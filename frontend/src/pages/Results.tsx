import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

interface Result {
  id: number;
  quiz_id: number;
  student_id: string;
  score: number;
  answers: Record<string, string>;
  question_times: Record<string, number>;
  completed_at: string;
}

const Results: React.FC = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await axios.get(`http://localhost:8001/results/${resultId}`);
        setResult(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load results');
        setLoading(false);
      }
    };

    if (resultId) {
      fetchResult();
    }
  }, [resultId]);

  if (loading) return <div className="results-container">Loading...</div>;
  if (error) return <div className="results-container error">{error}</div>;
  if (!result) return <div className="results-container">No results found</div>;

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
    <div className="results-container">
      <div className="score">
        <h2>Quiz Results</h2>
        <div className="score-value">{result.score.toFixed(1)}%</div>
        <p>Completed on {new Date(result.completed_at).toLocaleString()}</p>
      </div>

      {timeValues.length > 0 && (
        <div className="chart-section">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      <div className="answers-section">
        <h3>Your Answers</h3>
        {Object.entries(result.answers).map(([questionId, answer], index) => (
          <div key={questionId} className="answer-item">
            <p><strong>Question {index + 1}:</strong> {answer}</p>
            <p>
              <strong>Time spent:</strong>{' '}
              {typeof questionTimes[questionId] === 'number' 
                ? questionTimes[questionId].toFixed(1) 
                : 'N/A'} seconds
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Results; 