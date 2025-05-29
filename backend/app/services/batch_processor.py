import os
import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
import io
from datetime import datetime
import uuid
import concurrent.futures

from services.storage import FileStorage
from services.resume_processor import process_file_content, analyze_resume_content
from models.database import save_candidate_data, upsert_candidate_data

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BatchProcessingError(Exception):
    """Custom exception for batch processing errors"""
    pass

class BatchProcessor:
    def __init__(self, max_workers: int = 5, chunk_size: int = 10):
        """
        Initialize batch processor with configurable concurrency settings
        
        Args:
            max_workers: Maximum number of worker threads for processing
            chunk_size: Number of files to process in each chunk
        """
        self.file_storage = FileStorage()
        self.max_workers = max_workers
        self.chunk_size = chunk_size
        logger.info(f"BatchProcessor initialized with max_workers={max_workers}, chunk_size={chunk_size}")

    async def process_batch(self, files: List[Tuple[bytes, str, str]], parse: bool = True, save_to_db: bool = True) -> Dict[str, Any]:
        """
        Process a batch of files
        
        Args:
            files: List of tuples containing (file_content, file_extension, original_filename)
            parse: Whether to parse the resume content
            save_to_db: Whether to save parsed data to database
            
        Returns:
            Dict containing processing results
        """
        try:
            logger.info(f"Starting batch processing of {len(files)} files")
            start_time = datetime.now()
            
            # Process files in chunks to avoid overwhelming resources
            results = []
            processed_count = 0
            error_count = 0
            
            # Process files in chunks
            for i in range(0, len(files), self.chunk_size):
                chunk = files[i:i + self.chunk_size]
                chunk_results = await self._process_chunk(chunk, parse, save_to_db)
                
                # Count successful and failed results
                for result in chunk_results:
                    if result.get("success", False):
                        processed_count += 1
                    else:
                        error_count += 1
                
                results.extend(chunk_results)
                logger.info(f"Processed chunk {i//self.chunk_size + 1} ({len(chunk)} files)")
            
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            
            return {
                "success": True,
                "message": f"Batch processing completed in {processing_time:.2f} seconds",
                "total_files": len(files),
                "processed_files": processed_count,
                "failed_files": error_count,
                "processing_time_seconds": processing_time,
                "results": results
            }
            
        except Exception as e:
            logger.error(f"Error in batch processing: {str(e)}")
            return {
                "success": False,
                "message": f"Batch processing failed: {str(e)}",
                "total_files": len(files),
                "processed_files": 0,
                "failed_files": len(files),
                "results": []
            }

    async def _process_chunk(self, files_chunk: List[Tuple[bytes, str, str]], parse: bool, save_to_db: bool) -> List[Dict[str, Any]]:
        """Process a chunk of files concurrently"""
        tasks = []
        
        for file_content, file_extension, original_filename in files_chunk:
            task = self._process_single_file(file_content, file_extension, original_filename, parse, save_to_db)
            tasks.append(task)
        
        # Use asyncio.gather to process files concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions in results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error processing file {files_chunk[i][2]}: {str(result)}")
                processed_results.append({
                    "success": False,
                    "filename": files_chunk[i][2],
                    "error": str(result)
                })
            else:
                processed_results.append(result)
                
        return processed_results

    async def _process_single_file(self, file_content: bytes, file_extension: str, original_filename: str, parse: bool, save_to_db: bool) -> Dict[str, Any]:
        """Process a single file"""
        try:
            logger.info(f"Processing file: {original_filename}")
            
            # Create file-like object
            file_obj = io.BytesIO(file_content)
            
            # Extract text content
            if parse:
                content = process_file_content(file_obj, file_extension)
                if not content:
                    return {
                        "success": False,
                        "filename": original_filename,
                        "error": "Failed to extract content from file"
                    }
                
                # Analyze content with Groq
                extracted_data = analyze_resume_content(content)
                if not extracted_data:
                    return {
                        "success": False,
                        "filename": original_filename,
                        "error": "Failed to analyze resume content"
                    }
            else:
                extracted_data = {"Full Name": original_filename}
            
            # Save file to storage
            file_obj.seek(0)  # Reset file pointer
            file_path, _, presigned_url = await self.file_storage.save_file(
                file_obj,
                file_extension,
                original_filename
            )
            
            # Save to database if required
            candidate_id = None
            if save_to_db:
                # Convert extracted data to database format
                db_data = {
                    "full_name": extracted_data.get("Full Name", ""),
                    "email": extracted_data.get("Email Address", ""),
                    "phone": extracted_data.get("Phone Number", ""),
                    "location": extracted_data.get("Location", ""),
                    "years_experience": extracted_data.get("Years of Experience", 0),
                    "education": [
                        {
                            "degree": edu.get("degree", ""),
                            "institution": edu.get("institution", ""),
                            "year": edu.get("year", "")
                        } for edu in extracted_data.get("Education", [])
                    ],
                    "skills": self._categorize_skills(extracted_data.get("Skills", [])),
                    "work_experience": [
                        {
                            "company": company.split(",")[0].strip() if "," in company else company,
                            "position": company.split(",")[1].strip() if "," in company and len(company.split(",")) > 1 else "",
                            "duration": company.split(",")[2].strip() if "," in company and len(company.split(",")) > 2 else ""
                        } for company in extracted_data.get("Work Experience", [])
                    ]
                }
                
                # Save to database
                candidate_id = upsert_candidate_data(
                    db_data,
                    resume_file_path=file_path,
                    resume_s3_url=presigned_url,
                    original_filename=original_filename
                )
            
            return {
                "success": True,
                "filename": original_filename,
                "candidate_id": candidate_id,
                "file_path": file_path,
                "presigned_url": presigned_url,
                "extracted_data": extracted_data if parse else None
            }
            
        except Exception as e:
            logger.error(f"Error processing file {original_filename}: {str(e)}")
            return {
                "success": False,
                "filename": original_filename,
                "error": str(e)
            }

    def _categorize_skills(self, skills):
        """Categorize skills as technical, soft, or language skills"""
        # Common soft skills list
        soft_skills = [
            "leadership", "communication", "teamwork", "problem solving", 
            "critical thinking", "decision making", "time management", 
            "adaptability", "flexibility", "creativity", "interpersonal", 
            "presentation", "negotiation", "collaboration", "emotional intelligence",
            "conflict resolution", "management", "mentoring", "coaching", "training",
            "public speaking", "writing", "organizational", "detail-oriented",
            "multitasking", "analytical", "research", "planning", "coordination",
            "supervision", "motivation", "customer service", "active listening"
        ]
        
        # Common languages
        languages = [
            "english", "spanish", "french", "german", "chinese", "japanese",
            "italian", "portuguese", "russian", "arabic", "hindi", "korean",
            "dutch", "swedish", "norwegian", "danish", "finnish", "polish",
            "turkish", "greek", "hebrew", "vietnamese", "thai", "indonesian"
        ]
        
        categorized_skills = []
        
        for skill in skills:
            skill_name = skill.lower() if isinstance(skill, str) else ""
            skill_category = "technical"  # Default
            
            # Check if it's a soft skill
            if any(soft_skill in skill_name for soft_skill in soft_skills):
                skill_category = "soft"
            
            # Check if it's a language
            elif any(language in skill_name for language in languages):
                skill_category = "language"
            
            categorized_skills.append({
                "skill_name": skill,
                "skill_category": skill_category,
                "proficiency_level": "intermediate" if skill_category == "technical" else "advanced"
            })
        
        return categorized_skills

# Create global instance
batch_processor = BatchProcessor() 