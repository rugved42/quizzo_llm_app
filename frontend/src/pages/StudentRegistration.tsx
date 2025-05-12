import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const StudentRegistration: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate inputs
    if (!name.trim() || !email.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      console.log('Sending registration request...');
      const response = await axios.post('http://localhost:8001/register', {
        name,
        email
      });
      console.log('Registration response:', response.data);

      if (response.data.student_id) {
        console.log('Storing student ID in localStorage:', response.data.student_id);
        localStorage.setItem('studentId', response.data.student_id);
        console.log('Navigating to home page...');
        navigate('/');
      } else {
        console.error('No student_id in response');
        setError('Registration failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="registration-form">
      <h2>Student Registration</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Enter your name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default StudentRegistration; 