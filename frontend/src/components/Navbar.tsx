import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar, Nav, Button, Dropdown, Avatar } from 'rsuite';
import './Navbar.css';

const NavbarComponent: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Navbar className="navbar">
      <Navbar.Brand className="brand">
        <span className="nav-icon">📚</span>
        Quizzo
      </Navbar.Brand>
      <Nav className="nav-links">
        {isAuthenticated ? (
          <>
            <Nav.Item 
              icon={<span className="nav-icon">📊</span>}
              onSelect={() => navigate('/dashboard')}
            >
              Dashboard
            </Nav.Item>
            <Nav.Item 
              icon={<span className="nav-icon">📝</span>}
              onSelect={() => navigate('/quizzes')}
            >
              Quizzes
            </Nav.Item>
            <Nav.Item 
              icon={<span className="nav-icon">📤</span>}
              onSelect={() => navigate('/upload')}
            >
              Upload
            </Nav.Item>
            <Nav.Item 
              icon={<span className="nav-icon">👥</span>}
              onSelect={() => navigate('/live-quizzes')}
            >
              Live Quizzes
            </Nav.Item>
          </>
        ) : (
          <Nav.Item onSelect={() => navigate('/login')}>Login</Nav.Item>
        )}
      </Nav>
      <Nav pullRight>
        {isAuthenticated && user && (
          <Dropdown
            renderToggle={(props, ref) => (
              <Button {...props} ref={ref} className="user-button">
                <Avatar circle className="user-avatar">
                  {getUserInitials(user.name)}
                </Avatar>
                <span className="user-name">{user.name}</span>
                <span className="dropdown-icon">▼</span>
              </Button>
            )}
            placement="bottomEnd"
          >
            <Dropdown.Item className="dropdown-item">
              <span className="dropdown-item-icon">👤</span>
              <div className="dropdown-item-content">
                <div className="dropdown-item-title">Profile</div>
                <div className="dropdown-item-subtitle">{user.email}</div>
              </div>
            </Dropdown.Item>
            <Dropdown.Item className="dropdown-item">
              <span className="dropdown-item-icon">⚙️</span>
              <div className="dropdown-item-content">
                <div className="dropdown-item-title">Settings</div>
              </div>
            </Dropdown.Item>
            <Dropdown.Item className="dropdown-item" onSelect={handleLogout}>
              <span className="dropdown-item-icon">🚪</span>
              <div className="dropdown-item-content">
                <div className="dropdown-item-title">Logout</div>
              </div>
            </Dropdown.Item>
          </Dropdown>
        )}
      </Nav>
    </Navbar>
  );
};

export default NavbarComponent; 