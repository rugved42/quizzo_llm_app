import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Panel, Grid, Row, Col, Loader, Message } from 'rsuite';

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

        // Get the student ID from localStorage
        const studentId = localStorage.getItem('studentId');
        if (!studentId) {
          setError('No student ID found. Please log in again.');
          navigate('/login');
          return;
        }

        // Fetch quiz results
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

        // Fetch textbooks
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
    ? (quizResults.reduce((sum, result) => sum + result.score, 0) / totalQuizzes).toFixed(1)
    : 0;
  const totalTimeSpent = quizResults.reduce((sum, result) => sum + (result.time_taken || 0), 0);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dashboard</h2>
      
      {/* Statistics */}
      <Grid fluid>
        <Row>
          <Col xs={24} sm={8}>
            <Panel bordered>
              <h4>Total Quizzes</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalQuizzes}</p>
            </Panel>
          </Col>
          <Col xs={24} sm={8}>
            <Panel bordered>
              <h4>Average Score</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{averageScore}%</p>
            </Panel>
          </Col>
          <Col xs={24} sm={8}>
            <Panel bordered>
              <h4>Total Time Spent</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {Math.round(totalTimeSpent / 60)} minutes
              </p>
            </Panel>
          </Col>
        </Row>
      </Grid>

      {/* Recent Activity */}
      <Panel header="Recent Quiz Activity" bordered style={{ marginTop: '20px' }}>
        {quizResults.length > 0 ? (
          <div>
            {quizResults.map((result) => (
              <div key={result.id} style={{ marginBottom: '10px', padding: '10px', borderBottom: '1px solid #eee' }}>
                <p><strong>Quiz ID:</strong> {result.quiz_id}</p>
                <p><strong>Score:</strong> {result.score}%</p>
                <p><strong>Time Taken:</strong> {Math.round(result.time_taken / 60)} minutes</p>
                <p><strong>Submitted:</strong> {new Date(result.submitted_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No quiz results found.</p>
        )}
      </Panel>

      {/* Available Textbooks */}
      <Panel header="Available Textbooks" bordered style={{ marginTop: '20px' }}>
        {textbooks.length > 0 ? (
          <div>
            {textbooks.map((textbook) => (
              <div key={textbook.id} style={{ marginBottom: '10px', padding: '10px', borderBottom: '1px solid #eee' }}>
                <p><strong>Title:</strong> {textbook.title}</p>
                <p><strong>Questions:</strong> {textbook.question_count}</p>
                <p><strong>Created:</strong> {new Date(textbook.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No textbooks available.</p>
        )}
      </Panel>
    </div>
  );
};

export default UserDashboard; 