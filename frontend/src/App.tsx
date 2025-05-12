import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import FileUpload from './components/FileUpload';
import QuizList from './components/QuizList';
import QuizTaking from './pages/QuizTaking';
import Results from './pages/Results';
import StudentRegistration from './pages/StudentRegistration';
import './App.css';

const Navigation = () => {
  const location = useLocation();
  const studentId = localStorage.getItem('studentId');

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">Quizzo</Link>
        <div className="nav-links">
          {studentId ? (
            <>
              <Link 
                to="/" 
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                Home
              </Link>
              <Link 
                to="/upload" 
                className={`nav-link ${location.pathname === '/upload' ? 'active' : ''}`}
              >
                Upload Quiz
              </Link>
              <button 
                onClick={() => {
                  localStorage.removeItem('studentId');
                  window.location.href = '/';
                }}
                className="nav-link"
              >
                Logout
              </button>
            </>
          ) : (
            <Link 
              to="/register" 
              className={`nav-link ${location.pathname === '/register' ? 'active' : ''}`}
            >
              Register
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <div className="container">
          <Routes>
            <Route path="/" element={<QuizList />} />
            <Route path="/upload" element={<FileUpload />} />
            <Route path="/quiz/:quizId" element={<QuizTaking />} />
            <Route path="/results/:resultId" element={<Results />} />
            <Route path="/register" element={<StudentRegistration />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App; 