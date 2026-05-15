import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users, BookOpen, CalendarCheck, FileText, MessageCircle,
  TrendingUp, Clock, Award, ChevronRight, Bell
} from 'lucide-react';

const TeacherDashboard = () => {
  const { t } = useTranslation();
  const { teacherProfile } = useOutletContext();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSubjects: 0,
    totalClasses: 0,
    pendingAssignments: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    // Fetch dashboard statistics
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('access_token');
        // You can implement API calls here
        setStats({
          totalStudents: 45,
          totalSubjects: 3,
          totalClasses: 6,
          pendingAssignments: 12
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    fetchStats();
  }, []);

  const statCards = [
    { icon: Users, label: t('dashboard.totalStudents', 'Total Students'), value: stats.totalStudents, color: 'bg-blue-500' },
    { icon: BookOpen, label: t('dashboard.totalSubjects', 'Subjects'), value: stats.totalSubjects, color: 'bg-green-500' },
    { icon: CalendarCheck, label: t('dashboard.totalClasses', 'Classes Today'), value: stats.totalClasses, color: 'bg-purple-500' },
    { icon: FileText, label: t('dashboard.pendingAssignments', 'Pending Assignments'), value: stats.pendingAssignments, color: 'bg-orange-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          {t('dashboard.welcome', 'Welcome back')}, {teacherProfile?.first_name}!
        </h1>
        <p className="text-green-100">
          {t('dashboard.subtitle', 'Here\'s what\'s happening with your classes today')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('dashboard.quickActions', 'Quick Actions')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
            <Users className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">{t('dashboard.takeAttendance', 'Take Attendance')}</span>
          </button>
          <button className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('dashboard.enterGrades', 'Enter Grades')}</span>
          </button>
          <button className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{t('dashboard.addAssignment', 'Add Assignment')}</span>
          </button>
          <button className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors">
            <MessageCircle className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">{t('dashboard.sendMessage', 'Send Message')}</span>
          </button>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('dashboard.recentActivities', 'Recent Activities')}
          </h2>
          <button className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
            {t('dashboard.viewAll', 'View All')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  {t('dashboard.activityMessage', 'Student submission received for assignment')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('dashboard.minutesAgo', '5 minutes ago')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;