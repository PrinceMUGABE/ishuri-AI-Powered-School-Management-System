import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (username, password, role) => {
    // API call would go here
    // Mock login for demonstration
    const mockUser = {
      id: 1,
      username,
      role,
      name: role === 'student' ? 'John Doe' : 
            role === 'teacher' ? 'Mr. Smith' : 
            role === 'parent' ? 'Jane Doe' : 'Admin User'
    };
    
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('role', role);
    setUser(mockUser);
    return mockUser;
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};