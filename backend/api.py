from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os
import logging
from dotenv import load_dotenv
import io

from database import get_db, Candidate, Education, Skill, create_tables
from storage import FileStorage
from app import process_file_content, analyze_resume_content
from api_paths import APIPaths
from http_status_messages import APIErrorMessages

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="Resume Processing API")

# Initialize error messages
error_messages = APIErrorMessages()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize file storage
file_storage = FileStorage()

# Create database tables
create_tables()

@app.post(APIPaths.UPLOAD_RESUME)
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload and process a resume file"""
    try:
        logger.info(f"Received file upload request: {file.filename}")
        
        # Validate file type
        file_extension = file.filename.split('.')[-1].lower()
        if file_extension not in ['pdf', 'doc', 'docx', 'txt']:
            logger.error(f"Invalid file type: {file_extension}")
            raise HTTPException(status_code=400, detail=error_messages.get_error_message(400))

        # Process file content first to get candidate name
        try:
            # Create a temporary file-like object for initial processing
            file_content = file.file.read()
            file_obj = io.BytesIO(file_content)
            content = process_file_content(file_obj, file_extension)
            if not content:
                logger.error("Failed to extract content from file")
                raise HTTPException(status_code=400, detail="Failed to extract content from file")
            logger.info("File content processed successfully")

            # Analyze content with Groq
            extracted_data = analyze_resume_content(content)
            if not extracted_data:
                logger.error("Failed to analyze resume content")
                raise HTTPException(status_code=400, detail="Failed to analyze resume content")
            logger.info("Resume content analyzed successfully")

            # Handle case where extracted_data is a string
            if isinstance(extracted_data, str):
                logger.warning("Extracted data is a string, attempting to parse as JSON")
                try:
                    import json
                    extracted_data = json.loads(extracted_data)
                except json.JSONDecodeError:
                    logger.error("Failed to parse extracted data as JSON")
                    # Create a basic structure with the string as full name
                    extracted_data = {
                        'Full Name': extracted_data,
                        'Email Address': '',
                        'Phone Number': '',
                        'Location': '',
                        'Years of Experience': 0,
                        'Education': [],
                        'Skills': []
                    }

            # Get candidate name from extracted data
            candidate_name = extracted_data.get('Full Name', '')
            if not candidate_name:
                logger.warning("No candidate name found in resume, using default naming")
                candidate_name = None

            # Save file with candidate name
            try:
                file_path, _ = file_storage.save_file(
                    io.BytesIO(file_content),  # Create new file-like object from content
                    file_extension,
                    candidate_name
                )
                logger.info(f"File saved successfully at: {file_path}")
            except Exception as e:
                logger.error(f"Error saving file: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")

            # Create candidate record
            try:
                candidate = Candidate(
                    full_name=candidate_name or extracted_data.get('Full Name', ''),
                    email=extracted_data.get('Email Address', ''),
                    phone=extracted_data.get('Phone Number', ''),
                    location=extracted_data.get('Location', ''),
                    years_experience=extracted_data.get('Years of Experience', 0),
                    resume_file_path=file_path,
                    status='pending'
                )
                db.add(candidate)
                db.flush()  # Get the candidate_id
                logger.info(f"Created candidate record with ID: {candidate.candidate_id}")

                # Add education records
                for edu in extracted_data.get('Education', []):
                    education = Education(
                        candidate_id=candidate.candidate_id,
                        degree=edu.get('degree', ''),
                        institution=edu.get('institution', ''),
                        graduation_year=edu.get('year', None)
                    )
                    db.add(education)
                logger.info("Added education records")

                # Add skills
                for skill in extracted_data.get('Skills', []):
                    skill_record = Skill(
                        candidate_id=candidate.candidate_id,
                        skill_name=skill,
                        skill_category='technical',  # Default category
                        proficiency_level='intermediate'  # Default level
                    )
                    db.add(skill_record)
                logger.info("Added skill records")

                db.commit()
                logger.info("Successfully committed all changes to database")

                return {"message": error_messages.get_valid_response_message(201), "candidate_id": candidate.candidate_id}

            except Exception as e:
                logger.error(f"Database error: {str(e)}")
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get(APIPaths.GET_CANDIDATES)
async def get_candidates(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """Get all candidates with pagination"""
    candidates = db.query(Candidate).offset(skip).limit(limit).all()
    return candidates

@app.get(APIPaths.GET_CANDIDATE)
async def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Get specific candidate details"""
    candidate = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=error_messages.get_error_message(404))
    return candidate

@app.post(APIPaths.SHORTLIST_CANDIDATES)
async def shortlist_candidates(criteria: dict, db: Session = Depends(get_db)):
    """Process shortlisting criteria and update candidate status"""
    try:
        # Get all pending candidates
        candidates = db.query(Candidate).filter(Candidate.status == 'pending').all()
        
        # Apply shortlisting criteria
        shortlisted_count = 0
        for candidate in candidates:
            # Implement your shortlisting logic here
            # This is a simple example - you should implement more sophisticated criteria
            if (candidate.years_experience >= criteria.get('min_experience', 0) and
                any(skill.skill_name.lower() in [s.lower() for s in criteria.get('required_skills', [])]
                    for skill in candidate.skills)):
                candidate.status = 'shortlisted'
                shortlisted_count += 1
            else:
                candidate.status = 'rejected'

        db.commit()
        return {"message": f"Shortlisted {shortlisted_count} candidates"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=error_messages.get_error_message(500))

@app.put(APIPaths.UPDATE_CANDIDATE_STATUS)
async def update_candidate_status(candidate_id: int, status: str, db: Session = Depends(get_db)):
    """Update candidate status"""
    candidate = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=error_messages.get_error_message(404))
    
    if status not in ['pending', 'shortlisted', 'rejected']:
        raise HTTPException(status_code=400, detail=error_messages.get_error_message(400))
    
    candidate.status = status
    db.commit()
    return {"message": error_messages.get_valid_response_message(200)}

@app.get(APIPaths.GET_DASHBOARD_STATS)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get dashboard statistics"""
    total_candidates = db.query(Candidate).count()
    pending_candidates = db.query(Candidate).filter(Candidate.status == 'pending').count()
    shortlisted_candidates = db.query(Candidate).filter(Candidate.status == 'shortlisted').count()
    rejected_candidates = db.query(Candidate).filter(Candidate.status == 'rejected').count()

    return {
        "total_candidates": total_candidates,
        "pending_candidates": pending_candidates,
        "shortlisted_candidates": shortlisted_candidates,
        "rejected_candidates": rejected_candidates
    } 