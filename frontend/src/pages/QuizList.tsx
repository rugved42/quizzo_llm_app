import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './QuizList.css';

interface Quiz {
  id: number;
  title: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  time_limit: number;
  question_count: number;
  created_at: string;
}

interface Textbook {
  id: number;
  name: string;
  quizzes: Quiz[];
}

interface ApiResponse {
  textbook_id: number;
  textbook_title: string;
  quizzes: Quiz[];
}

const QuizList: React.FC = () => {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated. Please login.');
          setLoading(false);
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:8001/api/quizzes', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        console.log('Raw API Response:', JSON.stringify(response.data, null, 2));
        const apiData: ApiResponse[] = response.data;
        
        // Transform API response into our internal structure
        const textbooksArray = apiData.map(item => ({
          id: item.textbook_id,
          name: item.textbook_title,
          quizzes: item.quizzes
        }));
        
        console.log('Processed textbooks:', textbooksArray.map(t => ({
          id: t.id,
          name: t.name,
          quizCount: t.quizzes.length
        })));
        
        setTextbooks(textbooksArray);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching quizzes:', err);
        setError('Failed to load quizzes. Please try again later.');
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [navigate]);

  const filterQuizzes = (quizzes: Quiz[]) => {
    if (!quizzes || !Array.isArray(quizzes)) {
      console.log('Invalid quizzes array:', quizzes);
      return [];
    }

    console.log('Starting filter with:', {
      totalQuizzes: quizzes.length,
      searchQuery,
      difficultyFilter,
      timeFilter,
      firstQuiz: quizzes[0]
    });

    const filtered = quizzes.filter(quiz => {
      if (!quiz) {
        console.log('Invalid quiz object:', quiz);
        return false;
      }

      // Always return true if no filters are active
      if (!searchQuery && difficultyFilter === 'all' && timeFilter === 'all') {
        return true;
      }

      const searchLower = searchQuery.toLowerCase();
      const titleMatch = quiz.title ? quiz.title.toLowerCase().includes(searchLower) : false;
      const matchesSearch = !searchQuery || titleMatch;

      const matchesDifficulty = difficultyFilter === 'all' || 
                               (quiz.difficulty && quiz.difficulty.toLowerCase() === difficultyFilter.toLowerCase());

      const matchesTime = timeFilter === 'all' || 
                         (timeFilter === 'short' && quiz.time_limit <= 15) ||
                         (timeFilter === 'medium' && quiz.time_limit > 15 && quiz.time_limit <= 30) ||
                         (timeFilter === 'long' && quiz.time_limit > 30);

      const matches = matchesSearch && matchesDifficulty && matchesTime;
      
      console.log(`Quiz ${quiz.id} (${quiz.title}):`, {
        matchesSearch,
        matchesDifficulty,
        matchesTime,
        finalMatch: matches,
        difficulty: quiz.difficulty,
        timeLimit: quiz.time_limit
      });
      
      return matches;
    });

    console.log('Filter results:', {
      totalBefore: quizzes.length,
      totalAfter: filtered.length,
      filteredQuizzes: filtered.map(q => q.title)
    });

    return filtered;
  };

  const handleStartQuiz = (quizId: number) => {
    navigate(`/quiz/${quizId}`);
  };

  if (loading) {
    return (
      <div className="quiz-list-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-list-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="quiz-list-container">
      <div className="quiz-list-header">
        <h1 className="quiz-list-title">Available Quizzes</h1>
        <div className="filter-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="filter-select"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select
            className="filter-select"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="all">All Durations</option>
            <option value="short">Short (&le;15 min)</option>
            <option value="medium">Medium (15-30 min)</option>
            <option value="long">Long (&gt;30 min)</option>
          </select>
        </div>
      </div>

      {textbooks.map(textbook => {
        const filteredQuizzes = filterQuizzes(textbook.quizzes);
        if (filteredQuizzes.length === 0) return null;

        return (
          <div key={textbook.id} className="textbook-section">
            <div className="textbook-header">
              <h2 className="textbook-title">{textbook.name}</h2>
            </div>
            <div className="quiz-grid">
              {filteredQuizzes.map(quiz => (
                <div key={quiz.id} className="quiz-card">
                  <h3 className="quiz-title">{quiz.title}</h3>
                  <div className="quiz-info">
                    <div className="quiz-meta questions">
                      {quiz.question_count} Questions
                    </div>
                    <div className="quiz-meta difficulty">
                      <span className={`difficulty-badge difficulty-${quiz.difficulty}`}>
                        {quiz.difficulty}
                      </span>
                    </div>
                    <div className="quiz-meta time">
                      {quiz.time_limit} minutes
                    </div>
                  </div>
                  <button
                    className="start-button"
                    onClick={() => handleStartQuiz(quiz.id)}
                  >
                    Start Quiz
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {textbooks.every(textbook => filterQuizzes(textbook.quizzes).length === 0) && (
        <div className="no-quizzes">
          No quizzes found matching your criteria
        </div>
      )}
    </div>
  );
};

export default QuizList; 