import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface QuizResult {
  id: number;
  quiz_id: number;
  student_id: number;
  score: number;
  answers: Record<string, string>;
  question_times: Record<string, number>;
  submitted_at: string;
}

const Results: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8001/api/quizzes/${quizId}/result`,
          { withCredentials: true }
        );
        setResult(response.data);
      } catch (err) {
        setError('Failed to load quiz results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchResult();
    }
  }, [quizId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/quizzes')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No results found for this quiz.</p>
          <button
            onClick={() => navigate('/quizzes')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  const scorePercentage = Math.round((result.score / Object.keys(result.answers).length) * 100);

  // Safely handle question times
  const questionTimes = result.question_times || {};
  const timeValues = Object.values(questionTimes).filter(time => typeof time === 'number');
  const timeLabels = Object.keys(questionTimes).map((_, i) => `Question ${i + 1}`);

  const chartData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Time Spent (seconds)',
        data: timeValues,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Time Spent per Question'
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Quiz Results</h1>
          
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Score</h2>
                <p className="text-4xl font-bold text-blue-600 mt-2">{scorePercentage}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Submitted on</p>
                <p className="text-gray-900">
                  {new Date(result.submitted_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Question Analysis</h3>
            {Object.entries(result.answers).map(([questionId, answer]) => (
              <div key={questionId} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">Question {questionId}</p>
                    <p className="text-gray-600 mt-1">Your answer: {answer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Time taken</p>
                    <p className="text-gray-900">
                      {result.question_times[questionId]} seconds
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={() => navigate('/quizzes')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results; 