from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
import io

from models.database import get_db, Candidate, Education, Skill, init_db
from services.storage import FileStorage
from services.resume_processor import process_file_content, analyze_resume_content
from config.settings import API_PREFIX
from utils.error_messages import APIErrorMessages
from services.storage import StorageError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix=f"{API_PREFIX}/resumes", tags=["resumes"])

# Initialize error messages
error_messages = APIErrorMessages()

# Initialize file storage
file_storage = FileStorage()

# Create database tables
init_db()

def check_duplicate_resume_data(db: Session, extracted_data: dict):
    """Check if extracted data matches an existing candidate"""
    try:
        candidate_email = extracted_data.get('Email Address', '')
        candidate_name = extracted_data.get('Full Name', '')
        candidate_phone = extracted_data.get('Phone Number', '')
        
        if not candidate_email and not candidate_phone:
            return None, False
        
        # Find candidate by email or phone
        existing_candidate = None
        if candidate_email:
            existing_candidate = db.query(Candidate).filter(Candidate.email == candidate_email).first()
        elif candidate_phone:
            existing_candidate = db.query(Candidate).filter(Candidate.phone == candidate_phone).first()
        
        if not existing_candidate:
            return None, False
        
        # Compare key extracted data
        is_duplicate = True
        
        # Check basic info
        if existing_candidate.full_name and candidate_name:
            if existing_candidate.full_name.lower().strip() != candidate_name.lower().strip():
                is_duplicate = False
        
        if existing_candidate.phone and candidate_phone:
            if existing_candidate.phone.strip() != candidate_phone.strip():
                is_duplicate = False
        
        if existing_candidate.location and extracted_data.get('Location'):
            if existing_candidate.location.lower().strip() != extracted_data.get('Location', '').lower().strip():
                is_duplicate = False
        
        if existing_candidate.years_experience != extracted_data.get('Years of Experience', 0):
            is_duplicate = False
        
        # Check education count
        existing_education_count = len(existing_candidate.education)
        new_education_count = len(extracted_data.get('Education', []))
        if existing_education_count != new_education_count:
            is_duplicate = False
        
        # Check skills count
        existing_skills_count = len(existing_candidate.skills)
        new_skills_count = len(extracted_data.get('Skills', []))
        if existing_skills_count != new_skills_count:
            is_duplicate = False
        
        # If basic checks pass, do detailed comparison
        if is_duplicate:
            # Compare education details
            existing_degrees = set()
            for edu in existing_candidate.education:
                existing_degrees.add(f"{edu.degree}|{edu.institution}|{edu.graduation_year}")
            
            new_degrees = set()
            for edu in extracted_data.get('Education', []):
                new_degrees.add(f"{edu.get('degree', '')}|{edu.get('institution', '')}|{edu.get('year', '')}")
            
            if existing_degrees != new_degrees:
                is_duplicate = False
            
            # Compare skills
            existing_skill_names = set(skill.skill_name.lower().strip() for skill in existing_candidate.skills)
            new_skill_names = set(skill.lower().strip() for skill in extracted_data.get('Skills', []))
            
            if existing_skill_names != new_skill_names:
                is_duplicate = False
        
        return existing_candidate, is_duplicate
        
    except Exception as e:
        logger.error(f"Error checking duplicate resume data: {str(e)}")
        return None, False

@router.post("/upload")
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

            # Check for duplicate resume data
            existing_candidate, is_duplicate = check_duplicate_resume_data(db, extracted_data)
            
            if is_duplicate and existing_candidate:
                logger.info(f"Duplicate resume detected for candidate: {existing_candidate.full_name}")
                return {
                    "message": "Same resume detected - no changes needed",
                    "candidate_id": existing_candidate.candidate_id,
                    "is_duplicate": True,
                    "extracted_data": extracted_data,
                    "existing_resume_url": existing_candidate.resume_s3_url
                }

            # Get candidate name and email from extracted data
            candidate_name = extracted_data.get('Full Name', '')
            candidate_email = extracted_data.get('Email Address', '')
            
            if not candidate_name:
                logger.warning("No candidate name found in resume, using default naming")
                candidate_name = None

            # Save file with candidate name
            try:
                # Use await for async function
                file_path, file_content, presigned_url = await file_storage.save_file(
                    io.BytesIO(file_content),  # Create new file-like object from content
                    file_extension,
                    candidate_name
                )
                logger.info(f"File saved successfully at: {file_path}")
            except StorageError as e:
                if "A resume already exists for this candidate" in str(e):
                    logger.warning(f"Resume already exists for candidate: {candidate_name}")
                    raise HTTPException(status_code=409, detail="A resume already exists for this candidate")
                logger.error(f"Error saving file: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
            except Exception as e:
                logger.error(f"Error saving file: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")

            try:
                # Check if candidate already exists (for updates)
                if existing_candidate:
                    # Update existing candidate
                    logger.info(f"Updating existing candidate record with ID: {existing_candidate.candidate_id}")
                    existing_candidate.full_name = candidate_name or extracted_data.get('Full Name', existing_candidate.full_name)
                    existing_candidate.phone = extracted_data.get('Phone Number', existing_candidate.phone)
                    existing_candidate.location = extracted_data.get('Location', existing_candidate.location)
                    existing_candidate.years_experience = extracted_data.get('Years of Experience', existing_candidate.years_experience)
                    existing_candidate.resume_file_path = file_path
                    existing_candidate.resume_s3_url = presigned_url
                    
                    # Delete existing education and skills
                    db.query(Education).filter(Education.candidate_id == existing_candidate.candidate_id).delete()
                    db.query(Skill).filter(Skill.candidate_id == existing_candidate.candidate_id).delete()
                    
                    candidate = existing_candidate
                else:
                    # Create new candidate
                    candidate = Candidate(
                        full_name=candidate_name or extracted_data.get('Full Name', ''),
                        email=extracted_data.get('Email Address', ''),
                        phone=extracted_data.get('Phone Number', ''),
                        location=extracted_data.get('Location', ''),
                        years_experience=extracted_data.get('Years of Experience', 0),
                        resume_file_path=file_path,
                        resume_s3_url=presigned_url,
                        status='pending'
                    )
                    db.add(candidate)
                
                db.flush()  # Get the candidate_id
                logger.info(f"Created/Updated candidate record with ID: {candidate.candidate_id}")

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

                return {
                    "message": error_messages.get_valid_response_message(201),
                    "candidate_id": candidate.candidate_id,
                    "is_update": existing_candidate is not None,
                    "is_duplicate": False,
                    "extracted_data": extracted_data
                }

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