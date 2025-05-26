import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import QuizList from './pages/QuizList';
import QuizTaking from './pages/QuizTaking';
import QuizResults from './pages/QuizResults';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import LiveQuizzes from './pages/LiveQuizzes';
import './App.css';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for token in localStorage on initial load
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  // Function to handle successful login/registration
  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  // Function to handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('studentId');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          🎯
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {isAuthenticated && <Navbar onLogout={handleLogout} />}
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route 
              path="/login" 
              element={
                isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <Login onAuthSuccess={handleAuthSuccess} />
              } 
            />
            <Route 
              path="/register" 
              element={
                isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <Register onAuthSuccess={handleAuthSuccess} />
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                isAuthenticated ? 
                <Dashboard /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route 
              path="/quizzes" 
              element={
                isAuthenticated ? 
                <QuizList /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route
              path="/quiz/:quizId"
              element={
                isAuthenticated ? 
                <QuizTaking /> : 
                <Navigate to="/login" replace />
              }
            />
            <Route
              path="/results/:quizId"
              element={
                isAuthenticated ? 
                <QuizResults /> : 
                <Navigate to="/login" replace />
              }
            />
            <Route
              path="/upload"
              element={
                isAuthenticated ? 
                <Upload /> : 
                <Navigate to="/login" replace />
              }
            />
            <Route
              path="/live-quizzes"
              element={
                isAuthenticated ? 
                <LiveQuizzes /> : 
                <Navigate to="/login" replace />
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App; 