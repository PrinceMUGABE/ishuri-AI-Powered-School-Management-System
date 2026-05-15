import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, GraduationCap, CalendarCheck,
  Users, MessageCircle, User, LogOut, Menu, X,
  BarChart3, FileText, Bell, Sun, Sunset, Moon,
  ChevronDown, Dot
} from 'lucide-react';
import ThemeToggle from '../../Common/ThemeToggle';
import LanguageSwitcher from '../../Common/LanguageSwitcher';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const API_BASE = 'http://127.0.0.1:8000/api';

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
// Sidebar nav item
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
// Header component
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
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
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

          {/* Messages */}
          <button
            onClick={() => navigate('/teacher/chats')}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('teacher_layout.header.messages')}
          >
            <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate('/teacher/notifications')}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('teacher_layout.header.notifications')}
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

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
                {/* Profile summary */}
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
                  onClick={() => { setDropdownOpen(false); /* trigger logout from layout */ document.dispatchEvent(new Event('teacher:logout')); }}
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
    // Auth guard
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

  // Listen for logout event from header dropdown
  useEffect(() => {
    document.addEventListener('teacher:logout', handleLogout);
    return () => document.removeEventListener('teacher:logout', handleLogout);
  }, [handleLogout]);

  // ---- Nav items ---------------------------------------------------------
  const menuItems = [
    { path: '/teacher/dashboard', icon: LayoutDashboard, label: t('teacher_layout.nav.dashboard') },
    { path: '/teacher/grades', icon: BarChart3, label: t('teacher_layout.nav.grades') },
    { path: '/teacher/attendances', icon: CalendarCheck, label: t('teacher_layout.nav.attendances') },
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

      {/* ================================================================
          SIDEBAR
      ================================================================ */}
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

      {/* ================================================================
          HEADER
      ================================================================ */}
      <TeacherHeader
        teacherProfile={teacherProfile}
        onMenuClick={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
        isMobile={isMobile}
      />

      {/* ================================================================
          MAIN CONTENT
      ================================================================ */}
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

export default TeacherLayout;