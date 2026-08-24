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
  Eye, EyeOff, Settings, Mail, Phone, MapPin, Edit3, CalendarDays
} from 'lucide-react';
import ThemeToggle from '../../common/ThemeToggle';
import LanguageSwitcher from '../../common/LanguageSwitcher';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const API_BASE = 'http://127.0.0.1:8000/api';
const NOTIF_API_URL = 'http://127.0.0.1:8000/api/notifications';
const CHAT_API_URL = 'http://127.0.0.1:8000/api/chat';

// API Clients
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
// NOTIFICATIONS DROPDOWN COMPONENT (Client-side filtering)
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
      const response = await notifApiClient.get('/', {
        params: { page: 1, page_size: 50 }
      });
      
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
      
      const updatedAllNotifications = allNotifications.map(n =>
        n.id === notificationId ? { ...n, status: 'read', is_read: true } : n
      );
      setAllNotifications(updatedAllNotifications);
      
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
      
      const updatedAllNotifications = allNotifications.map(n => ({
        ...n,
        status: 'read',
        is_read: true
      }));
      setAllNotifications(updatedAllNotifications);
      
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

  const handleViewAll = () => {
    onClose();
    navigate('/teacher/notifications');
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
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
            {t('notifications.markAllRead', 'Mark all read')}
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
            <button 
              onClick={fetchNotifications}
              className="mt-3 text-xs text-emerald-600 hover:underline"
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
                      <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1.5"></span>
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
          className="w-full text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-center gap-1 py-1 transition-colors"
        >
          {t('notifications.viewAll', 'View all notifications')}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MESSAGES DROPDOWN COMPONENT (Client-side filtering)
// ---------------------------------------------------------------------------
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
      const response = await chatApiClient.get('/chatrooms/teacher/');
      
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
    navigate('/teacher/chats');
  };

  const getRoomIcon = (roomType) => {
    switch (roomType) {
      case 'direct':
        return <UserCircle size={18} className="text-emerald-600 dark:text-emerald-400" />;
      case 'group':
        return <Users size={18} className="text-blue-600 dark:text-blue-400" />;
      case 'class':
        return <BookOpen size={18} className="text-purple-600 dark:text-purple-400" />;
      default:
        return <MessageCircle size={18} className="text-emerald-600 dark:text-emerald-400" />;
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChatrooms();
    }
  }, [isOpen, fetchChatrooms]);

  return (
    <div className={`absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 transition-all duration-200 ${
      isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
    }`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageCircle size={18} />
          {t('messages.title', 'Messages')}
          {totalUnread > 0 && (
            <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
              {totalUnread}
            </span>
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
            <button 
              onClick={fetchChatrooms}
              className="mt-3 text-xs text-emerald-600 hover:underline"
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
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer bg-emerald-50/30 dark:bg-emerald-900/5"
                onClick={() => {
                  onClose();
                  navigate('/teacher/chats', { state: { openChatId: room.id } });
                }}
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
                    </div>
                    
                    {room.unread_count > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
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
          className="w-full text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-center gap-1 py-1 transition-colors"
        >
          {t('messages.viewAll', 'View all messages')}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header component with dropdowns
// ---------------------------------------------------------------------------
const TeacherHeader = ({
  teacherProfile,
  onMenuClick,
  sidebarOpen,
  isMobile,
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

  // Fetch unread counts
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const [notifRes, chatRes] = await Promise.all([
        notifApiClient.get('/unread-count/'),
        chatApiClient.get('/chatrooms/teacher/')
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

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(e.target)) {
        setShowMessages(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hour = now.getHours();

  const greeting = hour < 12
    ? t('teacher_layout.greeting.morning')
    : hour < 18
      ? t('teacher_layout.greeting.afternoon')
      : t('teacher_layout.greeting.evening');

  const firstName = teacherProfile?.first_name || t('teacher_layout.greeting.teacher');

  // Format date
  const dateStr = now.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'rw' ? 'rw-RW' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // Format time
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const avatarSrc = teacherProfile?.profile_picture_url;
  const initials = `${teacherProfile?.first_name?.charAt(0) ?? ''}${teacherProfile?.last_name?.charAt(0) ?? ''}`.toUpperCase();

  return (
    <header className={`
      fixed top-0 right-0 z-30 h-16
      bg-white/90 dark:bg-gray-900/90 backdrop-blur-md
      border-b border-gray-200/80 dark:border-gray-700/80
      transition-all duration-300
      ${sidebarOpen && !isMobile ? 'left-64' : 'left-0'}
    `}>
      <div className="flex items-center justify-between h-full px-4 gap-4">

        {/* Left — hamburger + greeting */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <GreetingIcon
              hour={hour}
              className="w-4 h-4 text-amber-500 flex-shrink-0"
            />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {greeting}, <span className="text-emerald-600 dark:text-emerald-400">{firstName}</span>
            </span>
          </div>
        </div>

        {/* Centre — date & clock */}
        <div className="hidden md:flex flex-col items-center leading-tight select-none">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{dateStr}</span>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums tracking-wide">{timeStr}</span>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <LanguageSwitcher />
          <ThemeToggle />

          {/* Messages Dropdown */}
          <div ref={messagesRef} className="relative">
            <button
              onClick={() => {
                setShowMessages(!showMessages);
                setShowNotifications(false);
                setDropdownOpen(false);
              }}
              className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={t('teacher_layout.header.messages')}
            >
              <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
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

          {/* Notifications Dropdown */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowMessages(false);
                setDropdownOpen(false);
              }}
              className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={t('teacher_layout.header.notifications')}
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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

          {/* Avatar dropdown */}
          <div className="relative ml-1" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center ring-2 ring-emerald-500/30">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={teacherProfile?.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{initials}</span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{teacherProfile?.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{teacherProfile?.email}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); navigate('/teacher/profile'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <User className="w-4 h-4" />
                  {t('teacher_layout.header.profile')}
                </button>
                <hr className="my-1 border-gray-100 dark:border-gray-700" />
                <button
                  onClick={() => { setDropdownOpen(false); document.dispatchEvent(new Event('teacher:logout')); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('teacher_layout.header.logout')}
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
// TeacherLayout
// ---------------------------------------------------------------------------
const TeacherLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(null);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---- Auth check --------------------------------------------------------
  const isAuthenticated = () => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return false;
    try {
      const expiry = localStorage.getItem('token_expiry');
      if (expiry && Date.now() > parseInt(expiry)) {
        localStorage.clear();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  // ---- Fetch profile -----------------------------------------------------
  const fetchTeacherProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/teachers/profile/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
          'X-Language': localStorage.getItem('user_language') || 'en',
        },
      });
      const data = await res.json();
      if (data.success) {
        setTeacherProfile(data.data.teacher);
        setUser(data.data.user);
      }
    } catch (err) {
      console.error('fetchTeacherProfile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Logout ------------------------------------------------------------
  const handleLogout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      const access = localStorage.getItem('access_token');
      if (refresh && access) {
        await fetch(`${API_BASE}/account/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access}`,
            'X-Language': localStorage.getItem('user_language') || 'en',
          },
          body: JSON.stringify({ refresh }),
        });
      }
    } catch { /* silent */ }
    localStorage.clear();
    sessionStorage.clear();
    toast.success(t('teacher_layout.messages.logoutSuccess'));
    navigate('/', { replace: true });
  }, [navigate, t]);

  // ---- Mount effects -----------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/', { replace: true });
      return;
    }
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.role !== 'teacher') {
          navigate('/app/dashboard', { replace: true });
          return;
        }
      } catch { /* ignore */ }
    }
    fetchTeacherProfile();
  }, [navigate, fetchTeacherProfile]);

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
    document.addEventListener('teacher:logout', handleLogout);
    return () => document.removeEventListener('teacher:logout', handleLogout);
  }, [handleLogout]);

  // ---- Nav items ---------------------------------------------------------
  const menuItems = [
   
    { path: '/teacher/timetable', icon: CalendarDays, label: t('teacher_layout.nav.timetable') },
    { path: '/teacher/grades', icon: BarChart3, label: t('teacher_layout.nav.grades') },
    { path: '/teacher/attendance', icon: CalendarCheck, label: t('teacher_layout.nav.attendances') },
    { path: '/teacher/assignments', icon: FileText, label: t('teacher_layout.nav.assignments') },
    { path: '/teacher/my-students', icon: Users, label: t('teacher_layout.nav.myStudents') },
    { path: '/teacher/chats', icon: MessageCircle, label: t('teacher_layout.nav.chats') },
    { path: '/teacher/profile', icon: User, label: t('teacher_layout.nav.profile') },
  ];

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  // ---- Loading state -----------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('teacher_layout.common.loading')}</p>
        </div>
      </div>
    );
  }

  const avatarSrc = teacherProfile?.profile_picture_url;
  const initials = `${teacherProfile?.first_name?.charAt(0) ?? ''}${teacherProfile?.last_name?.charAt(0) ?? ''}`.toUpperCase();

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
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Teacher card */}
          {teacherProfile && (
            <div className="mx-3 mt-4 p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 ring-2 ring-emerald-500/20">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={teacherProfile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">{initials}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                    {teacherProfile.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {teacherProfile.email}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                    {t('teacher_layout.common.role')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              {t('teacher_layout.nav.menu')}
            </p>
            <ul className="space-y-0.5">
              {menuItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  active={isActive(item.path)}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setSidebarOpen(false);
                  }}
                />
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="px-3 pb-4 flex-shrink-0 border-t border-gray-100 dark:border-gray-700/80 pt-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
            >
              <LogOut className="w-[18px] h-[18px] group-hover:-translate-x-0.5 transition-transform" />
              {t('teacher_layout.header.logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* HEADER */}
      <TeacherHeader
        teacherProfile={teacherProfile}
        onMenuClick={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
        isMobile={isMobile}
      />

      {/* MAIN CONTENT */}
      <main className={`
        transition-all duration-300 pt-16 min-h-screen
        ${sidebarOpen && !isMobile ? 'lg:ml-64' : ''}
      `}>
        <div className="p-4 md:p-6">
          <Outlet context={{ teacherProfile, user, refreshProfile: fetchTeacherProfile }} />
        </div>
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------
// NavItem component
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

export default TeacherLayout;