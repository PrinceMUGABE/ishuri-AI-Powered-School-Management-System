import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  GraduationCap,
  CalendarCheck,
  FileText,
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  BookOpen,
  Upload,
  CreditCard,
  CheckCircle,
  UserCheck,
  DollarSign,
  BadgeCheck,
  GraduationCapIcon,
  X
} from 'lucide-react';
import schoolLogo from '../../../public/imgs/school-logo.png';

const Sidebar = ({ role, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Fix: Updated paths to match the routes in App.js
  const navItems = {
    student: [
      { path: '/app/dashboard',       icon: LayoutDashboard, label: t('nav.dashboard',      'Dashboard') },
      { path: '/app/grades',          icon: GraduationCap,   label: t('nav.grades',         'Grades') },
      { path: '/app/attendance',      icon: CalendarCheck,   label: t('nav.attendance',     'Attendance') },
      { path: '/app/assignments',     icon: FileText,        label: t('nav.assignments',    'Assignments') },
      { path: '/app/digital-id',      icon: BadgeCheck,      label: t('nav.digitalId',      'Digital ID') },
      { path: '/app/academic-report', icon: BookOpen,        label: t('nav.academicReport', 'Academic Report') },
      { path: '/app/communications',  icon: MessageSquare,   label: t('nav.communications', 'Communications') },
    ],
    teacher: [
      { path: '/app/dashboard',          icon: LayoutDashboard, label: t('nav.dashboard',            'Dashboard') },
      { path: '/app/timetable',          icon: CalendarCheck,   label: t('nav.timetable',            'Timetable') },
      { path: '/app/grade-upload',       icon: Upload,          label: t('grades.upload',            'Upload Grades') },
      { path: '/app/attendance-record',  icon: UserCheck,       label: t('attendance.record',        'Attendance Record') },
      { path: '/app/assignment-upload',  icon: FileText,        label: t('teacher.uploadAssignments','Upload Assignments') },
      { path: '/app/communications',     icon: MessageSquare,   label: t('nav.communications',       'Communications') },
    ],
    parent: [
      { path: '/app/dashboard',    icon: LayoutDashboard, label: t('nav.dashboard',      'Dashboard') },
      { path: '/app/child-profile',icon: Users,           label: t('parent.childProfile','Child Profile') },
      { path: '/app/communications',icon: MessageSquare,  label: t('nav.communications', 'Communications') },
      { path: '/app/fee-payment',  icon: CreditCard,      label: t('parent.feePayment',  'Fee Payment') },
    ],
    admin: [
      { path: '/app/dashboard',      icon: LayoutDashboard, label: t('nav.dashboard',        'Dashboard') },
      { path: '/app/academics',     icon: GraduationCapIcon,             label: t('nav.academics',        'Academics') },
      { path: '/app/users',          icon: Users,           label: t('nav.users',            'Users') },
      { path: '/app/grade-approval', icon: CheckCircle,     label: t('admin.gradeApproval',  'Grade Approval') },
      { path: '/app/fee-management', icon: DollarSign,      label: t('admin.feeManagement',  'Fee Management') },
      { path: '/app/reports',        icon: BarChart3,       label: t('nav.reports',          'Reports') },
      { path: '/app/settings',       icon: Settings,        label: t('nav.settings',         'Settings') },
    ],
  };

  const items = navItems[role] || [];

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
            <p className="text-xs text-gray-500 dark:text-gray-400">Hirondelles DB</p>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 p-3 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/10 hover:text-green-700 dark:hover:text-green-400 border-l-4 border-transparent pl-3"
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
          {role} portal
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;