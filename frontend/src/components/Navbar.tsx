import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Navbar.css';

interface NavbarProps {
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName');

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <motion.nav 
      className="navbar"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          <motion.span 
            className="brand-text"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Quizzo
          </motion.span>
        </Link>

        <div className="navbar-links">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link to="/quizzes" className="nav-link">Quizzes</Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link to="/live-quizzes" className="nav-link">Live Quizzes</Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link to="/upload" className="nav-link">Upload</Link>
          </motion.div>
        </div>

        <div className="navbar-user">
          <motion.span 
            className="user-name"
            whileHover={{ scale: 1.05 }}
          >
            {userName}
          </motion.span>
          <motion.button
            className="logout-button"
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Logout
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar; 