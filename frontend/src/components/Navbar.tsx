import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as RSNavbar, Nav, Dropdown } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import './Navbar.css';

interface NavbarProps {
  isRegistered: boolean;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isRegistered, onLogout }) => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName');

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <RSNavbar appearance="subtle" className="custom-navbar">
      <RSNavbar.Brand>
        <Link to="/" className="brand-link">
          Quiz Maker
        </Link>
      </RSNavbar.Brand>

      {isRegistered && (
        <Nav>
          <Nav.Item onSelect={() => navigate('/quizzes')}>
            Quizzes
          </Nav.Item>
          <Nav.Item onSelect={() => navigate('/upload')}>
            Upload
          </Nav.Item>
        </Nav>
      )}

      <Nav pullRight>
        {isRegistered ? (
          <Dropdown title={userName || 'User'} placement="bottomEnd">
            <Dropdown.Item>Profile</Dropdown.Item>
            <Dropdown.Item>Settings</Dropdown.Item>
            <Dropdown.Separator />
            <Dropdown.Item onSelect={handleLogout}>
              Logout
            </Dropdown.Item>
          </Dropdown>
        ) : (
          <Nav.Item onSelect={() => navigate('/login')}>
            Login
          </Nav.Item>
        )}
      </Nav>
    </RSNavbar>
  );
};

export default Navbar; 