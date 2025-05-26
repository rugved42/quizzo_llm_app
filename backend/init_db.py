from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from models.quiz import db, Student, Quiz, Question, QuizResult

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/quizzes.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()
    print("Database initialized successfully!") 