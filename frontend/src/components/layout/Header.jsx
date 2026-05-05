import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, User, Settings, ChevronDown, Menu } from 'lucide-react';
import ThemeToggle from '../Common/ThemeToggle';
import LanguageSwitcher from '../Common/LanguageSwitcher';
import toast from 'react-hot-toast';

const Header = ({ user, onMenuClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      const accessToken = localStorage.getItem('access_token');
      const currentLanguage = localStorage.getItem('user_language') || 'en';
      
      if (refreshToken && accessToken) {
        // Call logout API using fetch
        const response = await fetch('http://127.0.0.1:8000/api/account/logout/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Language': currentLanguage
          },
          body: JSON.stringify({ refresh: refreshToken })
        });
        
        if (!response.ok) {
          console.warn('Logout API call failed, but continuing with local cleanup');
        }
      }
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success(t('messages.logoutSuccess', 'Logged out successfully'));
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage even if API call fails
      localStorage.clear();
      sessionStorage.clear();
      toast.success(t('messages.logoutSuccess', 'Logged out successfully'));
      navigate('/', { replace: true });
    }
  };
  
  const getUserInitial = () => {
    if (!user) return 'U';
    return user.username ? user.username.charAt(0).toUpperCase() : 'U';
  };
  
  const getUserDisplayName = () => {
    if (!user) return t('header.user', 'User');
    return user.username || t('header.user', 'User');
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Button - visible on mobile only */}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('header.title', 'Ishuri System')}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  {getUserInitial()}
                </span>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
                {getUserDisplayName()}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            
            {isOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/app/profile');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      {t('header.profile', 'Profile')}
                    </button>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/app/settings');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      {t('header.settings', 'Settings')}
                    </button>
                    <hr className="my-1 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('header.logout', 'Logout')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;