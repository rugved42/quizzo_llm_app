import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import './QuizResults.css';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

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
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('moderate');
  const [activeTab, setActiveTab] = useState<'summary' | 'details'>('summary');

  const difficultyOptions = [
    { label: 'Easy', value: 'easy' },
    { label: 'Moderate', value: 'moderate' },
    { label: 'Hard', value: 'hard' }
  ];

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

  const handleRegenerateQuiz = async () => {
    if (!quizId) {
      setError('Quiz ID is missing. Cannot regenerate quiz.');
      return;
    }

    setRegenerating(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated. Please login.');
        navigate('/login');
        return;
      }

      const response = await axios.post(
        `http://localhost:8001/api/quizzes/${quizId}/regenerate`,
        { difficulty: selectedDifficulty },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );

      if (response.data && response.data.quiz_id) {
        navigate(`/quiz/${response.data.quiz_id}`);
      } else {
        throw new Error('Failed to regenerate quiz');
      }
    } catch (err: any) {
      console.error('Error regenerating quiz:', err);
      setError(err.response?.data?.error || 'Failed to regenerate quiz. Please try again.');
    } finally {
      setRegenerating(false);
      setShowRegenerateModal(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#48bb78';
    if (score >= 50) return '#4299e1';
    return '#e53e3e';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 70) return '🎉';
    if (score >= 50) return '👍';
    return '💪';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 70) return 'Great job!';
    if (score >= 50) return 'Good effort!';
    return 'Keep practicing!';
  };

  if (loading) {
    return (
      <div className="results-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={handleBackToQuizzes}>Return to Quizzes</button>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const scoreColor = getScoreColor(result.score);
  const scoreEmoji = getScoreEmoji(result.score);
  const scoreMessage = getScoreMessage(result.score);

  const pieData = {
    labels: ['Correct', 'Incorrect'],
    datasets: [
      {
        data: [result.correct_answers, result.total_questions - result.correct_answers],
        backgroundColor: ['#48bb78', '#e53e3e'],
        borderWidth: 0,
      },
    ],
  };

  const timeData = {
    labels: result.questions.map((_, index) => `Q${index + 1}`),
    datasets: [
      {
        label: 'Time Spent (seconds)',
        data: result.questions.map(q => q.time_spent),
        backgroundColor: '#4299e1',
      },
    ],
  };

  return (
    <div className="results-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="results-header"
      >
        <h1>Quiz Results</h1>
        <div className="submission-time">
          Submitted on {new Date(result.submitted_at).toLocaleString()}
        </div>
      </motion.div>

      <div className="results-tabs">
        <button
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Question Details
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'summary' ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="summary-tab"
          >
            <div className="score-section">
              <div className="score-circle" style={{ borderColor: scoreColor }}>
                <div className="score-value" style={{ color: scoreColor }}>
                  {result.score.toFixed(1)}%
                </div>
                <div className="score-emoji">{scoreEmoji}</div>
                <div className="score-message">{scoreMessage}</div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>Performance</h3>
                <div className="chart-container">
                  <Pie data={pieData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                </div>
              </div>

              <div className="stat-card">
                <h3>Time Distribution</h3>
                <div className="chart-container">
                  <Bar
                    data={timeData}
                    options={{
                      plugins: {
                        legend: { display: false },
                        title: { display: false }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Seconds'
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button className="action-button retake" onClick={handleRetakeQuiz}>
                Retake Quiz
              </button>
              <button className="action-button regenerate" onClick={() => setShowRegenerateModal(true)}>
                Generate New Quiz
              </button>
              <button className="action-button back" onClick={handleBackToQuizzes}>
                Back to Quizzes
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="details-tab"
          >
            {result.questions.map((question, index) => (
              <motion.div
                key={question.question_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="question-card"
              >
                <div className="question-header">
                  <span className="question-number">Question {index + 1}</span>
                  <span className={`question-status ${question.is_correct ? 'correct' : 'incorrect'}`}>
                    {question.is_correct ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>
                <p className="question-text">{question.question_text}</p>
                <div className="answer-details">
                  <div className="answer-row">
                    <span className="answer-label">Your Answer:</span>
                    <span className={`answer-value ${question.is_correct ? 'correct' : 'incorrect'}`}>
                      {question.student_answer}
                    </span>
                  </div>
                  {!question.is_correct && (
                    <div className="answer-row">
                      <span className="answer-label">Correct Answer:</span>
                      <span className="answer-value correct">{question.correct_answer}</span>
                    </div>
                  )}
                  <div className="answer-row">
                    <span className="answer-label">Time Spent:</span>
                    <span className="answer-value">{formatTime(question.time_spent)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {showRegenerateModal && (
        <div className="modal-overlay">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-content"
          >
            <h3>Generate New Quiz</h3>
            <p>Select the difficulty level for the new quiz:</p>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="difficulty-select"
            >
              {difficultyOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="modal-buttons">
              <button onClick={() => setShowRegenerateModal(false)}>Cancel</button>
              <button
                onClick={handleRegenerateQuiz}
                disabled={regenerating}
                className="confirm-button"
              >
                {regenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default QuizResults; 