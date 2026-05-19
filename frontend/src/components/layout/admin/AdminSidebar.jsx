import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CheckCircle,
  DollarSign,
  BarChart3,
  Settings,
  BookOpen,
  MessageSquare,
  UserCheck,
  School,
  X
} from 'lucide-react';
import schoolLogo from '../../../../public/imgs/school-logo.png';

const AdminSidebar = ({ onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/app/dashboard', icon: LayoutDashboard, label: t('nav.dashboard', 'Dashboard') },
    { path: '/app/academics', icon: GraduationCap, label: t('nav.academics', 'Academics') },
    { path: '/app/teacher-management', icon: Users, label: t('admin.teacherManagement', 'Teacher Management') },
    { path: '/app/student-management', icon: School, label: t('admin.studentManagement', 'Student Management') },
    { path: '/app/users', icon: Users, label: t('nav.users', 'User Management') },
    { path: '/app/grade-approval', icon: CheckCircle, label: t('admin.gradeApproval', 'Grade Approval') },
    { path: '/app/fee-management', icon: DollarSign, label: t('admin.feeManagement', 'Fee Management') },
    { path: '/app/reports', icon: BarChart3, label: t('nav.reports', 'Reports') },
    { path: '/app/analytics', icon: BarChart3, label: t('admin.analytics', 'Analytics') },
    { path: '/app/chat', icon: MessageSquare, label: t('admin.chat', 'Chat Management') },

    { path: '/app/settings', icon: Settings, label: t('nav.settings', 'Settings') },
  ];

  const handleNavigate = (path) => {
    navigate(path);
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <aside
      className="
        w-64
        h-full
        bg-white dark:bg-gray-900
        border-r border-green-100 dark:border-green-900/30
        shadow-md
        overflow-y-auto
        flex flex-col
      "
    >
      {/* Close button for mobile */}
      <div className="lg:hidden absolute top-4 right-4">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* School branding */}
      <div className="p-4 border-b border-green-100 dark:border-green-900/30">
        <div className="flex items-center gap-3">
          <img
            src={schoolLogo}
            alt="Les Hirondelles de Don Bosco"
            className="w-10 h-10 rounded-full object-contain ring-2 ring-green-700/30"
          />
          <div>
            <h3 className="text-sm font-bold text-green-800 dark:text-green-400 leading-tight">
              Ishuri
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/10 hover:text-green-700 dark:hover:text-green-400"
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer role badge */}
      <div className="p-4 border-t border-green-100 dark:border-green-900/30">
        <p className="text-xs text-center text-gray-400 dark:text-gray-500 capitalize tracking-wide">
          Administrator Portal
        </p>
      </div>
    </aside>
  );
};

export default AdminSidebar;