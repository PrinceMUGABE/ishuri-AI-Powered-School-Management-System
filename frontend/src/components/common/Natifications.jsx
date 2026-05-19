// NotificationCenter.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Bell,
  CheckCircle,
  XCircle,
  Trash2,
  CheckCheck,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Send,
  Users,
  UserPlus,
  Settings,
  Clock,
  AlertCircle,
  Info,
  TrendingUp,
  Calendar,
  BookOpen,
  DollarSign,
  UserCheck,
  UserX,
  MessageSquare,
  Award,
  FileText,
  GraduationCap,
  CreditCard,
  Loader2
} from "lucide-react";

// API Configuration
const API_BASE_URL = "http://127.0.0.1:8000/api/notifications";
const ACCOUNT_API_URL = "http://127.0.0.1:8000/api/account";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  const lang = localStorage.getItem("user_language") || "en";
  config.headers["X-Language"] = lang;
  return config;
});

const accountApiClient = axios.create({
  baseURL: ACCOUNT_API_URL,
  timeout: 30000,
});

accountApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  const lang = localStorage.getItem("user_language") || "en";
  config.headers["X-Language"] = lang;
  return config;
});

// Helper Functions
const formatTimeAgo = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    case 'medium':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    case 'low':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  }
};

const getPriorityIcon = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high':
      return <AlertCircle size={14} />;
    case 'medium':
      return <Clock size={14} />;
    default:
      return <Info size={14} />;
  }
};

const getNotificationIcon = (type) => {
  const iconMap = {
    user_created: <UserPlus size={18} />,
    user_updated: <UserCheck size={18} />,
    user_deleted: <UserX size={18} />,
    login_success: <CheckCircle size={18} />,
    password_changed: <RefreshCw size={18} />,
    grade_uploaded: <FileText size={18} />,
    grade_approved: <Award size={18} />,
    assignment_created: <BookOpen size={18} />,
    attendance_marked: <Calendar size={18} />,
    low_attendance_warning: <AlertCircle size={18} />,
    message_received: <MessageSquare size={18} />,
    fee_payment_received: <DollarSign size={18} />,
    fee_payment_overdue: <CreditCard size={18} />,
    deadline_reminder: <Clock size={18} />,
  };
  return iconMap[type] || <Bell size={18} />;
};

// ============================================================================
// SEND NOTIFICATION MODAL (Admin Only)
// ============================================================================
function SendNotificationModal({ isOpen, onClose, onSend, users, roles, loading }) {
  const { t } = useTranslation();
  const [recipientType, setRecipientType] = useState('specific');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error(t('notifications.send.fillFields', 'Please fill in title and message'));
      return;
    }

    let payload = {
      title: title.trim(),
      message: message.trim(),
      priority: priority,
    };

    if (recipientType === 'specific') {
      if (selectedUsers.length === 0) {
        toast.error(t('notifications.send.selectUsers', 'Please select at least one user'));
        return;
      }
      payload.user_ids = selectedUsers;
      payload.recipient_type = 'specific';
    } else if (recipientType === 'role') {
      if (!selectedRole) {
        toast.error(t('notifications.send.selectRole', 'Please select a role'));
        return;
      }
      payload.role = selectedRole;
      payload.recipient_type = 'role';
    } else {
      payload.recipient_type = 'all';
    }

    setSending(true);
    await onSend(payload);
    setSending(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Send size={20} />
            {t('notifications.send.title', 'Send Notification')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Recipient Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('notifications.send.recipientType', 'Recipient Type')}
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setRecipientType('specific')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  recipientType === 'specific'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Users size={16} />
                {t('notifications.send.specificUsers', 'Specific Users')}
              </button>
              <button
                onClick={() => setRecipientType('role')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  recipientType === 'role'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <UserPlus size={16} />
                {t('notifications.send.byRole', 'By Role')}
              </button>
              <button
                onClick={() => setRecipientType('all')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  recipientType === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Users size={16} />
                {t('notifications.send.allUsers', 'All Users')}
              </button>
            </div>
          </div>

          {/* Specific Users Selection */}
          {recipientType === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('notifications.send.selectUsers', 'Select Users')}
              </label>
              <input
                type="text"
                placeholder={t('notifications.send.searchUsers', 'Search users...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
              />
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {filteredUsers.map(user => (
                  <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{user.username}</span>
                    <span className="text-xs text-gray-500">({user.role})</span>
                  </label>
                ))}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {selectedUsers.length} {t('notifications.send.usersSelected', 'users selected')}
              </div>
            </div>
          )}

          {/* Role Selection */}
          {recipientType === 'role' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('notifications.send.selectRole', 'Select Role')}
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{t('notifications.send.chooseRole', 'Choose a role')}</option>
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('notifications.send.title', 'Title')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('notifications.send.titlePlaceholder', 'Enter notification title')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('notifications.send.message', 'Message')} *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('notifications.send.messagePlaceholder', 'Enter notification message')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('notifications.send.priority', 'Priority')}
            </label>
            <div className="flex gap-3">
              {['low', 'medium', 'high'].map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-4 py-2 rounded-lg capitalize ${
                    priority === p
                      ? p === 'high' ? 'bg-red-600 text-white'
                        : p === 'medium' ? 'bg-yellow-600 text-white'
                        : 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t(`notifications.priority.${p}`, p)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {t('notifications.send.send', 'Send Notification')}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {t('notifications.send.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN NOTIFICATION CENTER COMPONENT
// ============================================================================
export default function NotificationCenter() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Roles for admin
  const roles = [
    { value: 'admin', label: t('notifications.roles.admin', 'Administrator') },
    { value: 'teacher', label: t('notifications.roles.teacher', 'Teacher') },
    { value: 'student', label: t('notifications.roles.student', 'Student') },
    { value: 'parent', label: t('notifications.roles.parent', 'Parent') },
  ];

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const response = await accountApiClient.get('/me/');
        if (response.data?.success && response.data?.data) {
          const role = response.data.data.role;
          setUserRole(role);
          setIsAdmin(role === 'admin');
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, []);

  // Fetch users (admin only)
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await accountApiClient.get('/users/');
      if (response.data?.success && response.data?.data?.results) {
        setUsers(response.data.data.results);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [isAdmin]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/?page=${currentPage}&page_size=20`;
      if (filterType) url += `&type=${filterType}`;
      if (filterStatus) url += `&status=${filterStatus}`;

      const response = await apiClient.get(url);
      if (response.data?.success) {
        setNotifications(response.data.results || []);
        setTotalPages(Math.ceil((response.data.count || 0) / 20));
        setTotalCount(response.data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error(t('notifications.messages.fetchError', 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterType, filterStatus, t]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.get('/unread-count/');
      if (response.data?.success) {
        setUnreadCount(response.data.data.unread_count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await apiClient.patch(`/${notificationId}/`);
      await fetchNotifications();
      await fetchUnreadCount();
      toast.success(t('notifications.messages.markedRead', 'Notification marked as read'));
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error(t('notifications.messages.markReadError', 'Failed to mark as read'));
    }
  };

  // Mark multiple notifications as read
  const markSelectedAsRead = async () => {
    if (selectedNotifications.length === 0) {
      toast.error(t('notifications.messages.selectNotifications', 'Please select notifications'));
      return;
    }
    try {
      await apiClient.post('/mark-read/', {
        notification_ids: selectedNotifications
      });
      await fetchNotifications();
      await fetchUnreadCount();
      setSelectedNotifications([]);
      toast.success(t('notifications.messages.markedReadSelected', 'Selected notifications marked as read'));
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error(t('notifications.messages.markReadError', 'Failed to mark as read'));
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await apiClient.post('/mark-read/', { mark_all: true });
      await fetchNotifications();
      await fetchUnreadCount();
      setSelectedNotifications([]);
      toast.success(t('notifications.messages.markedAllRead', 'All notifications marked as read'));
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error(t('notifications.messages.markReadError', 'Failed to mark as read'));
    }
  };

  // Delete notification (admin only)
  const deleteNotification = async (notificationId) => {
    if (!isAdmin) return;
    try {
      await apiClient.delete(`/${notificationId}/`);
      await fetchNotifications();
      await fetchUnreadCount();
      toast.success(t('notifications.messages.deleted', 'Notification deleted'));
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error(t('notifications.messages.deleteError', 'Failed to delete notification'));
    }
  };

  // Delete selected notifications (admin only)
  const deleteSelected = async () => {
    if (!isAdmin) return;
    if (selectedNotifications.length === 0) {
      toast.error(t('notifications.messages.selectNotifications', 'Please select notifications'));
      return;
    }
    try {
      await Promise.all(
        selectedNotifications.map(id => apiClient.delete(`/${id}/`))
      );
      await fetchNotifications();
      await fetchUnreadCount();
      setSelectedNotifications([]);
      toast.success(t('notifications.messages.deletedSelected', 'Selected notifications deleted'));
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error(t('notifications.messages.deleteError', 'Failed to delete notifications'));
    }
  };

  // Send notification (admin only)
  const sendNotification = async (payload) => {
    try {
      await apiClient.post('/send/', payload);
      toast.success(t('notifications.messages.notificationSent', 'Notification sent successfully'));
      setShowSendModal(false);
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(error.response?.data?.message || t('notifications.messages.sendError', 'Failed to send notification'));
    }
  };

  // Toggle selection
  const toggleSelect = (notificationId) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // Select all on current page
  const selectAll = () => {
    const allIds = notifications.map(n => n.id);
    setSelectedNotifications(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedNotifications([]);
  };

  // Initial load
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (userRole) {
      fetchNotifications();
      fetchUnreadCount();
      if (isAdmin) {
        fetchUsers();
      }
    }
  }, [userRole, isAdmin, fetchNotifications, fetchUnreadCount, fetchUsers, currentPage, filterType, filterStatus]);

  // Refresh handler
  const handleRefresh = async () => {
    await fetchNotifications();
    await fetchUnreadCount();
    toast.success(t('notifications.messages.refreshed', 'Notifications refreshed'));
  };

  const notificationTypes = [
    { value: '', label: t('notifications.filters.allTypes', 'All Types') },
    { value: 'user_created', label: 'User Created' },
    { value: 'grade_uploaded', label: 'Grade Uploaded' },
    { value: 'assignment_created', label: 'Assignment Created' },
    { value: 'attendance_marked', label: 'Attendance Marked' },
    { value: 'message_received', label: 'Message Received' },
    { value: 'fee_payment_received', label: 'Payment Received' },
    { value: 'deadline_reminder', label: 'Deadline Reminder' },
  ];

  const statusOptions = [
    { value: '', label: t('notifications.filters.allStatus', 'All Status') },
    { value: 'unread', label: t('notifications.status.unread', 'Unread') },
    { value: 'read', label: t('notifications.status.read', 'Read') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-6 h-6 text-green-600" />
                {t('notifications.title', 'Notification Center')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('notifications.subtitle', 'Manage and track your notifications')}
              </p>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <button
                  onClick={() => setShowSendModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Send size={18} />
                  {t('notifications.actions.send', 'Send Notification')}
                </button>
              )}
              <button
                onClick={handleRefresh}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.stats.total', 'Total Notifications')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.stats.unread', 'Unread')}</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{unreadCount}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.stats.read', 'Read')}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalCount - unreadCount}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.stats.page', 'Current Page')}</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{currentPage} / {totalPages || 1}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {selectedNotifications.length > 0 && (
            <>
              <button
                onClick={markSelectedAsRead}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCheck size={16} />
                {t('notifications.actions.markRead', 'Mark Read')} ({selectedNotifications.length})
              </button>
              {isAdmin && (
                <button
                  onClick={deleteSelected}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  {t('notifications.actions.delete', 'Delete')} ({selectedNotifications.length})
                </button>
              )}
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {t('notifications.actions.clear', 'Clear Selection')}
              </button>
            </>
          )}
          {!isAdmin && unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCheck size={16} />
              {t('notifications.actions.markAllRead', 'Mark All as Read')}
            </button>
          )}
          {isAdmin && notifications.length > 0 && (
            <button
              onClick={selectAll}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {t('notifications.actions.selectAll', 'Select All')}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('notifications.filters.type', 'Notification Type')}
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {notificationTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('notifications.filters.status', 'Status')}
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterType('');
                  setFilterStatus('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {t('notifications.filters.clear', 'Clear Filters')}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t('notifications.messages.noNotifications', 'No notifications found')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    notification.status === 'unread' ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox for admin */}
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={() => toggleSelect(notification.id)}
                        className="mt-1 rounded border-gray-300 dark:border-gray-600"
                      />
                    )}
                    
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${
                      notification.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30' :
                      notification.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      'bg-green-100 dark:bg-green-900/30'
                    }`}>
                      {getNotificationIcon(notification.notification_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className={`font-semibold ${
                            notification.status === 'unread' 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                            {getPriorityIcon(notification.priority)}
                            {t(`notifications.priority.${notification.priority}`, notification.priority)}
                          </span>
                          {notification.status === 'unread' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              <Bell size={12} />
                              {t('notifications.status.unread', 'Unread')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        <span className="capitalize">{notification.notification_type?.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {notification.status === 'unread' && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                          >
                            <CheckCheck size={12} />
                            {t('notifications.actions.markRead', 'Mark as read')}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                          >
                            <Trash2 size={12} />
                            {t('notifications.actions.delete', 'Delete')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('notifications.pagination.showing', 'Showing')} {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, totalCount)} {t('notifications.pagination.of', 'of')} {totalCount}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 py-1 bg-green-600 text-white rounded">{currentPage}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Notification Modal */}
      <SendNotificationModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSend={sendNotification}
        users={users}
        roles={roles}
        loading={loading}
      />
    </div>
  );
}