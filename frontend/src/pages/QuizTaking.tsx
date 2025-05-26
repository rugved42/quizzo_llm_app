import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import './QuizTaking.css';

interface Question {
  id: number;
  text: string;
  options: string[];
  correct_answer: string;
}

interface Quiz {
  id: number;
  title: string;
  time_limit: number;
  questions: Question[];
}

const QuizTaking: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (quiz?.time_limit) {
      setTimeLeft(quiz.time_limit * 60);
    }
  }, [quiz]);

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestion]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const fetchQuiz = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated. Please login.');
        setLoading(false);
        navigate('/login');
        return;
      }

      const response = await axios.get(
        `http://localhost:8001/api/quizzes/${quizId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setQuiz(response.data);
      setCurrentQuestion(0);
    } catch (err: any) {
      console.error('Error fetching quiz:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('studentId');
        localStorage.removeItem('userName');
        setError('Session expired. Please login again.');
        navigate('/login');
      } else if (err.response?.status === 404) {
        setError('Quiz not found');
      } else {
        setError('Failed to load quiz. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleQuestionChange = (newQuestionIndex: number) => {
    if (quiz) {
      const currentQuestionId = quiz.questions[currentQuestion].id;
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      setQuestionTimes(prev => ({
        ...prev,
        [currentQuestionId]: timeSpent
      }));
    }
    setCurrentQuestion(newQuestionIndex);
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (quiz) {
      const currentQuestionId = quiz.questions[currentQuestion].id;
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      setQuestionTimes(prev => ({
        ...prev,
        [currentQuestionId]: timeSpent
      }));
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated. Please login.');
        setSubmitting(false);
        navigate('/login');
        return;
      }

      if (!quizId) {
        setError('Quiz ID is missing. Cannot submit quiz.');
        setSubmitting(false);
        return;
      }

      const response = await axios.post(
        `http://localhost:8001/api/quizzes/${quizId}/submit`,
        { 
          answers,
          question_times: questionTimes
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );
      
      navigate(`/results/${quizId}`, { state: { results: response.data } });
    } catch (err: any) {
      console.error('Error submitting quiz:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('studentId');
        localStorage.removeItem('userName');
        setError('Session expired. Please login again.');
        navigate('/login');
      } else {
        setError('Failed to submit quiz. Please try again.');
      }
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="quiz-taking-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-taking-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/quizzes')}>Return to Quizzes</button>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  const currentQ = quiz.questions[currentQuestion];
  const progress = (Object.keys(answers).length / quiz.questions.length) * 100;
  const allQuestionsAnswered = Object.keys(answers).length === quiz.questions.length;

  return (
    <div className="quiz-taking-container">
      <div className="quiz-header">
        <h1>{quiz.title}</h1>
        <div className="quiz-info">
          <div className="timer">
            <span className="timer-icon">⏱️</span>
            <span className={timeLeft <= 60 ? 'time-warning' : ''}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
            <span className="progress-text">
              {Object.keys(answers).length} / {quiz.questions.length} Questions
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="question-container"
        >
          <div className="question-number">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </div>
          <h2 className="question-text">{currentQ.text}</h2>
          <div className="options-container">
            {currentQ.options.map((option, index) => (
              <motion.button
                key={index}
                className={`option-button ${answers[currentQ.id] === option ? 'selected' : ''}`}
                onClick={() => handleAnswerSelect(currentQ.id, option)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {option}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="navigation-buttons">
        <button
          className="nav-button"
          onClick={() => handleQuestionChange(currentQuestion - 1)}
          disabled={currentQuestion === 0}
        >
          Previous
        </button>
        {currentQuestion < quiz.questions.length - 1 ? (
          <button
            className="nav-button"
            onClick={() => handleQuestionChange(currentQuestion + 1)}
          >
            Next
          </button>
        ) : (
          <button
            className={`submit-button ${allQuestionsAnswered ? 'ready' : 'disabled'}`}
            onClick={() => setShowConfirmation(true)}
            disabled={!allQuestionsAnswered || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        )}
      </div>

      {showConfirmation && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Submit Quiz?</h3>
            <p>Are you sure you want to submit your answers? This action cannot be undone.</p>
            <div className="confirmation-buttons">
              <button onClick={() => setShowConfirmation(false)}>Cancel</button>
              <button onClick={handleSubmit} className="confirm-submit">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizTaking; 