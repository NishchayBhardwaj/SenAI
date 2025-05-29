from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from models.database import get_db, Candidate, shortlist_candidate as db_shortlist_candidate
from models.shortlisting_models import (
    ShortlistingCriteria, 
    ShortlistingResponse, 
    CandidateScoreDetail,
    ShortlistingPreviewResponse,
    ShortlistingPreview
)
from services.lightweight_shortlisting import lightweight_shortlisting_service
from utils.error_messages import APIErrorMessages
from utils.api_paths import SHORTLIST_PATHS, CANDIDATES_BASE

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router with the original candidates prefix to maintain API compatibility
router = APIRouter(prefix=CANDIDATES_BASE, tags=["shortlist"])

# Initialize error messages
error_messages = APIErrorMessages()

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

@router.post("/{candidate_id}/shortlist")
async def shortlist_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Shortlist a specific candidate"""
    logger.info(f"Received request to shortlist candidate {candidate_id}")
    
    # Call the database function to shortlist the candidate
    success = db_shortlist_candidate(candidate_id)
    
    if not success:
        logger.error(f"Failed to shortlist candidate {candidate_id}")
        raise HTTPException(status_code=404, detail="Candidate not found or could not be shortlisted")
    
    logger.info(f"Successfully shortlisted candidate {candidate_id}")
    return {"message": "Candidate successfully shortlisted", "candidate_id": candidate_id} 