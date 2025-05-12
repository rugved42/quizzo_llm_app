import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface Quiz {
  id: number;
  title: string;
  created_at: string;
  question_count: number;
}

const QuizList: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get('http://localhost:8001/quizzes');
        setQuizzes(response.data);
      } catch (err) {
        setError('Failed to load quizzes');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  if (loading) return <div>Loading quizzes...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="quiz-list">
      <h2>Available Quizzes</h2>
      <div className="quizzes-grid">
        {quizzes.map(quiz => (
          <div key={quiz.id} className="quiz-card">
            <h3>{quiz.title}</h3>
            <p>Questions: {quiz.question_count}</p>
            <p>Created: {new Date(quiz.created_at).toLocaleDateString()}</p>
            <Link to={`/quiz/${quiz.id}`} className="take-quiz-btn">
              Take Quiz
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuizList; 