import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Panel, Grid, Row, Col, Loader, Message, Stack, Button, Card, Tag } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';

interface QuizResult {
  id: number;
  quiz_id: number;
  score: number;
  time_taken: number;
  submitted_at: string;
}

interface Textbook {
  id: number;
  title: string;
  question_count: number;
  created_at: string;
}

const UserDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const studentId = localStorage.getItem('studentId');
        if (!studentId) {
          setError('No student ID found. Please log in again.');
          navigate('/login');
          return;
        }

        const resultsResponse = await axios.get(
          `http://localhost:8001/api/user/results/${studentId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          }
        );

        const textbooksResponse = await axios.get(
          'http://localhost:8001/api/textbooks',
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          }
        );

        setQuizResults(resultsResponse.data);
        setTextbooks(textbooksResponse.data);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        if (err.response?.status === 401) {
          setError('Session expired. Please log in again.');
          navigate('/login');
        } else {
          setError('Failed to load dashboard data. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Loader size="md" content="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <Message type="error" style={{ margin: '20px' }}>
        {error}
      </Message>
    );
  }

  // Calculate statistics
  const totalQuizzes = quizResults.length;
  const averageScore = totalQuizzes > 0
    ? (quizResults.reduce((sum, result) => sum + result.score, 0) / totalQuizzes).toFixed(2)
    : '0.00';
  
  const totalQuestionsGenerated = textbooks.reduce((sum, textbook) => sum + textbook.question_count, 0);
  const totalTextbooksUploaded = textbooks.length;

  const recentResults = quizResults.slice(0, 5); // Get 5 most recent results

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <Stack direction="column" spacing={40}>
        {/* Welcome Section */}
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1675e0' }}>
            Welcome back, {localStorage.getItem('userName')}!
          </h2>
          <p style={{ marginTop: '12px', color: '#666', fontSize: '16px' }}>
            Track your progress and continue learning
          </p>
          <Button 
            appearance="primary" 
            size="lg"
            onClick={() => navigate('/quizzes')}
            style={{ 
              marginTop: '20px',
              padding: '12px 24px',
              fontSize: '16px'
            }}
          >
            View All Quizzes
          </Button>
        </div>

        {/* Statistics Cards */}
        <Grid fluid>
          <Row gutter={30}>
            <Col xs={24} sm={8}>
              <Card bordered style={{ height: '100%', transition: 'box-shadow 0.3s ease', borderRadius: '12px' }} className="hover-shadow">
                <Stack spacing={20}>
                  <div style={{ 
                    background: '#e6f7ff', 
                    padding: '20px', 
                    borderRadius: '12px',
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '32px', color: '#1675e0' }}>📊</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#666', fontSize: '16px' }}>Total Quizzes</h4>
                    <p style={{ fontSize: '36px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#1675e0' }}>
                      {totalQuizzes.toLocaleString()}
                    </p>
                  </div>
                </Stack>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card bordered style={{ height: '100%', transition: 'box-shadow 0.3s ease', borderRadius: '12px' }} className="hover-shadow">
                <Stack spacing={20}>
                  <div style={{ 
                    background: '#e6f7ff', 
                    padding: '20px', 
                    borderRadius: '12px',
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '32px', color: '#1675e0' }}>📈</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#666', fontSize: '16px' }}>Average Score</h4>
                    <p style={{ fontSize: '36px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#1675e0' }}>
                      {averageScore}%
                    </p>
                  </div>
                </Stack>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card bordered style={{ height: '100%', transition: 'box-shadow 0.3s ease', borderRadius: '12px' }} className="hover-shadow">
                <Stack spacing={20}>
                  <div style={{ 
                    background: '#e6f7ff', 
                    padding: '20px', 
                    borderRadius: '12px',
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '32px', color: '#1675e0' }}>❓</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#666', fontSize: '16px' }}>Total Questions Generated</h4>
                    <p style={{ fontSize: '36px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#1675e0' }}>
                      {totalQuestionsGenerated.toLocaleString()}
                    </p>
                  </div>
                </Stack>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card bordered style={{ height: '100%', transition: 'box-shadow 0.3s ease', borderRadius: '12px' }} className="hover-shadow">
                <Stack spacing={20}>
                  <div style={{ 
                    background: '#e6f7ff', 
                    padding: '20px', 
                    borderRadius: '12px',
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '32px', color: '#1675e0' }}>📚</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#666', fontSize: '16px' }}>Total Textbooks Uploaded</h4>
                    <p style={{ fontSize: '36px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#1675e0' }}>
                      {totalTextbooksUploaded.toLocaleString()}
                    </p>
                  </div>
                </Stack>
              </Card>
            </Col>
          </Row>
        </Grid>

        {/* Recent Activity and Textbooks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '30px' }}>
          {/* Recent Activity */}
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1675e0', marginBottom: '20px' }}>
              Recent Quiz Activity
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recentResults.length > 0 ? (
                recentResults.map((result) => (
                  <div 
                    key={result.id} 
                    style={{ 
                      background: 'white',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #e5e5ea',
                      transition: 'all 0.3s ease'
                    }} 
                    className="hover-shadow"
                  >
                    <Stack justifyContent="space-between" alignItems="center">
                      <div>
                        <h5 style={{ margin: 0, color: '#1675e0', fontSize: '18px' }}>Quiz #{result.quiz_id}</h5>
                        <Stack spacing={24} style={{ marginTop: '8px' }}>
                          <Tag color={result.score >= 70 ? 'green' : result.score >= 50 ? 'orange' : 'red'} style={{ fontSize: '14px', padding: '4px 12px' }}>
                            {result.score.toFixed(2)}%
                          </Tag>
                          <span style={{ color: '#666', fontSize: '14px' }}>
                            {(result.time_taken || 0).toFixed(2)} seconds
                          </span>
                        </Stack>
                      </div>
                      <Button
                        size="md"
                        onClick={() => navigate(`/results/${result.quiz_id}`)}
                        style={{ 
                          background: '#e6f7ff', 
                          color: '#1675e0',
                          padding: '8px 16px',
                          fontSize: '14px'
                        }}
                      >
                        View Details
                      </Button>
                    </Stack>
                  </div>
                ))
              ) : (
                <div style={{ 
                  padding: '20px', 
                  color: '#666', 
                  background: 'white', 
                  borderRadius: '12px', 
                  border: '1px solid #e5e5ea' 
                }}>
                  No quiz results found.
                </div>
              )}
            </div>
          </div>

          {/* Available Textbooks */}
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1675e0', marginBottom: '20px' }}>
              Available Textbooks
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {textbooks.length > 0 ? (
                textbooks.map((textbook) => (
                  <div 
                    key={textbook.id} 
                    style={{ 
                      background: 'white',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #e5e5ea',
                      transition: 'all 0.3s ease'
                    }} 
                    className="hover-shadow"
                  >
                    <Stack justifyContent="space-between" alignItems="center">
                      <Stack spacing={20}>
                        <div style={{ 
                          background: '#e6f7ff', 
                          padding: '16px', 
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: '24px', color: '#1675e0' }}>📚</span>
                        </div>
                        <div>
                          <h5 style={{ margin: 0, color: '#1675e0', fontSize: '18px' }}>{textbook.title}</h5>
                          <Stack spacing={24} style={{ marginTop: '8px' }}>
                            <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>{textbook.question_count.toLocaleString()} Questions</Tag>
                            <span style={{ color: '#666', fontSize: '14px' }}>
                              Added {new Date(textbook.created_at).toLocaleDateString()}
                            </span>
                          </Stack>
                        </div>
                      </Stack>
                      <Button
                        size="md"
                        appearance="primary"
                        onClick={() => navigate('/quizzes')}
                        style={{ 
                          padding: '8px 16px',
                          fontSize: '14px'
                        }}
                      >
                        Take Quiz
                      </Button>
                    </Stack>
                  </div>
                ))
              ) : (
                <div style={{ 
                  padding: '20px', 
                  color: '#666', 
                  background: 'white', 
                  borderRadius: '12px', 
                  border: '1px solid #e5e5ea' 
                }}>
                  No textbooks available.
                </div>
              )}
            </div>
          </div>
        </div>
      </Stack>

      <style>
        {`
          .hover-shadow {
            transition: all 0.2s ease;
          }
          .hover-shadow:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            border-color: #1675e0;
          }
        `}
      </style>
    </div>
  );
};

export default UserDashboard; 