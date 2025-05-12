import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Question {
  id: number;
  text: string;
  options: string[];
  correct_answer: string;
}

interface QuizTakingProps {
  quizId?: string;
}

const QuizTaking: React.FC<QuizTakingProps> = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) {
      setError('Please register before taking the quiz');
      setTimeout(() => {
        navigate('/register');
      }, 2000);
    }
  }, [navigate]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`http://localhost:8001/quizzes/${quizId}/questions`);
        setQuestions(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load questions');
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuestions();
    }
  }, [quizId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuestionTimes(prev => ({
        ...prev,
        [currentQuestionIndex]: (Date.now() - startTime) / 1000
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, startTime]);

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questions[currentQuestionIndex].id]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setStartTime(Date.now());
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setStartTime(Date.now());
    }
  };

  const handleSubmit = async () => {
    try {
      const studentId = localStorage.getItem('studentId');
      if (!studentId) {
        navigate('/register');
        return;
      }

      const response = await axios.post('http://localhost:8001/submit-quiz', {
        quiz_id: quizId,
        student_id: studentId,
        answers: selectedAnswers,
        question_times: questionTimes
      });

      navigate(`/results/${response.data.result_id}`);
    } catch (err) {
      setError('Failed to submit quiz');
    }
  };

  if (loading) return <div className="quiz-container">Loading...</div>;
  if (error) return <div className="quiz-container error">{error}</div>;
  if (!questions.length) return <div className="quiz-container">No questions found</div>;

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = selectedAnswers[currentQuestion.id];

  return (
    <div className="quiz-container">
      <div className="question">
        <h3>Question {currentQuestionIndex + 1} of {questions.length}</h3>
        <p>{currentQuestion.text}</p>
        <div className="options">
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              className={`option ${selectedAnswer === option ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(option)}
            >
              {option}
            </div>
          ))}
        </div>
      </div>
      <div className="navigation-buttons">
        <button onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
          Previous
        </button>
        {currentQuestionIndex === questions.length - 1 ? (
          <button onClick={handleSubmit} disabled={!selectedAnswer}>
            Submit
          </button>
        ) : (
          <button onClick={handleNext} disabled={!selectedAnswer}>
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizTaking; 