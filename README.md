# Quizzo - Interactive Learning Platform

Quizzo is a modern web application that helps students create and take quizzes from their textbooks. It uses AI to generate questions and provides an interactive learning experience.

## Features

- 📚 Upload and process textbooks
- 🤖 AI-powered question generation
- 📝 Create and take quizzes
- 📊 Track learning progress
- 👥 Live quiz sessions
- 🔒 Secure authentication

## Prerequisites

- Python 3.8+
- Node.js 16+
- SQLite3
- OpenAI API key

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd quizzo
```

### 2. Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the backend directory with the following content:
```env
DATABASE_URL=sqlite:///instance/quizzes.db
JWT_SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=your-openai-api-key
```

5. Initialize the database:
```bash
python init_db.py
```

6. Start the backend server:
```bash
python main.py
```

The backend server will run on `http://localhost:8001`

### 3. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Database Setup

The application uses SQLite as its database. The database file (`quizzes.db`) will be created automatically when you run `init_db.py`. The database includes the following tables:

- Students
- Textbooks
- Chapters
- Questions
- Quizzes
- QuizResults

To reset the database (if needed):
```bash
python reset_db.py
```

## Environment Variables

### Backend (.env)

- `DATABASE_URL`: SQLite database URL (default: `sqlite:///instance/quizzes.db`)
  - Note: The database file will be created in the `instance` directory
  - Format: `sqlite:///instance/quizzes.db`
- `JWT_SECRET_KEY`: Secret key for JWT token generation
- `OPENAI_API_KEY`: Your OpenAI API key for question generation

### Frontend (.env)

- `REACT_APP_API_URL`: Backend API URL (default: `http://localhost:8001`)

## Running the Application

1. Start the backend server:
```bash
cd backend
python main.py
```

2. In a new terminal, start the frontend:
```bash
cd frontend
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Development

- Backend API documentation is available at `http://localhost:8001/api/docs`
- Frontend code is in the `frontend/src` directory
- Backend code is in the `backend` directory

## Troubleshooting

1. If you encounter database issues:
   - Run `python check_db.py` to verify database integrity
   - Use `python reset_db.py` to reset the database (warning: this will delete all data)

2. If the frontend can't connect to the backend:
   - Ensure both servers are running
   - Check that the ports (3000 and 8001) are not in use
   - Verify the API URL in the frontend environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 