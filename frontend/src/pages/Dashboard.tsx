import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './Dashboard.css';

interface Quiz {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  time_limit: number;
  total_questions: number;
}

interface RecentActivity {
  id: number;
  quiz_title: string;
  score: number;
  completed_at: string;
}

interface TextbookQuiz {
  id: number;
  title: string;
  difficulty: string;
  time_limit: number;
  question_count: number;
}

interface Textbook {
  textbook_id: number;
  textbook_title: string;
  quizzes: TextbookQuiz[];
}

const Dashboard: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'activity'>('quizzes');

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const studentId = localStorage.getItem('studentId');

      if (!token || !studentId) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      setLoading(true);

      const [quizzesResponse, activityResponse] = await Promise.all([
        axios.get('http://localhost:8001/api/quizzes', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }),
        axios.get(`http://localhost:8001/api/students/${studentId}/recent-activity`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        })
      ]);

      console.log('Quizzes Response:', quizzesResponse.data);
      console.log('Activity Response:', activityResponse.data);

      if (quizzesResponse.data) {
        const allQuizzes = quizzesResponse.data.flatMap((textbook: Textbook) => 
          textbook.quizzes.map((quiz: TextbookQuiz) => ({
            id: quiz.id,
            title: quiz.title,
            description: `Quiz from ${textbook.textbook_title}`,
            category: textbook.textbook_title,
            difficulty: quiz.difficulty || 'medium',
            time_limit: quiz.time_limit || 30,
            total_questions: quiz.question_count || 0
          }))
        );
        console.log('Processed Quizzes:', allQuizzes);
        setQuizzes(allQuizzes);
      }
      
      if (activityResponse.data) {
        console.log('Setting Recent Activity:', activityResponse.data);
        setRecentActivity(activityResponse.data);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      if (err.response?.status === 403) {
        setError('Not authorized to access this data');
      } else if (err.response?.status === 404) {
        setError('Recent activity data not found');
      } else {
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleTabChange = (tab: 'quizzes' | 'activity') => {
    setActiveTab(tab);
    fetchDashboardData();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
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

  if (error) {
    return (
      <motion.div 
        className="dashboard-error"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2>Oops! Something went wrong</h2>
        <p>{error}</p>
      </motion.div>
    );
  }

  const renderQuizzes = () => (
    <motion.div
      key="quizzes"
      className="quizzes-grid"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      {quizzes && quizzes.length > 0 ? (
        quizzes.map((quiz) => (
          <motion.div
            key={quiz.id}
            className="quiz-card"
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="quiz-header">
              <h3>{quiz.title}</h3>
              <span className={`difficulty-badge ${quiz.difficulty?.toLowerCase() || 'medium'}`}>
                {quiz.difficulty || 'Medium'}
              </span>
            </div>
            <p className="quiz-description">{quiz.description}</p>
            <div className="quiz-details">
              <span>⏱️ {quiz.time_limit} mins</span>
              <span>❓ {quiz.total_questions} questions</span>
              <span>📚 {quiz.category}</span>
            </div>
            <motion.button
              className="start-quiz-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = `/quiz/${quiz.id}`}
            >
              Start Quiz
            </motion.button>
          </motion.div>
        ))
      ) : (
        <div className="no-quizzes-message">
          <p>No quizzes available at the moment.</p>
        </div>
      )}
    </motion.div>
  );

  const renderActivity = () => (
    <motion.div
      key="activity"
      className="activity-list"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {recentActivity && recentActivity.length > 0 ? (
        recentActivity.map((activity) => (
          <motion.div
            key={activity.id}
            className="activity-card"
            variants={itemVariants}
            whileHover={{ scale: 1.01, x: 5 }}
          >
            <div className="activity-header">
              <h3>{activity.quiz_title}</h3>
              <span className="score-badge">
                Score: {activity.score}%
              </span>
            </div>
            <p className="activity-date">
              Completed on {new Date(activity.completed_at).toLocaleDateString()}
            </p>
          </motion.div>
        ))
      ) : (
        <div className="no-activity-message">
          <p>No recent activity to display.</p>
        </div>
      )}
    </motion.div>
  );

  return (
    <motion.div 
      className="dashboard-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="dashboard-header" variants={itemVariants}>
        <h1>Welcome back, {localStorage.getItem('userName')}!</h1>
        <p>Ready to test your knowledge?</p>
      </motion.div>

      <motion.div className="dashboard-tabs" variants={itemVariants}>
        <motion.button
          className={`tab-button ${activeTab === 'quizzes' ? 'active' : ''}`}
          onClick={() => handleTabChange('quizzes')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Available Quizzes
        </motion.button>
        <motion.button
          className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => handleTabChange('activity')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Recent Activity
        </motion.button>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'quizzes' ? renderQuizzes() : renderActivity()}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;