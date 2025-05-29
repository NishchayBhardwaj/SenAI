import os
import logging
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Enum, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from dotenv import load_dotenv
import enum
import mysql.connector
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Database configuration
DB_USER = os.getenv('MYSQL_USER')
DB_PASSWORD = os.getenv('MYSQL_PASSWORD')
DB_HOST = os.getenv('MYSQL_HOST')
DB_PORT = os.getenv('MYSQL_PORT')
DB_NAME = os.getenv('MYSQL_DATABASE')

# Define Enums
class Status(enum.Enum):
    PENDING = "pending"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"

class SkillCategory(enum.Enum):
    TECHNICAL = "technical"
    SOFT = "soft"
    LANGUAGE = "language"
    OTHER = "other"

class ProficiencyLevel(enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"
    UNKNOWN = "unknown"

# Create database if it doesn't exist
def create_database_if_not_exists():
    try:
        # Connect to MySQL server without specifying database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )
        cursor = conn.cursor()
        
        # Create database if it doesn't exist
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
        cursor.close()
        conn.close()
        logger.info(f"Database '{DB_NAME}' created or already exists")
    except Exception as e:
        logger.error(f"Error creating database: {str(e)}")
        raise

# Create database if it doesn't exist
create_database_if_not_exists()

# Database URL for SQLAlchemy
DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

class Candidate(Base):
    __tablename__ = "candidates"

    candidate_id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True)
    phone = Column(String(50))
    location = Column(String(255))
    years_experience = Column(Integer)
    resume_file_path = Column(String(1000))  # S3 object key or path
    resume_s3_url = Column(String(1000))     # Full S3 URL or presigned URL
    original_filename = Column(String(255))  # Original filename for reference
    status = Column(Enum(Status), default=Status.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    education = relationship("Education", back_populates="candidate", cascade="all, delete-orphan")
    skills = relationship("Skill", back_populates="candidate", cascade="all, delete-orphan")
    work_experiences = relationship("WorkExperience", back_populates="candidate", cascade="all, delete-orphan")

class Education(Base):
    __tablename__ = "education"

    education_id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("candidates.candidate_id", ondelete="CASCADE"))
    degree = Column(String(255))
    institution = Column(String(255))
    graduation_year = Column(Integer)

    # Relationship
    candidate = relationship("Candidate", back_populates="education")

class Skill(Base):
    __tablename__ = "skills"

    skill_id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("candidates.candidate_id", ondelete="CASCADE"))
    skill_name = Column(String(255))
    skill_category = Column(Enum(SkillCategory), default=SkillCategory.TECHNICAL)
    proficiency_level = Column(Enum(ProficiencyLevel), default=ProficiencyLevel.UNKNOWN)

    # Relationship
    candidate = relationship("Candidate", back_populates="skills")

class WorkExperience(Base):
    __tablename__ = "work_experiences"

    experience_id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("candidates.candidate_id", ondelete="CASCADE"))
    company = Column(String(255))
    position = Column(String(255))
    start_date = Column(String(50))  # Storing as string since we may not have exact dates
    end_date = Column(String(50))    # Could be "Present" or a date
    duration = Column(String(100))   # e.g., "2 years 3 months"

    # Relationship
    candidate = relationship("Candidate", back_populates="work_experiences")

# Database operations functions
def get_db():
    """Get a database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Create all tables in the database"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise

def upsert_candidate_data(parsed_data, resume_file_path=None, resume_s3_url=None, original_filename=None):
    """
    Update or insert candidate data based on email uniqueness
    
    Args:
        parsed_data (dict): The parsed resume data
        resume_file_path (str, optional): Path or key to the resume in S3
        resume_s3_url (str, optional): Full S3 URL to the resume
        original_filename (str, optional): Original filename of the uploaded resume
    
    Returns:
        int: The ID of the inserted/updated candidate
    """
    db = SessionLocal()
    
    try:
        # Check if candidate exists by email
        existing_candidate = None
        if parsed_data.get('email'):
            existing_candidate = db.query(Candidate).filter(
                Candidate.email == parsed_data.get('email')
            ).first()
        
        if existing_candidate:
            # Update existing candidate
            existing_candidate.full_name = parsed_data.get('full_name', existing_candidate.full_name)
            existing_candidate.phone = parsed_data.get('phone', existing_candidate.phone)
            existing_candidate.location = parsed_data.get('location', existing_candidate.location)
            existing_candidate.years_experience = parsed_data.get('years_experience', existing_candidate.years_experience)
            existing_candidate.resume_file_path = resume_file_path or existing_candidate.resume_file_path
            existing_candidate.resume_s3_url = resume_s3_url or existing_candidate.resume_s3_url
            existing_candidate.original_filename = original_filename or existing_candidate.original_filename
            existing_candidate.updated_at = datetime.utcnow()
            
            # Delete existing related records
            db.query(Education).filter(Education.candidate_id == existing_candidate.candidate_id).delete()
            db.query(Skill).filter(Skill.candidate_id == existing_candidate.candidate_id).delete()
            db.query(WorkExperience).filter(WorkExperience.candidate_id == existing_candidate.candidate_id).delete()
            
            candidate = existing_candidate
        else:
            # Create new candidate
            candidate = Candidate(
                full_name=parsed_data.get('full_name', 'Unknown'),
                email=parsed_data.get('email'),
                phone=parsed_data.get('phone'),
                location=parsed_data.get('location'),
                years_experience=parsed_data.get('years_experience', 0),
                resume_file_path=resume_file_path,
                resume_s3_url=resume_s3_url,
                original_filename=original_filename,
                status=Status.PENDING
            )
            db.add(candidate)
        
        db.flush()  # Get the candidate_id
        
        # Add education entries
        for edu in parsed_data.get('education', []):
            graduation_year = None
            year_str = edu.get('year', '').strip()
            if year_str:
                try:
                    year_match = re.search(r'\b(19|20)\d{2}\b', year_str)
                    if year_match:
                        graduation_year = int(year_match.group())
                    else:
                        graduation_year = int(year_str)
                except (ValueError, TypeError):
                    graduation_year = None
            
            education = Education(
                candidate_id=candidate.candidate_id,
                degree=edu.get('degree'),
                institution=edu.get('institution'),
                graduation_year=graduation_year
            )
            db.add(education)
        
        # Add skills - handle both string list and dict list formats
        for skill_item in parsed_data.get('skills', []):
            if isinstance(skill_item, dict):
                # Dictionary format with category and proficiency
                skill_name = skill_item.get('skill_name', '')
                skill_category_str = skill_item.get('skill_category', 'technical').upper()
                proficiency_level_str = skill_item.get('proficiency_level', 'intermediate').upper()
                
                # Convert string to enum value
                try:
                    skill_category = SkillCategory[skill_category_str]
                except (KeyError, ValueError):
                    skill_category = SkillCategory.TECHNICAL
                
                try:
                    proficiency_level = ProficiencyLevel[proficiency_level_str]
                except (KeyError, ValueError):
                    proficiency_level = ProficiencyLevel.INTERMEDIATE
                
                skill = Skill(
                    candidate_id=candidate.candidate_id,
                    skill_name=skill_name,
                    skill_category=skill_category,
                    proficiency_level=proficiency_level
                )
            else:
                # String format (legacy)
                skill = Skill(
                    candidate_id=candidate.candidate_id,
                    skill_name=skill_item,
                    skill_category=SkillCategory.TECHNICAL,
                    proficiency_level=ProficiencyLevel.UNKNOWN
                )
            
            db.add(skill)
        
        # Add work experiences
        for exp in parsed_data.get('work_experience', []):
            work_exp = WorkExperience(
                candidate_id=candidate.candidate_id,
                company=exp.get('company'),
                position=exp.get('position'),
                duration=exp.get('duration'),
                start_date=exp.get('start_date', ''),
                end_date=exp.get('end_date', '')
            )
            db.add(work_exp)
        
        db.commit()
        return candidate.candidate_id
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error upserting candidate data: {e}")
        return None
    finally:
        db.close()

def save_candidate_data(parsed_data, resume_file_path=None, resume_s3_url=None, original_filename=None):
    """
    Save parsed resume data to database using upsert logic
    
    Args:
        parsed_data (dict): The parsed resume data
        resume_file_path (str, optional): Path or key to the resume in S3
        resume_s3_url (str, optional): Full S3 URL to the resume
        original_filename (str, optional): Original filename of the uploaded resume
    
    Returns:
        int: The ID of the inserted/updated candidate
    """
    return upsert_candidate_data(parsed_data, resume_file_path, resume_s3_url, original_filename)

def get_all_candidates(limit=100, status=None):
    """
    Get all candidates with optional filtering by status
    
    Args:
        limit (int): Maximum number of candidates to return
        status (Status, optional): Filter by candidate status
        
    Returns:
        list: List of candidate objects with relationships loaded
    """
    db = SessionLocal()
    try:
        query = db.query(Candidate)
        
        if status:
            query = query.filter(Candidate.status == status)
        
        candidates = query.limit(limit).all()
        
        # Load relationships explicitly to avoid lazy loading issues
        for candidate in candidates:
            _ = candidate.skills
            _ = candidate.education
            _ = candidate.work_experiences
            
        return candidates
    except Exception as e:
        logger.error(f"Error fetching candidates: {str(e)}")
        raise
    finally:
        db.close()

def shortlist_candidate(candidate_id):
    """
    Mark a candidate as shortlisted
    
    Args:
        candidate_id (int): The ID of the candidate to shortlist
        
    Returns:
        bool: True if successful, False otherwise
    """
    db = SessionLocal()
    try:
        candidate = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
        if candidate:
            candidate.status = Status.SHORTLISTED
            candidate.updated_at = datetime.utcnow()
            db.commit()
            return True
        return False
    except Exception as e:
        db.rollback()
        logger.error(f"Error shortlisting candidate: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    # Initialize the database when run directly
    init_db() 