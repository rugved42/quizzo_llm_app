from flask import Flask, request, jsonify, send_from_directory, Request
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
from services.pdf_service import PDFService
from models.models import db, Textbook, Chapter, Question, Quiz, QuizResult, Student, QuizQuestion
import uuid
from services.mcq_generator import MCQGenerator
import json
from flask_jwt_extended import jwt_required, get_jwt_identity, JWTManager, create_access_token
from dotenv import load_dotenv
import bcrypt
import fitz
import io
import logging
from datetime import datetime, timedelta
from sqlalchemy import inspect
import openai
from langchain.prompts import PromptTemplate
from langchain.chains.llm import LLMChain
from langchain.chat_models import ChatOpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type", "Authorization"],
        "max_age": 3600
    }
})

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/quizzes.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
db.init_app(app)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize services
pdf_service = PDFService()
mcq_generator = MCQGenerator()

load_dotenv()

# Configure JWT
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
jwt = JWTManager(app)

# User Routes
@app.route('/api/user/results/<string:student_id>', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_student_results(student_id):
    logger.info("="*50)
    logger.info(f"GET STUDENT RESULTS REQUEST RECEIVED for student_id: {student_id}")
    logger.info(f"Request Method: {request.method}")
    logger.info(f"Request Headers: {dict(request.headers)}")
    
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 200

    try:
        # Get the current user from JWT token
        current_user = get_jwt_identity()
        logger.info(f"Current user from JWT: {current_user}")
        logger.info(f"Requested student_id: {student_id}")
        
        # Verify the requesting user matches the student_id
        if current_user != student_id:
            logger.error(f"Unauthorized access attempt. Current user: {current_user}, Requested student: {student_id}")
            return jsonify({'error': 'Unauthorized access'}), 403

        # Get student to verify they exist
        student = Student.query.filter_by(student_id=student_id).first()
        if not student:
            logger.error(f"Student not found with ID: {student_id}")
            return jsonify({'error': 'Student not found'}), 404
            
        logger.info(f"Found student: {student.name} (ID: {student.student_id})")
        
        # Get quiz results
        results = QuizResult.query.filter_by(student_id=student_id).all()
        logger.info(f"Found {len(results)} quiz results for student")
        
        # Log each result for debugging
        for r in results:
            logger.info(f"Result ID: {r.id}, Quiz ID: {r.quiz_id}, Score: {r.score}")
        
        response_data = [{
            'id': r.id,
            'quiz_id': r.quiz_id,
            'score': r.score,
            'answers': r.answers,
            'question_times': r.question_times,
            'submitted_at': r.submitted_at.isoformat() if r.submitted_at else None
        } for r in results]
        
        logger.info(f"Prepared response data: {response_data}")
        
        response = jsonify(response_data)
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        logger.info("Successfully returning quiz results")
        logger.info("="*50)
        return response, 200
        
    except Exception as e:
        logger.error("="*50)
        logger.error(f"Error in get_student_results: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error("="*50)
        
        response = jsonify({'error': str(e)})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 500

@app.route('/api/user/<string:student_id>', methods=['GET'])
@jwt_required()
def get_student(student_id):
    # Verify the requesting user matches the student_id
    current_user = get_jwt_identity()
    if current_user != student_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    student = Student.query.filter_by(student_id=student_id).first()
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    results = QuizResult.query.filter_by(student_id=student_id).all()
    
    return jsonify({
        'id': student.id,
        'name': student.name,
        'email': student.email,
        'quiz_results': [{
            'id': r.id,
            'quiz_id': r.quiz_id,
            'score': r.score,
            'time_taken': r.time_taken,
            'submitted_at': r.submitted_at.isoformat() if r.submitted_at else None
        } for r in results]
    })

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return jsonify({"message": "Welcome to Quiz Maker API"})

@app.route('/api/auth/register', methods=['POST', 'OPTIONS'])
def register_student():
    logger.info("="*50)
    logger.info("REGISTRATION REQUEST RECEIVED")
    logger.info(f"Request Method: {request.method}")
    logger.info(f"Request Headers: {dict(request.headers)}")
    logger.info(f"Request Content Type: {request.content_type}")
    logger.info(f"Request Data: {request.get_data()}")
    
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        return '', 200

    try:
        logger.info("Processing registration request")
        if not request.is_json:
            logger.error("Request is not JSON")
            logger.error(f"Content Type: {request.content_type}")
            return jsonify({"error": "Request must be JSON"}), 400
            
        data = request.get_json()
        logger.info(f"Parsed JSON data: {data}")
        
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        logger.info(f"Extracted fields - Name: {name}, Email: {email}, Password: {'*' * len(password) if password else None}")

        if not name or not email or not password:
            logger.error(f"Missing required fields - Name: {bool(name)}, Email: {bool(email)}, Password: {bool(password)}")
            return jsonify({"error": "Name, email, and password are required"}), 400

        if '@' not in email or '.' not in email:
            logger.error(f"Invalid email format: {email}")
            return jsonify({"error": "Invalid email format"}), 400

        # Check if student already exists
        existing_student = Student.query.filter_by(email=email).first()
        if existing_student:
            logger.error(f"Email already registered: {email}")
            return jsonify({"error": "Email already registered"}), 400

        logger.info("Creating new student record")
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        logger.info("Password hashed successfully")

        # Generate a new UUID for the student
        student_id = str(uuid.uuid4())
        logger.info(f"Generated student ID: {student_id}")

        student = Student(
            name=name.strip(),
            email=email.strip(),
            password=hashed_password.decode('utf-8'),
            student_id=student_id
        )
        logger.info(f"Student object created with ID: {student.student_id}")
        
        db.session.add(student)
        logger.info("Student added to session")
        
        try:
            db.session.commit()
            logger.info("Database commit successful")
            
            # Verify the student was created
            created_student = Student.query.filter_by(student_id=student_id).first()
            if not created_student:
                raise Exception("Student was not found in database after creation")
            logger.info(f"Verified student creation - ID: {created_student.student_id}")
                
        except Exception as db_error:
            logger.error(f"Database commit failed: {str(db_error)}")
            db.session.rollback()
            raise

        # Create access token for the new user
        try:
            access_token = create_access_token(identity=student_id)
            logger.info("Access token created successfully")
        except Exception as token_error:
            logger.error(f"Token creation failed: {str(token_error)}")
            raise

        response = jsonify({
            "message": "Registration successful",
            "student_id": student_id,
            "access_token": access_token,
            "name": student.name,
            "email": student.email
        })
        
        logger.info("Registration successful, sending response")
        logger.info("="*50)
        return response, 201

    except Exception as e:
        logger.error("="*50)
        logger.error(f"Registration error: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error("="*50)
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def login():
    logger.info("="*50)
    logger.info("LOGIN REQUEST RECEIVED")
    logger.info(f"Request Method: {request.method}")
    logger.info(f"Request Headers: {dict(request.headers)}")
    logger.info(f"Request Content Type: {request.content_type}")
    logger.info(f"Request Data: {request.get_data()}")
    
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        return '', 200

    try:
        logger.info("Processing login request")
        if not request.is_json:
            logger.error("Request is not JSON")
            logger.error(f"Content Type: {request.content_type}")
            return jsonify({"error": "Request must be JSON"}), 400
            
        data = request.get_json()
        logger.info(f"Parsed JSON data: {data}")
        
        email = data.get('email')
        password = data.get('password')

        logger.info(f"Login attempt for email: {email}")

        if not email or not password:
            logger.error("Missing email or password")
            return jsonify({"error": "Email and password are required"}), 400

        user = Student.query.filter_by(email=email).first()
        
        if not user:
            logger.error(f"User not found: {email}")
            return jsonify({"error": "Invalid email or password"}), 401

        if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
            logger.error(f"Invalid password for user: {email}")
            return jsonify({"error": "Invalid email or password"}), 401

        logger.info(f"Login successful for user: {email}")
        access_token = create_access_token(identity=user.student_id)
        logger.info("Access token created successfully")
        
        response = jsonify({
            "access_token": access_token,
            "student_id": user.student_id,
            "name": user.name,
            "email": user.email
        })
        
        logger.info("Sending successful login response")
        logger.info("="*50)
        return response, 200

    except Exception as e:
        logger.error("="*50)
        logger.error(f"Login error: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error("="*50)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/auth/check', methods=['GET', 'OPTIONS'])
@jwt_required()
def check_auth():
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    try:
        current_user = get_jwt_identity()
        user = Student.query.filter_by(student_id=current_user).first()
        
        if not user:
            return jsonify({"isAuthenticated": False}), 401

        response = jsonify({
            "isAuthenticated": True,
            "student_id": user.student_id,
            "name": user.name,
            "email": user.email
        })
        
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        return response, 200

    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        return jsonify({"isAuthenticated": False}), 401

@app.route('/api/auth/logout', methods=['POST', 'OPTIONS'])
def logout():
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    response = jsonify({"message": "Logged out successfully"})
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response, 200

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
@jwt_required()
def upload_file():
    logger.info("="*50)
    logger.info("UPLOAD REQUEST RECEIVED")
    logger.info(f"Request Method: {request.method}")
    logger.info(f"Request Headers: {dict(request.headers)}")

    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Content-Length, X-Requested-With'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    try:
        # Get the student ID from the JWT token
        student_id = get_jwt_identity()
        logger.info(f"Student ID from token: {student_id}")

        # Verify student exists
        student = Student.query.filter_by(student_id=student_id).first()
        if not student:
            logger.error(f"Student not found for ID: {student_id}")
            return jsonify({"error": "Student not found"}), 404

        if 'file' not in request.files:
            logger.error("No file part in request")
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            logger.error("No selected file")
            return jsonify({"error": "No selected file"}), 400
        
        if not file or not allowed_file(file.filename):
            logger.error(f"Invalid file type: {file.filename}")
            return jsonify({"error": "File type not allowed. Only PDF files are accepted."}), 400

        # Get parameters from form data
        number_of_questions = int(request.form.get('numberOfQuestions', 10))
        subject = request.form.get('subject', 'General')
        tone = request.form.get('tone', 'moderate')

        # Map tone to difficulty level
        difficulty_map = {
            'easy': 'easy',
            'moderate': 'medium',
            'hard': 'hard'
        }
        difficulty = difficulty_map.get(tone.lower(), 'medium')
        logger.info(f"Mapped tone '{tone}' to difficulty '{difficulty}'")

        filename = secure_filename(file.filename)
        title = os.path.splitext(filename)[0]

        # Check if student already has a textbook with this title
        existing_textbook = Textbook.query.filter_by(
            title=title,
            student_id=student_id
        ).first()

        if existing_textbook:
            logger.info(f"Student already has a textbook with title: {title}")
            # Generate a unique filename by adding timestamp
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            filename = f"{title}_{timestamp}.pdf"
            title = f"{title} ({timestamp})"

        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # Ensure upload directory exists
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

        try:
            file.save(filepath)
            logger.info(f"File saved successfully at: {filepath}")

            # Create textbook entry with student_id
            textbook = Textbook(
                title=title,
                file_path=filepath,
                student_id=student_id
            )
            db.session.add(textbook)
            db.session.commit()

            # Generate questions using MCQGenerator
            logger.info("Generating questions using MCQGenerator")
            result = mcq_generator.generate_mcqs(
                pdf_file=open(filepath, 'rb'),
                number_of_questions=number_of_questions,
                subject=subject,
                tone=tone
            )

            if not result or not result.get('questions'):
                logger.error("No questions generated")
                raise Exception("Failed to generate questions from PDF")

            # Create a single chapter for all questions
            chapter = Chapter(
                title=f"{subject} Questions",
                number=1,
                textbook_id=textbook.id
            )
            db.session.add(chapter)
            db.session.commit()
            
            # Add questions to the chapter
            for q in result['questions']:
                question = Question(
                    text=q['question'],
                    correct_answer=q['correct_answer'],
                    options=q['options'],
                    difficulty=difficulty,  # Use the mapped difficulty
                    chapter_id=chapter.id
                )
                db.session.add(question)
            
            db.session.commit()
            
            # Create a single quiz with all questions
            quiz = Quiz(
                title=f"{title} - {difficulty.capitalize()} Level Quiz",
                chapter_id=chapter.id,
                textbook_id=textbook.id,
                difficulty=difficulty,  # Use the mapped difficulty
                time_limit=30  # 30 minutes per quiz
            )
            db.session.add(quiz)
            db.session.commit()

            # Add all questions to the quiz
            questions = Question.query.filter_by(chapter_id=chapter.id).all()
            for i, question in enumerate(questions):
                quiz_question = QuizQuestion(
                    quiz_id=quiz.id,
                    question_id=question.id,
                    order=i + 1
                )
                db.session.add(quiz_question)

            db.session.commit()
            logger.info(f"Successfully created quiz with difficulty: {difficulty}")

            response = jsonify({
                "message": "PDF processed successfully",
                "textbook_id": textbook.id,
                "chapters": 1,
                "questions_generated": len(result['questions']),
                "quiz_created": {
                    'id': quiz.id,
                    'title': quiz.title,
                    'difficulty': quiz.difficulty,
                    'question_count': len(questions)
                },
                "review": result.get('review', 'No review available'),
                "subject": subject,
                "tone": tone,
                "difficulty": difficulty,
                "title": title
            })
            response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response, 201

        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            db.session.rollback()
            if os.path.exists(filepath):
                os.remove(filepath)
            error_response = jsonify({"error": str(e)})
            error_response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            error_response.headers['Access-Control-Allow-Credentials'] = 'true'
            return error_response, 500

    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        error_response = jsonify({"error": "Internal server error"})
        error_response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        error_response.headers['Access-Control-Allow-Credentials'] = 'true'
        return error_response, 500

@app.route('/api/textbooks', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_textbooks():
    logger.info("="*50)
    logger.info("GET TEXTBOOKS REQUEST RECEIVED")
    logger.info(f"Request Method: {request.method}")
    logger.info(f"Request Headers: {dict(request.headers)}")
    
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 200

    try:
        # Get the student ID from the JWT token
        student_id = get_jwt_identity()
        logger.info(f"Student ID from token: {student_id}")

        # Get all textbooks for this student
        textbooks = Textbook.query.filter_by(student_id=student_id).all()
        logger.info(f"Found {len(textbooks)} textbooks for student {student_id}")
        
        textbook_data = [{
            "id": t.id,
            "title": t.title,
            "question_count": sum(len(chapter.questions) for chapter in t.chapters),
            "created_at": t.created_at.isoformat() if t.created_at else None
        } for t in textbooks]
        
        logger.info(f"Prepared textbook data: {textbook_data}")
        
        response = jsonify(textbook_data)
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        logger.info("Successfully returning textbooks")
        logger.info("="*50)
        return response, 200
        
    except Exception as e:
        logger.error("="*50)
        logger.error(f"Error in get_textbooks: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error("="*50)
        
        response = jsonify({'error': str(e)})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 500

@app.route('/api/textbooks/<int:textbook_id>/create-quiz', methods=['POST', 'OPTIONS'])
@jwt_required()
def create_textbook_quiz(textbook_id):
    logger.info("="*50)
    logger.info(f"CREATE QUIZ REQUEST RECEIVED for textbook_id: {textbook_id}")
    logger.info(f"Request Method: {request.method}")
    logger.info(f"Request Headers: {dict(request.headers)}")
    
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    try:
        # Get the student ID from the JWT token
        student_id = get_jwt_identity()
        logger.info(f"Student ID from token: {student_id}")

        # Get request data
        data = request.get_json()
        logger.info(f"Received request data: {data}")
        
        number_of_questions = int(data.get('numberOfQuestions', 10))
        difficulty = data.get('difficulty', 'moderate')
        logger.info(f"Requested parameters - Questions: {number_of_questions}, Difficulty: {difficulty}")

        # Get the textbook
        textbook = Textbook.query.get_or_404(textbook_id)
        logger.info(f"Found textbook: {textbook.title}")

        # Verify the textbook belongs to the student
        if textbook.student_id != student_id:
            logger.error(f"Unauthorized access attempt. Student: {student_id}, Textbook owner: {textbook.student_id}")
            return jsonify({"error": "Unauthorized access"}), 403

        # Get existing questions to avoid duplicates
        existing_questions = Question.query.join(Chapter).filter(Chapter.textbook_id == textbook_id).all()
        existing_question_texts = {q.text.lower().strip() for q in existing_questions}
        logger.info(f"Found {len(existing_questions)} existing questions to avoid")

        # Map difficulty to tone
        difficulty_map = {
            'easy': 'easy',
            'moderate': 'moderate',
            'hard': 'hard'
        }
        tone = difficulty_map.get(difficulty.lower(), 'moderate')
        logger.info(f"Mapped difficulty '{difficulty}' to tone '{tone}'")

        # Generate new questions using MCQGenerator
        logger.info("Generating new questions using MCQGenerator")
        max_attempts = 3
        attempt = 0
        new_questions = []

        # Ensure the file exists
        if not os.path.exists(textbook.file_path):
            logger.error(f"Textbook file not found: {textbook.file_path}")
            return jsonify({"error": "Textbook file not found"}), 404

        while attempt < max_attempts and len(new_questions) < number_of_questions:
            try:
                with open(textbook.file_path, 'rb') as pdf_file:
                    result = mcq_generator.generate_mcqs(
                        pdf_file=pdf_file,
                        number_of_questions=number_of_questions * 2,  # Generate more questions to have a better selection
                        subject=textbook.title.split()[0],  # Extract subject from textbook title
                        tone=tone
                    )

                if not result or not result.get('questions'):
                    logger.error("No questions generated")
                    raise Exception("Failed to generate questions from PDF")

                # Filter out questions that are too similar to existing ones
                for q in result['questions']:
                    question_text = q['question'].lower().strip()
                    if question_text not in existing_question_texts:
                        new_questions.append(q)
                        existing_question_texts.add(question_text)
                        if len(new_questions) >= number_of_questions:
                            break

            except Exception as e:
                logger.error(f"Error generating questions on attempt {attempt + 1}: {str(e)}")
                attempt += 1
                continue

            attempt += 1

        if len(new_questions) < number_of_questions:
            logger.warning(f"Could only generate {len(new_questions)} unique questions after {max_attempts} attempts")
            return jsonify({"error": "Could not generate enough unique questions"}), 500

        # Create a new chapter for the questions
        chapter = Chapter(
            title=f"{textbook.title} - {difficulty.capitalize()} Level Questions",
            number=len(textbook.chapters) + 1,
            textbook_id=textbook.id
        )
        db.session.add(chapter)
        db.session.commit()

        # Create new questions
        created_questions = []
        for q in new_questions[:number_of_questions]:  # Only use the number of questions we need
            question = Question(
                text=q['question'],
                correct_answer=q['correct_answer'],
                options=q['options'],
                difficulty=difficulty,
                chapter_id=chapter.id
            )
            db.session.add(question)
            created_questions.append(question)
        
        db.session.commit()

        # Create a new quiz
        new_quiz = Quiz(
            title=f"{textbook.title} - {difficulty.capitalize()} Level Assessment",
            chapter_id=chapter.id,
            textbook_id=textbook.id,
            difficulty=difficulty,
            time_limit=30  # 30 minutes per quiz
        )
        db.session.add(new_quiz)
        db.session.commit()

        # Add questions to the new quiz
        for i, question in enumerate(created_questions):
            quiz_question = QuizQuestion(
                quiz_id=new_quiz.id,
                question_id=question.id,
                order=i + 1
            )
            db.session.add(quiz_question)

        db.session.commit()
        logger.info(f"Successfully created new quiz with ID: {new_quiz.id}")

        response = jsonify({
            "message": "Quiz created successfully",
            "quiz_id": new_quiz.id,
            "title": new_quiz.title,
            "difficulty": new_quiz.difficulty,
            "question_count": len(created_questions)
        })
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 201

    except Exception as e:
        logger.error("="*50)
        logger.error(f"Error creating quiz: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error("="*50)
        db.session.rollback()
        error_response = jsonify({"error": str(e)})
        error_response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        error_response.headers['Access-Control-Allow-Credentials'] = 'true'
        return error_response, 500

@app.route('/quizzes/<quiz_id>/questions', methods=['GET'])
def get_quiz_questions(quiz_id):
    try:
        quiz = Quiz.query.get_or_404(quiz_id)
        questions = []
        
        # Get questions through QuizQuestion relationship
        for quiz_question in quiz.questions:
            question = quiz_question.question
            questions.append({
                "id": question.id,
                "text": question.text,
                "options": question.options,
                "correct_answer": question.correct_answer
            })
        
        return jsonify(questions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/submit-quiz', methods=['POST'])
def submit_quiz():
    try:
        data = request.json
        quiz_id = data.get('quiz_id')
        student_id = data.get('student_id')
        answers = data.get('answers', {})
        question_times = data.get('question_times', {})
        
        # Get all questions for the quiz
        quiz = Quiz.query.get_or_404(quiz_id)
        questions = [q.question for q in quiz.questions]
        if not questions:
            return jsonify({"error": "No questions found for this quiz"}), 404
        
        # Calculate score
        total_questions = len(questions)
        correct_answers = 0
        question_results = []
        
        for question in questions:
            student_answers = answers.get(str(question.id), [])
            # Convert student answers to a set for comparison
            student_answers_set = set(student_answers)
            # Convert correct answer to a set (in case it's a string or list)
            correct_answer_set = set([question.correct_answer] if isinstance(question.correct_answer, str) else question.correct_answer)
            
            # Check if all correct answers are selected and no incorrect ones
            is_correct = student_answers_set == correct_answer_set
            if is_correct:
                correct_answers += 1
                
            question_results.append({
                "question_id": question.id,
                "question_text": question.text,
                "student_answers": student_answers,
                "correct_answer": question.correct_answer,
                "is_correct": is_correct,
                "time_spent": question_times.get(str(question.id), 0) if question_times else 0
            })
        
        score = (correct_answers / total_questions) * 100
        
        # Calculate total time taken
        total_time_taken = sum(question_times.values()) if question_times else 0

        # Save result
        result = QuizResult(
            quiz_id=quiz_id,
            student_id=student_id,
            score=score,
            answers=answers,
            question_times=question_times or {}
        )
        db.session.add(result)
        db.session.commit()
        
        response_data = {
            "result_id": result.id,
            "score": score,
            "total_questions": total_questions,
            "correct_answers": correct_answers,
            "question_results": question_results,
            "time_taken": total_time_taken,
            "submitted_at": result.submitted_at.isoformat() if result.submitted_at else None,
            "questions": [
                {
                    "id": q["question_id"],
                    "text": q["question_text"],
                    "options": Question.query.get(q["question_id"]).options,
                    "correct_answer": q["correct_answer"],
                    "user_answer": q["student_answers"][0] if isinstance(q["student_answers"], list) else q["student_answers"]
                } for q in question_results
            ]
        }

        return jsonify(response_data), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/results/<result_id>', methods=['GET'])
def get_result(result_id):
    try:
        result = QuizResult.query.get_or_404(result_id)
        
        # Get the quiz questions
        quiz = Quiz.query.get(result.quiz_id)
        questions = [q.question for q in quiz.questions]
        
        question_results = []
        for question in questions:
            student_answers = result.answers.get(str(question.id), [])
            correct_answer_set = set([question.correct_answer] if isinstance(question.correct_answer, str) else question.correct_answer)
            student_answers_set = set(student_answers)
            
            question_results.append({
                "question_id": question.id,
                "question_text": question.text,
                "student_answers": student_answers,
                "correct_answer": question.correct_answer,
                "is_correct": student_answers_set == correct_answer_set,
                "time_spent": result.question_times.get(str(question.id), 0)
            })
        
        return jsonify({
            "result_id": result.id,
            "score": result.score,
            "total_questions": len(questions),
            "correct_answers": sum(1 for q in question_results if q["is_correct"]),
            "question_results": question_results
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-mcqs', methods=['POST', 'OPTIONS'])
def generate_mcqs():
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
        
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.endswith('.pdf'):
            return jsonify({'error': 'File must be a PDF'}), 400

        number_of_questions = int(request.form.get('numberOfQuestions', 5))
        subject = request.form.get('subject', 'General')
        tone = request.form.get('tone', 'moderate')

        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        pdf_text = extract_text_from_pdf(filepath)
        if not pdf_text:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'error': 'Could not extract text from the PDF. The file might be corrupted or password-protected.'}), 400

        text_chunks = split_text_into_chunks(pdf_text)
        if not text_chunks:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'error': 'No readable text content found in the PDF.'}), 400

        mcq_generator = MCQGenerator()
        all_questions = []
        all_reviews = []

        questions_per_chunk = max(1, number_of_questions // len(text_chunks))
        remaining_questions = number_of_questions

        for chunk in text_chunks:
            if remaining_questions <= 0:
                break

            current_chunk_questions = min(questions_per_chunk, remaining_questions)
            
            try:
                chunk_text = f"Chunk {len(all_questions) + 1} of {len(text_chunks)}:\n\n{chunk}"
                
                result = mcq_generator.generate_mcqs_from_text(
                    text=chunk_text,
                    number_of_questions=current_chunk_questions,
                    subject=subject,
                    tone=tone
                )
                
                if result and result.get('questions'):
                    all_questions.extend(result['questions'])
                    if result.get('review'):
                        all_reviews.append(result['review'])
                    remaining_questions -= len(result['questions'])
                
            except Exception as e:
                logger.error(f"Error processing chunk: {str(e)}")
                continue

        if not all_questions:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'error': 'No questions could be generated from the PDF. The content might not be suitable for question generation.'}), 400

        textbook = Textbook(
            title=os.path.splitext(filename)[0],
            file_path=filepath
        )
        db.session.add(textbook)
        db.session.commit()

        chapter = Chapter(
            title="Generated Questions",
            number=1,
            textbook_id=textbook.id
        )
        db.session.add(chapter)
        db.session.commit()

        for q in all_questions:
            question = Question(
                text=q['question'],
                correct_answer=q['correct_answer'],
                options=q['options'],
                difficulty='medium',
                chapter_id=chapter.id
            )
            db.session.add(question)
        
        db.session.commit()

        cleanup_empty_textbooks()

        response = jsonify({
            'message': 'MCQs generated successfully',
            'textbook_id': textbook.id,
            'chapters': 1,
            'review': "\n\n".join(all_reviews) if all_reviews else "No review available"
        })
        
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        return response, 201

    except Exception as e:
        logger.error(f"Error generating MCQs: {str(e)}")
        db.session.rollback()
        if 'filepath' in locals() and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception as del_e:
                logger.error(f"Error deleting file {filepath}: {str(del_e)}")
        
        error_response = jsonify({'error': 'Internal server error'})
        error_response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        error_response.headers['Access-Control-Allow-Credentials'] = 'true'
        return error_response, 500

def cleanup_empty_textbooks():
    """Remove textbooks that have no questions."""
    try:
        empty_textbooks = []
        for textbook in Textbook.query.all():
            has_questions = False
            for chapter in textbook.chapters:
                if chapter.questions:
                    has_questions = True
                    break
            if not has_questions:
                empty_textbooks.append(textbook)
        
        for textbook in empty_textbooks:
            logger.info(f"Cleaning up empty textbook: {textbook.title} (ID: {textbook.id})")
            # Delete associated chapters and questions
            for chapter in textbook.chapters:
                Question.query.filter_by(chapter_id=chapter.id).delete()
                db.session.delete(chapter)
            
            # Delete the file if it exists
            if os.path.exists(textbook.file_path):
                try:
                    os.remove(textbook.file_path)
                    logger.info(f"Deleted file: {textbook.file_path}")
                except Exception as e:
                    logger.error(f"Error deleting file {textbook.file_path}: {str(e)}")
            
            # Delete the textbook
            db.session.delete(textbook)
            logger.info(f"Deleted textbook: {textbook.title}")
        
        db.session.commit()
        logger.info(f"Cleaned up {len(empty_textbooks)} empty textbooks")
    except Exception as e:
        logger.error(f"Error cleaning up empty textbooks: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        db.session.rollback()

def split_text_into_chunks(text, max_chunk_size=10000):
    """Split text into chunks of approximately max_chunk_size characters."""
    chunks = []
    current_chunk = ""
    
    # Split by paragraphs first
    paragraphs = text.split('\n\n')
    
    for paragraph in paragraphs:
        # If adding this paragraph would exceed the chunk size, save current chunk and start new one
        if len(current_chunk) + len(paragraph) > max_chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = paragraph
        else:
            if current_chunk:
                current_chunk += "\n\n"
            current_chunk += paragraph
    
    # Add the last chunk if it's not empty
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

@app.route('/api/quizzes', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_quizzes():
    logger.info("="*50)
    logger.info("GET QUIZZES REQUEST RECEIVED")
    logger.info(f"Request Method: {request.method}")
    logger.info(f"Request Headers: {dict(request.headers)}")
    
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        return '', 200

    try:
        # Get the student ID from the JWT token
        student_id = get_jwt_identity()
        logger.info(f"Student ID from token: {student_id}")

        # Verify student exists
        student = Student.query.filter_by(student_id=student_id).first()
        if not student:
            logger.error(f"Student not found for ID: {student_id}")
            return jsonify({"error": "Student not found"}), 404

        # Get all textbooks for this student
        textbooks = Textbook.query.filter_by(student_id=student_id).all()
        logger.info(f"Found {len(textbooks)} textbooks for student {student_id}")
        
        # Organize quizzes by textbook
        quiz_list = []
        for textbook in textbooks:
            textbook_quizzes = {
                "textbook_id": textbook.id,
                "textbook_title": textbook.title,
                "quizzes": []
            }
            
            # Get all quizzes for this textbook
            quizzes = Quiz.query.filter_by(textbook_id=textbook.id).all()
            logger.info(f"Found {len(quizzes)} quizzes for textbook {textbook.id}")
            
            # Add all quizzes directly to the list
            for quiz in quizzes:
                quiz_data = {
                    "id": quiz.id,
                    "title": quiz.title,
                    "difficulty": quiz.difficulty,
                    "time_limit": quiz.time_limit,
                    "created_at": quiz.created_at.isoformat() if quiz.created_at else None,
                    "question_count": len(quiz.questions)
                }
                textbook_quizzes["quizzes"].append(quiz_data)
            
            quiz_list.append(textbook_quizzes)
        
        logger.info(f"Returning quizzes for {len(quiz_list)} textbooks")
        logger.info(f"Response data: {quiz_list}")
        return jsonify(quiz_list), 200

    except Exception as e:
        logger.error("="*50)
        logger.error(f"Error getting quizzes: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error("="*50)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/quizzes/<int:quiz_id>', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_quiz(quiz_id):
    logger.info("="*50)
    logger.info(f"GET QUIZ REQUEST RECEIVED for quiz_id: {quiz_id}")
    logger.info(f"Request Method: {request.method}")
    logger.info(f"Request Headers: {dict(request.headers)}")
    
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    try:
        # Get the student ID from the JWT token
        student_id = get_jwt_identity()
        logger.info(f"Student ID from token: {student_id}")

        # Verify student exists
        student = Student.query.filter_by(student_id=student_id).first()
        if not student:
            logger.error(f"Student not found for ID: {student_id}")
            return jsonify({"error": "Student not found"}), 404

        # Get the quiz
        quiz = Quiz.query.get_or_404(quiz_id)
        logger.info(f"Found quiz: {quiz.id}")
        
        # Get the textbook for this quiz
        textbook = Textbook.query.join(Chapter).filter(Chapter.id == quiz.chapter_id).first()
        logger.info(f"Found textbook: {textbook.title if textbook else 'None'}")
        
        # Get questions for this quiz
        questions = []
        for quiz_question in quiz.questions:
            # Get the actual question from the Question model
            question = Question.query.get(quiz_question.question_id)
            if question:
                questions.append({
                    "id": question.id,
                    "text": question.text,
                    "options": question.options,
                    "correct_answer": question.correct_answer
                })
        
        logger.info(f"Found {len(questions)} questions for quiz {quiz_id}")
        
        quiz_data = {
            "id": quiz.id,
            "title": quiz.title,
            "textbook_title": textbook.title if textbook else "Unknown Textbook",
            "time_limit": quiz.time_limit,
            "created_at": quiz.created_at.isoformat() if quiz.created_at else None,
            "questions": questions
        }
        
        logger.info(f"Successfully retrieved quiz {quiz_id}")
        response = jsonify(quiz_data)
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 200

    except Exception as e:
        logger.error("="*50)
        logger.error(f"Error getting quiz: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error("="*50)
        error_response = jsonify({"error": "Internal server error"})
        error_response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        error_response.headers['Access-Control-Allow-Credentials'] = 'true'
        return error_response, 500

@app.route('/api/quizzes/<int:quiz_id>/submit', methods=['POST', 'OPTIONS'])
@jwt_required()
def submit_quiz_answers(quiz_id):
    logger.info("="*50)
    logger.info(f"SUBMIT QUIZ REQUEST RECEIVED for quiz_id: {quiz_id}")
    logger.info(f"Request Method: {request.method}")
    logger.info(f"Request Headers: {dict(request.headers)}")
    
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    try:
        # Get the student ID from the JWT token
        student_id = get_jwt_identity()
        logger.info(f"Student ID from token: {student_id}")

        # Verify student exists
        student = Student.query.filter_by(student_id=student_id).first()
        if not student:
            logger.error(f"Student not found for ID: {student_id}")
            return jsonify({"error": "Student not found"}), 404

        # Get the quiz
        quiz = Quiz.query.get_or_404(quiz_id)
        logger.info(f"Found quiz: {quiz.id}")

        # Get request data
        data = request.get_json()
        logger.info(f"Received answers: {data}")
        
        if not data or 'answers' not in data:
            logger.error("No answers provided in request")
            return jsonify({"error": "No answers provided"}), 400

        answers = data['answers']
        question_times = data.get('question_times', {})

        # Calculate score
        total_questions = len(quiz.questions)
        correct_answers = 0
        question_results = []

        for quiz_question in quiz.questions:
            question = Question.query.get(quiz_question.question_id)
            if not question:
                continue

            student_answer = answers.get(str(question.id))
            is_correct = student_answer == question.correct_answer
            if is_correct:
                correct_answers += 1

            question_results.append({
                "question_id": question.id,
                "question_text": question.text,
                "student_answer": student_answer,
                "correct_answer": question.correct_answer,
                "is_correct": is_correct,
                "time_spent": question_times.get(str(question.id), 0),
                "options": question.options
            })

        # Calculate score as a percentage
        score = (correct_answers / total_questions) * 100 if total_questions > 0 else 0

        # Calculate total time taken in seconds
        total_time_taken = sum(question_times.values()) if question_times else 0

        # Save result
        result = QuizResult(
            quiz_id=quiz_id,
            student_id=student_id,
            score=score,
            answers=answers,
            question_times=question_times
        )
        db.session.add(result)
        db.session.commit()

        logger.info(f"Quiz submitted successfully. Score: {score}%")
        
        response_data = {
            "result_id": result.id,
            "score": score,
            "total_questions": total_questions,
            "correct_answers": correct_answers,
            "time_taken": total_time_taken,
            "submitted_at": result.submitted_at.isoformat() if result.submitted_at else None,
            "questions": question_results
        }

        response = jsonify(response_data)
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 200

    except Exception as e:
        logger.error("="*50)
        logger.error(f"Error submitting quiz: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error("="*50)
        db.session.rollback()
        error_response = jsonify({"error": "Internal server error"})
        error_response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        error_response.headers['Access-Control-Allow-Credentials'] = 'true'
        return error_response, 500

@app.route('/api/quizzes/<int:quiz_id>/regenerate', methods=['POST', 'OPTIONS'])
@jwt_required()
def regenerate_quiz(quiz_id):
    logger.info("="*50)
    logger.info(f"REGENERATE QUIZ REQUEST RECEIVED for quiz_id: {quiz_id}")
    logger.info(f"Request Method: {request.method}")
    logger.info(f"Request Headers: {dict(request.headers)}")
    
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    try:
        # Get the student ID from the JWT token
        student_id = get_jwt_identity()
        logger.info(f"Student ID from token: {student_id}")

        # Get request data
        data = request.get_json()
        new_difficulty = data.get('difficulty', 'moderate')
        logger.info(f"New difficulty requested: {new_difficulty}")

        # Get the original quiz
        original_quiz = Quiz.query.get_or_404(quiz_id)
        logger.info(f"Found original quiz: {original_quiz.id}")

        # Get the textbook and chapter
        textbook = Textbook.query.get(original_quiz.textbook_id)
        chapter = Chapter.query.get(original_quiz.chapter_id)
        
        if not textbook or not chapter:
            logger.error("Textbook or chapter not found")
            return jsonify({"error": "Textbook or chapter not found"}), 404

        # Map tone to difficulty level
        difficulty_map = {
            'easy': 'easy',
            'moderate': 'medium',
            'hard': 'hard'
        }
        difficulty = difficulty_map.get(new_difficulty.lower(), 'medium')
        logger.info(f"Mapped difficulty '{new_difficulty}' to '{difficulty}'")

        # Get existing questions to avoid duplicates
        existing_questions = Question.query.filter_by(chapter_id=chapter.id).all()
        existing_question_texts = {q.text.lower().strip() for q in existing_questions}
        logger.info(f"Found {len(existing_questions)} existing questions to avoid")

        # Generate new questions using MCQGenerator
        logger.info("Generating new questions using MCQGenerator")
        max_attempts = 3
        attempt = 0
        new_questions = []

        while attempt < max_attempts and len(new_questions) < len(original_quiz.questions):
            result = mcq_generator.generate_mcqs(
                pdf_file=open(textbook.file_path, 'rb'),
                number_of_questions=len(original_quiz.questions) * 2,  # Generate more questions to have a better selection
                subject=chapter.title.split()[0],  # Extract subject from chapter title
                tone=new_difficulty
            )

            if not result or not result.get('questions'):
                logger.error("No questions generated")
                raise Exception("Failed to generate questions from PDF")

            # Filter out questions that are too similar to existing ones
            for q in result['questions']:
                question_text = q['question'].lower().strip()
                if question_text not in existing_question_texts:
                    new_questions.append(q)
                    existing_question_texts.add(question_text)
                    if len(new_questions) >= len(original_quiz.questions):
                        break

            attempt += 1

        if len(new_questions) < len(original_quiz.questions):
            logger.warning(f"Could only generate {len(new_questions)} unique questions after {max_attempts} attempts")
            return jsonify({"error": "Could not generate enough unique questions"}), 500

        # Create new questions
        created_questions = []
        for q in new_questions[:len(original_quiz.questions)]:  # Only use the number of questions we need
            question = Question(
                text=q['question'],
                correct_answer=q['correct_answer'],
                options=q['options'],
                difficulty=difficulty,
                chapter_id=chapter.id
            )
            db.session.add(question)
            created_questions.append(question)
        
        db.session.commit()

        # Create a new quiz
        new_quiz = Quiz(
            title=f"{textbook.title} - {difficulty.capitalize()} Level Assessment (Regenerated)",
            chapter_id=chapter.id,
            textbook_id=textbook.id,
            difficulty=difficulty,
            time_limit=original_quiz.time_limit
        )
        db.session.add(new_quiz)
        db.session.commit()

        # Add questions to the new quiz
        for i, question in enumerate(created_questions):
            quiz_question = QuizQuestion(
                quiz_id=new_quiz.id,
                question_id=question.id,
                order=i + 1
            )
            db.session.add(quiz_question)

        db.session.commit()
        logger.info(f"Successfully created new quiz with ID: {new_quiz.id}")

        response = jsonify({
            "message": "Quiz regenerated successfully",
            "quiz_id": new_quiz.id,
            "title": new_quiz.title,
            "difficulty": new_quiz.difficulty,
            "question_count": len(created_questions)
        })
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 201

    except Exception as e:
        logger.error("="*50)
        logger.error(f"Error regenerating quiz: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error("="*50)
        db.session.rollback()
        error_response = jsonify({"error": "Internal server error"})
        error_response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        error_response.headers['Access-Control-Allow-Credentials'] = 'true'
        return error_response, 500

@app.route('/api/generate-live-quiz', methods=['POST', 'OPTIONS'])
def generate_live_quiz():
    if request.method == 'OPTIONS':
        return '', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true'
        }
    
    try:
        data = request.get_json()
        topic = data.get('topic')
        difficulty = data.get('difficulty', 'medium')
        used_questions = data.get('used_questions', [])
        
        if not topic:
            return jsonify({'error': 'Topic is required'}), 400, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Credentials': 'true'
            }

        # Create a prompt that avoids used questions
        prompt = PromptTemplate(
            input_variables=["topic", "difficulty", "used_questions"],
            template="""Generate a single multiple-choice question about {topic} at {difficulty} difficulty level.
            The question should be unique and not similar to any of these previously used questions: {used_questions}
            
            Format the response as a JSON object with the following structure:
            {{
                "question": "The question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "The correct option"
            }}
            
            Make sure the question is challenging but fair, and the options are well-distributed.
            The correct answer should be one of the options exactly as written.
            """
        )

        # Create the chain
        chain = LLMChain(
            llm=ChatOpenAI(
                model_name="gpt-3.5-turbo",
                temperature=0.7
            ),
            prompt=prompt
        )

        # Generate the question
        response = chain.run(
            topic=topic,
            difficulty=difficulty,
            used_questions=used_questions
        )

        # Parse the response
        try:
            question_data = json.loads(response)
            return jsonify({
                'questions': [question_data]
            }), 200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Credentials': 'true'
            }
        except json.JSONDecodeError:
            return jsonify({'error': 'Failed to parse question data'}), 500, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Credentials': 'true'
            }

    except Exception as e:
        return jsonify({'error': str(e)}), 500, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true'
        }

@app.route('/api/students/<string:student_id>/recent-activity', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_recent_activity(student_id):
    logger.info("="*50)
    logger.info(f"GET RECENT ACTIVITY REQUEST RECEIVED for student_id: {student_id}")
    logger.info(f"Request Method: {request.method}")
    logger.info(f"Request Headers: {dict(request.headers)}")
    
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 200

    try:
        # Get the current user from JWT token
        current_user = get_jwt_identity()
        logger.info(f"Current user from JWT: {current_user}")
        
        # Verify the requesting user matches the student_id
        if current_user != student_id:
            logger.error(f"Unauthorized access attempt. Current user: {current_user}, Requested student: {student_id}")
            return jsonify({'error': 'Unauthorized access'}), 403

        # Get student to verify they exist
        student = Student.query.filter_by(student_id=student_id).first()
        if not student:
            logger.error(f"Student not found with ID: {student_id}")
            return jsonify({'error': 'Student not found'}), 404
            
        logger.info(f"Found student: {student.name} (ID: {student.student_id})")
        
        # Get recent quiz results
        results = QuizResult.query.filter_by(student_id=student_id)\
            .order_by(QuizResult.submitted_at.desc())\
            .limit(10)\
            .all()
            
        logger.info(f"Found {len(results)} recent quiz results")
        
        # Format the response
        activity_list = [{
            'id': r.id,
            'quiz_title': Quiz.query.get(r.quiz_id).title if Quiz.query.get(r.quiz_id) else 'Unknown Quiz',
            'score': r.score,
            'completed_at': r.submitted_at.isoformat() if r.submitted_at else None
        } for r in results]
        
        logger.info(f"Prepared response data: {activity_list}")
        
        response = jsonify(activity_list)
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        logger.info("Successfully returning recent activity")
        logger.info("="*50)
        return response, 200
        
    except Exception as e:
        logger.error("="*50)
        logger.error(f"Error in get_recent_activity: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error("="*50)
        
        response = jsonify({'error': str(e)})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 500

# Add cleanup on startup
with app.app_context():
    try:
        logger.info("Checking database initialization...")
        
        # Check if tables exist, create them if they don't
        inspector = inspect(db.engine)
        if not inspector.has_table('student'):
            logger.info("Creating database tables...")
            db.create_all()
            logger.info("Database tables created successfully")
        else:
            logger.info("Database tables already exist, skipping creation")
        
        # Log existing tables and their contents
        logger.info("Checking database contents...")
        student_count = Student.query.count()
        logger.info(f"Number of students in database: {student_count}")
        
        # Clean up any empty textbooks
        cleanup_empty_textbooks()
        logger.info("Database initialization complete")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise e

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001, debug=True) 