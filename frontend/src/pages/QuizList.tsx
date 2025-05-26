import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button, Panel, Loader, Message, Grid, Row, Col, Stack, Modal, InputNumber, SelectPicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';

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
  quizzes: Quiz[];
}

const QuizList: React.FC = () => {
  const navigate = useNavigate();
  const [textbookQuizzes, setTextbookQuizzes] = useState<TextbookQuizzes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTextbook, setSelectedTextbook] = useState<TextbookQuizzes | null>(null);
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('moderate');
  const [creating, setCreating] = useState(false);

  const difficultyOptions = [
    { label: 'Easy', value: 'easy' },
    { label: 'Moderate', value: 'moderate' },
    { label: 'Hard', value: 'hard' }
  ];

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
        console.log('First textbook quizzes:', response.data[0]?.quizzes);
        console.log('Type of quizzes:', typeof response.data[0]?.quizzes);
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

  const handleCreateQuiz = async () => {
    if (!selectedTextbook) return;

    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated. Please login.');
        navigate('/login');
        return;
      }

      console.log('Creating quiz with parameters:', {
        textbookId: selectedTextbook.textbook_id,
        numberOfQuestions,
        difficulty
      });

      const response = await axios.post(
        `http://localhost:8001/api/textbooks/${selectedTextbook.textbook_id}/create-quiz`,
        {
          numberOfQuestions: numberOfQuestions,
          difficulty: difficulty
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );

      console.log('Quiz creation response:', response.data);

      if (response.data && response.data.quiz_id) {
        // Refresh the quiz list
        const quizzesResponse = await axios.get('http://localhost:8001/api/quizzes', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        setTextbookQuizzes(quizzesResponse.data);
        
        // Navigate to the new quiz
        navigate(`/quiz/${response.data.quiz_id}`);
      } else {
        throw new Error('Failed to create quiz: Invalid response format');
      }
    } catch (err: any) {
      console.error('Error creating quiz:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      let errorMessage = 'Failed to create quiz. Please try again.';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
        navigate('/login');
      }
      
      setError(errorMessage);
    } finally {
      setCreating(false);
      setShowCreateModal(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'green';
      case 'medium':
        return 'orange';
      case 'hard':
        return 'red';
      default:
        return 'blue';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Loader size="md" content="Loading quizzes..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Message type="error" header="Error">
          {error}
        </Message>
        {error.includes('No quizzes available') ? (
          <Button
            appearance="primary"
            onClick={() => navigate('/upload')}
            style={{ marginTop: '20px' }}
          >
            Upload Textbook
          </Button>
        ) : (
          <Button
            appearance="primary"
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px' }}
          >
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (textbookQuizzes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Message type="info" header="No Quizzes">
          No quizzes available.
        </Message>
        <Button
          appearance="primary"
          onClick={() => navigate('/upload')}
          style={{ marginTop: '20px' }}
        >
          Upload Textbook
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Your Quizzes</h2>
      </Stack>

      <Stack direction="column" spacing={20}>
        {textbookQuizzes.map((textbook) => (
          <Panel key={textbook.textbook_id} shaded>
            <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: '15px' }}>
              <h3 style={{ fontSize: '20px', margin: 0 }}>{textbook.textbook_title}</h3>
              <Button
                appearance="primary"
                color="blue"
                onClick={() => {
                  setSelectedTextbook(textbook);
                  setShowCreateModal(true);
                }}
              >
                Create New Quiz
              </Button>
            </Stack>

            <Stack direction="column" spacing={10}>
              {textbook.quizzes.map((quiz) => (
                <Panel
                  key={quiz.id}
                  bordered
                  style={{
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/quiz/${quiz.id}`)}
                >
                  <Stack justifyContent="space-between" alignItems="center">
                    <div>
                      <h4 style={{ fontSize: '16px', marginBottom: '5px' }}>{quiz.title}</h4>
                      <Stack spacing={20}>
                        <div style={{ color: '#666' }}>
                          {quiz.question_count} Questions
                        </div>
                        <div style={{ color: '#666' }}>
                          {quiz.time_limit} minutes
                        </div>
                        <div style={{ color: getDifficultyColor(quiz.difficulty) }}>
                          {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)} Difficulty
                        </div>
                      </Stack>
                    </div>
                    <div style={{ color: '#666' }}>
                      Created on {new Date(quiz.created_at).toLocaleDateString()}
                    </div>
                  </Stack>
                </Panel>
              ))}
            </Stack>
          </Panel>
        ))}
      </Stack>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        size="sm"
      >
        <Modal.Header>
          <Modal.Title>Create New Quiz</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack direction="column" spacing={20}>
            <div>
              <p>Select parameters for your new quiz:</p>
              <Stack direction="column" spacing={15}>
                <div>
                  <label>Number of Questions:</label>
                  <InputNumber
                    min={1}
                    max={50}
                    value={numberOfQuestions}
                    onChange={value => setNumberOfQuestions(value as number)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label>Difficulty Level:</label>
                  <SelectPicker
                    data={difficultyOptions}
                    value={difficulty}
                    onChange={(value: string | null) => setDifficulty(value || 'moderate')}
                    style={{ width: '100%' }}
                  />
                </div>
              </Stack>
            </div>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button
            appearance="default"
            onClick={() => setShowCreateModal(false)}
          >
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={handleCreateQuiz}
            loading={creating}
          >
            Create Quiz
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default QuizList; 