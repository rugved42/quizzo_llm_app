from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
from services.pdf_service import PDFService
from models.quiz import db, Quiz, Question, QuizResult, Student
import uuid

app = Flask(__name__)
CORS(app, resources={r"/*": {
    "origins": "http://localhost:3000",
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///quizzes.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

pdf_service = PDFService()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return jsonify({"message": "Welcome to Quiz Maker API"})

@app.route('/register', methods=['POST'])
def register_student():
    try:
        print("\n=== Registration Request ===")
        print("Request headers:", request.headers)
        print("Request content type:", request.content_type)
        
        if not request.is_json:
            print("Request is not JSON")
            return jsonify({"error": "Request must be JSON"}), 400
            
        data = request.get_json()
        print("Request data:", data)
        
        name = data.get('name')
        email = data.get('email')

        if not name or not email:
            print("Missing name or email")
            return jsonify({"error": "Name and email are required"}), 400

        # Validate email format
        if '@' not in email or '.' not in email:
            print("Invalid email format")
            return jsonify({"error": "Invalid email format"}), 400

        # Check if email already exists
        print("Checking for existing student with email:", email)
        existing_student = Student.query.filter_by(email=email).first()
        if existing_student:
            print("Email already exists")
            return jsonify({"error": "Email already registered"}), 400

        # Create new student
        print("Creating new student")
        student = Student(
            name=name.strip(),
            email=email.strip(),
            student_id=str(uuid.uuid4())
        )
        db.session.add(student)
        print("Attempting to commit to database")
        db.session.commit()
        print("Student created successfully")

        return jsonify({
            "message": "Registration successful",
            "student_id": student.student_id
        })
    except Exception as e:
        print("Error during registration:", str(e))
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Process the PDF and generate questions
            chapters = pdf_service.extract_text_from_pdf(filepath)
            
            # Create a new quiz
            quiz = Quiz(title=filename)
            db.session.add(quiz)
            db.session.commit()
            
            # Add questions to the quiz
            for chapter, text in chapters.items():
                chapter_questions = pdf_service.generate_questions(text)
                for q in chapter_questions:
                    question = Question(
                        quiz_id=quiz.id,
                        text=q['text'],
                        options=q['options'],
                        correct_answer=q['correct_answer'],
                        difficulty=q['difficulty']
                    )
                    db.session.add(question)
            
            db.session.commit()
            
            return jsonify({
                "message": "File uploaded and processed successfully",
                "quiz_id": quiz.id,
                "title": quiz.title
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
    
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/quizzes', methods=['GET'])
def get_quizzes():
    try:
        print("Fetching quizzes from database...")
        quizzes = Quiz.query.all()
        print(f"Found {len(quizzes)} quizzes")
        
        quiz_data = [{
            "id": quiz.id,
            "title": quiz.title,
            "created_at": quiz.created_at.isoformat(),
            "question_count": len(quiz.questions)
        } for quiz in quizzes]
        
        print("Quiz data:", quiz_data)
        return jsonify(quiz_data)
    except Exception as e:
        print("Error fetching quizzes:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/quizzes/<quiz_id>/questions', methods=['GET'])
def get_quiz_questions(quiz_id):
    try:
        questions = Question.query.filter_by(quiz_id=quiz_id).all()
        return jsonify([{
            "id": q.id,
            "text": q.text,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "difficulty": q.difficulty
        } for q in questions])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/submit-quiz', methods=['POST'])
def submit_quiz():
    try:
        data = request.json
        quiz_id = data.get('quiz_id')
        student_id = data.get('student_id')
        answers = data.get('answers')
        question_times = data.get('question_times')
        
        # Calculate score
        questions = Question.query.filter_by(quiz_id=quiz_id).all()
        correct_answers = 0
        for q in questions:
            if answers.get(str(q.id)) == q.correct_answer:
                correct_answers += 1
        score = (correct_answers / len(questions)) * 100
        
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
        
        return jsonify({
            "message": "Quiz submitted successfully",
            "result_id": result.id,
            "score": score
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/results/<result_id>', methods=['GET'])
def get_result(result_id):
    try:
        result = QuizResult.query.get(result_id)
        if not result:
            return jsonify({"error": "Result not found"}), 404
        
        return jsonify({
            "id": result.id,
            "quiz_id": result.quiz_id,
            "student_id": result.student_id,
            "score": result.score,
            "answers": result.answers,
            "question_times": result.question_times,
            "completed_at": result.completed_at.isoformat()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/check-registration', methods=['GET'])
def check_registration():
    try:
        student_id = request.args.get('student_id')
        if not student_id:
            return jsonify({"registered": False}), 200
            
        student = Student.query.filter_by(student_id=student_id).first()
        return jsonify({"registered": student is not None}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/logout', methods=['POST'])
def logout():
    try:
        # In a real application, you might want to invalidate tokens or sessions here
        return jsonify({"message": "Logged out successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Create database tables
with app.app_context():
    print("Creating database tables...")
    try:
        db.create_all()
        print("Database tables created successfully")
    except Exception as e:
        print("Error creating database tables:", str(e))
        raise e

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001, debug=True) 