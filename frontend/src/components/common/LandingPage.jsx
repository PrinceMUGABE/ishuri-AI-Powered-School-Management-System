import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import {
  GraduationCap, Brain, MessageSquare, BarChart3, Users, Shield,
  ChevronRight, CheckCircle, ArrowRight, Star, FileText, CreditCard,
  Heart, X, User, Lock, LogIn, ArrowLeft, Mail, Eye, EyeOff,
  AlertCircle, Check, Phone, MapPin, Home, UserPlus, Menu,
  Award, BookOpen, Sparkles, Globe, TrendingUp, Zap
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/common/ThemeToggle';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import toast from 'react-hot-toast';
import schoolLogo from '../../../public/imgs/school-logo.png';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

// Helper: Extract error message
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

  if (error.message === 'Network Error') return t('landingPage.errors.networkError');
  if (error.message) return error.message;

  return t('landingPage.errors.somethingWentWrong');
};

// API Configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    let currentLanguage = 'en';

    const { i18n } = window;
    if (i18n && i18n.language) {
      currentLanguage = i18n.language;
    }

    const storedLang = localStorage.getItem('user_language');
    if (storedLang && ['en', 'fr', 'rw'].includes(storedLang)) {
      currentLanguage = storedLang;
    }

    const sessionLang = sessionStorage.getItem('selected_language');
    if (sessionLang && ['en', 'fr', 'rw'].includes(sessionLang)) {
      currentLanguage = sessionLang;
    }

    if (!['en', 'fr', 'rw'].includes(currentLanguage)) {
      currentLanguage = 'en';
    }

    config.headers['X-Language'] = currentLanguage;

    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.language) {
      const responseLang = response.data.language;
      const currentLang = localStorage.getItem('user_language');
      if (currentLang !== responseLang) {
        localStorage.setItem('user_language', responseLang);
        sessionStorage.setItem('selected_language', responseLang);
        const { i18n } = window;
        if (i18n && i18n.language !== responseLang) {
          i18n.changeLanguage(responseLang);
        }
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Enhanced password validation function
const validatePassword = (password, t) => {
  const errors = [];

  if (!password || password.length < 6) {
    errors.push(t('landingPage.passwordValidation.minLength') || 'Password must be at least 6 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push(t('landingPage.passwordValidation.uppercase') || 'Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push(t('landingPage.passwordValidation.lowercase') || 'Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push(t('landingPage.passwordValidation.number') || 'Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push(t('landingPage.passwordValidation.specialChar') || 'Password must contain at least one special character (!@#$%^&* etc.)');
  }

  return errors;
};

// Login Modal
const LoginModal = ({ onClose, onForgotPassword, onLoginSuccess }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      toast.error(t('landingPage.login.usernameRequired') || t('landingPage.errors.invalidCredentials'));
      return;
    }
    if (!formData.password) {
      toast.error(t('landingPage.login.passwordRequired') || t('landingPage.errors.invalidCredentials'));
      return;
    }

    setLoading(true);

    const currentLanguage = i18n.language || localStorage.getItem('user_language') || 'en';

    try {
      const response = await apiClient.post('/account/login/', {
        username: formData.username,
        password: formData.password
      }, {
        headers: { 'X-Language': currentLanguage }
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

        toast.success(response.data.message || t('landingPage.login.welcome'));

        if (onLoginSuccess) onLoginSuccess(user);
        onClose();

        // Navigate based on role
        const routes = {
          admin: '/app/admin/dashboard',
          teacher: '/app/teacher/dashboard',
          student: '/app/student/dashboard',
          parent: '/app/parent/dashboard',
        };
        navigate(routes[user.role] || '/app/dashboard');
      } else {
        toast.error(response.data.message || t('landingPage.login.invalidCredentials'));
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
          {t('landingPage.login.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('landingPage.login.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('landingPage.login.username')}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('landingPage.login.usernamePlaceholder')}
              disabled={loading}
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('landingPage.login.password')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('landingPage.login.passwordPlaceholder')}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-green-700 dark:text-green-400 hover:underline"
          >
            {t('landingPage.login.forgotPassword')}
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
              {t('landingPage.login.signIn')}
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-center text-gray-400 mt-5">
        {t('landingPage.login.adminNote')}
      </p>
    </div>
  );
};

// Check Username Modal - Step 1 of Password Reset
const CheckUsernameModal = ({ onBack, onUsernameFound, onClose }) => {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error(t('landingPage.forgotPassword.usernameRequired') || 'Username is required');
      return;
    }

    setLoading(true);
    const currentLanguage = i18n.language || localStorage.getItem('user_language') || 'en';

    try {
      const response = await apiClient.post('/account/check-username/', {
        username: username.trim()
      }, {
        headers: { 'X-Language': currentLanguage }
      });

      console.log('[Check Username Response]', response.data);

      if (response.data.success && response.data.exists) {
        toast.success(response.data.message || t('landingPage.forgotPassword.usernameFound'));
        onUsernameFound(username.trim(), response.data.data);
      } else {
        toast.error(response.data.message || t('landingPage.forgotPassword.usernameNotFound'));
      }
    } catch (error) {
      console.error('[Check Username Error]', error);
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
          <User className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('landingPage.forgotPassword.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('landingPage.forgotPassword.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('landingPage.forgotPassword.usernameLabel') || 'Username'}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('landingPage.forgotPassword.usernamePlaceholder') || 'Enter your username'}
              required
              disabled={loading}
              autoFocus
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
            <>
              <CheckCircle className="w-4 h-4" />
              {t('landingPage.forgotPassword.verifyUsername') || 'Verify Username'}
            </>
          )}
        </button>
      </form>

      <button
        onClick={onBack}
        className="mt-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-700 dark:hover:text-green-400 transition-colors mx-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('landingPage.forgotPassword.backToSignIn')}
      </button>
    </div>
  );
};

// Reset Password Modal - Step 2 of Password Reset
const ResetPasswordModal = ({ username, userData, onBack, onClose, onPasswordReset }) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  // Check password strength in real-time
  const checkPasswordStrength = (password) => {
    setPasswordStrength({
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  };

  const handlePasswordChange = (value) => {
    setFormData({ ...formData, new_password: value });
    checkPasswordStrength(value);
    const errors = validatePassword(value, t);
    setPasswordErrors(errors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate password
    const errors = validatePassword(formData.new_password, t);
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      toast.error(t('landingPage.forgotPassword.passwordsDoNotMatch') || 'Passwords do not match');
      return;
    }

    setLoading(true);
    const currentLanguage = i18n.language || localStorage.getItem('user_language') || 'en';

    try {
      const response = await apiClient.post('/account/forgot-password/', {
        username: username,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password
      }, {
        headers: { 'X-Language': currentLanguage }
      });

      console.log('[Reset Password Response]', response.data);

      if (response.data.success) {
        toast.success(response.data.message || t('landingPage.forgotPassword.passwordResetSuccess'));

        // Auto-login after password reset
        const loginResponse = await apiClient.post('/account/login/', {
          username: username,
          password: formData.new_password
        }, {
          headers: { 'X-Language': currentLanguage }
        });

        if (loginResponse.data.success) {
          const { access_token, refresh_token, user } = loginResponse.data.data;

          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          localStorage.setItem('user', JSON.stringify(user));

          const userLanguage = user.language || currentLanguage;
          localStorage.setItem('user_language', userLanguage);
          sessionStorage.setItem('selected_language', userLanguage);

          await i18n.changeLanguage(userLanguage);

          apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

          toast.success(t('landingPage.forgotPassword.loginSuccess') || 'Password reset successful! Logging you in...');
          onPasswordReset(user);
          onClose();
        } else {
          toast.success(t('landingPage.forgotPassword.resetSuccess') || 'Password reset successful! Please login.');
          onClose();
        }
      } else {
        toast.error(response.data.message || t('landingPage.forgotPassword.resetFailed'));
      }
    } catch (error) {
      console.error('[Reset Password Error]', error);
      toast.error(getErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    const passedCount = Object.values(passwordStrength).filter(Boolean).length;
    if (passedCount === 5) return 'bg-green-500';
    if (passedCount >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPasswordStrengthPercent = () => {
    const passedCount = Object.values(passwordStrength).filter(Boolean).length;
    return (passedCount / 5) * 100;
  };

  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 max-h-[90vh] overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="w-5 h-5 text-gray-500" />
      </button>

      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
          <Lock className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('landingPage.forgotPassword.resetTitle') || 'Reset Password'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('landingPage.forgotPassword.resetSubtitle') || 'Create a new password for your account'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {t('landingPage.forgotPassword.resettingFor') || 'Resetting password for'}: <span className="font-semibold text-green-700 dark:text-green-400">{username}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('landingPage.forgotPassword.newPassword') || 'New Password'}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.new_password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('landingPage.forgotPassword.newPasswordPlaceholder') || 'Enter new password'}
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
            </button>
          </div>

          {/* Password strength indicator */}
          {formData.new_password && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('landingPage.passwordValidation.strength') || 'Password strength'}:
                </span>
                <span className="font-semibold">
                  {Object.values(passwordStrength).filter(Boolean).length}/5
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                  style={{ width: `${getPasswordStrengthPercent()}%` }}
                />
              </div>
            </div>
          )}

          {/* Password requirements checklist */}
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('landingPage.passwordValidation.requirements') || 'Password must contain:'}
            </p>
            <div className={`flex items-center gap-2 text-xs ${passwordStrength.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {passwordStrength.length ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              <span>{t('landingPage.passwordValidation.minLength') || 'At least 6 characters'}</span>
            </div>
            <div className={`flex items-center gap-2 text-xs ${passwordStrength.uppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {passwordStrength.uppercase ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              <span>{t('landingPage.passwordValidation.uppercase') || 'At least one uppercase letter'}</span>
            </div>
            <div className={`flex items-center gap-2 text-xs ${passwordStrength.lowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {passwordStrength.lowercase ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              <span>{t('landingPage.passwordValidation.lowercase') || 'At least one lowercase letter'}</span>
            </div>
            <div className={`flex items-center gap-2 text-xs ${passwordStrength.number ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {passwordStrength.number ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              <span>{t('landingPage.passwordValidation.number') || 'At least one number'}</span>
            </div>
            <div className={`flex items-center gap-2 text-xs ${passwordStrength.special ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {passwordStrength.special ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              <span>{t('landingPage.passwordValidation.specialChar') || 'At least one special character (!@#$%^&*)'}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('landingPage.forgotPassword.confirmPassword') || 'Confirm Password'}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('landingPage.forgotPassword.confirmPasswordPlaceholder') || 'Confirm new password'}
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
          {formData.confirm_password && formData.new_password !== formData.confirm_password && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t('landingPage.forgotPassword.passwordsDoNotMatch') || 'Passwords do not match'}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !passwordStrength.length || !passwordStrength.uppercase || !passwordStrength.lowercase || !passwordStrength.number || !passwordStrength.special || formData.new_password !== formData.confirm_password}
          className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              {t('landingPage.forgotPassword.resetPassword') || 'Reset Password'}
            </>
          )}
        </button>
      </form>

      <button
        onClick={onBack}
        className="mt-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-700 dark:hover:text-green-400 transition-colors mx-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('landingPage.forgotPassword.backToUsername') || 'Back to username verification'}
      </button>
    </div>
  );
};

// Forgot Password Flow Modal - Manages steps
const ForgotPasswordFlow = ({ onClose, onPasswordReset }) => {
  const [step, setStep] = useState('check'); // 'check', 'reset'
  const [username, setUsername] = useState('');
  const [userData, setUserData] = useState(null);

  const handleUsernameFound = (foundUsername, data) => {
    setUsername(foundUsername);
    setUserData(data);
    setStep('reset');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {step === 'check' ? (
        <CheckUsernameModal
          onBack={onClose}
          onUsernameFound={handleUsernameFound}
          onClose={onClose}
        />
      ) : (
        <ResetPasswordModal
          username={username}
          userData={userData}
          onBack={() => setStep('check')}
          onClose={onClose}
          onPasswordReset={onPasswordReset}
        />
      )}
    </div>
  );
};

// Auth Modal
const AuthModal = ({ onClose, onLoginSuccess }) => {
  const [view, setView] = useState('login');

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
        <ForgotPasswordFlow
          onClose={onClose}
          onPasswordReset={onLoginSuccess}
        />
      )}
    </div>
  );
};

// Add Parent Modal for Students
const AddParentModal = ({ onClose, onParentAdded }) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    physical_address: '',
    relationship_type: 'guardian'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error(t('landingPage.addParent.fullNameRequired'));
      return;
    }
    if (!formData.phone_number.trim()) {
      toast.error(t('landingPage.addParent.phoneRequired'));
      return;
    }
    if (!formData.email.trim()) {
      toast.error(t('landingPage.addParent.emailRequired'));
      return;
    }

    setLoading(true);
    const currentLanguage = i18n.language || localStorage.getItem('user_language') || 'en';

    try {
      const response = await apiClient.post('/students/me/parents/add/', {
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        email: formData.email,
        physical_address: formData.physical_address,
        relationship_type: formData.relationship_type
      }, {
        headers: { 'X-Language': currentLanguage }
      });

      console.log('[Add Parent Response]', response.data);

      if (response.data.success) {
        toast.success(response.data.message || t('landingPage.addParent.success'));
        onParentAdded();
        onClose();
      } else {
        const errorMsg = response.data.errors
          ? Object.values(response.data.errors).flat()[0]
          : response.data.message;
        toast.error(errorMsg || t('landingPage.addParent.error'));
      }
    } catch (error) {
      console.error('[Add Parent Error]', error);
      toast.error(getErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
            <UserPlus className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('landingPage.addParent.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('landingPage.addParent.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('landingPage.addParent.fullName')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder={t('landingPage.addParent.fullNamePlaceholder')}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('landingPage.addParent.phoneNumber')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="+250XXXXXXXXX"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('landingPage.addParent.email')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="parent@example.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('landingPage.addParent.physicalAddress')}
            </label>
            <div className="relative">
              <Home className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                value={formData.physical_address}
                onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder={t('landingPage.addParent.addressPlaceholder')}
                rows="2"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('landingPage.addParent.relationshipType')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.relationship_type}
                onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                required
                disabled={loading}
              >
                <option value="father">{t('landingPage.addRelationship.father')}</option>
                <option value="mother">{t('landingPage.addRelationship.mother')}</option>
                <option value="guardian">{t('landingPage.addRelationship.guardian')}</option>
                <option value="other">{t('landingPage.addRelationship.other')}</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl disabled:opacity-60 text-sm font-semibold transition-colors"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : t('landingPage.addParent.submit')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors"
            >
              {t('landingPage.addParent.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Landing Page Component
const LandingPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [checkingParent, setCheckingParent] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when window resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  // Initialize language on component mount
  useEffect(() => {
    let initialLanguage = 'en';

    const storedLang = localStorage.getItem('user_language');
    if (storedLang && ['en', 'fr', 'rw'].includes(storedLang)) {
      initialLanguage = storedLang;
    }

    const sessionLang = sessionStorage.getItem('selected_language');
    if (sessionLang && ['en', 'fr', 'rw'].includes(sessionLang)) {
      initialLanguage = sessionLang;
    }

    if (i18n.language && ['en', 'fr', 'rw'].includes(i18n.language)) {
      initialLanguage = i18n.language;
    }

    if (initialLanguage !== i18n.language) {
      i18n.changeLanguage(initialLanguage);
    }

    localStorage.setItem('user_language', initialLanguage);
    sessionStorage.setItem('selected_language', initialLanguage);
    apiClient.defaults.headers.common['X-Language'] = initialLanguage;
  }, [i18n]);

  // Check existing session and student parent status
  useEffect(() => {
    const checkSessionAndParent = async () => {
      const token = localStorage.getItem('access_token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) return;

      try {
        const userData = JSON.parse(userStr);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        if (userData.language) {
          i18n.changeLanguage(userData.language);
          localStorage.setItem('user_language', userData.language);
          apiClient.defaults.headers.common['X-Language'] = userData.language;
        }

        if (userData.role === 'student') {
          setCheckingParent(true);
          try {
            const response = await apiClient.get('/students/me/');
            const studentData = response.data.data;
            const hasParents = studentData.parents && studentData.parents.length > 0;

            if (!hasParents) {
              setShowAddParentModal(true);
            } else {
              navigate('/app/student/dashboard', { replace: true });
            }
          } catch (err) {
            console.error('[Check Parent Error]', err);
            navigate('/app/student/dashboard', { replace: true });
          } finally {
            setCheckingParent(false);
          }
        } else {
          const routes = {
            admin: '/app/admin/dashboard',
            teacher: '/app/teacher/dashboard',
            parent: '/app/parent/dashboard',
          };
          navigate(routes[userData.role] || '/app/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('[Session Error]', err);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    };

    checkSessionAndParent();
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
      apiClient.defaults.headers.common['X-Language'] = user.language;
    }
  };

  const handleParentAdded = () => {
    toast.success(t('landingPage.addParent.success'));
    navigate('/app/student/dashboard', { replace: true });
  };

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      const newLang = i18n.language;
      localStorage.setItem('user_language', newLang);
      sessionStorage.setItem('selected_language', newLang);
      apiClient.defaults.headers.common['X-Language'] = newLang;

      const token = localStorage.getItem('access_token');
      if (token) {
        apiClient.put('/account/me/update/', { language: newLang }).catch(err => {
          console.error('Failed to update user language preference:', err);
        });
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  // Define navigation sections
  const navSections = ['features', 'about', 'testimonials', 'contact'];

  // Features data
  const features = [
    { icon: Brain, title: t('landingPage.features.ai.title'), description: t('landingPage.features.ai.desc'), gradient: 'from-purple-500 to-pink-500' },
    { icon: BarChart3, title: t('landingPage.features.dashboard.title'), description: t('landingPage.features.dashboard.desc'), gradient: 'from-blue-500 to-cyan-500' },
    { icon: MessageSquare, title: t('landingPage.features.communication.title'), description: t('landingPage.features.communication.desc'), gradient: 'from-green-500 to-emerald-500' },
    { icon: Shield, title: t('landingPage.features.security.title'), description: t('landingPage.features.security.desc'), gradient: 'from-indigo-500 to-purple-500' },
    { icon: FileText, title: t('landingPage.features.reports.title'), description: t('landingPage.features.reports.desc'), gradient: 'from-amber-500 to-orange-500' },
    { icon: CreditCard, title: t('landingPage.features.fees.title'), description: t('landingPage.features.fees.desc'), gradient: 'from-teal-500 to-green-500' },
  ];

  const stats = [
    { value: 486, label: t('landingPage.stats.students'), icon: Users, suffix: '' },
    { value: 32, label: t('landingPage.stats.teachers'), icon: GraduationCap, suffix: '' },
    { value: 98, label: t('landingPage.stats.satisfaction'), icon: Heart, suffix: '%' },
    { value: 0, label: t('landingPage.stats.paperForms'), icon: FileText, suffix: '' },
  ];

  const testimonials = [
    { name: 'Jean Paul Uwimana', role: t('landingPage.roles.parent'), content: t('landingPage.testimonials.parent'), avatar: '👨' },
    { name: 'Marie Claire Uwase', role: t('landingPage.roles.teacher'), content: t('landingPage.testimonials.teacher'), avatar: '👩‍🏫' },
    { name: 'Fr. Jean Bosco', role: t('landingPage.testimonials.directorRole'), content: t('landingPage.testimonials.director'), avatar: '👨‍💼' },
  ];

  const chartLegend = [
    { color: '#2e7d32', label: t('landingPage.chart.classAverage') },
    { color: '#f9a825', label: t('landingPage.chart.atRisk') },
    { color: '#283593', label: t('landingPage.chart.attendance') },
  ];

  const trustBadges = [
    { name: 'School 1', logo: '🏫' },
    { name: 'School 2', logo: '🏫' },
    { name: 'School 3', logo: '🏫' },
    { name: 'School 4', logo: '🏫' },
    { name: 'School 5', logo: '🏫' },
  ];

  if (checkingParent) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('landingPage.common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 font-['Inter'] overflow-x-hidden">
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {showAddParentModal && (
        <AddParentModal
          onClose={() => {
            setShowAddParentModal(false);
            navigate('/app/student/dashboard');
          }}
          onParentAdded={handleParentAdded}
        />
      )}

      {/* Enhanced Navbar with Glassmorphism */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-2xl border-b border-white/20 dark:border-gray-700/30' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo with Glow Effect */}
            <motion.div 
              className="flex items-center gap-2.5 flex-shrink-0"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="relative">
                <img
                  src={schoolLogo}
                  alt="Logo"
                  className="w-10 h-10 rounded-full object-contain ring-2 ring-green-700/30 shadow-lg shadow-green-500/20"
                />
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 to-amber-500/20 rounded-full blur-xl" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-black text-green-800 dark:text-green-400 block leading-tight bg-gradient-to-r from-green-700 to-green-500 dark:from-green-400 dark:to-green-300 bg-clip-text text-transparent">
                  Ishuri
                </span>
                <span className="text-[10px] text-gray-400 hidden sm:block font-medium tracking-wide">
                  Les Hirondelles de Don Bosco
                </span>
              </div>
            </motion.div>

            {/* Desktop Navigation - Enhanced */}
            <div className="hidden md:flex items-center gap-1">
              {navSections.map((section, index) => (
                <motion.a
                  key={section}
                  href={`#${section}`}
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 transition-all duration-300 px-4 py-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 font-medium"
                  whileHover={{ y: -2 }}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {t(`landingPage.nav.${section}`)}
                </motion.a>
              ))}
            </div>

            {/* Desktop Right Controls */}
            <div className="hidden md:flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <motion.button
                onClick={() => setShowAuthModal(true)}
                className="relative px-4 py-2 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-lg font-medium text-sm shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300 overflow-hidden group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t('landingPage.nav.signIn')}
                  <LogIn className="w-4 h-4" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>
            </div>

            {/* Mobile Controls */}
            <div className="flex md:hidden items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              <motion.button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                whileTap={{ scale: 0.9 }}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                )}
              </motion.button>
            </div>
          </div>

          {/* Mobile Menu - Enhanced Animation */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="md:hidden overflow-hidden border-t border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-col space-y-2 py-4">
                  {navSections.map((section) => (
                    <motion.a
                      key={section}
                      href={`#${section}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm text-gray-700 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 transition-colors capitalize py-2.5 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
                      whileHover={{ x: 10 }}
                    >
                      {t(`landingPage.nav.${section}`)}
                    </motion.a>
                  ))}
                  <motion.button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowAuthModal(true);
                    }}
                    className="w-full text-left px-4 py-3 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-lg font-medium text-sm shadow-lg shadow-green-500/25"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t('landingPage.nav.signIn')}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Enhanced Hero Section with Animated Background */}
      <section className="relative min-h-screen pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 overflow-hidden flex items-center">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-green-900/10" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 animate-float-slow opacity-20">
          <GraduationCap className="w-24 h-24 text-green-700" />
        </div>
        <div className="absolute bottom-20 right-10 animate-float-slower opacity-20">
          <BookOpen className="w-20 h-20 text-amber-600" />
        </div>
        <div className="absolute top-1/3 right-20 animate-float-fast opacity-15">
          <Sparkles className="w-16 h-16 text-green-500" />
        </div>

        {/* Animated Gradient Orbs */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slower" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-300/10 rounded-full filter blur-3xl animate-pulse-slow" />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div 
              className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-green-200/50 dark:border-green-700/30 shadow-lg shadow-green-500/10"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Brain className="w-4 h-4 text-green-700 animate-pulse" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                {t('landingPage.hero.badge')}
              </span>
            </motion.div>
            
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              {t('landingPage.hero.title')}
              <span className="block sm:inline bg-gradient-to-r from-green-700 to-amber-600 dark:from-green-400 dark:to-amber-400 bg-clip-text text-transparent">
                {' '}Les Hirondelles de Don Bosco
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8 px-2 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              {t('landingPage.hero.description')}
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center px-4 sm:px-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <motion.button
                onClick={() => setShowAuthModal(true)}
                className="relative px-8 py-4 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-xl font-bold text-lg shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300 overflow-hidden group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t('landingPage.hero.getStarted')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>
              
              <motion.a
                href="#features"
                className="relative px-8 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-bold text-lg text-gray-700 dark:text-gray-300 hover:border-green-700 dark:hover:border-green-400 transition-all duration-300 overflow-hidden group"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t('landingPage.hero.learnMore')}
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-50/20 to-amber-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              className="mt-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                {t('landingPage.trustedBy') || 'Trusted by schools across Rwanda'}
              </p>
              <div className="flex flex-wrap justify-center gap-8 opacity-60">
                {trustBadges.map((badge, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                  >
                    <span className="text-2xl">{badge.logo}</span>
                    <span className="text-sm font-medium">{badge.name}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Chart Preview - Enhanced */}
          <motion.div 
            className="mt-16 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50 backdrop-blur-sm">
              <div className="bg-gray-800/50 backdrop-blur-sm px-4 py-3 flex items-center gap-2 border-b border-gray-700/30">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/30" />
                  <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/30" />
                  <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/30" />
                </div>
                <span className="text-xs sm:text-sm text-gray-400 ml-2 font-mono">
                  ishuri.donbosco.rw/dashboard
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-500">Live</span>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex flex-wrap gap-3 sm:gap-4 mb-4">
                  {chartLegend.map((item) => (
                    <span key={item.color} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <span className="w-3 h-3 rounded-sm inline-block shadow-sm" style={{ background: item.color }} />
                      <span className="font-medium">{item.label}</span>
                    </span>
                  ))}
                </div>
                <div style={{ position: 'relative', width: '100%', height: '220px' }}>
                  <Bar data={DASHBOARD_CHART_DATA} options={DASHBOARD_CHART_OPTIONS} />
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-3 font-medium tracking-wide">
                  {t('landingPage.chart.title')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trusted By Section - Enhanced */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-800/20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-8">
              {t('landingPage.trustedBy') || 'Trusted by leading educational institutions'}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-40">
              <span className="text-2xl font-bold text-gray-400 dark:text-gray-600">🏫</span>
              <span className="text-2xl font-bold text-gray-400 dark:text-gray-600">📚</span>
              <span className="text-2xl font-bold text-gray-400 dark:text-gray-600">🎓</span>
              <span className="text-2xl font-bold text-gray-400 dark:text-gray-600">🏫</span>
              <span className="text-2xl font-bold text-gray-400 dark:text-gray-600">📚</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section - Enhanced with CountUp */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-to-br from-green-800 to-green-900 dark:from-green-900 dark:to-green-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5" />
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-green-600/20 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-amber-600/20 rounded-full filter blur-3xl" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="text-center group"
                whileHover={{ y: -5 }}
              >
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl md:text-5xl font-black text-white mb-1 tracking-tight">
                  <CountUp end={stat.value} duration={2.5} />{stat.suffix}
                </div>
                <div className="text-green-200 text-xs sm:text-sm font-medium uppercase tracking-wide">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section - Enhanced with Glassmorphism */}
      <section id="features" className="py-16 sm:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-50/30 to-transparent dark:via-green-900/5" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-green-700" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
                {t('landingPage.featuresSection.badge') || 'Features'}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
              {t('landingPage.featuresSection.title')}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto px-2">
              {t('landingPage.featuresSection.subtitle')}
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group relative p-6 sm:p-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                whileHover={{ y: -5 }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className={`p-3 bg-gradient-to-br ${feature.gradient} rounded-xl w-fit mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Roles Section - Enhanced */}
      <section className="py-16 sm:py-24 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/30 dark:to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/dots.svg')] opacity-5" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full mb-4">
              <Users className="w-4 h-4 text-blue-700" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                {t('landingPage.rolesSection.badge') || 'For Everyone'}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
              {t('landingPage.rolesSection.title')}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto px-2">
              {t('landingPage.rolesSection.subtitle')}
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {['student', 'parent', 'teacher', 'admin'].map((role) => (
              <motion.div
                key={role}
                variants={fadeInUp}
                className="group bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden"
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-amber-500/10 rounded-full transform translate-x-10 -translate-y-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      {role === 'student' && <GraduationCap className="w-5 h-5 text-green-700" />}
                      {role === 'parent' && <Users className="w-5 h-5 text-green-700" />}
                      {role === 'teacher' && <Shield className="w-5 h-5 text-green-700" />}
                      {role === 'admin' && <User className="w-5 h-5 text-green-700" />}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                      {t(`landingPage.roles.${role}`)}
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{t(`landingPage.roleFeatures.${role}.${idx}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AI Section - Enhanced */}
      <section className="py-16 sm:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-purple-50/20 to-white dark:from-gray-900 dark:via-purple-900/5 dark:to-gray-900" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full mb-4">
                <Brain className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                  {t('landingPage.aiSection.badge')}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                {t('landingPage.aiSection.title')}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                {t('landingPage.aiSection.description')}
              </p>
              <div className="space-y-4">
                {['green', 'yellow', 'red'].map((zone) => (
                  <motion.div
                    key={zone}
                    className="flex items-start gap-4 p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/30 hover:shadow-lg transition-all duration-300"
                    whileHover={{ x: 5 }}
                  >
                    <div className={`w-3 h-3 rounded-full mt-1.5 shadow-lg ${
                      zone === 'green' ? 'bg-green-500 shadow-green-500/50' : 
                      zone === 'yellow' ? 'bg-yellow-500 shadow-yellow-500/50' : 
                      'bg-red-500 shadow-red-500/50'
                    }`} />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">
                        {t(`landingPage.zones.${zone}.title`)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t(`landingPage.zones.${zone}.desc`)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <motion.div
              className="bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-gray-800/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-purple-200/30 dark:border-purple-900/30 shadow-xl"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  {t('landingPage.aiSection.cardTitle')}
                </h3>
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/30">
                  <Brain className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t('landingPage.aiSection.cardDesc')}
              </p>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('landingPage.aiSection.classAvg')}</span>
                    <span className="font-bold text-green-600">78%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <motion.div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: '78%' }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      viewport={{ once: true }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('landingPage.aiSection.atRisk')}</span>
                    <span className="font-bold text-yellow-600">18%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <motion.div 
                      className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: '18%' }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      viewport={{ once: true }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section - Enhanced */}
      <section id="testimonials" className="py-16 sm:py-24 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/30 dark:to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/testimonial-bg.svg')] opacity-5" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 px-4 py-2 rounded-full mb-4">
              <Star className="w-4 h-4 text-amber-700 fill-amber-700" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                {t('landingPage.testimonialsSection.badge') || 'Testimonials'}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
              {t('landingPage.testimonialsSection.title')}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto px-2">
              {t('landingPage.testimonialsSection.subtitle')}
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-amber-500 rounded-t-2xl" />
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-full flex items-center justify-center text-3xl shadow-lg shadow-green-500/20">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                      {testimonial.name}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 italic leading-relaxed">
                  "{testimonial.content}"
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section - Enhanced */}
      <section className="py-16 sm:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-800 to-amber-900" />
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-green-500/20 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/20 rounded-full filter blur-3xl" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="inline-block text-6xl mb-4"
            >
              🚀
            </motion.div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
              {t('landingPage.cta.title')}
            </h2>
            <p className="text-lg sm:text-xl text-green-100 mb-8 px-2 max-w-2xl mx-auto">
              {t('landingPage.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 sm:px-0">
              <motion.button
                onClick={() => setShowAuthModal(true)}
                className="relative px-8 py-4 bg-white text-green-700 rounded-xl font-bold text-lg shadow-2xl shadow-black/30 hover:shadow-green-500/30 transition-all duration-300 overflow-hidden group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t('landingPage.cta.signIn')}
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-amber-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>
              
              <motion.a
                href="#contact"
                className="relative px-8 py-4 border-2 border-white/40 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all duration-300 group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t('landingPage.cta.contact')}
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.a>
            </div>
            <p className="text-sm text-green-200/80 mt-6">
              {t('landingPage.cta.note')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer - Enhanced */}
      <footer id="contact" className="bg-gray-950 text-gray-400 pt-16 pb-8 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-10">
            <div className="col-span-2 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={schoolLogo}
                  alt="Logo"
                  className="w-10 h-10 rounded-full object-contain ring-1 ring-green-700/40 shadow-lg shadow-green-500/20"
                />
                <div>
                  <span className="text-xl font-black text-white block">Ishuri</span>
                  <span className="text-xs text-gray-500">Les Hirondelles de Don Bosco</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {t('landingPage.footer.description')}
              </p>
              <div className="flex gap-3 mt-4">
                {['Facebook', 'Twitter', 'Instagram', 'LinkedIn'].map((social, idx) => (
                  <motion.a
                    key={idx}
                    href="#"
                    className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:bg-green-700 hover:text-white transition-all duration-300"
                    whileHover={{ y: -2 }}
                  >
                    <span className="text-xs">{social[0]}</span>
                  </motion.a>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
                {t('landingPage.footer.quickLinks')}
              </h3>
              <ul className="space-y-2 text-sm">
                {['features', 'testimonials', 'contact'].map((item) => (
                  <li key={item}>
                    <a href={`#${item}`} className="text-gray-400 hover:text-green-400 transition-colors">
                      {t(`landingPage.nav.${item}`)}
                    </a>
                  </li>
                ))}
                <li>
                  <button onClick={() => setShowAuthModal(true)} className="text-gray-400 hover:text-green-400 transition-colors">
                    {t('landingPage.nav.signIn')}
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
                {t('landingPage.footer.contact')}
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span>Les Hirondelles de Don Bosco</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span>Ndera, Rwanda</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-green-500" />
                  <a href="mailto:info@hdb.rw" className="hover:text-green-400 transition-colors">
                    info@hdb.rw
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-500" />
                  <a href="tel:+250783201428" className="hover:text-green-400 transition-colors">
                    +250 783 201 428
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
                {t('landingPage.footer.resources')}
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://hdb.rw" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-400 transition-colors">
                    {t('landingPage.footer.schoolWebsite')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                    {t('landingPage.footer.documentation')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                    {t('landingPage.footer.support')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p className="text-gray-500">
              &copy; 2026 <span className="text-green-400 font-semibold">Ishuri</span> — Les Hirondelles de Don Bosco. {t('landingPage.footer.rights')}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {t('landingPage.footer.tagline')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;