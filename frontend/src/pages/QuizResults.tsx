import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Panel, Loader, Message, Button, Progress, Stack, Radio, Modal, SelectPicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';

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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Loader size="md" content="Loading results..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Message type="error" header="Error">
          {error}
        </Message>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ padding: '20px' }}>
        <Message type="warning" header="Notice">
          No results found
        </Message>
      </div>
    );
  }

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

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Panel shaded>
        <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Quiz Results</h2>
          <div style={{ fontSize: '16px', color: '#666' }}>
            Submitted on {new Date(result.submitted_at).toLocaleString()}
          </div>
        </Stack>

        <Stack spacing={20} style={{ marginBottom: '30px' }}>
          <Panel bordered style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Score</h3>
            <Progress.Line 
              percent={result.score} 
              status={result.score >= 70 ? 'success' : result.score >= 50 ? 'active' : 'fail'}
              strokeWidth={10}
            />
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{result.score.toFixed(1)}%</span>
              <div style={{ color: '#666' }}>
                {result.correct_answers} out of {result.total_questions} correct
              </div>
            </div>
          </Panel>

          <Panel bordered style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Time Taken</h3>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatTime(result.time_taken)}</span>
            </div>
          </Panel>
        </Stack>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Question Analysis</h3>
          <Stack direction="column" spacing={15}>
            {result.questions.map((question, index) => (
              <Panel 
                key={question.question_id}
                bordered
                style={{
                  backgroundColor: question.is_correct ? '#f0f9ff' : '#fff1f0',
                  borderColor: question.is_correct ? '#91caff' : '#ffccc7'
                }}
              >
                <Stack justifyContent="space-between" alignItems="flex-start">
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>
                      Question {index + 1}: {question.question_text}
                    </h4>
                    <Stack direction="column" spacing={10}>
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          style={{
                            padding: '10px',
                            borderRadius: '6px',
                            backgroundColor: option === question.correct_answer
                              ? '#f6ffed'
                              : option === question.student_answer && option !== question.correct_answer
                              ? '#fff2f0'
                              : '#f5f5f5',
                            border: '1px solid',
                            borderColor: option === question.correct_answer
                              ? '#b7eb8f'
                              : option === question.student_answer && option !== question.correct_answer
                              ? '#ffccc7'
                              : '#d9d9d9'
                          }}
                        >
                          <Stack spacing={10}>
                            {option === question.correct_answer && (
                              <span style={{ color: '#52c41a', fontWeight: 'bold' }}>✓</span>
                            )}
                            {option === question.student_answer && option !== question.correct_answer && (
                              <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>✗</span>
                            )}
                            <span>{option}</span>
                          </Stack>
                        </div>
                      ))}
                    </Stack>
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                      Time spent: {formatTime(question.time_spent)}
                    </div>
                  </div>
                </Stack>
              </Panel>
            ))}
          </Stack>
        </div>

        <Stack justifyContent="space-between">
          <Button
            appearance="default"
            onClick={handleBackToQuizzes}
          >
            Back to Quizzes
          </Button>
          <Stack spacing={10}>
            <Button
              appearance="primary"
              color="blue"
              onClick={() => setShowRegenerateModal(true)}
            >
              Regenerate Quiz
            </Button>
            <Button
              appearance="primary"
              color="green"
              onClick={handleRetakeQuiz}
            >
              Retake Quiz
            </Button>
          </Stack>
        </Stack>
      </Panel>

      <Modal
        backdrop="static"
        keyboard={false}
        size="sm"
        onClose={() => setShowRegenerateModal(false)}
        open={showRegenerateModal}
      >
        <Modal.Header>
          <Modal.Title>Regenerate Quiz</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack direction="column" spacing={20}>
            <div>
              <p>Select a new difficulty level for the quiz:</p>
              <SelectPicker
                data={difficultyOptions}
                value={selectedDifficulty}
                onChange={(value: string | null) => setSelectedDifficulty(value || 'moderate')}
                style={{ width: '100%' }}
              />
            </div>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button
            appearance="default"
            onClick={() => setShowRegenerateModal(false)}
          >
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={handleRegenerateQuiz}
            loading={regenerating}
          >
            Regenerate
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default QuizResults; 