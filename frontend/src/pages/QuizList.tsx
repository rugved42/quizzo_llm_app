import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface Textbook {
  id: number;
  title: string;
  chapters: number;
}

interface Chapter {
  id: number;
  title: string;
  number: number;
  questions: number;
}

const QuizList: React.FC = () => {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [selectedTextbook, setSelectedTextbook] = useState<number | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchTextbooks();
  }, []);

  useEffect(() => {
    if (selectedTextbook) {
      fetchChapters(selectedTextbook);
    }
  }, [selectedTextbook]);

  const fetchTextbooks = async () => {
    try {
      const response = await axios.get('http://localhost:8001/api/pdf/textbooks');
      setTextbooks(response.data);
    } catch (err) {
      setError('Error fetching textbooks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async (textbookId: number) => {
    try {
      const response = await axios.get(`http://localhost:8001/api/pdf/textbooks/${textbookId}/chapters`);
      setChapters(response.data);
    } catch (err) {
      setError('Error fetching chapters');
      console.error(err);
    }
  };

  const createQuiz = async (chapterId: number) => {
    try {
      const response = await axios.post('http://localhost:8001/api/quiz/create', {
        chapter_id: chapterId,
        num_questions: 10,
        time_limit: 30
      });
      // Redirect to quiz taking page
      window.location.href = `/quiz/${response.data.quiz_id}`;
    } catch (err) {
      setError('Error creating quiz');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Available Quizzes</h2>
      
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="mb-8">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Select Textbook
        </label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={selectedTextbook || ''}
          onChange={(e) => setSelectedTextbook(Number(e.target.value))}
        >
          <option value="">Select a textbook</option>
          {textbooks.map((textbook) => (
            <option key={textbook.id} value={textbook.id}>
              {textbook.title} ({textbook.chapters} chapters)
            </option>
          ))}
        </select>
      </div>

      {selectedTextbook && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="bg-white p-4 rounded-lg shadow-md"
            >
              <h3 className="text-lg font-semibold mb-2">
                Chapter {chapter.number}: {chapter.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {chapter.questions} questions available
              </p>
              <button
                onClick={() => createQuiz(chapter.id)}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                Start Quiz
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizList; 