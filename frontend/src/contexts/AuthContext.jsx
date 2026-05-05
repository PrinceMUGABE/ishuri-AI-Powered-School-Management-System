import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const token = localStorage.getItem('access_token');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
          setIsAuthenticated(true);
          console.log('[AuthContext] User loaded from storage:', userData.username);
        }
      } catch (error) {
        console.error('[AuthContext] Error loading user from storage:', error);
        localStorage.clear();
      } finally {
        setLoading(false);
      }
    };
    
    loadUserFromStorage();
  }, []);

  const login = (userData, tokens) => {
    // Store tokens
    if (tokens.access_token) {
      localStorage.setItem('access_token', tokens.access_token);
    }
    if (tokens.refresh_token) {
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }
    
    // Set token expiry (24 hours from now)
    const expiry = Date.now() + (24 * 60 * 60 * 1000);
    localStorage.setItem('token_expiry', expiry.toString());
    
    // Store user data
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Store language preference
    if (userData.language) {
      localStorage.setItem('user_language', userData.language);
      sessionStorage.setItem('selected_language', userData.language);
    }
    
    // Update state
    setUser(userData);
    setIsAuthenticated(true);
    
    console.log('[AuthContext] Login successful:', userData.username);
  };

  const logout = () => {
    // Clear all auth data from storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('user_language');
    sessionStorage.removeItem('selected_language');
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
    
    console.log('[AuthContext] Logout successful');
  };

  const updateUser = (updatedData) => {
    const currentUser = { ...user, ...updatedData };
    setUser(currentUser);
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    if (updatedData.language) {
      localStorage.setItem('user_language', updatedData.language);
    }
    
    console.log('[AuthContext] User updated:', currentUser.username);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};