import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, TrendingUp, CalendarCheck, MessageSquare, Bell, AlertCircle, Eye, Mail, DollarSign, CheckCircle, GraduationCap } from 'lucide-react';

const ParentDashboard = () => {
  const { t } = useTranslation();

  const children = [
    { name: 'John Doe', class: t('parent.classes.s5'), average: 78, attendance: 92, status: 'satisfactory' },
    { name: 'Jane Doe', class: t('parent.classes.s3'), average: 86, attendance: 96, status: 'satisfactory' }
  ];

  const notifications = [
    { message: t('parent.notifications.gradeUpload'), time: t('parent.notifications.time2hours'), type: 'grade' },
    { message: t('parent.notifications.feeDeadline'), time: t('parent.notifications.time1day'), type: 'fee' },
    { message: t('parent.notifications.parentMeeting'), time: t('parent.notifications.time2days'), type: 'event' },
  ];

  const quickStats = [
    { label: t('parent.quickStats.totalChildren'), value: children.length, icon: Users, color: 'green' },
    { label: t('parent.quickStats.avgPerformance'), value: '82%', icon: TrendingUp, color: 'green' },
    { label: t('parent.quickStats.unreadMessages'), value: '3', icon: MessageSquare, color: 'amber' },
    { label: t('parent.quickStats.feeStatus'), value: t('parent.quickStats.paid'), icon: DollarSign, color: 'green' },
  ];

  const getStatusColor = (status) => {
    return status === 'satisfactory' 
      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
      : 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
  };

  const getNotificationIconColor = (type) => {
    switch(type) {
      case 'grade': return 'text-green-600 dark:text-green-400';
      case 'fee': return 'text-amber-600 dark:text-amber-400';
      case 'event': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getProgressBarColor = (type, value) => {
    if (type === 'attendance') {
      return value >= 75 ? 'bg-green-600' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';
    }
    return value >= 70 ? 'bg-green-600' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-green-100 dark:border-green-900/30">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('parent.dashboard.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('parent.dashboard.subtitle')}
        </p>
      </div>

      {/* Children Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {children.map((child, index) => (
          <div 
            key={index} 
            className="bg-white dark:bg-gray-800 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <GraduationCap className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{child.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{child.class}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(child.status)}`}>
                  {t(`performance.${child.status === 'satisfactory' ? 'satisfactory' : 'nearDanger'}`)}
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Academic Average */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{t('parent.academicAverage')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{child.average}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`${getProgressBarColor('academic', child.average)} h-2.5 rounded-full transition-all duration-500`}
                      style={{ width: `${child.average}%` }}
                    />
                  </div>
                </div>
                
                {/* Attendance Rate */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{t('parent.attendanceRate')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{child.attendance}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`${getProgressBarColor('attendance', child.attendance)} h-2.5 rounded-full transition-all duration-500`}
                      style={{ width: `${child.attendance}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <button className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4" />
                  {t('parent.viewDetails')}
                </button>
                <button className="flex-1 px-4 py-2 border-2 border-green-700 dark:border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {t('parent.messageTeacher')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notifications and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifications */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-green-100 dark:border-green-900/30 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('parent.notifications.title')}
              </h2>
              <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="p-6 space-y-3">
            {notifications.map((notif, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                <AlertCircle className={`w-5 h-5 mt-0.5 shrink-0 ${getNotificationIconColor(notif.type)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">{notif.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notif.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-green-100 dark:border-green-900/30">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('parent.quickStats.title')}
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {quickStats.map((stat, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    stat.color === 'green' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-amber-100 dark:bg-amber-900/20'
                  }`}>
                    <stat.icon className={`w-4 h-4 ${
                      stat.color === 'green' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                    }`} />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">{stat.value}</span>
              </div>
            ))}
          </div>
          <div className="p-6 pt-0">
            <button className="w-full px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              {t('parent.contactSchool')}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-green-100 dark:border-green-900/30">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('parent.recentActivity.title')}
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="p-2 bg-green-100 dark:bg-green-800/30 rounded-lg">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent.recentActivity.avgGrade')}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">82%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
                <CalendarCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent.recentActivity.upcomingEvents')}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">2</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="p-2 bg-amber-100 dark:bg-amber-800/30 rounded-lg">
                <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent.recentActivity.unreadMessages')}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">3</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="p-2 bg-purple-100 dark:bg-purple-800/30 rounded-lg">
                <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent.recentActivity.feeStatus')}</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{t('parent.quickStats.paid')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;