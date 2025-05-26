import React from 'react';
import { Container, Row, Col, Card } from 'rsuite';
import FileUpload from '../components/FileUpload';
import './Upload.css';

const Upload: React.FC = () => {
  return (
    <Container className="upload-container">
      <Row>
        <Col xs={24} md={16} mdOffset={4}>
          <Card className="upload-card">
            <h2>Upload Textbook</h2>
            <p className="description">
              Upload your textbook in PDF format to generate quizzes. We'll analyze the content and create engaging questions for you.
            </p>
            <FileUpload />
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Upload; 