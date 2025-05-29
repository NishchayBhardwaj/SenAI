from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
import logging
import io
import re

from models.database import get_db, Candidate, Education, Skill, WorkExperience, init_db
from services.storage import FileStorage
from services.resume_processor import process_file_content, analyze_resume_content, groq_client
from utils.error_messages import APIErrorMessages
from utils.api_paths import RESUME_PATHS, RESUMES_BASE
from services.storage import StorageError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix=RESUMES_BASE, tags=["resumes"])

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
            try:
                extracted_data = analyze_resume_content(content)
            except Exception as e:
                logger.error(f"Resume parsing error: {str(e)}")
                raise HTTPException(status_code=400, detail="Failed to analyze resume content. Please upload a valid resume.")
            if not extracted_data:
                logger.error("Failed to analyze resume content")
                raise HTTPException(status_code=400, detail="Failed to analyze resume content")
            logger.info("Resume content analyzed successfully")

            # Post-LLM resume validation: ensure at least one key field is present
            fields_to_check = [
                extracted_data.get('Full Name', '').strip().lower(),
                extracted_data.get('Email Address', '').strip().lower(),
                extracted_data.get('Skills', []),
                extracted_data.get('Education', []),
                extracted_data.get('Work Experience', [])
            ]
            if (
                (not fields_to_check[0] or fields_to_check[0] == 'not found') and
                (not fields_to_check[1] or fields_to_check[1] == 'not found') and
                (not fields_to_check[2] or (isinstance(fields_to_check[2], list) and (len(fields_to_check[2]) == 0 or all((str(s).strip().lower() == 'not found') for s in fields_to_check[2])))) and
                (not fields_to_check[3] or (isinstance(fields_to_check[3], list) and (len(fields_to_check[3]) == 0 or all((str(e).strip().lower() == 'not found') for e in fields_to_check[3])))) and
                (not fields_to_check[4] or (isinstance(fields_to_check[4], list) and (len(fields_to_check[4]) == 0 or all((str(w).strip().lower() == 'not found') for w in fields_to_check[4]))))
            ):
                logger.error(f"Resume validation failed: No key fields found or all fields are 'Not found' in file {file.filename}")
                raise HTTPException(status_code=400, detail="Invalid file, please upload a valid resume (no key information found).")

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
                    file.filename  # Pass original filename instead of candidate_name
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
                # --- Skill Extraction Fix ---
                # If extracted_data['Skills'] is a single string, split it into a list
                skills = extracted_data.get('Skills', [])
                if isinstance(skills, str):
                    # Split on newlines, commas, or semicolons
                    skills = [s.strip() for s in re.split(r'[\n,;]', skills) if s.strip()]
                    extracted_data['Skills'] = skills
                elif isinstance(skills, list):
                    # Flatten any list items that are long strings with delimiters
                    flat_skills = []
                    for s in skills:
                        if isinstance(s, str) and ("\n" in s or "," in s or ";" in s):
                            flat_skills.extend([x.strip() for x in re.split(r'[\n,;]', s) if x.strip()])
                        else:
                            flat_skills.append(s)
                    extracted_data['Skills'] = flat_skills

                # --- LLM Skill Categorization & Proficiency ---
                def get_skill_category_and_proficiency(skill_name):
                    """Use Groq LLM to determine skill category and proficiency level, enforcing allowed enums."""
                    allowed_categories = ["TECHNICAL", "SOFT", "LANGUAGE", "OTHER"]
                    allowed_proficiencies = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]
                    prompt = f"""
Classify the following skill into one of these categories (respond with only the category): Technical, Soft, Language, Other. Also, estimate the proficiency level (choose only one: Beginner, Intermediate, Advanced, Expert) based on the skill name and typical usage in resumes. Return the result as JSON with keys: skill_category, proficiency_level. Use only these values for each field.

Skill: {skill_name}

Respond in this format:
{{"skill_category": "Technical", "proficiency_level": "Intermediate"}}
"""
                    try:
                        chat_completion = groq_client.chat.completions.create(
                            messages=[{"role": "user", "content": prompt}],
                            model="llama3-70b-8192",
                            temperature=0.1,
                            max_tokens=100
                        )
                        import json
                        response = chat_completion.choices[0].message.content
                        result = json.loads(response)
                        # Normalize and map to allowed enums
                        cat = str(result.get("skill_category", "Technical")).strip().upper()
                        prof = str(result.get("proficiency_level", "Intermediate")).strip().upper()
                        if cat not in allowed_categories:
                            logger.warning(f"LLM returned unknown skill_category '{cat}' for skill '{skill_name}', defaulting to TECHNICAL")
                            cat = "TECHNICAL"
                        if prof not in allowed_proficiencies:
                            logger.warning(f"LLM returned unknown proficiency_level '{prof}' for skill '{skill_name}', defaulting to INTERMEDIATE")
                            prof = "INTERMEDIATE"
                        return cat, prof
                    except Exception as e:
                        logger.error(f"LLM skill categorization error for '{skill_name}': {str(e)}")
                        return "TECHNICAL", "INTERMEDIATE"

                categorized_skills = []
                for skill in extracted_data.get('Skills', []):
                    skill_name = skill if isinstance(skill, str) else str(skill)
                    skill_category, proficiency_level = get_skill_category_and_proficiency(skill_name)
                    categorized_skills.append({
                        "skill_name": skill_name,
                        "skill_category": skill_category.upper(),
                        "proficiency_level": proficiency_level.upper()
                    })
                # Use these categorized_skills for DB insert

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
                    existing_candidate.original_filename = file.filename  # Set original filename
                    
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
                        original_filename=file.filename,  # Set original filename
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

                # Add skills with categories
                for skill_data in categorized_skills:
                    skill_record = Skill(
                        candidate_id=candidate.candidate_id,
                        skill_name=skill_data['skill_name'],
                        skill_category=skill_data['skill_category'],
                        proficiency_level=skill_data['proficiency_level']
                    )
                    db.add(skill_record)
                logger.info("Added skill records")

                # Add work experiences with parsed start_date and end_date
                for exp in extracted_data.get('Work Experience', []):
                    # exp is a string like "Company, Position, Duration"
                    company = position = duration = start_date = end_date = ""
                    if isinstance(exp, dict):
                        company = exp.get('company', '')
                        position = exp.get('position', '')
                        duration = exp.get('duration', '')
                    elif isinstance(exp, str):
                        parts = [p.strip() for p in exp.split(',')]
                        if len(parts) == 3:
                            company, position, duration = parts
                        elif len(parts) == 2:
                            company, position = parts
                        elif len(parts) == 1:
                            company = parts[0]
                        # Try to extract duration from the string if not already set
                        if not duration and (" - " in exp or " to " in exp):
                            duration = exp
                    # Parse start_date and end_date from duration
                    if duration:
                        # Look for patterns like "Jan 2020 - Mar 2022", "2018 - Present", etc.
                        match = re.search(r"([A-Za-z]{3,9} \d{4}|\d{4})\s*[-to]+\s*([A-Za-z]{3,9} \d{4}|\d{4}|Present|Current)", duration, re.IGNORECASE)
                        if match:
                            start_date = match.group(1)
                            end_date = match.group(2)
                        else:
                            # Try to split on dash or 'to'
                            if ' - ' in duration:
                                sd, ed = duration.split(' - ', 1)
                                start_date, end_date = sd.strip(), ed.strip()
                            elif ' to ' in duration:
                                sd, ed = duration.split(' to ', 1)
                                start_date, end_date = sd.strip(), ed.strip()
                    work_exp = WorkExperience(
                        candidate_id=candidate.candidate_id,
                        company=company,
                        position=position,
                        duration=duration,
                        start_date=start_date,
                        end_date=end_date
                    )
                    db.add(work_exp)

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

def categorize_skills(skills):
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
            "skill_category": skill_category.upper(),
            "proficiency_level": "intermediate" if skill_category == "technical" else "advanced"
        })
    
    return categorized_skills

@router.get("/{candidate_id}/view")
async def view_candidate_resume(candidate_id: int, db: Session = Depends(get_db)):
    """Get resume URL for a specific candidate"""
    try:
        candidate = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail=error_messages.get_error_message(404))
        
        if not candidate.resume_s3_url:
            raise HTTPException(status_code=404, detail="No resume found for this candidate")
        
        # Check if the URL might be expired
        # S3 presigned URLs typically contain an Expires parameter that we can check
        # For now, we'll just return the URL and let the frontend handle refresh if needed
        
        # For S3 URLs, you might want to check if the URL is still valid
        # This requires making a HEAD request to the URL, which might be expensive
        # For now, we'll just check if the URL exists and let the client handle refresh if needed
        
        return {
            "resume_url": candidate.resume_s3_url,
            "filename": candidate.original_filename or f"resume_{candidate_id}.pdf",
            "candidate_id": candidate_id
        }
    except Exception as e:
        logger.error(f"Error viewing resume for candidate {candidate_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to view resume: {str(e)}")

@router.post("/parse-text/")
async def parse_text(text: str = Form(...)):
    """Parse raw resume text and return structured data."""
    try:
        parsed_data = analyze_resume_content(text)
        return {"parsed_data": parsed_data}
    except Exception as e:
        logger.error(f"Error parsing text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse text: {str(e)}") 