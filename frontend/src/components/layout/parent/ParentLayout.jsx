// ParentLayout.jsx - Fixed Version
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  LayoutDashboard, GraduationCap, CalendarCheck,
  Users, MessageCircle, User, LogOut, Menu, X,
  BarChart3, FileText, Bell, Sun, Sunset, Moon,
  ChevronDown, Dot, Clock, AlertCircle, Info,
  CheckCircle, BellOff, Loader2, ChevronRight,
  BookOpen, Calendar, Key, UserCircle, Shield, Save,
  Eye, EyeOff, Settings, Mail, Phone, MapPin, Edit3,
  CalendarDays, DollarSign, CreditCard
} from 'lucide-react';
import ThemeToggle from '../../Common/ThemeToggle';
import LanguageSwitcher from '../../Common/LanguageSwitcher';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const API_BASE = 'http://127.0.0.1:8000/api';
const NOTIF_API_URL = 'http://127.0.0.1:8000/api/notifications';
const CHAT_API_URL = 'http://127.0.0.1:8000/api/chat';

const apiClient = axios.create({ baseURL: API_BASE, timeout: 30000 });
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

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------
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
    grade_uploaded: <BookOpen size={14} />,
    grade_approved: <CheckCircle size={14} />,
    assignment_created: <BookOpen size={14} />,
    assignment_submitted: <FileText size={14} />,
    attendance_marked: <Calendar size={14} />,
    low_attendance_warning: <AlertCircle size={14} />,
    message_received: <MessageCircle size={14} />,
    deadline_reminder: <Clock size={14} />,
  };
  return iconMap[type] || <Bell size={14} />;
};

// ---------------------------------------------------------------------------
// Live clock hook
// ---------------------------------------------------------------------------
const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

// ---------------------------------------------------------------------------
// Greeting icon by hour
// ---------------------------------------------------------------------------
const GreetingIcon = ({ hour, className }) => {
  if (hour < 12) return <Sun className={className} />;
  if (hour < 18) return <Sunset className={className} />;
  return <Moon className={className} />;
};

// ---------------------------------------------------------------------------
// PROFILE MODAL COMPONENT
// ---------------------------------------------------------------------------
function ProfileModal({ isOpen, onClose, userData, onUpdate, t }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    physical_address: '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const modalRef = useRef(null);

  // Populate form when userData changes or modal opens
  useEffect(() => {
    if (userData && isOpen) {
      setFormData({
        full_name: userData.full_name || '',
        phone_number: userData.phone_number || '',
        physical_address: userData.physical_address || '',
      });
      setErrors({});
      setPasswordErrors({});
      setActiveTab('profile');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    }
  }, [userData, isOpen]);

  // Close on outside click or Escape
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
    if (!formData.full_name?.trim()) e.full_name = 'Full name is required';
    if (formData.phone_number && !/^(\+?[0-9]{10,15})$/.test(formData.phone_number)) {
      e.phone_number = 'Invalid phone number format';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const validatePasswordForm = () => {
    const e = {};
    if (!passwordData.current_password) e.current_password = 'Current password required';
    if (!passwordData.new_password) e.new_password = 'New password required';
    else if (passwordData.new_password.length < 8) e.new_password = 'Password must be at least 8 characters';
    if (!passwordData.confirm_password) e.confirm_password = 'Please confirm your password';
    else if (passwordData.new_password !== passwordData.confirm_password) e.confirm_password = 'Passwords do not match';
    setPasswordErrors(e);
    return !Object.keys(e).length;
  };

  const handleProfileUpdate = async () => {
    if (!validateProfileForm()) return;
    setLoading(true);
    try {
      // Support both id and parent_id field names from the API
      const parentId = userData?.id || userData?.parent_id;
      const response = await apiClient.put(`/students/parents/${parentId}/update/`, formData);
      if (response.data?.success) {
        toast.success(response.data.message || 'Profile updated successfully');
        onUpdate({ ...userData, ...formData });
        onClose();
      } else {
        toast.error(response.data?.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update profile');
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
        toast.success(response.data.message || 'Password changed successfully');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setActiveTab('profile');
      } else {
        toast.error(response.data?.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('Password change error:', err);
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl p-5 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Profile</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account settings</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <UserCircle size={16} />
            Profile Info
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'password'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Key size={16} />
            Change Password
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Read-only account details */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Shield size={14} />
                  Account Details
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Role:</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      Parent
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Email:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{userData?.email || '-'}</span>
                  </div>
                  {userData?.relationship_type && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Relationship:</span>
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {userData.relationship_type}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Editable fields */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Edit Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                        errors.full_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="+250XXXXXXXXX"
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                        errors.phone_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.phone_number && <p className="text-xs text-red-500 mt-1">{errors.phone_number}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <textarea
                      value={formData.physical_address}
                      onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="space-y-5">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Password must be at least 8 characters long.
                </p>
              </div>

              {[
                { key: 'current', label: 'Current Password', field: 'current_password', error: passwordErrors.current_password },
                { key: 'new', label: 'New Password', field: 'new_password', error: passwordErrors.new_password },
                { key: 'confirm', label: 'Confirm New Password', field: 'confirm_password', error: passwordErrors.confirm_password },
              ].map(({ key, label, field, error }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label} *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword[key] ? 'text' : 'password'}
                      value={passwordData[field]}
                      onChange={(e) => setPasswordData({ ...passwordData, [field]: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-10 ${
                        error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, [key]: !showPassword[key] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                      {showPassword[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-5 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={activeTab === 'profile' ? handleProfileUpdate : handlePasswordChange}
            disabled={loading || passwordLoading}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {(loading || passwordLoading)
              ? <Loader2 size={16} className="animate-spin" />
              : <Save size={16} />
            }
            {activeTab === 'profile' ? 'Save Changes' : 'Update Password'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NOTIFICATIONS DROPDOWN
// ---------------------------------------------------------------------------
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
      const response = await notifApiClient.get('/', { params: { page: 1, page_size: 50 } });
      let list = [];
      if (response.data?.success) {
        list = response.data.results || (Array.isArray(response.data.data) ? response.data.data : []);
      } else if (Array.isArray(response.data)) {
        list = response.data;
      }
      setAllNotifications(list);
      const unread = list.filter(n => n.status === 'unread' || n.is_read === false);
      setUnreadNotifications(unread);
      setUnreadCount(unread.length);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id) => {
    try {
      await notifApiClient.patch(`/${id}/`);
      const updated = allNotifications.map(n => n.id === id ? { ...n, status: 'read', is_read: true } : n);
      setAllNotifications(updated);
      const newUnread = unreadNotifications.filter(n => n.id !== id);
      setUnreadNotifications(newUnread);
      setUnreadCount(newUnread.length);
      toast.success('Marked as read');
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await notifApiClient.post('/mark-read/', { mark_all: true });
      setAllNotifications(prev => prev.map(n => ({ ...n, status: 'read', is_read: true })));
      setUnreadNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  return (
    <div className={`absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 transition-all duration-200 ${
      isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
    }`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell size={18} />
          Notifications
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={28} className="animate-spin text-emerald-600" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle size={32} className="mx-auto mb-2 text-red-500 opacity-50" />
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={fetchNotifications} className="mt-3 text-xs text-emerald-600 hover:underline">Retry</button>
          </div>
        ) : unreadNotifications.length === 0 ? (
          <div className="text-center py-12">
            <BellOff size={40} className="mx-auto mb-3 text-gray-400 dark:text-gray-600 opacity-50" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No unread notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {unreadNotifications.slice(0, 10).map((notif) => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer bg-blue-50/30 dark:bg-blue-900/10"
              >
                <div className="flex gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${getPriorityColor(notif.priority)}`}>
                    {getNotificationIcon(notif.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                      <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1.5" />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1"><Clock size={10} />{formatTimeAgo(notif.created_at)}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 ${getPriorityColor(notif.priority)}`}>
                        {getPriorityIcon(notif.priority)}{notif.priority}
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
          onClick={() => { onClose(); navigate('/parent/notifications'); }}
          className="w-full text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-center gap-1 py-1"
        >
          View all notifications <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MESSAGES DROPDOWN
// ---------------------------------------------------------------------------
function MessagesDropdown({ isOpen, onClose, t }) {
  const navigate = useNavigate();
  const [unreadChatrooms, setUnreadChatrooms] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchChatrooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await chatApiClient.get('/chatrooms/parent/');
      let rooms = response.data?.chatrooms || (Array.isArray(response.data) ? response.data : response.data?.data?.chatrooms || []);
      const withUnread = rooms.filter(r => (r.unread_count || 0) > 0);
      setUnreadChatrooms(withUnread);
      setTotalUnread(withUnread.reduce((s, r) => s + (r.unread_count || 0), 0));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchChatrooms();
  }, [isOpen, fetchChatrooms]);

  const getRoomIcon = (roomType) => {
    switch (roomType) {
      case 'direct': return <UserCircle size={18} className="text-emerald-600 dark:text-emerald-400" />;
      case 'group': return <Users size={18} className="text-blue-600 dark:text-blue-400" />;
      case 'class': return <BookOpen size={18} className="text-purple-600 dark:text-purple-400" />;
      default: return <MessageCircle size={18} className="text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div className={`absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 transition-all duration-200 ${
      isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
    }`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageCircle size={18} />
          Messages
          {totalUnread > 0 && (
            <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">{totalUnread}</span>
          )}
        </h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={28} className="animate-spin text-emerald-600" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle size={32} className="mx-auto mb-2 text-red-500 opacity-50" />
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={fetchChatrooms} className="mt-3 text-xs text-emerald-600 hover:underline">Retry</button>
          </div>
        ) : unreadChatrooms.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle size={40} className="mx-auto mb-3 text-gray-400 dark:text-gray-600 opacity-50" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No unread messages</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {unreadChatrooms.map(room => (
              <div
                key={room.id}
                onClick={() => { onClose(); navigate('/parent/chats', { state: { openChatId: room.id } }); }}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer bg-emerald-50/30 dark:bg-emerald-900/5"
              >
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 relative">
                    {getRoomIcon(room.room_type)}
                    {room.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                        {room.unread_count > 9 ? '9+' : room.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{room.name}</p>
                      {room.last_message?.sent_at && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Clock size={10} />{formatTimeAgo(room.last_message.sent_at)}
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
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{room.members?.length || 0} members</span>
                    </div>
                    {room.unread_count > 0 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                        {room.unread_count} unread {room.unread_count === 1 ? 'message' : 'messages'}
                      </p>
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
          onClick={() => { onClose(); navigate('/parent/chats'); }}
          className="w-full text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-center gap-1 py-1"
        >
          View all messages <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HEADER
// ---------------------------------------------------------------------------
const ParentHeader = ({
  parentProfile,
  onMenuClick,
  sidebarOpen,
  isMobile,
  onOpenProfile,           // ← receives the setter from ParentLayout
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const now = useClock();
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const messagesRef = useRef(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const [notifRes, chatRes] = await Promise.all([
        notifApiClient.get('/unread-count/'),
        chatApiClient.get('/chatrooms/parent/'),
      ]);
      if (notifRes.data?.success) setUnreadNotifications(notifRes.data.data.unread_count || 0);
      if (chatRes.data?.chatrooms) {
        setUnreadMessages(chatRes.data.chatrooms.reduce((s, r) => s + (r.unread_count || 0), 0));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (messagesRef.current && !messagesRef.current.contains(e.target)) setShowMessages(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12
    ? t('parent_layout.greeting.morning', 'Good morning')
    : hour < 18
      ? t('parent_layout.greeting.afternoon', 'Good afternoon')
      : t('parent_layout.greeting.evening', 'Good evening');

  const firstName = parentProfile?.full_name?.split(' ')[0] || t('parent_layout.greeting.parent', 'Parent');
  const avatarInitials = parentProfile?.full_name?.charAt(0)?.toUpperCase() || 'P';

  const dateStr = now.toLocaleDateString(
    i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'rw' ? 'rw-RW' : 'en-US',
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  );
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className={`
      fixed top-0 right-0 z-30 h-16
      bg-white/90 dark:bg-gray-900/90 backdrop-blur-md
      border-b border-gray-200/80 dark:border-gray-700/80
      transition-all duration-300
      ${sidebarOpen && !isMobile ? 'left-64' : 'left-0'}
    `}>
      <div className="flex items-center justify-between h-full px-4 gap-4">

        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onMenuClick} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <GreetingIcon hour={hour} className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {greeting}, <span className="text-emerald-600 dark:text-emerald-400">{firstName}</span>
            </span>
          </div>
        </div>

        {/* Centre */}
        <div className="hidden md:flex flex-col items-center leading-tight select-none">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{dateStr}</span>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums tracking-wide">{timeStr}</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <LanguageSwitcher />
          <ThemeToggle />

          {/* Messages */}
          <div ref={messagesRef} className="relative">
            <button
              onClick={() => { setShowMessages(v => !v); setShowNotifications(false); setDropdownOpen(false); }}
              className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>
            <MessagesDropdown isOpen={showMessages} onClose={() => setShowMessages(false)} t={t} />
          </div>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setShowNotifications(v => !v); setShowMessages(false); setDropdownOpen(false); }}
              className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
            <NotificationsDropdown isOpen={showNotifications} onClose={() => setShowNotifications(false)} t={t} />
          </div>

          {/* Avatar dropdown */}
          <div className="relative ml-1" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center ring-2 ring-emerald-500/30">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{avatarInitials}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{parentProfile?.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{parentProfile?.email}</p>
                </div>

                {/* ← Opens modal instead of navigating */}
                <button
                  onClick={() => { setDropdownOpen(false); onOpenProfile(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>

                <hr className="my-1 border-gray-100 dark:border-gray-700" />
                <button
                  onClick={() => { setDropdownOpen(false); document.dispatchEvent(new Event('parent:logout')); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// ---------------------------------------------------------------------------
// NavItem
// ---------------------------------------------------------------------------
const NavItem = ({ item, active, onClick }) => (
  <li>
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium group
        ${active
          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
        }
      `}
    >
      <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-150 ${active ? '' : 'group-hover:scale-110'}`} />
      <span className="truncate">{item.label}</span>
      {active && <Dot className="ml-auto w-4 h-4 opacity-70" />}
    </button>
  </li>
);

// ---------------------------------------------------------------------------
// ParentLayout
// ---------------------------------------------------------------------------
const ParentLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [parentProfile, setParentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);  // ← controls the modal

  const isAuthenticated = () => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return false;
    try {
      const expiry = localStorage.getItem('token_expiry');
      if (expiry && Date.now() > parseInt(expiry)) { localStorage.clear(); return false; }
      return true;
    } catch { return false; }
  };

  const fetchParentProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/students/parents/me/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
          'X-Language': localStorage.getItem('user_language') || 'en',
        },
      });
      const data = await res.json();
      if (data.success) {
        setParentProfile(data.data);
      } else {
        toast.error(data.message || 'Failed to load profile');
      }
    } catch (err) {
      console.error('fetchParentProfile error:', err);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      const access = localStorage.getItem('access_token');
      if (refresh && access) {
        await fetch(`${API_BASE}/account/logout/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
          body: JSON.stringify({ refresh }),
        });
      }
    } catch { /* silent */ }
    localStorage.clear();
    sessionStorage.clear();
    toast.success('Logged out successfully');
    navigate('/', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/', { replace: true }); return; }
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.role !== 'parent') { navigate('/app/dashboard', { replace: true }); return; }
    } catch { /* ignore */ }
    fetchParentProfile();
  }, [navigate, fetchParentProfile]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.addEventListener('parent:logout', handleLogout);
    return () => document.removeEventListener('parent:logout', handleLogout);
  }, [handleLogout]);

  // Nav items — profile is handled separately as a modal trigger
  const menuItems = [
    { path: '/parent/dashboard', icon: LayoutDashboard, label: t('parent_layout.nav.dashboard', 'Dashboard') },
    { path: '/parent/chats', icon: MessageCircle, label: t('parent_layout.nav.chats', 'Messages') },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const avatarInitials = parentProfile?.full_name?.charAt(0)?.toUpperCase() || 'P';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* SIDEBAR */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen w-64
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-700/80
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">

          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200 dark:border-gray-700/80 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/30">
                <GraduationCap className="w-[18px] h-[18px] text-white" />
              </div>
              <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Ishuri</span>
            </div>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Parent card */}
          {parentProfile && (
            <div className="mx-3 mt-4 p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 ring-2 ring-emerald-500/20">
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">{avatarInitials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">{parentProfile.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{parentProfile.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                    {parentProfile.relationship_type || 'Parent'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Menu</p>
            <ul className="space-y-0.5">
              {menuItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  active={isActive(item.path)}
                  onClick={() => { navigate(item.path); if (isMobile) setSidebarOpen(false); }}
                />
              ))}

              {/* Profile — opens modal, not a route */}
              <li>
                <button
                  onClick={() => { setShowProfileModal(true); if (isMobile) setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium group text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white"
                >
                  <User className="w-[18px] h-[18px] flex-shrink-0 group-hover:scale-110 transition-transform duration-150" />
                  <span className="truncate">{t('parent_layout.nav.profile', 'Profile')}</span>
                </button>
              </li>
            </ul>
          </nav>

          {/* Logout */}
          <div className="px-3 pb-4 flex-shrink-0 border-t border-gray-100 dark:border-gray-700/80 pt-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
            >
              <LogOut className="w-[18px] h-[18px] group-hover:-translate-x-0.5 transition-transform" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* HEADER — receives onOpenProfile to open the modal */}
      <ParentHeader
        parentProfile={parentProfile}
        onMenuClick={() => setSidebarOpen(v => !v)}
        sidebarOpen={sidebarOpen}
        isMobile={isMobile}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {/* MAIN */}
      <main className={`transition-all duration-300 pt-16 min-h-screen ${sidebarOpen && !isMobile ? 'lg:ml-64' : ''}`}>
        <div className="p-4 md:p-6">
          <Outlet context={{ parentProfile, refreshProfile: fetchParentProfile }} />
        </div>
      </main>

      {/* PROFILE MODAL — controlled by showProfileModal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userData={parentProfile}
        onUpdate={(updated) => {
          setParentProfile(updated);
          fetchParentProfile();
        }}
        t={t}
      />
    </div>
  );
};

export default ParentLayout;