from flask import Blueprint, request, jsonify
from models.models import Quiz, QuizQuestion, Question, QuizResult, Student, db
from datetime import datetime

bp = Blueprint('quiz', __name__, url_prefix='/api/quiz')

@bp.route('/create', methods=['POST'])
def create_quiz():
    data = request.json
    chapter_id = data.get('chapter_id')
    num_questions = data.get('num_questions', 10)
    time_limit = data.get('time_limit', 30)  # in minutes
    
    # Get questions for the chapter
    questions = Question.query.filter_by(chapter_id=chapter_id).all()
    if not questions:
        return jsonify({'error': 'No questions found for this chapter'}), 404
    
    # Create quiz
    quiz = Quiz(
        title=f"Quiz for Chapter {data.get('chapter_title', '')}",
        chapter_id=chapter_id,
        time_limit=time_limit
    )
    db.session.add(quiz)
    db.session.commit()
    
    # Add questions to quiz
    for i, question in enumerate(questions[:num_questions]):
        quiz_question = QuizQuestion(
            quiz_id=quiz.id,
            question_id=question.id,
            order=i + 1
        )
        db.session.add(quiz_question)
    
    db.session.commit()
    
    return jsonify({
        'quiz_id': quiz.id,
        'title': quiz.title,
        'num_questions': num_questions,
        'time_limit': time_limit
    }), 201

@bp.route('/<int:quiz_id>', methods=['GET'])
def get_quiz(quiz_id):
    quiz = Quiz.query.get_or_404(quiz_id)
    questions = QuizQuestion.query.filter_by(quiz_id=quiz_id).order_by(QuizQuestion.order).all()
    
    return jsonify({
        'id': quiz.id,
        'title': quiz.title,
        'time_limit': quiz.time_limit,
        'questions': [{
            'id': q.question.id,
            'text': q.question.text,
            'options': q.question.options,
            'order': q.order
        } for q in questions]
    })

@bp.route('/submit', methods=['POST'])
def submit_quiz():
    data = request.json
    student_id = data.get('student_id')
    quiz_id = data.get('quiz_id')
    answers = data.get('answers', {})
    question_times = data.get('question_times', {})
    
    # Calculate score
    quiz = Quiz.query.get_or_404(quiz_id)
    questions = QuizQuestion.query.filter_by(quiz_id=quiz_id).all()
    
    correct = 0
    total = len(questions)
    
    for q in questions:
        if str(q.question_id) in answers:
            if answers[str(q.question_id)] == q.question.correct_answer:
                correct += 1
    
    score = (correct / total) * 100
    
    # Create quiz result
    result = QuizResult(
        student_id=student_id,
        quiz_id=quiz_id,
        score=score,
        time_taken=sum(question_times.values()),
        question_times=question_times,
        answers=answers
    )
    db.session.add(result)
    db.session.commit()
    
    return jsonify({
        'score': score,
        'correct': correct,
        'total': total,
        'result_id': result.id
    })

@bp.route('/results/<int:result_id>', methods=['GET'])
def get_result(result_id):
    result = QuizResult.query.get_or_404(result_id)
    quiz = Quiz.query.get(result.quiz_id)
    questions = QuizQuestion.query.filter_by(quiz_id=quiz.id).all()
    
    return jsonify({
        'score': result.score,
        'time_taken': result.time_taken,
        'question_times': result.question_times,
        'answers': result.answers,
        'questions': [{
            'id': q.question.id,
            'text': q.question.text,
            'correct_answer': q.question.correct_answer,
            'student_answer': result.answers.get(str(q.question_id))
        } for q in questions]
    }) 