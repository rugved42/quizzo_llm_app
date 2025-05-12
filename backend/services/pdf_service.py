import os
from PyPDF2 import PdfReader
from typing import List, Dict
import json

class PDFService:
    def __init__(self):
        self.upload_dir = os.path.join(os.getcwd(), 'uploads')
        os.makedirs(self.upload_dir, exist_ok=True)

    def extract_text_from_pdf(self, file_path: str) -> Dict[str, str]:
        """Extract text from PDF and split into chapters."""
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

    def generate_questions(self, chapter_text: str, num_questions: int = 5) -> List[Dict]:
        """Generate simple multiple choice questions based on the text."""
        # Split text into sentences
        sentences = [s.strip() for s in chapter_text.split('.') if len(s.strip()) > 50]
        
        questions = []
        for i, sentence in enumerate(sentences[:num_questions]):
            # Create a simple question from the sentence
            question = {
                "id": i + 1,
                "text": f"What is the main topic of this sentence: '{sentence[:100]}...'?",
                "options": [
                    "Topic A",
                    "Topic B",
                    "Topic C",
                    "Topic D"
                ],
                "correct_answer": "Topic A",
                "difficulty": "medium"
            }
            questions.append(question)
        
        return questions

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