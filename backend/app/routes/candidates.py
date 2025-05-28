from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from models.database import get_db, Candidate
from models.shortlisting_models import (
    ShortlistingCriteria, 
    ShortlistingResponse, 
    CandidateScoreDetail,
    ShortlistingPreviewResponse,
    ShortlistingPreview
)
from services.lightweight_shortlisting import lightweight_shortlisting_service
from config.settings import API_PREFIX
from utils.error_messages import APIErrorMessages

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix=f"{API_PREFIX}/candidates", tags=["candidates"])

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

@router.post("/shortlist", response_model=ShortlistingResponse)
async def shortlist_candidates(criteria: ShortlistingCriteria, db: Session = Depends(get_db)):
    """Process shortlisting criteria using Groq LLM and update candidate status"""
    try:
        logger.info("Received shortlisting request")
        logger.info(f"Criteria: {criteria.dict()}")
        
        # Convert Pydantic model to dict for the service
        criteria_dict = criteria.dict(exclude_unset=True)
        
        # Call the Groq-based shortlisting service
        result = lightweight_shortlisting_service.shortlist_candidates(db, criteria_dict)
        
        # Convert result to Pydantic response model
        response = ShortlistingResponse(
            message=result['message'],
            total_candidates=result['total_candidates'],
            shortlisted_count=result['shortlisted_count'],
            rejected_count=result['rejected_count'],
            criteria_used=result['criteria_used'],
            scoring_results=[
                CandidateScoreDetail(
                    candidate_id=score['candidate_id'],
                    candidate_name=score['candidate_name'],
                    semantic_score=score.get('skill_score', 0.0),  # Map skill_score to semantic_score for compatibility
                    keyword_score=score.get('experience_score', 0.0),  # Map experience_score to keyword_score for compatibility
                    combined_score=score['combined_score'],
                    candidate_profile=score['candidate_profile'],
                    meets_minimum_threshold=score['meets_minimum_threshold'],
                    final_status=score.get('final_status'),
                    error=score.get('error'),
                    # Groq-specific fields
                    groq_score=score.get('groq_score'),
                    reasoning=score.get('reasoning'),
                    strengths=score.get('strengths', []),
                    weaknesses=score.get('weaknesses', [])
                ) for score in result['scoring_results']
            ],
            all_results_count=result['all_results_count'],
            algorithm=result.get('algorithm', 'groq_llm_based'),
            job_description_used=result.get('job_description_used')
        )
        
        return response

    except Exception as e:
        logger.error(f"Error in shortlisting: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Shortlisting failed: {str(e)}")

@router.post("/shortlist/preview", response_model=ShortlistingPreviewResponse)
async def preview_shortlisting(criteria: ShortlistingCriteria, db: Session = Depends(get_db)):
    """Preview shortlisting results without updating candidate status"""
    try:
        logger.info("Received shortlisting preview request")
        
        # Get all pending candidates
        pending_candidates = db.query(Candidate).filter(Candidate.status == 'pending').all()
        
        if not pending_candidates:
            return ShortlistingPreviewResponse(
                total_candidates=0,
                predicted_shortlisted=0,
                predicted_rejected=0,
                preview_results=[],
                criteria_summary=criteria.dict(exclude_unset=True),
                algorithm="groq_llm_based"
            )
        
        # Convert criteria to dict
        criteria_dict = criteria.dict(exclude_unset=True)
        
        # Build job description for preview
        job_description = lightweight_shortlisting_service._build_job_description(criteria_dict)
        
        # Score all candidates without updating status
        preview_results = []
        predicted_shortlisted = 0
        predicted_rejected = 0
        
        minimum_score = criteria_dict.get('minimum_score', 0.5)
        max_shortlisted = criteria_dict.get('max_shortlisted', None)
        
        for candidate in pending_candidates[:10]:  # Limit to 10 for preview to avoid long response times
            score_details = lightweight_shortlisting_service.score_candidate(candidate, criteria_dict)
            
            # Predict status
            should_shortlist = (
                score_details['combined_score'] >= minimum_score and
                (max_shortlisted is None or predicted_shortlisted < max_shortlisted)
            )
            
            predicted_status = 'shortlisted' if should_shortlist else 'rejected'
            if should_shortlist:
                predicted_shortlisted += 1
            else:
                predicted_rejected += 1
            
            preview_results.append(ShortlistingPreview(
                candidate_id=score_details['candidate_id'],
                candidate_name=score_details['candidate_name'],
                combined_score=score_details['combined_score'],
                predicted_status=predicted_status,
                score_breakdown=score_details.get('score_breakdown', {}),
                # Groq-specific fields
                groq_score=score_details.get('groq_score'),
                reasoning=score_details.get('reasoning'),
                strengths=score_details.get('strengths', []),
                weaknesses=score_details.get('weaknesses', [])
            ))
        
        # Sort by combined score
        preview_results.sort(key=lambda x: x.combined_score, reverse=True)
        
        return ShortlistingPreviewResponse(
            total_candidates=len(pending_candidates),
            predicted_shortlisted=predicted_shortlisted,
            predicted_rejected=predicted_rejected,
            preview_results=preview_results,
            criteria_summary=criteria_dict,
            algorithm="groq_llm_based",
            job_description_used=job_description
        )

    except Exception as e:
        logger.error(f"Error in shortlisting preview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")

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