# Quiz Maker

A web application that generates quizzes from PDF textbooks, allows students to take timed quizzes, and provides detailed analytics on quiz performance.

## Features

- Upload PDF textbooks and automatically generate quiz questions
- Organize questions by chapters
- Create quizzes from chapter questions
- Take timed quizzes with a user-friendly interface
- Track time spent on each question
- View detailed quiz results with correct/incorrect answers
- Analyze time spent on questions with charts
- Store student information and quiz results in a database

## Tech Stack

### Backend
- Python 3.8+
- Flask
- SQLAlchemy
- PostgreSQL
- PyPDF2 for PDF processing
- OpenAI API for question generation

### Frontend
- React with TypeScript
- React Router for navigation
- Axios for API calls
- Chart.js for analytics
- Tailwind CSS for styling

## Setup

### Backend Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
flask db upgrade
```

5. Start the server:
```bash
flask run --port 8001
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

## API Endpoints

### PDF Management
- `POST /api/pdf/upload` - Upload a PDF textbook
- `GET /api/pdf/textbooks` - List all textbooks
- `GET /api/pdf/textbooks/{id}/chapters` - Get chapters for a textbook

### Quiz Management
- `POST /api/quiz/create` - Create a new quiz
- `GET /api/quiz/{id}` - Get quiz details
- `POST /api/quiz/submit` - Submit quiz answers
- `GET /api/quiz/results/{id}` - Get quiz results

### User Management
- `POST /api/user/register` - Register a new student
- `GET /api/user/{id}` - Get student details
- `GET /api/user/results/{id}` - Get student's quiz results

## Environment Variables

### Backend (.env)
```
FLASK_APP=app
FLASK_ENV=development
DATABASE_URL=postgresql://localhost/quiz_maker
SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-openai-api-key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 