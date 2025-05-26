import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Button, Panel, Container, Header, Content, Footer, Message } from 'rsuite';
import EyeCloseIcon from '@rsuite/icons/EyeClose';
import EyeRoundIcon from '@rsuite/icons/EyeRound';
import axios from 'axios';
import './Login.css';

interface LoginProps {
  onAuthSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        'http://localhost:8001/api/auth/login',
        formData,
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('studentId', response.data.student_id);
        localStorage.setItem('userName', response.data.name);
        onAuthSuccess();
        navigate('/dashboard', { replace: true });
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="login-container">
      <Header className="login-header">
        <h2>Welcome Back to Quizzo</h2>
        <p>Sign in to continue your learning journey</p>
      </Header>
      <Content className="login-content">
        <Panel bordered className="login-panel">
          <Form fluid onSubmit={handleSubmit}>
            <Form.Group>
              <Form.ControlLabel>Email address</Form.ControlLabel>
              <Form.Control
                name="email"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData({ ...formData, email: value })}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </Form.Group>

            <Form.Group>
              <Form.ControlLabel>Password</Form.ControlLabel>
              <div style={{ position: 'relative' }}>
                <Form.Control
                  name="password"
                  type={visible ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(value) => setFormData({ ...formData, password: value })}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <Button
                  className="password-toggle"
                  appearance="subtle"
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeCloseIcon /> : <EyeRoundIcon />}
                </Button>
              </div>
            </Form.Group>

            {error && (
              <Message type="error" className="error-message">
                {error}
              </Message>
            )}

            <Form.Group>
              <Button
                appearance="primary"
                type="submit"
                loading={loading}
                block
                className="login-button"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </Form.Group>
          </Form>
        </Panel>
      </Content>
      <Footer className="login-footer">
        <p>
          Don't have an account?{' '}
          <Link to="/register" className="register-link">
            Create one now
          </Link>
        </p>
      </Footer>
    </Container>
  );
};

export default Login; 