import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Panel, Form, Input, InputNumber, SelectPicker, Button, Message, Loader, Stack } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';

interface FileUploadProps {
  onUploadSuccess?: (data?: any) => void;
  onUploadError?: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  onUploadError
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [subject, setSubject] = useState('General');
  const [tone, setTone] = useState<string>('moderate');
  const navigate = useNavigate();

  const difficultyOptions = [
    { label: 'Easy', value: 'easy' },
    { label: 'Moderate', value: 'moderate' },
    { label: 'Hard', value: 'hard' }
  ];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      onUploadError?.('Please upload a PDF file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('numberOfQuestions', numberOfQuestions.toString());
    formData.append('subject', subject);
    formData.append('tone', tone);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated. Please login.');
        navigate('/login');
        return;
      }

      const response = await axios.post(
        'http://localhost:8001/api/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      if (response.data) {
        setSuccess('Textbook uploaded successfully! Generating questions...');
        onUploadSuccess?.(response.data);
        setTimeout(() => {
          navigate('/quizzes');
        }, 2000);
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess, onUploadError, numberOfQuestions, subject, tone, navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: uploading
  });

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <Panel shaded>
        <Stack direction="column" spacing={20}>
          {/* Parameters Form */}
          <Panel bordered>
            <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Quiz Parameters</h3>
            <Form fluid>
              <Form.Group>
                <Form.ControlLabel>Number of Questions</Form.ControlLabel>
                <InputNumber
                  min={1}
                  max={50}
                  value={numberOfQuestions}
                  onChange={value => setNumberOfQuestions(value as number)}
                  style={{ width: '100%' }}
                />
              </Form.Group>

              <Form.Group>
                <Form.ControlLabel>Subject</Form.ControlLabel>
                <Input
                  value={subject}
                  onChange={value => setSubject(value)}
                  placeholder="e.g., Physics, Mathematics, History"
                  style={{ width: '100%' }}
                />
              </Form.Group>

              <Form.Group>
                <Form.ControlLabel>Difficulty Level</Form.ControlLabel>
                <SelectPicker
                  data={difficultyOptions}
                  value={tone}
                  onChange={(value: string | null) => setTone(value || 'moderate')}
                  style={{ width: '100%' }}
                  placeholder="Select difficulty"
                />
              </Form.Group>
            </Form>
          </Panel>

          {/* File Upload Area */}
          <div
            {...getRootProps()}
            style={{
              border: '2px dashed #ccc',
              backgroundColor: isDragActive ? '#f0f9ff' : '#fff',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.7 : 1,
              padding: '20px',
              borderRadius: '6px'
            }}
          >
            <input {...getInputProps()} />
            <Stack direction="column" spacing={10} alignItems="center">
              {uploading ? (
                <Stack spacing={10} alignItems="center">
                  <Loader size="sm" />
                  <span>Uploading...</span>
                </Stack>
              ) : (
                <>
                  <Button appearance="primary" disabled={uploading}>
                    Choose PDF File
                  </Button>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    Only PDF files are accepted
                  </span>
                </>
              )}
            </Stack>
          </div>

          {error && (
            <Message type="error" header="Error">
              {error}
            </Message>
          )}

          {success && (
            <Message type="success" header="Success">
              {success}
            </Message>
          )}
        </Stack>
      </Panel>
    </div>
  );
};

export default FileUpload; 