from flask import Blueprint, request, jsonify
from models.models import Student, QuizResult, db
from datetime import datetime

bp = Blueprint('user', __name__, url_prefix='/api/user')

@bp.route('/register', methods=['POST'])
def register_student():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    
    if not name or not email:
        return jsonify({'error': 'Name and email are required'}), 400
    
    # Check if email already exists
    if Student.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    student = Student(
        name=name,
        email=email
    )
    db.session.add(student)
    db.session.commit()
    
    return jsonify({
        'id': student.id,
        'name': student.name,
        'email': student.email
    }), 201

@bp.route('/<int:student_id>', methods=['GET'])
def get_student(student_id):
    student = Student.query.get_or_404(student_id)
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
            'completed_at': r.completed_at.isoformat()
        } for r in results]
    })

@bp.route('/results/<int:student_id>', methods=['GET'])
def get_student_results(student_id):
    results = QuizResult.query.filter_by(student_id=student_id).all()
    
    return jsonify([{
        'id': r.id,
        'quiz_id': r.quiz_id,
        'score': r.score,
        'time_taken': r.time_taken,
        'question_times': r.question_times,
        'completed_at': r.completed_at.isoformat()
    } for r in results]) 