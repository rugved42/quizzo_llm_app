import React from 'react';
import FileUpload from '../components/FileUpload';
import { useNavigate } from 'react-router-dom';

const TextbookUpload: React.FC = () => {
  const navigate = useNavigate();

  const handleUploadSuccess = (data: any) => {
    navigate('/quizzes', { state: { message: 'Textbook uploaded successfully!' } });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Upload Textbook
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Upload your PDF textbook and let our AI generate questions for you.
          </p>
        </div>

        <div className="mt-12">
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>
    </div>
  );
};

export default TextbookUpload; 