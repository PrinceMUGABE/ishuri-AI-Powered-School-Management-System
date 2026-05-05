import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, LogOut, User, Bell, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSwitcher from '../Common/LanguageSwitcher';
import ThemeToggle from '../Common/ThemeToggle';
import schoolLogo from '../../../public/imgs/school-logo.png';

const Header = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-sm z-50 border-b border-green-100 dark:border-green-900/30">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              <Menu className="w-5 h-5 text-green-700 dark:text-green-400" />
            </button>
            {/* <Link to="/app/dashboard" className="flex items-center gap-2">
              <img 
                src={schoolLogo} 
                alt="Ishuri Logo" 
                className="w-8 h-8 rounded-full object-contain ring-2 ring-green-700/30"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-green-700 to-green-800 dark:from-green-400 dark:to-green-500 bg-clip-text text-transparent">
                  Ishuri
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  {t('app.tagline')}
                </span>
              </div>
            </Link> */}
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            
            <button className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors relative">
              <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
            </button>

            <div className="flex items-center gap-3 border-l pl-3 border-green-100 dark:border-green-900/30">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || t('header.guest')}</p>
                <p className="text-xs text-green-700 dark:text-green-400 capitalize">{user?.role || t('header.role')}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
                title={t('nav.logout')}
              >
                <LogOut className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 z-50 transform transition-transform duration-300 lg:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-green-100 dark:border-green-900/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={schoolLogo} alt="Logo" className="w-10 h-10 rounded-full object-contain ring-2 ring-green-700/30" />
            <span className="text-lg font-bold text-green-800 dark:text-green-400">Ishuri</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || t('header.guest')}</p>
              <p className="text-xs text-green-700 dark:text-green-400 capitalize">{user?.role || t('header.role')}</p>
            </div>
          </div>
          {/* Mobile nav items would go here - you can reuse the Sidebar logic */}
        </div>
      </div>
    </>
  );
};

export default Header;