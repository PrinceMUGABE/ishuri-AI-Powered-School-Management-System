import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  GraduationCap, Brain, MessageSquare, BarChart3, Users, Shield,
  ChevronRight, CheckCircle, ArrowRight, Star, FileText, CreditCard,
  Heart, X, User, Lock, LogIn, ArrowLeft, Mail
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/Common/ThemeToggle';
import LanguageSwitcher from '../../components/Common/LanguageSwitcher';
import toast from 'react-hot-toast';
import schoolLogo from '../../../public/imgs/school-logo.png';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// API Configuration
const API_BASE_URL = 'http://127.0.0.1:8000/api/account';

// Create axios instance with interceptors
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add language header to EVERY request
apiClient.interceptors.request.use(
  (config) => {
    // IMPORTANT: Get current language from i18n (not just localStorage)
    // This ensures we get the language that the user actually selected
    let currentLanguage = 'en';

    // Method 1: Get from i18n (most reliable)
    const { i18n } = window;
    if (i18n && i18n.language) {
      currentLanguage = i18n.language;
      console.log(`[Interceptor] Language from i18n: ${currentLanguage}`);
    }

    // Method 2: Get from localStorage as fallback
    const storedLang = localStorage.getItem('user_language');
    if (storedLang && ['en', 'fr', 'rw'].includes(storedLang)) {
      currentLanguage = storedLang;
      console.log(`[Interceptor] Language from localStorage: ${currentLanguage}`);
    }

    // Method 3: Get from sessionStorage
    const sessionLang = sessionStorage.getItem('selected_language');
    if (sessionLang && ['en', 'fr', 'rw'].includes(sessionLang)) {
      currentLanguage = sessionLang;
      console.log(`[Interceptor] Language from sessionStorage: ${currentLanguage}`);
    }

    // Validate language
    if (!['en', 'fr', 'rw'].includes(currentLanguage)) {
      currentLanguage = 'en';
    }

    // Add language header
    config.headers['X-Language'] = currentLanguage;

    // Add authorization token if exists
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`[API Request] Headers:`, {
      'X-Language': config.headers['X-Language'],
      'Authorization': config.headers['Authorization'] ? 'Bearer ***' : 'None'
    });

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Capture language from response
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.url} - Status: ${response.status}`);

    // If response has language field, update localStorage and i18n
    if (response.data && response.data.language) {
      const responseLang = response.data.language;
      const currentLang = localStorage.getItem('user_language');

      if (currentLang !== responseLang) {
        localStorage.setItem('user_language', responseLang);
        sessionStorage.setItem('selected_language', responseLang);

        // Update i18n if available
        const { i18n } = window;
        if (i18n && i18n.language !== responseLang) {
          i18n.changeLanguage(responseLang);
          console.log(`[API Response] Language updated to: ${responseLang}`);
        }
      }
    }

    return response;
  },
  (error) => {
    console.error('[API Response Error]', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Dashboard Chart Data
export const DASHBOARD_CHART_DATA = {
  labels: ['Term 1', 'Term 2', 'Term 3'],
  datasets: [
    {
      label: 'Class Average (%)',
      data: [72, 78, 81],
      backgroundColor: 'rgba(46,125,50,0.82)',
      borderColor: '#2e7d32',
      borderWidth: 2,
      borderRadius: 6
    },
    {
      label: 'At-Risk Students',
      data: [30, 24, 18],
      backgroundColor: 'rgba(249,168,37,0.82)',
      borderColor: '#f9a825',
      borderWidth: 2,
      borderRadius: 6
    },
    {
      label: 'Attendance Rate (%)',
      data: [88, 91, 94],
      backgroundColor: 'rgba(40,53,147,0.75)',
      borderColor: '#283593',
      borderWidth: 2,
      borderRadius: 6
    },
  ],
};

export const DASHBOARD_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false }
  },
  scales: {
    x: {
      ticks: { color: '#ccc', font: { size: 13 } },
      grid: { color: 'rgba(255,255,255,0.07)' }
    },
    y: {
      ticks: { color: '#ccc', font: { size: 12 } },
      grid: { color: 'rgba(255,255,255,0.07)' },
      min: 0,
      max: 110
    },
  },
};

// Helper: Extract error message from response
const getErrorMessage = (error, t) => {
  console.log('[Error Debug]', error.response?.data);

  if (error.response?.data) {
    const data = error.response.data;

    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;

    if (data.non_field_errors?.length) {
      const err = data.non_field_errors[0];
      return typeof err === 'string' ? err : JSON.stringify(err);
    }

    for (const key in data) {
      if (Array.isArray(data[key]) && data[key].length) {
        const err = data[key][0];
        if (typeof err === 'string') return err;
        if (err?.string) return err.string;
        if (err?.message) return err.message;
        return JSON.stringify(err);
      }
      if (typeof data[key] === 'string') return data[key];
    }
  }

  if (error.message === 'Network Error') return t('errors.networkError');
  if (error.message) return error.message;

  return t('errors.somethingWentWrong');
};

// Login Modal
const LoginModal = ({ onClose, onForgotPassword, onLoginSuccess }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      toast.error(t('login.usernameRequired'));
      return;
    }
    if (!formData.password) {
      toast.error(t('login.passwordRequired'));
      return;
    }

    setLoading(true);

    const currentLanguage = i18n.language || localStorage.getItem('user_language') || 'en';
    console.log(`[LoginModal] Submitting login with language: ${currentLanguage}`);

    try {
      // REMOVED the 'role' field from the request
      const response = await apiClient.post('/login/', {
        username: formData.username,
        password: formData.password
        // role field is removed - backend will determine role from user record
      }, {
        headers: {
          'X-Language': currentLanguage
        }
      });

      console.log('[Login Response]', response.data);

      if (response.data.success) {
        const { access_token, refresh_token, user } = response.data.data;

        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));

        const userLanguage = user.language || response.data.language || currentLanguage;
        localStorage.setItem('user_language', userLanguage);
        sessionStorage.setItem('selected_language', userLanguage);

        await i18n.changeLanguage(userLanguage);

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        apiClient.defaults.headers.common['X-Language'] = userLanguage;

        toast.success(response.data.message || t('login.welcome'));

        if (onLoginSuccess) onLoginSuccess(user);
        onClose();

        // Navigate based on role from backend
        const routes = {
          admin: '/app/admin/dashboard',
          teacher: '/app/teacher/dashboard',
          student: '/app/student/dashboard',
          parent: '/app/parent/dashboard',
        };
        navigate(routes[user.role] || '/app/dashboard');
      } else {
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('[Login Error]', error);
      toast.error(getErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="w-5 h-5 text-gray-500" />
      </button>

      <div className="text-center mb-6">
        <img
          src={schoolLogo}
          alt="Logo"
          className="w-16 h-16 mx-auto mb-3 rounded-full object-contain"
        />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('login.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('login.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('login.username')}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('login.usernamePlaceholder')}
              disabled={loading}
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('login.password')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('login.passwordPlaceholder')}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-green-700 dark:text-green-400 hover:underline"
          >
            {t('login.forgotPassword')}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              {t('login.signIn')}
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-center text-gray-400 mt-5">
        {t('login.adminNote')}
      </p>
    </div>
  );
};

// Forgot Password Modal
const ForgotPasswordModal = ({ onBack, onClose }) => {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Get current language
    const currentLanguage = i18n.language || localStorage.getItem('user_language') || 'en';
    console.log(`[ForgotPasswordModal] Submitting with language: ${currentLanguage}`);

    try {
      const response = await apiClient.post('/password-reset/request/', {
        username
      }, {
        headers: {
          'X-Language': currentLanguage
        }
      });

      console.log('[Password Reset Response]', response.data);

      if (response.data.success) {
        setSent(true);

        if (response.data.data?.token) {
          setResetToken(response.data.data.token);
        }

        toast.success(response.data.message || t('forgotPassword.resetSent'));
      } else {
        toast.error(response.data.message || 'Request failed');
      }
    } catch (error) {
      console.error('[Password Reset Error]', error);
      toast.error(getErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="w-5 h-5 text-gray-500" />
      </button>

      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-3">
          <Mail className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('forgotPassword.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('forgotPassword.subtitle')}
        </p>
      </div>

      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('forgotPassword.usernameLabel')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder={t('forgotPassword.usernamePlaceholder')}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              t('forgotPassword.sendReset')
            )}
          </button>
        </form>
      ) : (
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
            {t('forgotPassword.resetInstructionsSent')}
          </p>
          {resetToken && (
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('forgotPassword.yourToken')}</p>
              <code className="text-sm font-mono text-green-700 dark:text-green-400 break-all">
                {resetToken}
              </code>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onBack}
        className="mt-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-700 dark:hover:text-green-400 transition-colors mx-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('forgotPassword.backToSignIn')}
      </button>
    </div>
  );
};

// Auth Modal
const AuthModal = ({ onClose, onLoginSuccess }) => {
  const [view, setView] = useState('login');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {view === 'login' ? (
        <LoginModal
          onClose={onClose}
          onForgotPassword={() => setView('forgot')}
          onLoginSuccess={onLoginSuccess}
        />
      ) : (
        <ForgotPasswordModal
          onBack={() => setView('login')}
          onClose={onClose}
        />
      )}
    </div>
  );
};

// Main Landing Page
const LandingPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Initialize language on component mount
  useEffect(() => {
    // Get language from various sources
    let initialLanguage = 'en';

    // Priority 1: From localStorage
    const storedLang = localStorage.getItem('user_language');
    if (storedLang && ['en', 'fr', 'rw'].includes(storedLang)) {
      initialLanguage = storedLang;
      console.log(`[LandingPage] Language from localStorage: ${initialLanguage}`);
    }

    // Priority 2: From sessionStorage
    const sessionLang = sessionStorage.getItem('selected_language');
    if (sessionLang && ['en', 'fr', 'rw'].includes(sessionLang)) {
      initialLanguage = sessionLang;
      console.log(`[LandingPage] Language from sessionStorage: ${initialLanguage}`);
    }

    // Priority 3: From i18n
    if (i18n.language && ['en', 'fr', 'rw'].includes(i18n.language)) {
      initialLanguage = i18n.language;
      console.log(`[LandingPage] Language from i18n: ${initialLanguage}`);
    }

    // Set the language
    if (initialLanguage !== i18n.language) {
      i18n.changeLanguage(initialLanguage);
    }

    // Store in all places for consistency
    localStorage.setItem('user_language', initialLanguage);
    sessionStorage.setItem('selected_language', initialLanguage);

    // Set default header
    apiClient.defaults.headers.common['X-Language'] = initialLanguage;

    console.log(`[LandingPage] Initialized with language: ${initialLanguage}`);
  }, [i18n]);

  // Check existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');

    if (token && user) {
      try {
        const userData = JSON.parse(user);

        // Set authorization header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Set language from user profile
        if (userData.language) {
          const userLang = userData.language;
          i18n.changeLanguage(userLang);
          localStorage.setItem('user_language', userLang);
          sessionStorage.setItem('selected_language', userLang);
          apiClient.defaults.headers.common['X-Language'] = userLang;
        }

        // Navigate to role-based dashboard
        const routes = {
          admin: '/app/admin/dashboard',
          teacher: '/app/teacher/dashboard',
          student: '/app/student/dashboard',
          parent: '/app/parent/dashboard',
        };
        navigate(routes[userData.role] || '/app/dashboard');
      } catch (err) {
        console.error('[Session Error] Error parsing user data:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
  }, [navigate, i18n]);

  // Handle scroll for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginSuccess = (user) => {
    if (user.language && user.language !== i18n.language) {
      i18n.changeLanguage(user.language);
      localStorage.setItem('user_language', user.language);
      sessionStorage.setItem('selected_language', user.language);
      apiClient.defaults.headers.common['X-Language'] = user.language;
    }
  };

  // Listen for language changes from LanguageSwitcher
  useEffect(() => {
    const handleLanguageChange = () => {
      const newLang = i18n.language;
      console.log(`[LandingPage] Language changed to: ${newLang}`);

      // Update all storage locations
      localStorage.setItem('user_language', newLang);
      sessionStorage.setItem('selected_language', newLang);

      // Update axios default header
      apiClient.defaults.headers.common['X-Language'] = newLang;

      // Also update user profile if authenticated
      const token = localStorage.getItem('access_token');
      if (token) {
        // Optionally update user's language preference in backend
        apiClient.put('/me/update/', { language: newLang }).catch(err => {
          console.error('Failed to update user language preference:', err);
        });
      }
    };

    // Subscribe to i18n language changes
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const features = [
    { icon: Brain, title: t('features.ai.title'), description: t('features.ai.desc') },
    { icon: BarChart3, title: t('features.dashboard.title'), description: t('features.dashboard.desc') },
    { icon: MessageSquare, title: t('features.communication.title'), description: t('features.communication.desc') },
    { icon: Shield, title: t('features.security.title'), description: t('features.security.desc') },
    { icon: FileText, title: t('features.reports.title'), description: t('features.reports.desc') },
    { icon: CreditCard, title: t('features.fees.title'), description: t('features.fees.desc') },
  ];

  const stats = [
    { value: '486', label: t('stats.students'), icon: Users },
    { value: '32', label: t('stats.teachers'), icon: GraduationCap },
    { value: '98%', label: t('stats.satisfaction'), icon: Heart },
    { value: '0', label: t('stats.paperForms'), icon: FileText },
  ];

  const testimonials = [
    { name: 'Jean Paul Uwimana', role: t('roles.parent'), content: t('testimonials.parent'), avatar: '👨' },
    { name: 'Marie Claire Uwase', role: t('roles.teacher'), content: t('testimonials.teacher'), avatar: '👩‍🏫' },
    { name: 'Fr. Jean Bosco', role: t('testimonials.directorRole'), content: t('testimonials.director'), avatar: '👨‍💼' },
  ];

  const chartLegend = [
    { color: '#2e7d32', label: t('chart.classAverage') },
    { color: '#f9a825', label: t('chart.atRisk') },
    { color: '#283593', label: t('chart.attendance') },
  ];

  // Debug: Log current language on every render
  console.log(`[LandingPage Render] Current language: ${i18n.language}`);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/95 dark:bg-gray-900/95 shadow-lg backdrop-blur-sm border-b border-green-100 dark:border-green-900/30'
          : 'bg-transparent'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <img
                src={schoolLogo}
                alt="Logo"
                className="w-10 h-10 rounded-full object-contain ring-2 ring-green-700/30"
              />
              <div>
                <span className="text-lg sm:text-xl font-bold text-green-800 dark:text-green-400 block">
                  Ishuri
                </span>
                <span className="text-[10px] text-gray-400 hidden sm:block">
                  Les Hirondelles de Don Bosco
                </span>
              </div>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              {['features', 'about', 'testimonials', 'contact'].map((section) => (
                <a
                  key={section}
                  href={`#${section}`}
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 transition-colors capitalize"
                >
                  {t(`nav.${section}`)}
                </a>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
              >
                {t('nav.signIn')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-green-900/10" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full mb-6">
              <Brain className="w-4 h-4 text-green-700" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {t('hero.badge')}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              {t('hero.title')}
              <span className="text-green-700 dark:text-green-400"> Les Hirondelles de Don Bosco</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              {t('hero.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors font-medium text-lg"
              >
                {t('hero.getStarted')}
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-700 transition-colors font-medium text-lg text-gray-700 dark:text-gray-300"
              >
                {t('hero.learnMore')}
                <ChevronRight className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Chart Preview */}
          <div className="mt-16 relative">
            <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
              <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-400 ml-2">
                  ishuri.donbosco.rw/dashboard
                </span>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-4 mb-4">
                  {chartLegend.map((item) => (
                    <span key={item.color} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ background: item.color }} />
                      {item.label}
                    </span>
                  ))}
                </div>
                <div style={{ position: 'relative', width: '100%', height: '260px' }}>
                  <Bar data={DASHBOARD_CHART_DATA} options={DASHBOARD_CHART_OPTIONS} />
                </div>
                <p className="text-xs text-gray-500 text-center mt-3">
                  {t('chart.title')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-green-800 dark:bg-green-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-white/10 rounded-full">
                    <stat.icon className="w-6 h-6 text-amber-300" />
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-green-200 mt-1 text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('featuresSection.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {t('featuresSection.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-green-100 dark:border-green-900/30 rounded-xl p-6"
              >
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg w-fit mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                  <feature.icon className="w-6 h-6 text-green-700 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('testimonialsSection.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {t('testimonialsSection.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-green-100 dark:border-green-900/30 shadow-sm"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-400 italic text-sm">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-green-700 to-green-900 rounded-2xl text-white p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('cta.title')}
            </h2>
            <p className="text-lg text-green-100 mb-8">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 bg-white text-green-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                {t('cta.signIn')}
              </button>
              <a
                href="#contact"
                className="px-6 py-3 border-2 border-white/30 rounded-lg hover:bg-white/10 transition-colors font-medium"
              >
                {t('cta.contact')}
              </a>
            </div>
            <p className="text-sm text-green-200 mt-6">
              {t('cta.note')}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img
                  src={schoolLogo}
                  alt="Logo"
                  className="w-8 h-8 rounded-full object-contain ring-1 ring-green-700/40"
                />
                <span className="text-xl font-bold text-white">Ishuri</span>
              </div>
              <p className="text-sm">{t('footer.description')}</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('footer.quickLinks')}</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-green-400 transition-colors">{t('nav.features')}</a></li>
                <li><a href="#testimonials" className="hover:text-green-400 transition-colors">{t('nav.testimonials')}</a></li>
                <li><button onClick={() => setShowAuthModal(true)} className="hover:text-green-400 transition-colors">{t('nav.signIn')}</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('footer.contact')}</h3>
              <ul className="space-y-2 text-sm">
                <li>Les Hirondelles de Don Bosco</li>
                <li>Ndera, Rwanda</li>
                <li>info@hdb.rw</li>
                <li>+250 783 201 428</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('footer.resources')}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://hdb.rw" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">
                    {t('footer.schoolWebsite')}
                  </a>
                </li>
                <li><a href="#" className="hover:text-green-400 transition-colors">{t('footer.documentation')}</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">{t('footer.support')}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 Ishuri — Les Hirondelles de Don Bosco. {t('footer.rights')}</p>
            <p className="mt-1">{t('footer.tagline')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;