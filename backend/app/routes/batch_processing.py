from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Optional
import logging
import io
import asyncio
import os
from datetime import datetime

from models.database import get_db
from services.batch_processor import batch_processor
from utils.error_messages import APIErrorMessages
from utils.api_paths import BATCH_PATHS, BATCH_BASE
from config.settings import MAX_FILE_SIZE, ALLOWED_FILE_TYPES

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix=BATCH_BASE, tags=["batch processing"])

# Initialize error messages
error_messages = APIErrorMessages()

@router.post("/upload-resumes")
async def upload_resumes_batch(
    files: List[UploadFile] = File(...),
    parse: bool = Form(True),
    save_to_db: bool = Form(True),
    background_tasks: BackgroundTasks = None
):
    """
    Upload and process multiple resume files in a batch
    """
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        logger.info(f"Received batch upload request with {len(files)} files")
        
        # Validate files
        file_data = []
        file_count = 0
        rejected_files = []
        
        for file in files:
            file_count += 1
            
            # Validate file type
            file_extension = file.filename.split('.')[-1].lower()
            if file_extension not in ALLOWED_FILE_TYPES:
                rejected_files.append({
                    "filename": file.filename,
                    "reason": f"Unsupported file type: {file_extension}"
                })
                continue
            
            # Read file content
            file_content = await file.read()
            
            # Validate file size
            if len(file_content) > MAX_FILE_SIZE:
                rejected_files.append({
                    "filename": file.filename,
                    "reason": f"File size exceeds maximum limit of {MAX_FILE_SIZE} bytes"
                })
                continue
            
            # Add to file data list
            file_data.append((file_content, file_extension, file.filename))
        
        if not file_data:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "All files were rejected",
                    "rejected_files": rejected_files
                }
            )
        
        # Process files
        batch_results = await batch_processor.process_batch(file_data, parse, save_to_db)
        
        # Add rejected files to response
        if rejected_files:
            batch_results["rejected_files"] = rejected_files
            batch_results["total_rejected"] = len(rejected_files)
        
        return batch_results
    
    except Exception as e:
        logger.error(f"Error in batch upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch upload failed: {str(e)}")

@router.post("/upload-resumes/async")
async def upload_resumes_batch_async(
    files: List[UploadFile] = File(...),
    parse: bool = Form(True),
    save_to_db: bool = Form(True),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Upload and process multiple resume files in a batch asynchronously
    This endpoint returns immediately and processes files in the background
    """
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        logger.info(f"Received async batch upload request with {len(files)} files")
        
        # Validate and prepare files
        file_data = []
        file_count = 0
        rejected_files = []
        
        for file in files:
            file_count += 1
            
            # Validate file type
            file_extension = file.filename.split('.')[-1].lower()
            if file_extension not in ALLOWED_FILE_TYPES:
                rejected_files.append({
                    "filename": file.filename,
                    "reason": f"Unsupported file type: {file_extension}"
                })
                continue
            
            # Read file content
            file_content = await file.read()
            
            # Validate file size
            if len(file_content) > MAX_FILE_SIZE:
                rejected_files.append({
                    "filename": file.filename,
                    "reason": f"File size exceeds maximum limit of {MAX_FILE_SIZE} bytes"
                })
                continue
            
            # Add to file data list
            file_data.append((file_content, file_extension, file.filename))
        
        if not file_data:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "All files were rejected",
                    "rejected_files": rejected_files
                }
            )
        
        # Generate batch ID
        batch_id = f"batch_{datetime.now().strftime('%Y%m%d%H%M%S')}_{len(file_data)}"
        
        # Add task to background
        async def process_in_background():
            try:
                results = await batch_processor.process_batch(file_data, parse, save_to_db)
                
                # Write results to log file
                log_file = f"batch_results_{batch_id}.json"
                log_path = os.path.join(os.getenv("LOCAL_STORAGE_PATH", "storage"), log_file)
                
                os.makedirs(os.path.dirname(log_path), exist_ok=True)
                
                # Convert results to string and write to file
                import json
                with open(log_path, "w") as f:
                    f.write(json.dumps(results, indent=2))
                
                logger.info(f"Batch {batch_id} processing completed. Results saved to {log_path}")
            except Exception as e:
                logger.error(f"Error processing batch {batch_id}: {str(e)}")
        
        background_tasks.add_task(process_in_background)
        
        return {
            "success": True,
            "message": "Batch processing started in background",
            "batch_id": batch_id,
            "files_accepted": len(file_data),
            "files_rejected": len(rejected_files),
            "rejected_files": rejected_files
        }
    
    except Exception as e:
        logger.error(f"Error in async batch upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Async batch upload failed: {str(e)}")

@router.get("/status/{batch_id}")
async def get_batch_status(batch_id: str):
    """
    Get the status of a batch processing job
    """
    try:
        # Check if result file exists
        log_file = f"batch_results_{batch_id}.json"
        log_path = os.path.join(os.getenv("LOCAL_STORAGE_PATH", "storage"), log_file)
        
        if os.path.exists(log_path):
            # Read results from file
            import json
            with open(log_path, "r") as f:
                results = json.load(f)
            
            return {
                "status": "completed",
                "batch_id": batch_id,
                "results": results
            }
        else:
            return {
                "status": "processing",
                "batch_id": batch_id,
                "message": "Batch is still processing or does not exist"
            }
    
    except Exception as e:
        logger.error(f"Error getting batch status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get batch status: {str(e)}") 