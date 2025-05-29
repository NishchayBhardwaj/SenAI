import io
import unittest
import pytest
from unittest.mock import patch, MagicMock
from services.resume_processor import (
    process_file_content,
    analyze_resume_content,
    ResumeProcessingError
)

class TestResumeProcessor(unittest.TestCase):
    
    def setUp(self):
        # Sample resume content for testing
        self.sample_resume = """
        John Doe
        john.doe@example.com
        (123) 456-7890
        San Francisco, CA

        Education:
        - Bachelor of Science, Computer Science, Stanford University, 2018

        Experience:
        - Software Engineer, Google, 2018-2020
        - Senior Software Engineer, Microsoft, 2020-Present

        Skills: Python, Java, JavaScript, React, Machine Learning
        """
        
    @patch('services.resume_processor.process_pdf_content')
    def test_process_pdf_file(self, mock_process_pdf):
        mock_process_pdf.return_value = self.sample_resume
        file = io.BytesIO(b"mock pdf content")
        result = process_file_content(file, "pdf")
        self.assertEqual(result, self.sample_resume)
        mock_process_pdf.assert_called_once_with(file)
    
    @patch('services.resume_processor.groq_client.chat.completions.create')
    def test_analyze_resume_content(self, mock_chat_completion):
        # Mock the Groq API response
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content="""
                    ## Full Name
                    John Doe

                    ## Email Address
                    john.doe@example.com

                    ## Phone Number
                    (123) 456-7890

                    ## Location
                    San Francisco, CA

                    ## Education
                    - Bachelor of Science, Computer Science, Stanford University, 2018

                    ## Work Experience
                    - Software Engineer, Google, 2018-2020
                    - Senior Software Engineer, Microsoft, 2020-Present

                    ## Skills
                    Python, Java, JavaScript, React, Machine Learning

                    ## Years of Experience
                    4
                    """
                )
            )
        ]
        mock_chat_completion.return_value = mock_response
        
        result = analyze_resume_content(self.sample_resume)
        
        self.assertEqual(result['Full Name'], 'John Doe')
        self.assertEqual(result['Email Address'], 'john.doe@example.com')
        self.assertEqual(result['Phone Number'], '(123) 456-7890')
        self.assertEqual(result['Location'], 'San Francisco, CA')
        self.assertIn('Python', result['Skills'])
        self.assertEqual(result['Years of Experience'], 4)
    
    def test_invalid_content_validation(self):
        # Test with empty content
        file = io.BytesIO(b"")
        with self.assertRaises(ResumeProcessingError):
            process_file_content(file, "txt")
        
        # Test with non-alphabetic content
        file = io.BytesIO(b"12345678901234567890")
        with self.assertRaises(ResumeProcessingError):
            process_file_content(file, "txt")

if __name__ == '__main__':
    unittest.main() 