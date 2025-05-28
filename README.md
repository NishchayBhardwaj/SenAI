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

- Streamlit-based web interface
- Real-time processing status
- Interactive data visualization
- Responsive design

## Prerequisites

1. **Python Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

2. **System Dependencies**

   - Tesseract OCR
   - Poppler (for PDF processing)

3. **Environment Setup**
   - Create `.env` file with required variables:
     ```
     GROQ_API_KEY=your_groq_api_key_here
     DATABASE_URL=your_database_connection_string
     ```

## Installation

1. **Clone the Repository**

   ```bash
   git clone [repository-url]
   cd resume-processing-system
   ```

2. **Install Python Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Install System Dependencies**

   **Windows:**

   - Download and install Tesseract OCR from: https://github.com/UB-Mannheim/tesseract/wiki
   - Download Poppler from: https://github.com/oschwartz10612/poppler-windows/releases/
   - Add both to system PATH

   **Linux:**

   ```bash
   sudo apt-get install tesseract-ocr
   sudo apt-get install poppler-utils
   ```

   **Mac:**

   ```bash
   brew install tesseract
   brew install poppler
   ```

4. **Download NLP Models**

   ```bash
   python -m spacy download en_core_web_sm
   ```

5. **Initialize NLTK Data**
   ```python
   import nltk
   nltk.download('punkt')
   nltk.download('stopwords')
   nltk.download('averaged_perceptron_tagger')
   ```

## Usage

1. **Start the Application**

   ```bash
   streamlit run backend/app.py
   ```

2. **Access the Web Interface**

   - Open your browser and navigate to: http://localhost:8501

3. **Process Resumes**
   - Upload resume files (PDF, DOCX, TXT)
   - View extracted information
   - Apply shortlisting criteria
   - Review and manage candidates

## Database Schema

### Candidates Table

```sql
CREATE TABLE candidates (
    candidate_id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    location VARCHAR(255),
    years_experience INT,
    resume_file_path VARCHAR(255),
    status ENUM('pending', 'shortlisted', 'rejected'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Education Table

```sql
CREATE TABLE education (
    education_id INT PRIMARY KEY AUTO_INCREMENT,
    candidate_id INT,
    degree VARCHAR(255),
    institution VARCHAR(255),
    graduation_year INT,
    gpa DECIMAL(3,2),
    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id)
);
```

### Skills Table

```sql
CREATE TABLE skills (
    skill_id INT PRIMARY KEY AUTO_INCREMENT,
    candidate_id INT,
    skill_name VARCHAR(255),
    skill_category ENUM('technical', 'soft', 'language', 'other'),
    proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id)
);
```

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
- Streamlit team
- All open-source contributors

## Support

For support, please open an issue in the GitHub repository or contact the development team.
