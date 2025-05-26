import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button, Panel, Loader, Message, Grid, Row, Col } from 'rsuite';
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
    <div style={{ padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
          Available Quizzes
        </h2>
        <p style={{ color: '#666' }}>
          Select a quiz to begin testing your knowledge
        </p>
      </div>

      <Grid fluid>
        {textbookQuizzes.map((textbook) => {
          const quizzes = Array.isArray(textbook.quizzes) ? textbook.quizzes : [];
          console.log(`Quizzes for ${textbook.textbook_title}:`, quizzes);
          
          return (
            <div key={textbook.textbook_id} style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}>
                {textbook.textbook_title}
              </h3>
              <Row>
                {quizzes.map((quiz) => (
                  <Col xs={24} sm={12} md={8} key={quiz.id}>
                    <Panel
                      shaded
                      style={{ marginBottom: '15px' }}
                      header={
                        <div style={{ fontWeight: 'bold' }}>
                          {quiz.title}
                        </div>
                      }
                    >
                      <div style={{ marginBottom: '15px' }}>
                        <p>{quiz.question_count} questions</p>
                        <p>{quiz.time_limit} minutes time limit</p>
                        <p style={{ color: getDifficultyColor(quiz.difficulty) }}>
                          {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)} difficulty
                        </p>
                        <p>
                          Created on {new Date(quiz.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        appearance="primary"
                        color="blue"
                        block
                        onClick={() => handleStartQuiz(quiz.id)}
                      >
                        Start Quiz
                      </Button>
                    </Panel>
                  </Col>
                ))}
              </Row>
            </div>
          );
        })}
      </Grid>
    </div>
  );
};

export default QuizList; 