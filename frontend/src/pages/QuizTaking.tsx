import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button, Panel, Loader, Message, Progress, Radio, RadioGroup, Stack, ButtonGroup, IconButton } from 'rsuite';
import { ArrowLeft, ArrowRight, Check } from '@rsuite/icons';
import 'rsuite/dist/rsuite.min.css';

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

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (quiz?.time_limit) {
      setTimeLeft(quiz.time_limit * 60);
    }
  }, [quiz]);

  useEffect(() => {
    // Reset question start time when question changes
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
      console.log('Token from localStorage:', token);
      
      if (!token) {
        console.error('No token found in localStorage');
        setError('Not authenticated. Please login.');
        setLoading(false);
        navigate('/login');
        return;
      }

      console.log('Fetching quiz with ID:', quizId);
      const response = await axios.get(
        `http://localhost:8001/api/quizzes/${quizId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Quiz response:', response.data);
      setQuiz(response.data);
      setCurrentQuestion(0);
    } catch (err: any) {
      console.error('Error fetching quiz:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        headers: err.response?.headers
      });
      
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
    // Record time spent on current question
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

    // Record time for the last question
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

      console.log('Submitting quiz with answers:', answers);
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
      
      console.log('Quiz submission response:', response.data);
      navigate(`/results/${quizId}`, { state: { results: response.data } });
    } catch (err: any) {
      console.error('Error submitting quiz:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        headers: err.response?.headers
      });
      
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('studentId');
        localStorage.removeItem('userName');
        setError('Session expired. Please login again.');
        navigate('/login');
      } else {
        setError('Failed to submit quiz. Please try again.');
      }
    } finally {
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
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Loader size="md" content="Loading quiz..." />
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

  if (!quiz) {
    return (
      <div style={{ padding: '20px' }}>
        <Message type="warning" header="Notice">
          Quiz not found
        </Message>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Panel shaded>
        <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{quiz.title}</h2>
          <div style={{ fontSize: '18px', fontWeight: 'medium' }}>
            Time Left: {formatTime(timeLeft)}
          </div>
        </Stack>

        <Stack spacing={10} style={{ marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <Progress.Line percent={progress} status="active" />
          </div>
          <div style={{ minWidth: '100px', textAlign: 'right' }}>
            Question {currentQuestion + 1} of {quiz.questions.length}
          </div>
        </Stack>

        <Panel bordered style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>{question.text}</h3>
          <RadioGroup
            value={answers[question.id]}
            onChange={(value) => handleAnswerSelect(question.id, value as string)}
            style={{ width: '100%' }}
          >
            <Stack direction="column" spacing={15} style={{ width: '100%' }}>
              {question.options.map((option, index) => (
                <Radio 
                  key={index} 
                  value={option}
                  style={{ 
                    padding: '12px 15px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    width: '100%',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#ffffff',
                    transition: 'background-color 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  {option}
                </Radio>
              ))}
            </Stack>
          </RadioGroup>
        </Panel>

        <Stack justifyContent="space-between" spacing={10}>
          <Button
            appearance="default"
            startIcon={<ArrowLeft />}
            onClick={() => handleQuestionChange(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          
          {currentQuestion < quiz.questions.length - 1 ? (
            <Button
              appearance="primary"
              endIcon={<ArrowRight />}
              onClick={() => handleQuestionChange(Math.min(quiz.questions.length - 1, currentQuestion + 1))}
            >
              Next
            </Button>
          ) : (
            <Button
              appearance="primary"
              color="green"
              startIcon={<Check />}
              loading={submitting}
              onClick={handleSubmit}
            >
              Submit Quiz
            </Button>
          )}
        </Stack>
      </Panel>
    </div>
  );
};

export default QuizTaking; 