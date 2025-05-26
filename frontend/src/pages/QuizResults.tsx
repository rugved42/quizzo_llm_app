import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Question {
  question_id: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  student_answer: string;
  is_correct: boolean;
  time_spent: number;
}

interface QuizResult {
  result_id: number;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken: number;
  submitted_at: string;
  questions: Question[];
}

const QuizResults: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated. Please login.');
          setLoading(false);
          return;
        }

        if (location.state?.results) {
          setResult(location.state.results);
        } else {
          const response = await axios.get(`http://localhost:8001/api/quizzes/${quizId}/results`, {
            withCredentials: true,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          setResult(response.data);
        }
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Failed to load quiz results. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [quizId, location.state]);

  const handleRetakeQuiz = () => {
    if (!quizId) {
      setError('Quiz ID is missing. Cannot retake quiz.');
      return;
    }
    navigate(`/quiz/${quizId}`);
  };

  const handleBackToQuizzes = () => {
    navigate('/quizzes');
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

  if (!result) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Notice: </strong>
          <span className="block sm:inline">No results found</span>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Quiz Results</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Score</h3>
            <div className="text-3xl font-bold text-blue-600">{result.score.toFixed(1)}%</div>
            <div className="text-sm text-blue-600">
              {result.correct_answers} out of {result.total_questions} correct
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Time Taken</h3>
            <div className="text-3xl font-bold text-green-600">{formatTime(result.time_taken)}</div>
            <div className="text-sm text-green-600">
              Submitted on {result.submitted_at ? new Date(result.submitted_at).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {result.questions && result.questions.map((question, index) => (
            <div
              key={question.question_id}
              className={`p-4 rounded-lg border ${
                question.is_correct
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <h4 className="font-semibold mb-2 text-gray-800">
                Question {index + 1}: {question.question_text}
              </h4>
              <div className="space-y-2">
                {question.options && question.options.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    className={`p-2 rounded ${
                      option === question.correct_answer
                        ? 'bg-green-100 text-green-800'
                        : option === question.student_answer && option !== question.correct_answer
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-50 text-gray-800'
                    }`}
                  >
                    {option}
                    {option === question.correct_answer && ' ✓'}
                    {option === question.student_answer && option !== question.correct_answer && ' ✗'}
                  </div>
                ))}
                <div className="mt-2 text-sm">
                  <p className="text-gray-600">
                    Your answer: <span className="font-medium">{question.student_answer || 'Not answered'}</span>
                  </p>
                  <p className="text-gray-600">
                    Correct answer: <span className="font-medium">{question.correct_answer}</span>
                  </p>
                  <p className="text-gray-600">
                    Time spent: <span className="font-medium">{formatTime(question.time_spent)}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={handleBackToQuizzes}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Back to Quizzes
          </button>
          <button
            onClick={handleRetakeQuiz}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retake Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResults; 