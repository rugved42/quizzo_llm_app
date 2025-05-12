import React from 'react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  isRegistered: boolean;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isRegistered, onLogout }) => {
  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-800">
              Quiz Maker
            </Link>
          </div>
          <div className="flex space-x-4">
            {isRegistered ? (
              <>
                <Link
                  to="/"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Home
                </Link>
                <Link
                  to="/upload"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Upload Textbook
                </Link>
                <button
                  onClick={onLogout}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/register"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Register
              </Link>
            )}
            <Link
              to="/quizzes"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Quizzes
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 