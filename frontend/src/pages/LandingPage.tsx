import React from 'react';
import { Container, Row, Col, Button } from 'rsuite';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = (): void => {
    navigate('/login');
  };

  const handleRegister = (): void => {
    navigate('/register');
  };

  return (
    <div className="landing-page">
      <Container>
        <Row className="landing-content">
          <Col xs={24} md={12}>
            <div className="text-content animate-fade-in">
              <h1 className="title animate-slide-up">
                Welcome to Quizzo
              </h1>
              <p className="subtitle animate-slide-up delay-1">
                Test your knowledge with our interactive quiz platform
              </p>

              <div className="features">
                <div className="feature-item animate-slide-up delay-2">
                  <h3>Real-time Quizzes</h3>
                  <p>Engage in live quizzes with instant feedback</p>
                </div>
                <div className="feature-item animate-slide-up delay-3">
                  <h3>Track Progress</h3>
                  <p>Monitor your performance and improve over time</p>
                </div>
                <div className="feature-item animate-slide-up delay-4">
                  <h3>Learn & Grow</h3>
                  <p>Expand your knowledge with diverse topics</p>
                </div>
              </div>

              <div className="cta-buttons animate-slide-up delay-5">
                <Button
                  className="login-button"
                  size="lg"
                  onClick={handleLogin}
                >
                  Login
                </Button>
                <Button
                  className="register-button"
                  size="lg"
                  onClick={handleRegister}
                >
                  Register
                </Button>
              </div>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <div className="visual-content animate-fade-in">
              <div className="hero-image">
                <div className="floating-elements">
                  <div className="floating-element animate-float">
                    📚
                  </div>
                  <div className="floating-element animate-float delay-1">
                    🎯
                  </div>
                  <div className="floating-element animate-float delay-2">
                    🏆
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LandingPage; 