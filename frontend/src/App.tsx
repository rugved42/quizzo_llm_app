import React from 'react';
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
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && <Navbar />}
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Login />
            } 
          />
          <Route 
            path="/register" 
            element={
              isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Register />
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
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App; 