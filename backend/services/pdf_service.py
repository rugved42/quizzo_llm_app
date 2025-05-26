import fitz
import os
import logging
from PyPDF2 import PdfReader
from typing import List, Dict
import json

logger = logging.getLogger(__name__)

class PDFService:
    def __init__(self):
        self.upload_dir = os.path.join(os.getcwd(), 'uploads')
        os.makedirs(self.upload_dir, exist_ok=True)

    def extract_text_from_pdf(self, file_path: str) -> Dict[str, str]:
        """Extract text from PDF and split into chapters."""
        try:
            reader = PdfReader(file_path)
            chapters = {}
            current_chapter = "Introduction"
            current_text = ""

            for page in reader.pages:
                text = page.extract_text()
                # Simple chapter detection - can be improved
                if "Chapter" in text[:100]:
                    if current_text:
                        chapters[current_chapter] = current_text.strip()
                    current_chapter = text.split('\n')[0]
                    current_text = ""
                current_text += text + "\n"

            if current_text:
                chapters[current_chapter] = current_text.strip()

            return chapters
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            return None

    def generate_questions(self, text: str) -> List[Dict]:
        """Generate simple questions from text."""
        try:
            # Split text into sentences
            sentences = text.split('. ')
            questions = []
            
            # Generate a question for every 3rd sentence
            for i in range(0, len(sentences), 3):
                if i + 2 < len(sentences):
                    context = sentences[i:i+3]
                    question = {
                        'question': f"Based on the text: {' '.join(context)}",
                        'correct_answer': context[1],
                        'options': [
                            context[1],
                            context[0],
                            context[2] if len(context) > 2 else "None of the above",
                            "None of the above"
                        ],
                        'difficulty': 'medium'
                    }
                    questions.append(question)
            
            return questions
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            return []

    def _parse_questions_from_text(self, text: str) -> List[Dict]:
        """Parse questions from plain text format as fallback."""
        questions = []
        current_question = None
        current_options = []
        
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            if line.startswith(('1.', '2.', '3.', '4.', '5.')):
                if current_question:
                    questions.append({
                        'question': current_question,
                        'options': current_options,
                        'correct_answer': current_options[0],  # Assuming first option is correct
                        'difficulty': 'medium'
                    })
                current_question = line[2:].strip()
                current_options = []
            elif line.startswith(('a)', 'b)', 'c)', 'd)')):
                current_options.append(line[2:].strip())
        
        if current_question:
            questions.append({
                'question': current_question,
                'options': current_options,
                'correct_answer': current_options[0],
                'difficulty': 'medium'
            })
        
        return questions 