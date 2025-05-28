from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Enum, ForeignKey, DECIMAL, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv
import mysql.connector

# Load environment variables
load_dotenv()

# Database configuration
DB_USER = os.getenv('MYSQL_USER')
DB_PASSWORD = os.getenv('MYSQL_PASSWORD')
DB_HOST = os.getenv('MYSQL_HOST')
DB_PORT = os.getenv('MYSQL_PORT')
DB_NAME = os.getenv('MYSQL_DATABASE')

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
        print(f"Database '{DB_NAME}' created or already exists")
    except Exception as e:
        print(f"Error creating database: {str(e)}")
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

# Define models
class Candidate(Base):
    __tablename__ = "candidates"

    candidate_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True)
    phone = Column(String(50))
    location = Column(String(255))
    years_experience = Column(Integer)
    resume_file_path = Column(String(255))
    status = Column(Enum('pending', 'shortlisted', 'rejected', name='candidate_status'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    education = relationship("Education", back_populates="candidate")
    skills = relationship("Skill", back_populates="candidate")

class Education(Base):
    __tablename__ = "education"

    education_id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.candidate_id"))
    degree = Column(String(255))
    institution = Column(String(255))
    graduation_year = Column(Integer)
    gpa = Column(DECIMAL(3, 2))

    # Relationship
    candidate = relationship("Candidate", back_populates="education")

class Skill(Base):
    __tablename__ = "skills"

    skill_id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.candidate_id"))
    skill_name = Column(String(255))
    skill_category = Column(Enum('technical', 'soft', 'language', 'other', name='skill_category'))
    proficiency_level = Column(Enum('beginner', 'intermediate', 'advanced', 'expert', name='proficiency_level'))

    # Relationship
    candidate = relationship("Candidate", back_populates="skills")

# Create all tables
def create_tables():
    try:
        Base.metadata.create_all(bind=engine)
        print("All tables created successfully")
    except Exception as e:
        print(f"Error creating tables: {str(e)}")
        raise

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 