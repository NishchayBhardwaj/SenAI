import os
import boto3
from datetime import datetime
from dotenv import load_dotenv
import uuid
import logging
import io
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class FileStorage:
    def __init__(self):
        self.storage_type = os.getenv('STORAGE_TYPE', 'local')  # 'local' or 's3'
        logger.info(f"Initializing FileStorage with type: {self.storage_type}")
        
        if self.storage_type == 's3':
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                    region_name=os.getenv('AWS_REGION')
                )
                self.bucket_name = os.getenv('AWS_BUCKET_NAME')
                logger.info("S3 client initialized successfully")
            except Exception as e:
                logger.error(f"Error initializing S3 client: {str(e)}")
                raise
        else:
            # Create local storage directory if it doesn't exist
            self.local_storage_path = os.getenv('LOCAL_STORAGE_PATH', 'storage/resumes')
            try:
                os.makedirs(self.local_storage_path, exist_ok=True)
                logger.info(f"Local storage directory created/verified at: {self.local_storage_path}")
            except Exception as e:
                logger.error(f"Error creating local storage directory: {str(e)}")
                raise

    def _get_next_resume_number(self, candidate_name):
        """Get the next resume number for a candidate"""
        try:
            # List all objects in the candidate's directory
            prefix = f"resumes/{candidate_name}/"
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            # Get the highest resume number
            max_number = 0
            if 'Contents' in response:
                for obj in response['Contents']:
                    # Extract number from filename (e.g., "Resume_1.pdf" -> 1)
                    match = re.search(r'Resume_(\d+)\.', obj['Key'])
                    if match:
                        number = int(match.group(1))
                        max_number = max(max_number, number)
            
            return max_number + 1
        except Exception as e:
            logger.error(f"Error getting next resume number: {str(e)}")
            return 1  # Default to 1 if there's an error

    def _sanitize_name(self, name):
        """Sanitize candidate name for use in file path"""
        # Remove special characters and replace spaces with underscores
        sanitized = re.sub(r'[^a-zA-Z0-9\s-]', '', name)
        sanitized = re.sub(r'\s+', '_', sanitized.strip())
        return sanitized.lower()

    def save_file(self, file, file_extension, candidate_name=None):
        """Save file to storage and return the file path and content"""
        try:
            # Read file content first
            file_content = file.read()
            # Create a new file-like object from the content
            file_obj = io.BytesIO(file_content)
            
            if self.storage_type == 's3':
                # Sanitize candidate name if provided
                if candidate_name:
                    sanitized_name = self._sanitize_name(candidate_name)
                    # Get next resume number for this candidate
                    resume_number = self._get_next_resume_number(sanitized_name)
                    filename = f"Resume_{resume_number}.{file_extension}"
                    file_path = f"resumes/{sanitized_name}/{filename}"
                else:
                    # Fallback to timestamp-based naming if no candidate name
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    unique_id = str(uuid.uuid4())[:8]
                    filename = f"{timestamp}_{unique_id}.{file_extension}"
                    file_path = f"resumes/{filename}"
                
                logger.info(f"Generated filename: {filename}")
                
                try:
                    self.s3_client.upload_fileobj(
                        file_obj,
                        self.bucket_name,
                        file_path,
                        ExtraArgs={'ContentType': self._get_content_type(file_extension)}
                    )
                    logger.info(f"File uploaded to S3: {file_path}")
                    return f"s3://{self.bucket_name}/{file_path}", file_content
                except Exception as e:
                    logger.error(f"Error uploading to S3: {str(e)}")
                    raise
            else:
                # Local storage logic
                if candidate_name:
                    sanitized_name = self._sanitize_name(candidate_name)
                    candidate_dir = os.path.join(self.local_storage_path, sanitized_name)
                    os.makedirs(candidate_dir, exist_ok=True)
                    
                    # Get next resume number
                    existing_files = [f for f in os.listdir(candidate_dir) if f.startswith('Resume_')]
                    max_number = 0
                    for f in existing_files:
                        match = re.search(r'Resume_(\d+)\.', f)
                        if match:
                            max_number = max(max_number, int(match.group(1)))
                    resume_number = max_number + 1
                    
                    filename = f"Resume_{resume_number}.{file_extension}"
                    file_path = os.path.join(candidate_dir, filename)
                else:
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    unique_id = str(uuid.uuid4())[:8]
                    filename = f"{timestamp}_{unique_id}.{file_extension}"
                    file_path = os.path.join(self.local_storage_path, filename)
                
                try:
                    with open(file_path, 'wb') as f:
                        f.write(file_content)
                    logger.info(f"File saved locally: {file_path}")
                    return file_path, file_content
                except Exception as e:
                    logger.error(f"Error saving file locally: {str(e)}")
                    raise
        except Exception as e:
            logger.error(f"Error in save_file: {str(e)}")
            raise

    def get_file(self, file_path):
        """Retrieve file from storage"""
        try:
            if self.storage_type == 's3':
                # Get from S3
                bucket = file_path.split('/')[2]
                key = '/'.join(file_path.split('/')[3:])
                try:
                    response = self.s3_client.get_object(Bucket=bucket, Key=key)
                    logger.info(f"File retrieved from S3: {file_path}")
                    return response['Body']
                except Exception as e:
                    logger.error(f"Error retrieving from S3: {str(e)}")
                    raise
            else:
                # Get from local storage
                try:
                    file = open(file_path, 'rb')
                    logger.info(f"File retrieved from local storage: {file_path}")
                    return file
                except Exception as e:
                    logger.error(f"Error retrieving from local storage: {str(e)}")
                    raise
        except Exception as e:
            logger.error(f"Error in get_file: {str(e)}")
            raise

    def delete_file(self, file_path):
        """Delete file from storage"""
        try:
            if self.storage_type == 's3':
                # Delete from S3
                bucket = file_path.split('/')[2]
                key = '/'.join(file_path.split('/')[3:])
                try:
                    self.s3_client.delete_object(Bucket=bucket, Key=key)
                    logger.info(f"File deleted from S3: {file_path}")
                except Exception as e:
                    logger.error(f"Error deleting from S3: {str(e)}")
                    raise
            else:
                # Delete from local storage
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        logger.info(f"File deleted from local storage: {file_path}")
                except Exception as e:
                    logger.error(f"Error deleting from local storage: {str(e)}")
                    raise
        except Exception as e:
            logger.error(f"Error in delete_file: {str(e)}")
            raise

    def _get_content_type(self, file_extension):
        """Get content type based on file extension"""
        content_types = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain'
        }
        return content_types.get(file_extension.lower(), 'application/octet-stream') 