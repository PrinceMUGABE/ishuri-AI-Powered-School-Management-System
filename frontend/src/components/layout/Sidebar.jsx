import React from 'react';
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import schoolLogo from '../../../public/imgs/school-logo.png';
import {faIdCard} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Sidebar = ({ role }) => {
  const { t } = useTranslation();

  const navItems = {
    student: [
      { path: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
      { path: '/grades', icon: GraduationCap, label: t('nav.grades') },
      { path: '/attendance', icon: CalendarCheck, label: t('nav.attendance') },
      { path: '/assignments', icon: FileText, label: t('nav.assignments') },
      { 
        path: '/digital-id', 
        icon: () => <FontAwesomeIcon icon={faIdCard} className="w-5 h-5 shrink-0" />, 
        label: t('nav.digitalId') 
      },
      { path: '/academic-report', icon: BookOpen, label: t('nav.academicReport') },
      { path: '/communications', icon: MessageSquare, label: t('nav.communications') },
    ],
    teacher: [
      { path: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
      { path: '/timetable', icon: CalendarCheck, label: t('nav.timetable') },
      { path: '/grade-upload', icon: Upload, label: t('grades.upload') },
      { path: '/attendance-record', icon: UserCheck, label: t('attendance.record') },
      { path: '/assignment-upload', icon: FileText, label: t('teacher.uploadAssignments') },
      { path: '/communications', icon: MessageSquare, label: t('nav.communications') },
    ],
    parent: [
      { path: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
      { path: '/child-profile', icon: Users, label: t('parent.childProfile') },
      { path: '/communications', icon: MessageSquare, label: t('nav.communications') },
      { path: '/fee-payment', icon: CreditCard, label: t('parent.feePayment') },
    ],
    admin: [
      { path: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
      { path: '/users', icon: Users, label: t('nav.users') },
      { path: '/grade-approval', icon: CheckCircle, label: t('admin.gradeApproval') },
      { path: '/fee-management', icon: DollarSign, label: t('admin.feeManagement') },
      { path: '/reports', icon: BarChart3, label: t('nav.reports') },
      { path: '/settings', icon: Settings, label: t('nav.settings') },
    ]
  };

  const items = navItems[role] || [];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-gray-900 border-r border-green-100 dark:border-green-900/30 overflow-y-auto z-40 hidden lg:block shrink-0">
      {/* School Logo Section */}
      <div className="p-4 border-b border-green-100 dark:border-green-900/30 mb-4">
        <div className="flex items-center gap-3">
          <img 
            src={schoolLogo} 
            alt="Les Hirondelles de Don Bosco" 
            className="w-10 h-10 rounded-full object-contain ring-2 ring-green-700/30"
          />
          <div>
            <h3 className="text-sm font-bold text-green-800 dark:text-green-400">Ishuri</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Hirondelles DB</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-l-4 border-green-700 dark:border-green-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/10 hover:text-green-700 dark:hover:text-green-400'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;