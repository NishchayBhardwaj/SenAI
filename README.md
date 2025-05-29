# Resume Processing System

A comprehensive system for processing, analyzing, and shortlisting candidate resumes using advanced NLP and ML techniques.

## Overview

This system automates the resume processing workflow, from file upload to candidate shortlisting, using a combination of OCR, NLP, and LLM technologies. It provides a user-friendly interface for managing candidate data and implementing shortlisting criteria.

## Features

- **Multi-format Resume Processing**

  - Supports PDF, DOCX, and TXT files
  - OCR capabilities for scanned documents
  - Advanced text extraction using PyPDF2 and python-docx

- **Intelligent Data Extraction**

  - Extracts key candidate information:
    - Full Name
    - Email Address
    - Phone Number
    - Location
    - Education History
    - Work Experience
    - Skills
    - Years of Experience
  - Uses Groq's LLaMA-3 model for accurate information extraction
  - Implements OCR with Tesseract for scanned documents

- **Modern Web Interface**
  - Built with Streamlit for rapid prototyping
  - Real-time processing feedback
  - Clean and intuitive user experience

## Project Components

The application consists of three main components:

1. **Frontend** - A Next.js application that provides the user interface
2. **Backend** - A FastAPI-based service that processes resumes and manages candidates
3. **Auth Backend** - An Express.js service that handles authentication with Google OAuth

## Quick Start

### Using the Startup Script

The easiest way to run the entire application is to use the provided startup script:

#### On Linux/macOS:

```bash
# Make the script executable
chmod +x start-app.sh

# Run the application
./start-app.sh
```

#### On Windows:

```cmd
# Run the application
start-app.bat
```

The script will:

1. Check for required dependencies
2. Start all three components in the background
3. Provide URLs to access each service
4. Allow you to stop all services with Ctrl+C

### Accessing the Application

Once started, you can access the application at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Auth Backend: http://localhost:4000

**Important**: After first loading the application, you may need to refresh the page to ensure all services are properly connected.

## Technical Architecture

### Backend Components

- **File Processing**

  - PDF processing with PyPDF2
  - DOCX handling with python-docx
  - OCR processing with Tesseract
  - Image processing with Pillow

- **NLP & ML**

  - Text extraction and processing
  - Entity recognition with spaCy
  - Advanced parsing with NLTK
  - LLM integration with Groq

- **Database**
  - MySQL/PostgreSQL support
  - SQLAlchemy ORM
  - Structured schema for candidate data

### Frontend Components

- Next.js-based web interface
- Real-time processing status
- Interactive data visualization
- Responsive design

## Prerequisites

1. **Python Dependencies**

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Node.js Dependencies**

   ```bash
   # For the frontend
   cd frontend
   npm install

   # For the auth backend
   cd auth-backend
   npm install
   ```

3. **System Dependencies**

   - Tesseract OCR
   - Poppler (for PDF processing)

4. **Environment Setup**
   - Create `.env` file with required variables:
     ```
     GROQ_API_KEY=your_groq_api_key_here
     DATABASE_URL=your_database_connection_string
     GOOGLE_CLIENT_ID=your_google_client_id
     GOOGLE_CLIENT_SECRET=your_google_client_secret
     ```

## Database Setup

The application uses MySQL for data storage. You can set up the database using the provided `schema.sql` file:

```bash
# Create the database and tables
mysql -u your_username -p < schema.sql
```

### Database Schema

The database consists of the following tables:

1. **candidates** - Stores basic candidate information
2. **education** - Stores candidate education history
3. **skills** - Stores candidate skills with categories and proficiency levels
4. **work_experiences** - Stores candidate work history
5. **users** - Stores authenticated user information
6. **sessions** - Stores authentication sessions
7. **resume_batches** - Tracks batch processing of resumes

For the full schema details, please refer to the `schema.sql` file in the root directory.

## API Endpoints

- `POST /api/resumes/upload` - Upload and process resume files
- `GET /api/candidates` - Retrieve all candidates with pagination
- `GET /api/candidates/{id}` - Get specific candidate details
- `POST /api/candidates/shortlist` - Process shortlisting criteria
- `PUT /api/candidates/{id}/status` - Update candidate status
- `GET /api/dashboard/stats` - Get dashboard statistics

## Error Handling

The system implements comprehensive error handling for:

- File upload issues
- OCR processing errors
- Database connection problems
- API request failures
- Invalid input data

## Security Considerations

- Input validation and sanitization
- SQL injection prevention
- File upload security
- API key management
- Secure database connections

## Performance Optimization

- Database indexing
- Asynchronous file processing
- Caching mechanisms
- Efficient OCR processing
- Optimized database queries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Groq for LLM capabilities
- Tesseract OCR team
- Nextjs Team
- All open-source contributors

## Support

For support, please open an issue in the GitHub repository or contact the development team.
