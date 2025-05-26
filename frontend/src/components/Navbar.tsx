import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar as RSNavbar, Nav, Button, Dropdown, Avatar } from 'rsuite';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userName } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getUserInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <RSNavbar className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <RSNavbar.Brand as={Link} to="/dashboard" className="navbar-brand">
            <span className="brand-icon">🎯</span>
            <span className="brand-text">Quizzo</span>
          </RSNavbar.Brand>
        </div>

        <div className="navbar-center">
          <Nav className="nav-links">
            <Nav.Item 
              as={Link} 
              to="/dashboard"
              className={isActive('/dashboard') ? 'active' : ''}
            >
              <span className="nav-icon">📊</span>
              Dashboard
            </Nav.Item>
            <Nav.Item 
              as={Link} 
              to="/quizzes"
              className={isActive('/quizzes') ? 'active' : ''}
            >
              <span className="nav-icon">📝</span>
              Quizzes
            </Nav.Item>
            <Nav.Item 
              as={Link} 
              to="/upload"
              className={isActive('/upload') ? 'active' : ''}
            >
              <span className="nav-icon">📤</span>
              Upload
            </Nav.Item>
            <Nav.Item 
              as={Link} 
              to="/live-quizzes"
              className={isActive('/live-quizzes') ? 'active' : ''}
            >
              <span className="nav-icon">👥</span>
              Live Quizzes
            </Nav.Item>
          </Nav>
        </div>

        <div className="navbar-right">
          <Dropdown
            renderToggle={(props, ref) => (
              <Button {...props} ref={ref} appearance="subtle" className="user-button">
                <Avatar circle size="sm" className="user-avatar">
                  {getUserInitials(userName)}
                </Avatar>
                <div className="user-info">
                  <span className="user-name">{userName || 'User'}</span>
                  <span className="user-role">Student</span>
                </div>
                <span className="dropdown-icon">▼</span>
              </Button>
            )}
            placement="bottomEnd"
          >
            <Dropdown.Item>
              <span className="dropdown-item-icon">👤</span>
              Profile
            </Dropdown.Item>
            <Dropdown.Item>
              <span className="dropdown-item-icon">⚙️</span>
              Settings
            </Dropdown.Item>
            <Dropdown.Item divider />
            <Dropdown.Item onSelect={handleLogout}>
              <span className="dropdown-item-icon">🚪</span>
              Logout
            </Dropdown.Item>
          </Dropdown>
        </div>
      </div>
    </RSNavbar>
  );
};

export default Navbar; 