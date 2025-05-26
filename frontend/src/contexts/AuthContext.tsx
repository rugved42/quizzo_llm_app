import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  name: string;
  email: string;
  studentId: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string, studentId: string, name: string, email: string) => void;
  logout: () => void;
  user: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const storedStudentId = localStorage.getItem('studentId');
    const storedUserName = localStorage.getItem('userName');
    const storedEmail = localStorage.getItem('userEmail');

    if (token && storedStudentId && storedUserName && storedEmail) {
      setIsAuthenticated(true);
      setUser({
        name: storedUserName,
        email: storedEmail,
        studentId: storedStudentId
      });
    }
  }, []);

  const login = (token: string, studentId: string, name: string, email: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('studentId', studentId);
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    setIsAuthenticated(true);
    setUser({
      name,
      email,
      studentId
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('studentId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, user }}>
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