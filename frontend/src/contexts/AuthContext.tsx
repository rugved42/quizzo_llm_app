import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string, studentId: string, name: string) => void;
  logout: () => void;
  studentId: string | null;
  userName: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const storedStudentId = localStorage.getItem('studentId');
    const storedUserName = localStorage.getItem('userName');

    if (token && storedStudentId) {
      setIsAuthenticated(true);
      setStudentId(storedStudentId);
      setUserName(storedUserName);
    }
  }, []);

  const login = (token: string, studentId: string, name: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('studentId', studentId);
    localStorage.setItem('userName', name);
    setIsAuthenticated(true);
    setStudentId(studentId);
    setUserName(name);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('studentId');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    setStudentId(null);
    setUserName(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, studentId, userName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 