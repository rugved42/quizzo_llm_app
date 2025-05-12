from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
from services.pdf_service import PDFService
from models.models import Textbook, Chapter, Question, db

bp = Blueprint('pdf', __name__, url_prefix='/api/pdf')
pdf_service = PDFService()

@bp.route('/upload', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are allowed'}), 400
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(pdf_service.upload_dir, filename)
    file.save(file_path)
    
    # Create textbook entry
    textbook = Textbook(
        title=os.path.splitext(filename)[0],
        file_path=file_path
    )
    db.session.add(textbook)
    db.session.commit()
    
    # Process PDF and create chapters
    chapters = pdf_service.extract_text_from_pdf(file_path)
    for chapter_title, chapter_text in chapters.items():
        chapter = Chapter(
            title=chapter_title,
            number=len(textbook.chapters) + 1,
            textbook_id=textbook.id
        )
        db.session.add(chapter)
        db.session.commit()
        
        # Generate questions for chapter
        questions = pdf_service.generate_questions(chapter_text)
        for q in questions:
            question = Question(
                text=q['question'],
                correct_answer=q['correct_answer'],
                options=q['options'],
                difficulty=q['difficulty'],
                chapter_id=chapter.id
            )
            db.session.add(question)
    
    db.session.commit()
    
    return jsonify({
        'message': 'PDF processed successfully',
        'textbook_id': textbook.id,
        'chapters': len(chapters)
    }), 201

@bp.route('/textbooks', methods=['GET'])
def get_textbooks():
    textbooks = Textbook.query.all()
    return jsonify([{
        'id': t.id,
        'title': t.title,
        'author': t.author,
        'chapters': len(t.chapters)
    } for t in textbooks])

@bp.route('/textbooks/<int:textbook_id>/chapters', methods=['GET'])
def get_chapters(textbook_id):
    chapters = Chapter.query.filter_by(textbook_id=textbook_id).all()
    return jsonify([{
        'id': c.id,
        'title': c.title,
        'number': c.number,
        'questions': len(c.questions)
    } for c in chapters]) 