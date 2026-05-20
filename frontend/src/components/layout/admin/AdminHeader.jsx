// AdminHeader.jsx - COMPLETELY FIXED VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  LogOut, User, Settings, ChevronDown, Menu, Bell, MessageCircle,
  CheckCircle, XCircle, Trash2, CheckCheck, RefreshCw, Clock, AlertCircle,
  Info, Mail, Phone, MapPin, Shield, Calendar, Edit3, Save, Eye, EyeOff,
  Loader2, X, ChevronRight, BellOff, MessageSquare, UserCircle, Key,
  Globe, Home, Users, BookOpen, DollarSign, Activity
} from 'lucide-react';
import ThemeToggle from '../../Common/ThemeToggle';
import LanguageSwitcher from '../../Common/LanguageSwitcher';
import toast from 'react-hot-toast';

// API Configuration
const API_BASE_URL = 'http://127.0.0.1:8000/api';
const NOTIF_API_URL = 'http://127.0.0.1:8000/api/notifications';
const CHAT_API_URL = 'http://127.0.0.1:8000/api/chat';

const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });
const notifApiClient = axios.create({ baseURL: NOTIF_API_URL, timeout: 30000 });
const chatApiClient = axios.create({ baseURL: CHAT_API_URL, timeout: 30000 });

const addAuthInterceptor = (client) => {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    const lang = localStorage.getItem('user_language') || 'en';
    config.headers['X-Language'] = lang;
    return config;
  });
};

addAuthInterceptor(apiClient);
addAuthInterceptor(notifApiClient);
addAuthInterceptor(chatApiClient);

// Helper Functions
const formatTimeAgo = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    case 'low': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  }
};

const getPriorityIcon = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high': return <AlertCircle size={12} />;
    case 'medium': return <Clock size={12} />;
    default: return <Info size={12} />;
  }
};

const getNotificationIcon = (type) => {
  const iconMap = {
    user_created: <UserCircle size={14} />,
    user_updated: <User size={14} />,
    user_deleted: <User size={14} />,
    login_success: <CheckCircle size={14} />,
    password_changed: <Key size={14} />,
    grade_uploaded: <BookOpen size={14} />,
    grade_approved: <CheckCircle size={14} />,
    assignment_created: <BookOpen size={14} />,
    attendance_marked: <Calendar size={14} />,
    low_attendance_warning: <AlertCircle size={14} />,
    message_received: <MessageSquare size={14} />,
    fee_payment_received: <DollarSign size={14} />,
    fee_payment_overdue: <AlertCircle size={14} />,
    deadline_reminder: <Clock size={14} />,
    system_alert: <Activity size={14} />,
  };
  return iconMap[type] || <Bell size={14} />;
};

// ============================================================================
// PROFILE MODAL COMPONENT
// ============================================================================
function ProfileModal({ isOpen, onClose, userData, onUpdate, t }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({ username: '', email: '', language: 'en' });
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const modalRef = useRef(null);

  useEffect(() => {
    if (userData) {
      setFormData({
        username: userData.username || '',
        email: userData.email || '',
        language: userData.language || 'en'
      });
    }
  }, [userData]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const validateProfileForm = () => {
    const e = {};
    if (!formData.username?.trim()) e.username = t('profile.usernameRequired', 'Username is required');
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = t('profile.emailInvalid', 'Invalid email format');
    setErrors(e);
    return !Object.keys(e).length;
  };

  const validatePasswordForm = () => {
    const e = {};
    if (!passwordData.current_password) e.current_password = t('profile.currentPasswordRequired', 'Current password required');
    if (!passwordData.new_password) e.new_password = t('profile.newPasswordRequired', 'New password required');
    else if (passwordData.new_password.length < 6) e.new_password = t('profile.passwordTooShort', 'Password must be at least 6 characters');
    if (!passwordData.confirm_password) e.confirm_password = t('profile.confirmPasswordRequired', 'Please confirm your password');
    else if (passwordData.new_password !== passwordData.confirm_password) e.confirm_password = t('profile.passwordsDoNotMatch', 'Passwords do not match');
    setPasswordErrors(e);
    return !Object.keys(e).length;
  };

  const handleProfileUpdate = async () => {
    if (!validateProfileForm()) return;
    setLoading(true);
    try {
      const response = await apiClient.put('/account/me/update/', formData);
      if (response.data?.success) {
        const updatedUser = { ...userData, ...formData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success(response.data.message || t('profile.updateSuccess', 'Profile updated successfully'));
        onUpdate(updatedUser);
        onClose();
      } else {
        toast.error(response.data?.message || t('profile.updateFailed', 'Failed to update profile'));
      }
    } catch (err) {
      console.error('Profile update error:', err);
      toast.error(err.response?.data?.message || t('profile.updateFailed', 'Failed to update profile'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) return;
    setPasswordLoading(true);
    try {
      const response = await apiClient.post('/account/change-password/', passwordData);
      if (response.data?.success) {
        toast.success(response.data.message || t('profile.passwordChanged', 'Password changed successfully'));
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setActiveTab('profile');
      } else {
        toast.error(response.data?.message || t('profile.passwordChangeFailed', 'Failed to change password'));
      }
    } catch (err) {
      console.error('Password change error:', err);
      toast.error(err.response?.data?.message || t('profile.passwordChangeFailed', 'Failed to change password'));
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!isOpen) return null;

  const roleColors = {
    admin: { bg: '#fef3c7', color: '#d97706', border: '#fde68a', darkBg: '#422800', darkColor: '#fbbf24' },
    teacher: { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe', darkBg: '#1e3a5f', darkColor: '#60a5fa' },
    student: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0', darkBg: '#14532d', darkColor: '#4ade80' },
    parent: { bg: '#fce7f3', color: '#db2777', border: '#fbcfe8', darkBg: '#4a0e2e', darkColor: '#f472b6' }
  }[userData?.role] || { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', darkBg: '#374151', darkColor: '#9ca3af' };

  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl p-5">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('profile.title', 'My Profile')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('profile.manageAccount', 'Manage your account settings')}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 px-5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'profile'
                ? 'border-green-600 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <UserCircle size={16} />
            {t('profile.profileInfo', 'Profile Info')}
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'password'
                ? 'border-green-600 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Key size={16} />
            {t('profile.changePassword', 'Change Password')}
          </button>
        </div>

        <div className="p-5">
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Shield size={14} />
                  {t('profile.accountDetails', 'Account Details')}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('profile.role', 'Role')}:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium`}
                      style={{ background: isDark ? roleColors.darkBg : roleColors.bg, color: isDark ? roleColors.darkColor : roleColors.color }}>
                      {t(`roles.${userData?.role}`, userData?.role || 'User')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('profile.status', 'Status')}:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      userData?.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {t(`status.${userData?.status}`, userData?.status || 'Active')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('profile.memberSince', 'Member Since')}:</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('profile.editInfo', 'Edit Information')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('profile.username', 'Username')} *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        errors.username ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('profile.email', 'Email')}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('profile.language', 'Language')}
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="rw">Kinyarwanda</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="space-y-5">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  {t('profile.passwordRequirements', 'Password must be at least 6 characters long.')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.currentPassword', 'Current Password')} *
                </label>
                <div className="relative">
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10 ${
                      passwordErrors.current_password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  >
                    {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.current_password && <p className="text-xs text-red-500 mt-1">{passwordErrors.current_password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.newPassword', 'New Password')} *
                </label>
                <div className="relative">
                  <input
                    type={showPassword.new ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10 ${
                      passwordErrors.new_password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  >
                    {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.new_password && <p className="text-xs text-red-500 mt-1">{passwordErrors.new_password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.confirmPassword', 'Confirm New Password')} *
                </label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10 ${
                      passwordErrors.confirm_password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  >
                    {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.confirm_password && <p className="text-xs text-red-500 mt-1">{passwordErrors.confirm_password}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-5 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={activeTab === 'profile' ? handleProfileUpdate : handlePasswordChange}
            disabled={loading || passwordLoading}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {(loading || passwordLoading) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {activeTab === 'profile' ? t('common.save', 'Save Changes') : t('common.update', 'Update Password')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// NOTIFICATIONS DROPDOWN COMPONENT - FIXED
// ============================================================================

// ============================================================================
// NOTIFICATIONS DROPDOWN COMPONENT - CLIENT-SIDE UNREAD FILTERING
// ============================================================================
function NotificationsDropdown({ isOpen, onClose, t }) {
  const navigate = useNavigate();
  const [allNotifications, setAllNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all notifications
      const response = await notifApiClient.get('/', {
        params: { page: 1, page_size: 50 }
      });
      
      console.log('Notifications API response:', response.data);
      
      // Handle different response structures
      let notificationsList = [];
      
      if (response.data?.success) {
        if (response.data.results) {
          notificationsList = response.data.results;
        } else if (response.data.data) {
          notificationsList = Array.isArray(response.data.data) ? response.data.data : [];
        }
      } else if (Array.isArray(response.data)) {
        notificationsList = response.data;
      }
      
      setAllNotifications(notificationsList);
      
      // Filter unread notifications on client side
      const unreadList = notificationsList.filter(n => 
        n.status === 'unread' || n.is_read === false
      );
      setUnreadNotifications(unreadList);
      setUnreadCount(unreadList.length);
      
      // Also fetch unread count from separate endpoint if available
      try {
        const countRes = await notifApiClient.get('/unread-count/');
        if (countRes.data?.success) {
          setUnreadCount(countRes.data.data.unread_count);
        }
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await notifApiClient.patch(`/${notificationId}/`);
      
      // Update local state: remove from unread list and update all notifications
      const updatedAllNotifications = allNotifications.map(n =>
        n.id === notificationId ? { ...n, status: 'read', is_read: true } : n
      );
      setAllNotifications(updatedAllNotifications);
      
      // Remove from unread list
      const newUnreadList = unreadNotifications.filter(n => n.id !== notificationId);
      setUnreadNotifications(newUnreadList);
      setUnreadCount(newUnreadList.length);
      
      toast.success(t('notifications.markedRead', 'Marked as read'));
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error(t('notifications.markReadError', 'Failed to mark as read'));
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await notifApiClient.post('/mark-read/', { mark_all: true });
      
      // Update local state: mark all as read
      const updatedAllNotifications = allNotifications.map(n => ({
        ...n,
        status: 'read',
        is_read: true
      }));
      setAllNotifications(updatedAllNotifications);
      
      // Clear unread notifications
      setUnreadNotifications([]);
      setUnreadCount(0);
      
      toast.success(t('notifications.allMarkedRead', 'All notifications marked as read'));
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error(t('notifications.markAllError', 'Failed to mark all as read'));
    } finally {
      setMarkingAll(false);
    }
  };

  // Helper function to check if a notification is unread
  const isNotificationUnread = (notification) => {
    return notification.status === 'unread' || notification.is_read === false;
  };

  const handleViewAll = () => {
    onClose();
    navigate('/app/notifications');
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  return (
    <div className={`absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 transition-all duration-200 ${
      isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
    }`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell size={18} />
          {t('notifications.title', 'Notifications')}
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
            {t('notifications.markAllRead', 'Mark all read')}
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={28} className="animate-spin text-green-600" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle size={32} className="mx-auto mb-2 text-red-500 opacity-50" />
            <p className="text-sm text-red-500">{error}</p>
            <button 
              onClick={fetchNotifications}
              className="mt-3 text-xs text-green-600 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : unreadNotifications.length === 0 ? (
          <div className="text-center py-12">
            <BellOff size={40} className="mx-auto mb-3 text-gray-400 dark:text-gray-600 opacity-50" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('notifications.noUnread', 'No unread notifications')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {unreadNotifications.slice(0, 10).map((notif) => (
              <div
                key={notif.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer bg-blue-50/30 dark:bg-blue-900/10"
                onClick={() => markAsRead(notif.id)}
              >
                <div className="flex gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${getPriorityColor(notif.priority)}`}>
                    {getNotificationIcon(notif.notification_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {notif.title}
                      </p>
                      <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1.5"></span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatTimeAgo(notif.created_at)}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 ${getPriorityColor(notif.priority)}`}>
                        {getPriorityIcon(notif.priority)}
                        {t(`notifications.priority.${notif.priority}`, notif.priority)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleViewAll}
          className="w-full text-sm text-green-600 dark:text-green-400 hover:underline flex items-center justify-center gap-1 py-1 transition-colors"
        >
          {t('notifications.viewAll', 'View all notifications')}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MESSAGES DROPDOWN COMPONENT - FIXED
// ============================================================================

function MessagesDropdown({ isOpen, onClose, t }) {
  const navigate = useNavigate();
  const [allChatrooms, setAllChatrooms] = useState([]);
  const [unreadChatrooms, setUnreadChatrooms] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchChatrooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await chatApiClient.get('/chatrooms/all/');
      console.log('Chatrooms API response:', response.data);
      
      let rooms = [];
      if (response.data?.chatrooms) {
        rooms = response.data.chatrooms;
      } else if (Array.isArray(response.data)) {
        rooms = response.data;
      } else if (response.data?.data?.chatrooms) {
        rooms = response.data.data.chatrooms;
      }
      
      setAllChatrooms(rooms);
      
      // Filter chatrooms with unread messages on client side
      const roomsWithUnread = rooms.filter(room => (room.unread_count || 0) > 0);
      setUnreadChatrooms(roomsWithUnread);
      
      // Calculate total unread count
      const unreadTotal = roomsWithUnread.reduce((sum, room) => sum + (room.unread_count || 0), 0);
      setTotalUnread(unreadTotal);
      
    } catch (error) {
      console.error('Error fetching chatrooms:', error);
      setError(error.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleViewAll = () => {
    onClose();
    navigate('/app/chat');
  };

  // Function to mark messages as read when opening a chat (optional)
  const markChatAsRead = async (roomId) => {
    try {
      await chatApiClient.post(`/chatrooms/${roomId}/mark-read/`);
      
      // Update local state
      const updatedAllRooms = allChatrooms.map(room => 
        room.id === roomId ? { ...room, unread_count: 0 } : room
      );
      setAllChatrooms(updatedAllRooms);
      
      // Update unread rooms list
      const updatedUnreadRooms = updatedAllRooms.filter(room => (room.unread_count || 0) > 0);
      setUnreadChatrooms(updatedUnreadRooms);
      
      // Update total unread count
      const newTotal = updatedUnreadRooms.reduce((sum, room) => sum + (room.unread_count || 0), 0);
      setTotalUnread(newTotal);
      
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChatrooms();
    }
  }, [isOpen, fetchChatrooms]);

  // Helper function to get room icon based on room type
  const getRoomIcon = (roomType) => {
    switch (roomType) {
      case 'direct':
        return <UserCircle size={18} className="text-green-600 dark:text-green-400" />;
      case 'group':
        return <Users size={18} className="text-blue-600 dark:text-blue-400" />;
      case 'class':
        return <BookOpen size={18} className="text-purple-600 dark:text-purple-400" />;
      default:
        return <MessageCircle size={18} className="text-green-600 dark:text-green-400" />;
    }
  };

  return (
    <div className={`absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 transition-all duration-200 ${
      isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
    }`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageCircle size={18} />
          {t('messages.title', 'Messages')}
          {totalUnread > 0 && (
            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
              {totalUnread}
            </span>
          )}
        </h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={28} className="animate-spin text-green-600" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle size={32} className="mx-auto mb-2 text-red-500 opacity-50" />
            <p className="text-sm text-red-500">{error}</p>
            <button 
              onClick={fetchChatrooms}
              className="mt-3 text-xs text-green-600 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : unreadChatrooms.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle size={40} className="mx-auto mb-3 text-gray-400 dark:text-gray-600 opacity-50" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('messages.noUnread', 'No unread messages')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {unreadChatrooms.map(room => (
              <div
                key={room.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer bg-green-50/30 dark:bg-green-900/5"
                onClick={() => {
                  onClose();
                  navigate('/app/chat', { state: { openChatId: room.id } });
                }}
              >
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 relative">
                    {getRoomIcon(room.room_type)}
                    {room.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                        {room.unread_count > 9 ? '9+' : room.unread_count}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {room.name}
                      </p>
                      {room.last_message?.sent_at && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Clock size={10} />
                          {formatTimeAgo(room.last_message.sent_at)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {room.last_message?.content || 'No messages yet'}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                        {room.room_type?.replace(/_/g, ' ') || 'Chat'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {room.members?.length || 0} members
                      </span>
                      {room.last_message?.sender_name && (
                        <>
                          <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {room.last_message.sender_name}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* Show unread message count indicator */}
                    {room.unread_count > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          {room.unread_count} unread {room.unread_count === 1 ? 'message' : 'messages'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleViewAll}
          className="w-full text-sm text-green-600 dark:text-green-400 hover:underline flex items-center justify-center gap-1 py-1 transition-colors"
        >
          {t('messages.viewAll', 'View all messages')}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ADMIN HEADER COMPONENT
// ============================================================================
const AdminHeader = ({ user, onMenuClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const notifRef = useRef(null);
  const messagesRef = useRef(null);
  const profileRef = useRef(null);

  // Fetch unread counts
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const [notifRes, chatRes] = await Promise.all([
        notifApiClient.get('/unread-count/'),
        chatApiClient.get('/chatrooms/all/')
      ]);
      
      if (notifRes.data?.success) {
        setUnreadNotifications(notifRes.data.data.unread_count);
      }
      
      if (chatRes.data?.chatrooms) {
        const total = chatRes.data.chatrooms.reduce((sum, room) => sum + (room.unread_count || 0), 0);
        setUnreadMessages(total);
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, []);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(event.target)) {
        setShowMessages(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      const accessToken = localStorage.getItem('access_token');
      
      if (refreshToken && accessToken) {
        await apiClient.post('/account/logout/', { refresh: refreshToken });
      }
      
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success(t('messages.logoutSuccess', 'Logged out successfully'));
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.clear();
      sessionStorage.clear();
      toast.success(t('messages.logoutSuccess', 'Logged out successfully'));
      navigate('/', { replace: true });
    }
  };

  const getUserInitial = () => {
    if (!currentUser) return 'A';
    return currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'A';
  };

  const getUserDisplayName = () => {
    if (!currentUser) return t('header.user', 'Admin');
    return currentUser.username || t('header.user', 'Admin');
  };

  const handleProfileUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center gap-3">
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
            
            {/* Messages Button */}
            <div ref={messagesRef} className="relative">
              <button
                onClick={() => {
                  setShowMessages(!showMessages);
                  setShowNotifications(false);
                  setIsOpen(false);
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={t('header.messages', 'Messages')}
              >
                <MessageCircle className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </button>
              <MessagesDropdown 
                isOpen={showMessages} 
                onClose={() => setShowMessages(false)} 
                t={t}
              />
            </div>
            
            {/* Notifications Button */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowMessages(false);
                  setIsOpen(false);
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={t('header.notifications', 'Notifications')}
              >
                <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
              <NotificationsDropdown 
                isOpen={showNotifications} 
                onClose={() => setShowNotifications(false)} 
                t={t}
              />
            </div>
            
            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
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
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setShowProfileModal(true);
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
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userData={currentUser}
        onUpdate={handleProfileUpdate}
        t={t}
      />
    </>
  );
};

export default AdminHeader;