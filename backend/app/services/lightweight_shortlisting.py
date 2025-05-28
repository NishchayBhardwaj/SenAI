import os
import logging
from typing import List, Dict, Any, Optional
from groq import Groq
from dotenv import load_dotenv
from pydantic import BaseModel
from models.database import get_db, Candidate, Education, Skill, WorkExperience, Status
from sqlalchemy.orm import Session
from datetime import datetime
import re

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Groq client
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

class CandidateScore(BaseModel):
    candidate_id: int
    candidate_name: str
    score: int  # Score out of 100
    reasoning: str
    strengths: List[str]
    weaknesses: List[str]

class ShortlistingResult(BaseModel):
    job_description: str
    total_candidates: int
    shortlisted_candidates: List[CandidateScore]
    scoring_criteria: str

def get_candidate_resume_data(candidate_id: int, db: Session) -> Optional[Dict[str, Any]]:
    """
    Get comprehensive resume data for a candidate from the database
    """
    try:
        # Get candidate basic info
        candidate = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
        if not candidate:
            return None
        
        # Get education
        education = db.query(Education).filter(Education.candidate_id == candidate_id).all()
        education_list = []
        for edu in education:
            education_list.append({
                "degree": edu.degree,
                "institution": edu.institution,
                "graduation_year": edu.graduation_year
            })
        
        # Get skills
        skills = db.query(Skill).filter(Skill.candidate_id == candidate_id).all()
        skills_list = [skill.skill_name for skill in skills]
        
        # Get work experience
        work_experience = db.query(WorkExperience).filter(WorkExperience.candidate_id == candidate_id).all()
        work_exp_list = []
        for exp in work_experience:
            work_exp_list.append({
                "company": exp.company,
                "position": exp.position,
                "duration": exp.duration,
                "start_date": exp.start_date,
                "end_date": exp.end_date
            })
        
        return {
            "candidate_id": candidate.candidate_id,
            "full_name": candidate.full_name,
            "email": candidate.email,
            "phone": candidate.phone,
            "location": candidate.location,
            "years_experience": candidate.years_experience,
            "education": education_list,
            "skills": skills_list,
            "work_experience": work_exp_list
        }
    
    except Exception as e:
        logger.error(f"Error getting candidate resume data: {str(e)}")
        return None

def score_candidate_against_job(candidate_data: Dict[str, Any], job_description: str) -> CandidateScore:
    """
    Score a single candidate against the job description using LLM
    """
    try:
        # Prepare candidate summary for LLM
        candidate_summary = f"""
Candidate: {candidate_data['full_name']}
Years of Experience: {candidate_data.get('years_experience', 'Unknown')}
Location: {candidate_data.get('location', 'Unknown')}

Education:
{chr(10).join([f"- {edu.get('degree', 'Unknown')} from {edu.get('institution', 'Unknown')} ({edu.get('graduation_year', 'Unknown')})" for edu in candidate_data.get('education', [])])}

Skills:
{', '.join(candidate_data.get('skills', []))}

Work Experience:
{chr(10).join([f"- {exp.get('position', 'Unknown')} at {exp.get('company', 'Unknown')} ({exp.get('duration', 'Unknown')})" for exp in candidate_data.get('work_experience', [])])}
"""

        prompt = f"""You are an expert HR recruiter. Analyze the following candidate's resume against the job description and provide a comprehensive scoring.

JOB DESCRIPTION:
{job_description}

CANDIDATE RESUME:
{candidate_summary}

Evaluate the candidate on the following criteria:
1. Technical Skills Match (30%)
2. Experience Level and Relevance (25%)
3. Education Background (15%)
4. Industry Experience (20%)
5. Overall Fit (10%)

Provide your response in this EXACT format:

SCORE: [0-100]

REASONING:
[2-3 sentences explaining the overall assessment]

STRENGTHS:
- [Strength 1]
- [Strength 2]
- [Strength 3]

WEAKNESSES:
- [Weakness 1]
- [Weakness 2]
- [Weakness 3]

Be specific and constructive in your feedback. Consider both hard skills and soft skills mentioned in the job description.
"""

        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert HR recruiter with 10+ years of experience in candidate evaluation. Be thorough, fair, and constructive in your assessments."
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama3-70b-8192",
            temperature=0.3,  # Slightly higher for more nuanced evaluation
            max_tokens=800
        )
        
        response = chat_completion.choices[0].message.content
        
        # Parse the response
        score, reasoning, strengths, weaknesses = parse_scoring_response(response)
        
        return CandidateScore(
            candidate_id=candidate_data['candidate_id'],
            candidate_name=candidate_data['full_name'],
            score=score,
            reasoning=reasoning,
            strengths=strengths,
            weaknesses=weaknesses
        )
    
    except Exception as e:
        logger.error(f"Error scoring candidate {candidate_data.get('candidate_id')}: {str(e)}")
        return CandidateScore(
            candidate_id=candidate_data['candidate_id'],
            candidate_name=candidate_data['full_name'],
            score=0,
            reasoning="Error occurred during scoring",
            strengths=[],
            weaknesses=["Could not evaluate due to technical error"]
        )

def parse_scoring_response(response: str) -> tuple:
    """
    Parse the LLM response to extract score, reasoning, strengths, and weaknesses
    """
    try:
        lines = response.strip().split('\n')
        score = 0
        reasoning = ""
        strengths = []
        weaknesses = []
        
        current_section = None
        
        for line in lines:
            line = line.strip()
            
            if line.startswith('SCORE:'):
                score_text = line.replace('SCORE:', '').strip()
                # Extract number from score text
                score_match = re.search(r'\d+', score_text)
                if score_match:
                    score = min(100, max(0, int(score_match.group())))
            
            elif line.startswith('REASONING:'):
                current_section = 'reasoning'
                reasoning_text = line.replace('REASONING:', '').strip()
                if reasoning_text:
                    reasoning = reasoning_text
            
            elif line.startswith('STRENGTHS:'):
                current_section = 'strengths'
            
            elif line.startswith('WEAKNESSES:'):
                current_section = 'weaknesses'
            
            elif line.startswith('- ') and current_section:
                item = line[2:].strip()
                if current_section == 'strengths':
                    strengths.append(item)
                elif current_section == 'weaknesses':
                    weaknesses.append(item)
            
            elif current_section == 'reasoning' and line and not line.startswith(('STRENGTHS:', 'WEAKNESSES:')):
                if reasoning:
                    reasoning += " " + line
                else:
                    reasoning = line
        
        return score, reasoning, strengths, weaknesses
    
    except Exception as e:
        logger.error(f"Error parsing scoring response: {str(e)}")
        return 0, "Error parsing response", [], ["Could not parse evaluation"]

class LightweightShortlistingService:
    def __init__(self):
        """Initialize the Groq-based shortlisting service"""
        logger.info("Initialized Groq-based shortlisting service")
    
    def shortlist_candidates(self, db: Session, criteria: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main shortlisting function using Groq LLM
        """
        try:
            logger.info("Starting Groq-based candidate shortlisting process")
            
            # Extract job description from criteria
            job_description = self._build_job_description(criteria)
            min_score = int(criteria.get('minimum_score', 0.5) * 100)  # Convert to 0-100 scale
            max_shortlisted = criteria.get('max_shortlisted', None)
            
            # Get all pending candidates
            pending_candidates = db.query(Candidate).filter(
                Candidate.status == Status.PENDING
            ).all()
            
            if not pending_candidates:
                return {
                    'message': 'No pending candidates found for shortlisting',
                    'total_candidates': 0,
                    'shortlisted_count': 0,
                    'rejected_count': 0,
                    'scoring_results': []
                }
            
            logger.info(f"Found {len(pending_candidates)} pending candidates")
            
            scored_candidates = []
            
            # Score each candidate using Groq
            for candidate in pending_candidates:
                candidate_data = get_candidate_resume_data(candidate.candidate_id, db)
                if candidate_data:
                    candidate_score = score_candidate_against_job(candidate_data, job_description)
                    scored_candidates.append(candidate_score)
            
            # Sort by score (highest first)
            scored_candidates.sort(key=lambda x: x.score, reverse=True)
            
            # Apply shortlisting logic
            shortlisted_count = 0
            rejected_count = 0
            scoring_results = []
            
            for candidate_score in scored_candidates:
                candidate = db.query(Candidate).filter(
                    Candidate.candidate_id == candidate_score.candidate_id
                ).first()
                
                if candidate:
                    should_shortlist = (
                        candidate_score.score >= min_score and
                        (max_shortlisted is None or shortlisted_count < max_shortlisted)
                    )
                    
                    if should_shortlist:
                        candidate.status = Status.SHORTLISTED
                        shortlisted_count += 1
                        final_status = 'shortlisted'
                    else:
                        candidate.status = Status.REJECTED
                        rejected_count += 1
                        final_status = 'rejected'
                    
                    candidate.updated_at = datetime.utcnow()
                    
                    # Convert to the expected format
                    scoring_results.append({
                        'candidate_id': candidate_score.candidate_id,
                        'candidate_name': candidate_score.candidate_name,
                        'skill_score': candidate_score.score / 100.0,  # Convert back to 0-1 scale
                        'experience_score': candidate_score.score / 100.0,
                        'combined_score': candidate_score.score / 100.0,
                        'candidate_profile': f"{candidate_score.reasoning}",
                        'meets_minimum_threshold': candidate_score.score >= min_score,
                        'final_status': final_status,
                        'groq_score': candidate_score.score,
                        'reasoning': candidate_score.reasoning,
                        'strengths': candidate_score.strengths,
                        'weaknesses': candidate_score.weaknesses
                    })
            
            # Commit changes to database
            db.commit()
            
            logger.info(f"Groq shortlisting completed: {shortlisted_count} shortlisted, {rejected_count} rejected")
            
            return {
                'message': f'Groq LLM shortlisting completed successfully',
                'total_candidates': len(pending_candidates),
                'shortlisted_count': shortlisted_count,
                'rejected_count': rejected_count,
                'criteria_used': criteria,
                'scoring_results': scoring_results[:20],  # Return top 20 for response size management
                'all_results_count': len(scoring_results),
                'algorithm': 'groq_llm_based',
                'job_description_used': job_description
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error in Groq shortlisting process: {str(e)}")
            raise Exception(f"Groq shortlisting failed: {str(e)}")
    
    def score_candidate(self, candidate: Candidate, criteria: Dict[str, Any]) -> Dict[str, Any]:
        """
        Score a single candidate using Groq LLM (for preview functionality)
        """
        try:
            # Build job description from criteria
            job_description = self._build_job_description(criteria)
            
            # Get candidate data
            candidate_data = {
                'candidate_id': candidate.candidate_id,
                'full_name': candidate.full_name,
                'email': candidate.email,
                'phone': candidate.phone,
                'location': candidate.location,
                'years_experience': candidate.years_experience,
                'education': [{'degree': edu.degree, 'institution': edu.institution, 'graduation_year': edu.graduation_year} for edu in candidate.education],
                'skills': [skill.skill_name for skill in candidate.skills],
                'work_experience': [{'company': exp.company, 'position': exp.position, 'duration': exp.duration} for exp in candidate.work_experiences]
            }
            
            # Score using Groq
            candidate_score = score_candidate_against_job(candidate_data, job_description)
            
            # Convert to expected format
            return {
                'candidate_id': candidate_score.candidate_id,
                'candidate_name': candidate_score.candidate_name,
                'skill_score': candidate_score.score / 100.0,
                'experience_score': candidate_score.score / 100.0,
                'education_score': candidate_score.score / 100.0,
                'location_score': candidate_score.score / 100.0,
                'text_similarity': candidate_score.score / 100.0,
                'combined_score': candidate_score.score / 100.0,
                'candidate_profile': candidate_score.reasoning,
                'meets_minimum_threshold': candidate_score.score >= (criteria.get('minimum_score', 0.5) * 100),
                'groq_score': candidate_score.score,
                'reasoning': candidate_score.reasoning,
                'strengths': candidate_score.strengths,
                'weaknesses': candidate_score.weaknesses,
                'score_breakdown': {
                    'groq_llm_score': f"{candidate_score.score}/100",
                    'reasoning': candidate_score.reasoning,
                    'strengths': candidate_score.strengths,
                    'weaknesses': candidate_score.weaknesses
                }
            }
            
        except Exception as e:
            logger.error(f"Error scoring candidate {candidate.candidate_id}: {str(e)}")
            return {
                'candidate_id': candidate.candidate_id,
                'candidate_name': candidate.full_name,
                'skill_score': 0.0,
                'experience_score': 0.0,
                'education_score': 0.0,
                'location_score': 0.0,
                'text_similarity': 0.0,
                'combined_score': 0.0,
                'candidate_profile': '',
                'meets_minimum_threshold': False,
                'error': str(e)
            }
    
    def _build_job_description(self, criteria: Dict[str, Any]) -> str:
        """
        Build a comprehensive job description from the criteria
        """
        job_parts = []
        
        if criteria.get('job_title'):
            job_parts.append(f"Job Title: {criteria['job_title']}")
        
        if criteria.get('job_description'):
            job_parts.append(f"Job Description: {criteria['job_description']}")
        
        if criteria.get('required_skills'):
            job_parts.append(f"Required Skills: {', '.join(criteria['required_skills'])}")
        
        if criteria.get('preferred_skills'):
            job_parts.append(f"Preferred Skills: {', '.join(criteria['preferred_skills'])}")
        
        if criteria.get('min_experience') is not None:
            exp_text = f"Minimum Experience: {criteria['min_experience']} years"
            if criteria.get('max_experience'):
                exp_text += f" to {criteria['max_experience']} years"
            job_parts.append(exp_text)
        
        if criteria.get('education_level'):
            job_parts.append(f"Education Level: {criteria['education_level']}")
        
        if criteria.get('education_field'):
            job_parts.append(f"Education Field: {criteria['education_field']}")
        
        if criteria.get('preferred_locations'):
            job_parts.append(f"Preferred Locations: {', '.join(criteria['preferred_locations'])}")
        
        return '\n'.join(job_parts) if job_parts else "General position requirements"

# Global instance
lightweight_shortlisting_service = LightweightShortlistingService() 