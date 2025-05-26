import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Input, Loader, Message } from 'rsuite';
import { useNavigate } from 'react-router-dom';
import './LiveQuizzes.css';

interface Question {
  question: string;
  options: string[];
  correct_answer: string;
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'dynamic';

const LiveQuizzes: React.FC = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isDynamicMode, setIsDynamicMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [questionsAttempted, setQuestionsAttempted] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveIncorrect, setConsecutiveIncorrect] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('http://localhost:8001/api/auth/check', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Not authenticated');
        }

        const data = await response.json();
        if (!data.isAuthenticated) {
          throw new Error('Not authenticated');
        }

        setCheckingAuth(false);
      } catch (err) {
        console.error('Auth check failed:', err);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  const generateNewQuestion = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    setGeneratingQuestion(true);
    try {
      // Get the current difficulty level to send to the backend
      const currentDifficulty = isDynamicMode ? difficulty : difficulty;
      
      const response = await fetch('http://localhost:8001/api/generate-live-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          topic,
          difficulty: currentDifficulty,
          num_questions: 1,
          used_questions: Array.from(usedQuestions),
          is_dynamic_mode: isDynamicMode,
          performance_metrics: {
            consecutive_correct: consecutiveCorrect,
            consecutive_incorrect: consecutiveIncorrect,
            total_questions: questionsAttempted,
            correct_answers: correctAnswers
          }
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error('Failed to generate question');
      }

      const data = await response.json();
      const newQuestion = data.questions[0];
      
      // If the backend suggests a difficulty change in dynamic mode, update it
      if (isDynamicMode && data.suggested_difficulty) {
        setDifficulty(data.suggested_difficulty);
      }
      
      setUsedQuestions(prev => {
        const newSet = new Set(prev);
        newSet.add(newQuestion.question);
        return newSet;
      });
      setCurrentQuestion(newQuestion);
    } catch (err) {
      setError('Failed to generate question. Please try again.');
    } finally {
      setGeneratingQuestion(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await generateNewQuestion();
      setQuizStarted(true);
      setScore(0);
      setQuestionsAttempted(0);
      setCorrectAnswers(0);
      setQuizCompleted(false);
    } catch (err) {
      setError('Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const adjustDifficulty = (isCorrect: boolean) => {
    if (!isDynamicMode) return;
    
    if (isCorrect) {
      setConsecutiveCorrect(prev => prev + 1);
      setConsecutiveIncorrect(0);
      
      // Increase difficulty after 2 consecutive correct answers
      if (consecutiveCorrect >= 1) {
        if (difficulty === 'easy') {
          setDifficulty('medium');
        } else if (difficulty === 'medium') {
          setDifficulty('hard');
        }
      }
    } else {
      setConsecutiveIncorrect(prev => prev + 1);
      setConsecutiveCorrect(0);
      
      // Decrease difficulty after 2 consecutive incorrect answers
      if (consecutiveIncorrect >= 1) {
        if (difficulty === 'hard') {
          setDifficulty('medium');
        } else if (difficulty === 'medium') {
          setDifficulty('easy');
        }
      }
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion) return;
    
    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correct_answer;
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }
    adjustDifficulty(isCorrect);
    setQuestionsAttempted(prev => prev + 1);
  };

  const handleNextQuestion = async () => {
    setSelectedAnswer(null);
    await generateNewQuestion();
  };

  const handleFinishQuiz = () => {
    const finalScore = questionsAttempted > 0 ? (correctAnswers / questionsAttempted) * 100 : 0;
    setScore(finalScore);
    setQuizCompleted(true);
  };

  const handleRestart = () => {
    setQuizStarted(false);
    setCurrentQuestion(null);
    setScore(0);
    setQuestionsAttempted(0);
    setCorrectAnswers(0);
    setSelectedAnswer(null);
    setQuizCompleted(false);
    setUsedQuestions(new Set());
    setDifficulty('medium');
    setIsDynamicMode(false);
    setConsecutiveCorrect(0);
    setConsecutiveIncorrect(0);
  };

  if (checkingAuth) {
    return (
      <Container className="live-quizzes-container">
        <Loader size="md" content="Loading..." vertical />
      </Container>
    );
  }

  if (quizCompleted) {
    return (
      <Container className="live-quizzes-container">
        <Card className="quiz-completion-card">
          <h2>Quiz Completed! 🎉</h2>
          <p className="score-display">Correct Answers: {correctAnswers}/{questionsAttempted}</p>
          <p className="percentage">{score.toFixed(1)}%</p>
          <Button appearance="primary" size="lg" onClick={handleRestart}>
            Try Another Quiz
          </Button>
        </Card>
      </Container>
    );
  }

  if (quizStarted && currentQuestion) {
    return (
      <Container className="live-quizzes-container">
        <Card className="quiz-card">
          <div className="question-counter">
            Questions Attempted: {questionsAttempted}
            {isDynamicMode && (
              <div className="difficulty-meter">
                <div className="difficulty-label">Current Difficulty:</div>
                <div className="difficulty-level">
                  <div className={`difficulty-dot ${difficulty === 'easy' ? 'active' : ''}`}></div>
                  <div className={`difficulty-dot ${difficulty === 'medium' ? 'active' : ''}`}></div>
                  <div className={`difficulty-dot ${difficulty === 'hard' ? 'active' : ''}`}></div>
                </div>
                <div className="difficulty-text">{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</div>
              </div>
            )}
          </div>
          <h3 className="question-text">{currentQuestion.question}</h3>
          <div className="options-grid">
            {currentQuestion.options.map((option, index) => (
              <Button
                key={index}
                className={`option-button ${
                  selectedAnswer === option 
                    ? option === currentQuestion.correct_answer 
                      ? 'correct' 
                      : 'incorrect'
                    : selectedAnswer && option === currentQuestion.correct_answer
                      ? 'correct'
                      : ''
                }`}
                onClick={() => !selectedAnswer && handleAnswerSelect(option)}
                block
                disabled={!!selectedAnswer}
              >
                {option}
              </Button>
            ))}
          </div>
          <div className="button-group">
            <Button
              appearance="primary"
              size="lg"
              onClick={handleNextQuestion}
              disabled={!selectedAnswer || generatingQuestion}
              loading={generatingQuestion}
              className="next-button"
            >
              Next Question
            </Button>
            <Button
              appearance="primary"
              color="red"
              size="lg"
              onClick={handleFinishQuiz}
              disabled={!selectedAnswer}
              className="finish-button"
            >
              End Quiz
            </Button>
          </div>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="live-quizzes-container">
      <Row>
        <Col xs={24} md={16} mdOffset={4}>
          <Card className="setup-card">
            <h2>Live Quiz Generator</h2>
            <p className="description">
              Generate instant quizzes on any topic! Just enter a topic and choose the difficulty level.
              You'll see the correct answer immediately after selecting your choice.
              Questions are generated one at a time to ensure variety and relevance.
            </p>
            
            <div className="input-group">
              <Input
                placeholder="Enter a topic (e.g., 'Space Exploration', 'Ancient History')"
                value={topic}
                onChange={setTopic}
                size="lg"
              />
            </div>

            <div className="difficulty-buttons">
              <Button
                appearance={!isDynamicMode && difficulty === 'easy' ? 'primary' : 'default'}
                onClick={() => {
                  setDifficulty('easy');
                  setIsDynamicMode(false);
                }}
              >
                Easy
              </Button>
              <Button
                appearance={!isDynamicMode && difficulty === 'medium' ? 'primary' : 'default'}
                onClick={() => {
                  setDifficulty('medium');
                  setIsDynamicMode(false);
                }}
              >
                Medium
              </Button>
              <Button
                appearance={!isDynamicMode && difficulty === 'hard' ? 'primary' : 'default'}
                onClick={() => {
                  setDifficulty('hard');
                  setIsDynamicMode(false);
                }}
              >
                Hard
              </Button>
              <Button
                appearance={isDynamicMode ? 'primary' : 'default'}
                onClick={() => {
                  if (isDynamicMode) {
                    // If dynamic mode is on, turn it off and keep the current difficulty
                    setIsDynamicMode(false);
                  } else {
                    // If dynamic mode is off, turn it on and set to medium
                    setIsDynamicMode(true);
                    setDifficulty('medium');
                  }
                }}
              >
                Dynamic
              </Button>
            </div>

            {error && (
              <Message type="error" className="error-message">
                {error}
              </Message>
            )}

            <Button
              appearance="primary"
              size="lg"
              onClick={handleGenerateQuiz}
              loading={loading}
              className="generate-button"
            >
              Start Quiz
            </Button>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LiveQuizzes; 