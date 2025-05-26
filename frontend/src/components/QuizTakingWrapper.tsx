import React from 'react';
import { useNavigate } from 'react-router-dom';

interface QuizTakingWrapperProps {
  children: React.ReactNode;
}

const QuizTakingWrapper: React.FC<QuizTakingWrapperProps> = ({ children }) => {
  const navigate = useNavigate();

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };

  React.useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizTakingWrapper; 