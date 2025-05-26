from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Textbook(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    student_id = db.Column(db.String(36), db.ForeignKey('student.student_id'), nullable=False)
    student = db.relationship('Student', backref=db.backref('textbooks', lazy=True))
    chapters = db.relationship('Chapter', backref='textbook', lazy=True, cascade='all, delete-orphan')
    
    # Add a unique constraint for title + student_id combination
    __table_args__ = (
        db.UniqueConstraint('title', 'student_id', name='unique_textbook_per_student'),
    )

class Chapter(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    number = db.Column(db.Integer, nullable=False)
    textbook_id = db.Column(db.Integer, db.ForeignKey('textbook.id'), nullable=False)
    questions = db.relationship('Question', backref='chapter', lazy=True, cascade='all, delete-orphan')

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON, nullable=False)
    correct_answer = db.Column(db.String(500), nullable=False)
    difficulty = db.Column(db.String(20), default='medium')
    chapter_id = db.Column(db.Integer, db.ForeignKey('chapter.id'), nullable=False)

class Quiz(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    chapter_id = db.Column(db.Integer, db.ForeignKey('chapter.id'), nullable=False)
    textbook_id = db.Column(db.Integer, db.ForeignKey('textbook.id'), nullable=False)
    difficulty = db.Column(db.String(20), default='medium')
    time_limit = db.Column(db.Integer, default=30)  # in minutes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    questions = db.relationship('QuizQuestion', backref='quiz', lazy=True, cascade='all, delete-orphan')
    textbook = db.relationship('Textbook', backref=db.backref('quizzes', lazy=True))

class QuizQuestion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quiz.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=False)
    order = db.Column(db.Integer, nullable=False)

class QuizResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quiz.id'), nullable=False)
    student_id = db.Column(db.String(36), nullable=False)
    score = db.Column(db.Float, nullable=False)
    answers = db.Column(db.JSON, nullable=False)
    question_times = db.Column(db.JSON, nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(36), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow) 