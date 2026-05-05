import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Header from './Header';
import Sidebar from './Sidebar';

// Helper to check authentication from localStorage
const isAuthenticated = () => {
  const token = localStorage.getItem('access_token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    return false;
  }
  
  try {
    const userData = JSON.parse(user);
    const tokenExpiry = localStorage.getItem('token_expiry');
    
    if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
      // Token expired, clear storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('token_expiry');
      localStorage.removeItem('user_language');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

// Get user from localStorage
const getUser = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user from storage:', error);
    return null;
  }
};

const Layout = () => {
  const navigate = useNavigate();
  const [isAuth, setIsAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check authentication on mount and when storage changes
    const checkAuth = () => {
      const auth = isAuthenticated();
      const currentUser = getUser();
      
      setIsAuth(auth);
      setUser(currentUser);
      
      if (!auth) {
        console.log('[Layout] Not authenticated, redirecting to /');
        navigate('/', { replace: true });
      }
    };
    
    checkAuth();
    
    // Listen for storage events (in case token changes in another tab)
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, [navigate]);

  // Close sidebar on route change on mobile
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Show loading while checking authentication
  if (isAuth === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render anything
  if (!isAuth) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Fixed top header */}
      <Header user={user} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile by default, shown when sidebarOpen is true */}
      <div className={`
        fixed left-0 top-16 h-[calc(100vh-4rem)] z-50
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar role={user?.role} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content - adjusts margin based on sidebar visibility */}
      <div className="flex pt-16 h-screen">
        <main
          className={`
            flex-1
            overflow-x-auto
            overflow-y-auto
            h-full
            min-w-0
            bg-gray-50
            dark:bg-gray-900
            transition-all duration-300
            lg:ml-64
            ${sidebarOpen ? 'ml-64' : 'ml-0'}
          `}
        >
          <div className="p-6 lg:p-8 min-w-max lg:min-w-0">
            <div className="mx-auto max-w-screen-2xl">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;