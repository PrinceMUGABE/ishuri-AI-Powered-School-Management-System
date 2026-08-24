import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  GraduationCap, Brain, MessageSquare, BarChart3, Users, Shield,
  ChevronRight, CheckCircle, ArrowRight, Star, FileText, CreditCard,
  Heart, X, User, Lock, LogIn, ArrowLeft, Mail, Eye, EyeOff,
  AlertCircle, Check, Phone, MapPin, Home, UserPlus
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// API Configuration
const API_BASE_URL = 'http://127.0.0.1:8000/api';

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

// Main Landing Page (keep as is from original)
const LandingPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [checkingParent, setCheckingParent] = useState(false);

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

      if (!token || !userStr) return;   // not logged in, stay on landing page

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
              setShowAddParentModal(true);   // show the add-parent modal, stay on page
            } else {
              navigate('/app/student/dashboard', { replace: true });  // ← direct navigate, no reload
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
  }, [navigate, i18n]);  // ← removed dependencies that caused re-runs

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

    // if (user.role === 'student') {
    //   setTimeout(() => {
    //     window.location.reload();
    //   }, 500);
    // }
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

  const features = [
    { icon: Brain, title: t('landingPage.features.ai.title'), description: t('landingPage.features.ai.desc') },
    { icon: BarChart3, title: t('landingPage.features.dashboard.title'), description: t('landingPage.features.dashboard.desc') },
    { icon: MessageSquare, title: t('landingPage.features.communication.title'), description: t('landingPage.features.communication.desc') },
    { icon: Shield, title: t('landingPage.features.security.title'), description: t('landingPage.features.security.desc') },
    { icon: FileText, title: t('landingPage.features.reports.title'), description: t('landingPage.features.reports.desc') },
    { icon: CreditCard, title: t('landingPage.features.fees.title'), description: t('landingPage.features.fees.desc') },
  ];

  const stats = [
    { value: '486', label: t('landingPage.stats.students'), icon: Users },
    { value: '32', label: t('landingPage.stats.teachers'), icon: GraduationCap },
    { value: '98%', label: t('landingPage.stats.satisfaction'), icon: Heart },
    { value: '0', label: t('landingPage.stats.paperForms'), icon: FileText },
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
    <div className="min-h-screen bg-white dark:bg-gray-900">
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

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? 'bg-white/95 dark:bg-gray-900/95 shadow-lg backdrop-blur-sm border-b border-green-100 dark:border-green-900/30'
        : 'bg-transparent'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
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

            <div className="hidden md:flex items-center gap-6">
              {['features', 'about', 'testimonials', 'contact'].map((section) => (
                <a
                  key={section}
                  href={`#${section}`}
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 transition-colors capitalize"
                >
                  {t(`landingPage.nav.${section}`)}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
              >
                {t('landingPage.nav.signIn')}
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
                {t('landingPage.hero.badge')}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              {t('landingPage.hero.title')}
              <span className="text-green-700 dark:text-green-400"> Les Hirondelles de Don Bosco</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              {t('landingPage.hero.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors font-medium text-lg"
              >
                {t('landingPage.hero.getStarted')}
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-700 transition-colors font-medium text-lg text-gray-700 dark:text-gray-300"
              >
                {t('landingPage.hero.learnMore')}
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
                  {t('landingPage.chart.title')}
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
              {t('landingPage.featuresSection.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {t('landingPage.featuresSection.subtitle')}
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

      {/* Roles Section */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landingPage.rolesSection.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {t('landingPage.rolesSection.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {['student', 'parent', 'teacher', 'admin'].map((role) => (
              <div key={role} className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-green-100 dark:border-green-900/30 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    {role === 'student' && <GraduationCap className="w-5 h-5 text-green-700" />}
                    {role === 'parent' && <Users className="w-5 h-5 text-green-700" />}
                    {role === 'teacher' && <Shield className="w-5 h-5 text-green-700" />}
                    {role === 'admin' && <User className="w-5 h-5 text-green-700" />}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {t(`landingPage.roles.${role}`)}
                  </h3>
                </div>
                <ul className="space-y-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      {t(`landingPage.roleFeatures.${role}.${idx}`)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full mb-4">
                <Brain className="w-4 h-4 text-green-700" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                  {t('landingPage.aiSection.badge')}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {t('landingPage.aiSection.title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('landingPage.aiSection.description')}
              </p>
              <div className="space-y-4">
                {['green', 'yellow', 'red'].map((zone) => (
                  <div key={zone} className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${zone === 'green' ? 'bg-green-500' : zone === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {t(`landingPage.zones.${zone}.title`)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t(`landingPage.zones.${zone}.desc`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-amber-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-6 border border-green-100 dark:border-green-900/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t('landingPage.aiSection.cardTitle')}
                </h3>
                <Brain className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('landingPage.aiSection.cardDesc')}
              </p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('landingPage.aiSection.classAvg')}</span>
                    <span className="font-semibold">78%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '78%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('landingPage.aiSection.atRisk')}</span>
                    <span className="font-semibold">18%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '18%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landingPage.testimonialsSection.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {t('landingPage.testimonialsSection.subtitle')}
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
              {t('landingPage.cta.title')}
            </h2>
            <p className="text-lg text-green-100 mb-8">
              {t('landingPage.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 bg-white text-green-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                {t('landingPage.cta.signIn')}
              </button>
              <a
                href="#contact"
                className="px-6 py-3 border-2 border-white/30 rounded-lg hover:bg-white/10 transition-colors font-medium"
              >
                {t('landingPage.cta.contact')}
              </a>
            </div>
            <p className="text-sm text-green-200 mt-6">
              {t('landingPage.cta.note')}
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
              <p className="text-sm">{t('landingPage.footer.description')}</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('landingPage.footer.quickLinks')}</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-green-400 transition-colors">{t('landingPage.nav.features')}</a></li>
                <li><a href="#testimonials" className="hover:text-green-400 transition-colors">{t('landingPage.nav.testimonials')}</a></li>
                <li><button onClick={() => setShowAuthModal(true)} className="hover:text-green-400 transition-colors">{t('landingPage.nav.signIn')}</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('landingPage.footer.contact')}</h3>
              <ul className="space-y-2 text-sm">
                <li>Les Hirondelles de Don Bosco</li>
                <li>Ndera, Rwanda</li>
                <li>info@hdb.rw</li>
                <li>+250 783 201 428</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('landingPage.footer.resources')}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://hdb.rw" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">
                    {t('landingPage.footer.schoolWebsite')}
                  </a>
                </li>
                <li><a href="#" className="hover:text-green-400 transition-colors">{t('landingPage.footer.documentation')}</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">{t('landingPage.footer.support')}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 Ishuri — Les Hirondelles de Don Bosco. {t('landingPage.footer.rights')}</p>
            <p className="mt-1">{t('landingPage.footer.tagline')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;