import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Quiz {
  id: number;
  title: string;
  difficulty: string;
  time_limit: number;
  created_at: string;
  question_count: number;
}

interface TextbookQuizzes {
  textbook_id: number;
  textbook_title: string;
  quizzes: {
    easy: Quiz[];
    medium: Quiz[];
    hard: Quiz[];
  };
}

const QuizList: React.FC = () => {
  const navigate = useNavigate();
  const [textbookQuizzes, setTextbookQuizzes] = useState<TextbookQuizzes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Token from localStorage:', token);
        
        if (!token) {
          console.error('No token found in localStorage');
          setError('Not authenticated. Please login.');
          setLoading(false);
          navigate('/login');
          return;
        }

        const response = await axios.get(
          'http://localhost:8001/api/quizzes',
          { 
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          }
        );
        console.log('Quizzes response:', response.data);
        setTextbookQuizzes(response.data);
      } catch (err: any) {
        console.error('Error fetching quizzes:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('studentId');
          localStorage.removeItem('userName');
          setError('Session expired. Please login again.');
          navigate('/login');
        } else if (err.response?.status === 404) {
          setError('No quizzes available. Please upload a textbook to generate quizzes.');
        } else {
          setError('Failed to load quizzes. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [navigate]);

  const handleStartQuiz = (quizId: number) => {
    navigate(`/quiz/${quizId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          {error.includes('No quizzes available') ? (
            <button
              onClick={() => navigate('/upload')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Upload Textbook
            </button>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (textbookQuizzes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No quizzes available.</p>
          <button
            onClick={() => navigate('/upload')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Upload Textbook
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Available Quizzes
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Select a quiz to begin testing your knowledge
          </p>
        </div>

        <div className="mt-12 space-y-12">
          {textbookQuizzes.map((textbook) => (
            <div key={textbook.textbook_id} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">{textbook.textbook_title}</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(textbook.quizzes).map(([difficulty, quizzes]) => (
                  quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="bg-white overflow-hidden shadow rounded-lg"
                    >
                      <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-900">
                          {quiz.title}
                        </h3>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <div>
                            <p>{quiz.question_count} questions</p>
                            <p>{quiz.time_limit} minutes time limit</p>
                            <p className="capitalize">{difficulty} difficulty</p>
                          </div>
                          <div>
                            <p>
                              Created on{' '}
                              {new Date(quiz.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-6">
                          <button
                            onClick={() => handleStartQuiz(quiz.id)}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Start Quiz
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizList; 