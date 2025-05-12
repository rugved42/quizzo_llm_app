from main import app, db, Student, Quiz, Question, QuizResult
import os

def reset_database():
    with app.app_context():
        # Delete all data from tables
        QuizResult.query.delete()
        Question.query.delete()
        Quiz.query.delete()
        Student.query.delete()
        
        # Commit the changes
        db.session.commit()
        print("Database has been reset successfully")

if __name__ == '__main__':
    reset_database() 