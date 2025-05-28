from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from enum import Enum

class ShortlistingCriteria(BaseModel):
    """Model for shortlisting criteria request"""
    
    # Job Information
    job_title: Optional[str] = Field(None, description="Job title or position")
    job_description: Optional[str] = Field(None, description="Detailed job description")
    
    # Skills Requirements
    required_skills: Optional[List[str]] = Field(default_factory=list, description="Must-have skills")
    preferred_skills: Optional[List[str]] = Field(default_factory=list, description="Nice-to-have skills")
    
    # Experience Requirements
    min_experience: Optional[int] = Field(None, ge=0, description="Minimum years of experience")
    max_experience: Optional[int] = Field(None, ge=0, description="Maximum years of experience")
    
    # Education Requirements
    education_level: Optional[str] = Field(None, description="Required education level (e.g., Bachelor's, Master's)")
    education_field: Optional[str] = Field(None, description="Preferred field of study")
    
    # Location Preferences
    preferred_locations: Optional[List[str]] = Field(default_factory=list, description="Preferred work locations")
    
    # Scoring Configuration
    minimum_score: Optional[float] = Field(0.5, ge=0.0, le=1.0, description="Minimum score threshold for shortlisting")
    semantic_weight: Optional[float] = Field(0.7, ge=0.0, le=1.0, description="Weight for semantic matching (0-1)")
    max_shortlisted: Optional[int] = Field(None, ge=1, description="Maximum number of candidates to shortlist")
    
    @validator('max_experience')
    def validate_experience_range(cls, v, values):
        """Validate that max_experience is greater than min_experience"""
        if v is not None and 'min_experience' in values and values['min_experience'] is not None:
            if v < values['min_experience']:
                raise ValueError('max_experience must be greater than or equal to min_experience')
        return v
    
    @validator('semantic_weight')
    def validate_semantic_weight(cls, v):
        """Ensure semantic weight is between 0 and 1"""
        if not 0.0 <= v <= 1.0:
            raise ValueError('semantic_weight must be between 0.0 and 1.0')
        return v

class CandidateScoreDetail(BaseModel):
    """Model for individual candidate scoring details"""
    candidate_id: int
    candidate_name: Optional[str]
    semantic_score: float = Field(..., ge=0.0, le=1.0)
    keyword_score: float = Field(..., ge=0.0, le=1.0)
    combined_score: float = Field(..., ge=0.0, le=1.0)
    candidate_profile: str
    meets_minimum_threshold: bool
    final_status: Optional[str] = None
    error: Optional[str] = None
    
    # Groq-specific fields
    groq_score: Optional[int] = Field(None, ge=0, le=100, description="Groq LLM score out of 100")
    reasoning: Optional[str] = Field(None, description="LLM reasoning for the score")
    strengths: Optional[List[str]] = Field(default_factory=list, description="Candidate strengths identified by LLM")
    weaknesses: Optional[List[str]] = Field(default_factory=list, description="Candidate weaknesses identified by LLM")

class ShortlistingResponse(BaseModel):
    """Model for shortlisting response"""
    message: str
    total_candidates: int
    shortlisted_count: int
    rejected_count: int
    criteria_used: Dict[str, Any]
    scoring_results: List[CandidateScoreDetail]
    all_results_count: int
    algorithm: Optional[str] = Field(None, description="Algorithm used for shortlisting")
    job_description_used: Optional[str] = Field(None, description="Job description used by LLM")

class ShortlistingPreview(BaseModel):
    """Model for shortlisting preview (without actual status updates)"""
    candidate_id: int
    candidate_name: Optional[str]
    combined_score: float
    predicted_status: str
    score_breakdown: Dict[str, Any]
    
    # Additional Groq fields for preview
    groq_score: Optional[int] = Field(None, ge=0, le=100)
    reasoning: Optional[str] = None
    strengths: Optional[List[str]] = Field(default_factory=list)
    weaknesses: Optional[List[str]] = Field(default_factory=list)

class ShortlistingPreviewResponse(BaseModel):
    """Model for shortlisting preview response"""
    total_candidates: int
    predicted_shortlisted: int
    predicted_rejected: int
    preview_results: List[ShortlistingPreview]
    criteria_summary: Dict[str, Any]
    algorithm: Optional[str] = Field(None, description="Algorithm used for preview")
    job_description_used: Optional[str] = Field(None, description="Job description used by LLM") 