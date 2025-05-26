import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import QuizList from './pages/QuizList';
import QuizTaking from './pages/QuizTaking';
import QuizResults from './pages/QuizResults';
import FileUpload from './components/FileUpload';
import './App.css';

const App: React.FC = () => {
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  useEffect(() => {
    const checkAuth = () => {
      const studentId = localStorage.getItem('studentId');
      setIsRegistered(!!studentId);
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('studentId');
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setIsRegistered(false);
    window.location.href = '/';
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar isRegistered={isRegistered} onLogout={handleLogout} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/quizzes" element={<QuizList />} />
            <Route path="/quiz/:quizId" element={<QuizTaking />} />
            <Route path="/results/:quizId" element={<QuizResults />} />
            <Route path="/upload" element={<FileUpload />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App; 