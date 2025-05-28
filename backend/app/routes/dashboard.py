from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import logging
from models.database import get_db, Candidate
from config.settings import API_PREFIX

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix=f"{API_PREFIX}/dashboard", tags=["dashboard"])

@router.get("/stats")
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