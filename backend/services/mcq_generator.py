import fitz  # PyMuPDF
import json
import os
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain, SequentialChain
from langchain_community.callbacks import get_openai_callback
from dotenv import load_dotenv
import re

load_dotenv()

def split_text_into_chunks(text, max_chunk_size=4000):
    """Split text into chunks of approximately max_chunk_size characters."""
    chunks = []
    current_chunk = ""
    
    paragraphs = text.split('\n\n')
    
    for paragraph in paragraphs:
        if len(current_chunk) + len(paragraph) > max_chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
            if len(paragraph) > max_chunk_size:
                sentences = paragraph.split('. ')
                current_chunk = ""
                for sentence in sentences:
                    if len(current_chunk) + len(sentence) > max_chunk_size:
                        if current_chunk:
                            chunks.append(current_chunk.strip())
                        current_chunk = sentence
                    else:
                        if current_chunk:
                            current_chunk += ". "
                        current_chunk += sentence
            else:
                current_chunk = paragraph
        else:
            if current_chunk:
                current_chunk += "\n\n"
            current_chunk += paragraph
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

class MCQGenerator:
    RESPONSE_JSON = {
        "1": {
            "mcq": "multiple choice question",
            "options": [
                "First option",
                "Second option",
                "Third option",
                "Fourth option"
            ],
            "correct": "First option",
        },
        "2": {
            "mcq": "multiple choice question",
            "options": [
                "First option",
                "Second option",
                "Third option",
                "Fourth option"
            ],
            "correct": "First option",
        }
    }

    def __init__(self):
        self.KEY = os.getenv("OPENAI_API_KEY")
        if not self.KEY:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
            
        self.llm = ChatOpenAI(
            api_key=self.KEY,
            model="gpt-3.5-turbo",
            temperature=0.5
        )
        self._setup_chains()

    def _setup_chains(self):
        TEMPLATE = """
        Text:{text}
        You are an expert MCQ maker. Given the above text, it is your job to create a quiz of {number} multiple choice questions for {subject} students in {tone} tone. 
        Make sure the questions are not repeated and check all the questions to be conforming the text as well.
        Make sure to format your response like RESPONSE_JSON below and use it as a guide. 
        Ensure to make {number} MCQs
        Each question must have exactly 4 options.
        The correct answer must be one of the options.
        Format the options as an array of strings, not as an object.
        ### RESPONSE_JSON
        {response_json}
        """

        TEMPLATE2 = """
        You are an expert english grammarian and writer. Given a Multiple Choice Quiz for {subject} students. 
        You need to evaluate the complexity of the question and give a complete analysis of the quiz. Only use at max 50 words for complexity analysis. 
        If the quiz is not at par with the cognitive and analytical abilities of the students, 
        update the quiz questions which need to be changed and change the tone such that it perfectly fits the student abilities.
        Quiz_MCQs:
        {quiz}

        Check from an expert English Writer of the above quiz:
        """

        self.quiz_generation_prompt = PromptTemplate(
            input_variables=["text", "number", "subject", "tone", "response_json"],
            template=TEMPLATE
        )

        self.quiz_evaluation_prompt = PromptTemplate(
            input_variables=["subject", "quiz"],
            template=TEMPLATE2
        )

        self.quiz_chain = LLMChain(
            llm=self.llm,
            prompt=self.quiz_generation_prompt,
            output_key="quiz",
            verbose=False
        )

        self.review_chain = LLMChain(
            llm=self.llm,
            prompt=self.quiz_evaluation_prompt,
            output_key="review",
            verbose=False
        )

        self.generate_evaluate_chain = SequentialChain(
            chains=[self.quiz_chain, self.review_chain],
            input_variables=["text", "number", "subject", "tone", "response_json"],
            output_variables=["quiz", "review"],
            verbose=False,
        )

    def _process_chunk(self, text, number_of_questions, subject, tone, retry_count=0):
        """Process a single chunk of text and generate questions."""
        try:
            # Map tone to difficulty level
            difficulty_map = {
                'easy': 'easy',
                'moderate': 'medium',
                'hard': 'hard'
            }
            difficulty = difficulty_map.get(tone.lower(), 'medium')

            with get_openai_callback() as cb:
                response = self.generate_evaluate_chain({
                    "text": text,
                    "number": number_of_questions,
                    "subject": subject,
                    "tone": tone,
                    "response_json": json.dumps(self.RESPONSE_JSON)
                })

            quiz = response.get("quiz")
            review = response.get("review")

            start_index = quiz.find("{")
            if start_index != -1:
                quiz = quiz[start_index:]
            
            quiz_data = json.loads(quiz)
            
            formatted_questions = []
            for key, value in quiz_data.items():
                options = value["options"]
                if isinstance(options, dict):
                    options = [options.get(k, "") for k in ['a', 'b', 'c', 'd']]
                elif not isinstance(options, list):
                    options = []

                question = {
                    "question": value["mcq"],
                    "options": options,
                    "correct_answer": value["correct"],
                    "difficulty": difficulty  # Use the mapped difficulty
                }
                formatted_questions.append(question)

            return formatted_questions, review

        except Exception as e:
            error_msg = str(e)
            if "context_length_exceeded" in error_msg and retry_count < 3:
                sub_chunks = split_text_into_chunks(text, max_chunk_size=2000)
                all_questions = []
                all_reviews = []
                
                for sub_chunk in sub_chunks:
                    sub_questions, sub_review = self._process_chunk(
                        sub_chunk,
                        max(1, number_of_questions // len(sub_chunks)),
                        subject,
                        tone,
                        retry_count + 1
                    )
                    if sub_questions:
                        all_questions.extend(sub_questions)
                    if sub_review:
                        all_reviews.append(sub_review)
                
                return all_questions, "\n\n".join(all_reviews) if all_reviews else None
            return [], None

    def _select_best_questions(self, all_questions, target_count):
        """Select the best questions from all generated questions."""
        if len(all_questions) <= target_count:
            return all_questions

        questions_text = "\n".join([f"{i+1}. {q['question']}" for i, q in enumerate(all_questions)])
        selection_prompt = f"""
        Given the following {len(all_questions)} questions, select the best {target_count} questions that:
        1. Are most relevant to the subject
        2. Have clear and unambiguous answers
        3. Cover different aspects of the topic
        4. Are well-formulated and grammatically correct

        Questions:
        {questions_text}

        Please provide ONLY the numbers of the {target_count} best questions, separated by commas.
        For example: 1, 3, 5, 7, 9
        """

        try:
            response = self.llm.invoke(selection_prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            numbers = re.findall(r'\d+', response_text)
            selected_indices = list(set([int(num) - 1 for num in numbers if num.isdigit()]))
            valid_indices = [idx for idx in selected_indices if 0 <= idx < len(all_questions)]
            
            if not valid_indices:
                return all_questions[:target_count]
                
            if len(valid_indices) > target_count:
                valid_indices = valid_indices[:target_count]
            elif len(valid_indices) < target_count:
                remaining = target_count - len(valid_indices)
                additional_indices = [i for i in range(len(all_questions)) if i not in valid_indices][:remaining]
                valid_indices.extend(additional_indices)
            
            return [all_questions[i] for i in valid_indices]

        except Exception:
            return all_questions[:target_count]

    def generate_mcqs_from_text(self, text, number_of_questions, subject, tone):
        """Generate MCQs directly from text by processing it in chunks."""
        try:
            chunks = split_text_into_chunks(text)
            all_questions = []
            all_reviews = []
            questions_per_chunk = max(1, number_of_questions // len(chunks))

            for chunk in chunks:
                chunk_questions, chunk_review = self._process_chunk(
                    chunk,
                    questions_per_chunk,
                    subject,
                    tone
                )
                
                if chunk_questions:
                    all_questions.extend(chunk_questions)
                if chunk_review:
                    all_reviews.append(chunk_review)

            if not all_questions:
                raise Exception("No questions could be generated from any chunk")

            selected_questions = self._select_best_questions(all_questions, number_of_questions)

            return {
                "questions": selected_questions,
                "review": "\n\n".join(all_reviews) if all_reviews else "No review available"
            }

        except Exception as e:
            raise

    def generate_mcqs(self, pdf_file, number_of_questions, subject, tone):
        """Generate MCQs from a PDF file."""
        try:
            pdf_text = ""
            doc = fitz.open(stream=pdf_file.read(), filetype="pdf")
            for page in doc:
                pdf_text += page.get_text()

            return self.generate_mcqs_from_text(pdf_text, number_of_questions, subject, tone)

        except Exception as e:
            raise 