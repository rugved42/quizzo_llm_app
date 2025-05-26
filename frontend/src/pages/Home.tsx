import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import UserDashboard from '../components/UserDashboard';
import './Home.css';

const Home: React.FC = () => {
  const isAuthenticated = !!localStorage.getItem('token');

  if (isAuthenticated) {
    return <UserDashboard />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <motion.div 
        className="hero-section"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="hero-content" variants={itemVariants}>
          <motion.h1 
            className="hero-title"
            variants={itemVariants}
          >
            Welcome to <span className="gradient-text">Quizzo</span>
          </motion.h1>
          <motion.p 
            className="hero-subtitle"
            variants={itemVariants}
          >
            Your AI-powered quiz platform for creating and taking interactive quizzes.
            Upload your textbooks and let our AI generate questions for you.
          </motion.p>
          <motion.div 
            className="cta-buttons"
            variants={itemVariants}
          >
            <Link to="/register" className="cta-button primary">
              Get Started
            </Link>
            <Link to="/login" className="cta-button secondary">
              Login
            </Link>
          </motion.div>
        </motion.div>
        <motion.div 
          className="hero-image"
          variants={itemVariants}
        >
          <div className="floating-elements">
            <motion.div
              className="floating-element"
              animate={{
                y: [0, -20, 0],
                rotate: [0, 5, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              📚
            </motion.div>
            <motion.div
              className="floating-element"
              animate={{
                y: [0, -15, 0],
                rotate: [0, -5, 0]
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            >
              🎯
            </motion.div>
            <motion.div
              className="floating-element"
              animate={{
                y: [0, -25, 0],
                rotate: [0, 8, 0]
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            >
              🏆
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Features Section */}
      <motion.div 
        className="features-section"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          A better way to learn
        </motion.h2>
        <div className="features-grid">
          {[
            {
              icon: "🤖",
              title: "AI-Powered Questions",
              description: "Our AI analyzes your textbooks and generates relevant questions to test your understanding."
            },
            {
              icon: "🎨",
              title: "Customizable Quizzes",
              description: "Create quizzes with different difficulty levels and topics to match your learning needs."
            },
            {
              icon: "📊",
              title: "Track Progress",
              description: "Monitor your performance and track your improvement over time with detailed analytics."
            },
            {
              icon: "⚡",
              title: "Instant Feedback",
              description: "Get immediate feedback on your answers and learn from your mistakes in real-time."
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Home; 