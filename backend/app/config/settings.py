import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# API Settings
API_PREFIX = "/api"
API_VERSION = "1.0.0"
API_TITLE = "Resume Parser API"
API_DESCRIPTION = "API for parsing and analyzing resumes"

# Storage Settings
STORAGE_TYPE = os.getenv("STORAGE_TYPE", "local")  # 'local' or 's3'
LOCAL_STORAGE_PATH = os.getenv("LOCAL_STORAGE_PATH", str(BASE_DIR / "storage"))
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 10 * 1024 * 1024))  # 10MB default

# AWS Settings (only required if using S3)
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")

# Allowed file types and their MIME types
ALLOWED_FILE_TYPES = {
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain"
}

# Groq API Settings
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-70b-8192")

# OCR Settings
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "tesseract")
TESSERACT_LANG = os.getenv("TESSERACT_LANG", "eng")

# Logging Settings
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_FILE = os.getenv("LOG_FILE", str(BASE_DIR / "logs" / "app.log"))

# Security Settings
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]

# Create necessary directories
os.makedirs(LOCAL_STORAGE_PATH, exist_ok=True)
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

# Validate required settings
def validate_settings():
    """Validate required settings are present"""
    # Always required settings
    required_settings = {
        "GROQ_API_KEY": GROQ_API_KEY
    }
    
    # Add S3 settings only if using S3 storage
    if STORAGE_TYPE == "s3":
        required_settings.update({
            "AWS_ACCESS_KEY_ID": AWS_ACCESS_KEY_ID,
            "AWS_SECRET_ACCESS_KEY": AWS_SECRET_ACCESS_KEY,
            "AWS_BUCKET_NAME": AWS_BUCKET_NAME
        })
    
    missing_settings = [key for key, value in required_settings.items() if not value]
    
    if missing_settings:
        raise ValueError(f"Missing required settings: {', '.join(missing_settings)}")

# Validate settings on import
validate_settings() 