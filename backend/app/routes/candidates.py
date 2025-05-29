from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from models.database import get_db, Candidate, shortlist_candidate as db_shortlist_candidate
from utils.error_messages import APIErrorMessages
from utils.api_paths import CANDIDATE_PATHS, CANDIDATES_BASE

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix=CANDIDATES_BASE, tags=["candidates"])

# Initialize error messages
error_messages = APIErrorMessages()

@router.get("/")
async def get_candidates(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """Get all candidates with pagination"""
    candidates = db.query(Candidate).offset(skip).limit(limit).all()
    return candidates

@router.get("/{candidate_id}")
async def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Get specific candidate details"""
    candidate = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=error_messages.get_error_message(404))
    return candidate

@router.put("/{candidate_id}/status")
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

@router.post("/{candidate_id}/refresh-resume-url")
async def refresh_resume_url(candidate_id: int, db: Session = Depends(get_db)):
    """Refresh the presigned URL for a candidate's resume"""
    try:
        candidate = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        if not candidate.resume_file_path:
            raise HTTPException(status_code=404, detail="No resume file found for this candidate")
        
        # Import FileStorage here to avoid circular imports
        from services.storage import FileStorage
        file_storage = FileStorage()
        
        # First, get the existing file content
        try:
            file_content = await file_storage.get_file(candidate.resume_file_path)
            
            # Get file extension from original path
            file_extension = candidate.resume_file_path.split('.')[-1]
            
            # Delete the old file
            await file_storage.delete_file(candidate.resume_file_path)
            
            # Save the file with a new path and get new presigned URL
            new_file_path, _, new_presigned_url = await file_storage.save_file(
                file_content,
                file_extension,
                candidate.original_filename
            )
            
            # Update the candidate record with the new paths
            candidate.resume_file_path = new_file_path
            candidate.resume_s3_url = new_presigned_url
            db.commit()
            
            return {
                "message": "Resume URL refreshed successfully",
                "new_url": new_presigned_url,
                "new_file_path": new_file_path,
                "filename": candidate.original_filename or f"resume_{candidate_id}.pdf",
                "candidate_id": candidate_id
            }
            
        except Exception as e:
            logger.error(f"Error accessing file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to access resume file: {str(e)}")
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error refreshing resume URL for candidate {candidate_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh resume URL: {str(e)}")

@router.get("/{candidate_id}/view")
async def view_candidate_resume(candidate_id: int, db: Session = Depends(get_db)):
    """Get resume URL for a specific candidate"""
    candidate = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=error_messages.get_error_message(404))
    
    if not candidate.resume_s3_url:
        raise HTTPException(status_code=404, detail="No resume found for this candidate")
    
    return {
        "resume_url": candidate.resume_s3_url,
        "filename": candidate.original_filename or f"resume_{candidate_id}.pdf",
        "candidate_id": candidate_id
    }

@router.post("/{candidate_id}/shortlist")
async def shortlist_candidate_endpoint(candidate_id: int, db: Session = Depends(get_db)):
    """Shortlist a specific candidate"""
    logger.info(f"Received request to shortlist candidate {candidate_id} from candidates router")
    
    # Call the database function to shortlist the candidate
    success = db_shortlist_candidate(candidate_id)
    
    if not success:
        logger.error(f"Failed to shortlist candidate {candidate_id}")
        raise HTTPException(status_code=404, detail="Candidate not found or could not be shortlisted")
    
    logger.info(f"Successfully shortlisted candidate {candidate_id}")
    return {"message": "Candidate successfully shortlisted", "candidate_id": candidate_id}

@router.post("/{candidate_id}/shortlist-debug")
async def shortlist_candidate_debug(candidate_id: int, db: Session = Depends(get_db)):
    """Debug endpoint for shortlisting a candidate"""
    logger.info(f"Debug endpoint: Received request to shortlist candidate {candidate_id}")
    
    # Find the candidate first
    candidate = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not candidate:
        logger.error(f"Debug endpoint: Candidate {candidate_id} not found")
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Update status directly
    candidate.status = "shortlisted"
    db.commit()
    
    logger.info(f"Debug endpoint: Successfully shortlisted candidate {candidate_id}")
    return {
        "message": "Candidate successfully shortlisted (debug endpoint)",
        "candidate_id": candidate_id,
        "previous_status": candidate.status
    }