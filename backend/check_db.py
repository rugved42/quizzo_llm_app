from main import app, db, Student, Quiz, Question, QuizResult

with app.app_context():
    print("\n=== Students ===")
    students = Student.query.all()
    for student in students:
        print(f"ID: {student.id}")
        print(f"Name: {student.name}")
        print(f"Email: {student.email}")
        print(f"Student ID: {student.student_id}")
        print(f"Created at: {student.created_at}")
        print("---")

    print("\n=== Quizzes ===")
    quizzes = Quiz.query.all()
    for quiz in quizzes:
        print(f"ID: {quiz.id}")
        print(f"Title: {quiz.title}")
        print(f"Created at: {quiz.created_at}")
        print("---")

    print("\n=== Questions ===")
    questions = Question.query.all()
    for question in questions:
        print(f"ID: {question.id}")
        print(f"Quiz ID: {question.quiz_id}")
        print(f"Text: {question.text}")
        print("---")

    print("\n=== Quiz Results ===")
    results = QuizResult.query.all()
    for result in results:
        print(f"ID: {result.id}")
        print(f"Quiz ID: {result.quiz_id}")
        print(f"Student ID: {result.student_id}")
        print(f"Score: {result.score}")
        print("---") 