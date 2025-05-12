import React from 'react';
import { useParams } from 'react-router-dom';
import QuizTaking from '../pages/QuizTaking';

const QuizTakingWrapper: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  return <QuizTaking quizId={quizId || ''} />;
};

export default QuizTakingWrapper; 