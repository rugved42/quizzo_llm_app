import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Quiz {
  id: number;
  title: string;
  subject: string;
  difficulty: string;
  time_limit: number;
  created_at: string;
}

const QuizList: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await axios.get('http://localhost:8001/api/quizzes', {
        withCredentials: true
      });
      setQuizzes(response.data);
    } catch (err) {
      setError('Failed to fetch quizzes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = (quizId: number) => {
    navigate(`/quiz/${quizId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Available Quizzes</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <h3 className="text-xl font-semibold mb-2 text-gray-800">{quiz.title}</h3>
            <div className="space-y-2 text-gray-600">
              <p><span className="font-medium">Subject:</span> {quiz.subject}</p>
              <p><span className="font-medium">Difficulty:</span> {quiz.difficulty}</p>
              <p><span className="font-medium">Time Limit:</span> {quiz.time_limit} minutes</p>
              <p><span className="font-medium">Created:</span> {new Date(quiz.created_at).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => handleStartQuiz(quiz.id)}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Start Quiz
            </button>
          </div>
        ))}
      </div>
      {quizzes.length === 0 && (
        <div className="text-center text-gray-600 mt-8">
          No quizzes available at the moment.
        </div>
      )}
    </div>
  );
};

export default QuizList; 