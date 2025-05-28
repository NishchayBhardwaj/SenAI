import os
import boto3
from datetime import datetime, timedelta
from dotenv import load_dotenv
import uuid
import logging
import io
import re
from typing import Tuple, Optional, Dict, Any
from botocore.exceptions import ClientError
from config.settings import (
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_BUCKET_NAME,
    MAX_FILE_SIZE,
    ALLOWED_FILE_TYPES
)
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StorageError(Exception):
    """Custom exception for storage-related errors"""
    pass

class FileStorage:
    def __init__(self):
        self.storage_type = os.getenv('STORAGE_TYPE', 'local')
        logger.info(f"Initializing FileStorage with type: {self.storage_type}")
        
        if self.storage_type == 's3':
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                    region_name=AWS_REGION
                )
                self.bucket_name = AWS_BUCKET_NAME
                logger.info("S3 client initialized successfully")
            except Exception as e:
                logger.error(f"Error initializing S3 client: {str(e)}")
                raise StorageError("Failed to initialize storage service")

    def _validate_file(self, file: io.BytesIO, file_extension: str) -> None:
        """Validate file type and size"""
        try:
            # Check file size
            file_size = len(file.getvalue())
            if file_size > MAX_FILE_SIZE:
                raise StorageError(f"File size exceeds maximum limit of {MAX_FILE_SIZE} bytes")

            # Validate file extension
            if file_extension.lower() not in ALLOWED_FILE_TYPES.keys():
                raise StorageError(f"Invalid file extension: {file_extension}")

            # Basic file content validation
            file_content = file.read(1024)  # Read first 1024 bytes
            file.seek(0)  # Reset file pointer

            # PDF validation
            if file_extension.lower() == 'pdf' and not file_content.startswith(b'%PDF-'):
                raise StorageError("Invalid PDF file format")

            # DOCX validation (ZIP file with specific structure)
            if file_extension.lower() == 'docx' and not file_content.startswith(b'PK\x03\x04'):
                raise StorageError("Invalid DOCX file format")

            # DOC validation (OLE2 format)
            if file_extension.lower() == 'doc' and not file_content.startswith(b'\xD0\xCF\x11\xE0'):
                raise StorageError("Invalid DOC file format")

        except Exception as e:
            logger.error(f"File validation error: {str(e)}")
            raise StorageError(f"File validation failed: {str(e)}")

    def _generate_secure_path(self, file_extension: str, original_filename: Optional[str] = None) -> str:
        """Generate a secure, unique file path"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())
        
        if original_filename:
            # Use original filename but sanitize it
            base_name = os.path.splitext(original_filename)[0]
            sanitized_name = self._sanitize_filename(base_name)
            return f"resumes/{sanitized_name}_{timestamp}_{unique_id}.{file_extension}"
        else:
            return f"resumes/{timestamp}_{unique_id}.{file_extension}"

    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and other security issues"""
        # Remove any path components
        filename = os.path.basename(filename)
        # Remove special characters and replace spaces with underscores
        sanitized = re.sub(r'[^a-zA-Z0-9\s-]', '', filename)
        sanitized = re.sub(r'\s+', '_', sanitized.strip())
        return sanitized.lower()

    async def save_file(self, file: io.BytesIO, file_extension: str, original_filename: Optional[str] = None) -> Tuple[str, bytes, str]:
        """Save file to storage and return the file path, content, and presigned URL"""
        try:
            # Validate file
            self._validate_file(file, file_extension)
            
            # Read file content
            file_content = file.read()
            file_obj = io.BytesIO(file_content)
            
            if self.storage_type == 's3':
                # Generate secure path
                file_path = self._generate_secure_path(file_extension, original_filename)
                
                try:
                    # Upload to S3 with encryption
                    self.s3_client.upload_fileobj(
                        file_obj,
                        self.bucket_name,
                        file_path,
                        ExtraArgs={
                            'ContentType': self._get_content_type(file_extension),
                            'ServerSideEncryption': 'AES256',
                            'Metadata': {
                                'original-filename': self._sanitize_filename(original_filename) if original_filename else 'unknown',
                                'upload-date': datetime.now().isoformat()
                            }
                        }
                    )
                    logger.info(f"File uploaded to S3: {file_path}")

                    # Generate presigned URL
                    presigned_url = self.generate_presigned_url(file_path)
                    
                    return f"s3://{self.bucket_name}/{file_path}", file_content, presigned_url

                except ClientError as e:
                    logger.error(f"S3 upload error: {str(e)}")
                    raise StorageError("Failed to upload file to storage")

            else:
                # Local storage logic
                file_path = os.path.join(
                    os.getenv('LOCAL_STORAGE_PATH', 'storage/resumes'),
                    self._generate_secure_path(file_extension, original_filename)
                )
                
                try:
                    os.makedirs(os.path.dirname(file_path), exist_ok=True)
                    with open(file_path, 'wb') as f:
                        f.write(file_content)
                    logger.info(f"File saved locally: {file_path}")
                    return file_path, file_content, file_path

                except Exception as e:
                    logger.error(f"Local storage error: {str(e)}")
                    raise StorageError("Failed to save file locally")

        except StorageError as se:
            raise se
        except Exception as e:
            logger.error(f"Unexpected error in save_file: {str(e)}")
            raise StorageError("An unexpected error occurred while saving the file")

    def generate_presigned_url(self, file_path: str, expiration: int = 86400) -> str:
        """Generate a presigned URL for temporary access to the file"""
        try:
            if self.storage_type == 's3':
                # Extract bucket and key from s3:// URL
                if file_path.startswith('s3://'):
                    bucket = file_path.split('/')[2]
                    key = '/'.join(file_path.split('/')[3:])
                else:
                    bucket = self.bucket_name
                    key = file_path

                response = self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': bucket,
                        'Key': key
                    },
                    ExpiresIn=expiration
                )
                return response
            else:
                # For local storage, return the file path
                return file_path

        except Exception as e:
            logger.error(f"Error generating presigned URL: {str(e)}")
            raise StorageError("Failed to generate presigned URL")

    def refresh_presigned_url(self, file_path: str, expiration: int = 86400) -> str:
        """Generate a fresh presigned URL for an existing file"""
        return self.generate_presigned_url(file_path, expiration)

    async def get_file(self, file_path: str) -> io.BytesIO:
        """Retrieve file from storage"""
        try:
            if self.storage_type == 's3':
                try:
                    # Extract bucket and key from s3:// URL
                    if file_path.startswith('s3://'):
                        bucket = file_path.split('/')[2]
                        key = '/'.join(file_path.split('/')[3:])
                    else:
                        bucket = self.bucket_name
                        key = file_path

                    # Add retries for S3 operations
                    max_retries = 3
                    retry_count = 0
                    last_error = None

                    while retry_count < max_retries:
                        try:
                            response = self.s3_client.get_object(
                                Bucket=bucket,
                                Key=key
                            )
                            logger.info(f"File retrieved from S3: {file_path}")
                            return io.BytesIO(response['Body'].read())
                        except ClientError as e:
                            error_code = e.response['Error']['Code']
                            if error_code == 'NoSuchKey':
                                raise StorageError(f"File does not exist in S3: {file_path}")
                            elif error_code in ['SlowDown', 'InternalError', 'ServiceUnavailable']:
                                last_error = e
                                retry_count += 1
                                if retry_count < max_retries:
                                    time.sleep(2 ** retry_count)  # Exponential backoff
                                continue
                            else:
                                raise StorageError(f"S3 error: {str(e)}")
                    
                    if last_error:
                        raise StorageError(f"Failed to retrieve file after {max_retries} retries: {str(last_error)}")

                except ClientError as e:
                    logger.error(f"S3 retrieval error: {str(e)}")
                    raise StorageError(f"Failed to retrieve file from storage: {str(e)}")

            else:
                try:
                    with open(file_path, 'rb') as f:
                        content = f.read()
                    logger.info(f"File retrieved from local storage: {file_path}")
                    return io.BytesIO(content)

                except FileNotFoundError:
                    raise StorageError(f"File not found in local storage: {file_path}")
                except Exception as e:
                    logger.error(f"Local storage retrieval error: {str(e)}")
                    raise StorageError(f"Failed to retrieve file from local storage: {str(e)}")

        except StorageError as se:
            raise se
        except Exception as e:
            logger.error(f"Unexpected error in get_file: {str(e)}")
            raise StorageError(f"An unexpected error occurred while retrieving the file: {str(e)}")

    async def delete_file(self, file_path: str) -> None:
        """Delete file from storage"""
        try:
            if self.storage_type == 's3':
                try:
                    # Extract bucket and key from s3:// URL
                    if file_path.startswith('s3://'):
                        bucket = file_path.split('/')[2]
                        key = '/'.join(file_path.split('/')[3:])
                    else:
                        bucket = self.bucket_name
                        key = file_path

                    self.s3_client.delete_object(
                        Bucket=bucket,
                        Key=key
                    )
                    logger.info(f"File deleted from S3: {file_path}")

                except ClientError as e:
                    logger.error(f"S3 deletion error: {str(e)}")
                    raise StorageError("Failed to delete file from storage")

            else:
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        logger.info(f"File deleted from local storage: {file_path}")

                except Exception as e:
                    logger.error(f"Local storage deletion error: {str(e)}")
                    raise StorageError("Failed to delete file from local storage")

        except StorageError as se:
            raise se
        except Exception as e:
            logger.error(f"Unexpected error in delete_file: {str(e)}")
            raise StorageError("An unexpected error occurred while deleting the file")

    def _get_content_type(self, file_extension: str) -> str:
        """Get content type based on file extension"""
        content_types = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain'
        }
        return content_types.get(file_extension.lower(), 'application/octet-stream') 