import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, BookOpen, TrendingUp, DollarSign, AlertCircle, CheckCircle, GraduationCap, FileText, Eye } from 'lucide-react';

const AdminDashboard = () => {
  const { t } = useTranslation();

  const stats = [
    { 
      label: t('admin.stats.totalStudents'), 
      value: '486', 
      icon: Users, 
      color: 'green', 
      change: '+12%',
      changeType: 'increase'
    },
    { 
      label: t('admin.stats.totalTeachers'), 
      value: '32', 
      icon: BookOpen, 
      color: 'blue', 
      change: '+2%',
      changeType: 'increase'
    },
    { 
      label: t('admin.stats.feeCollection'), 
      value: '78%', 
      icon: DollarSign, 
      color: 'amber', 
      change: '+5%',
      changeType: 'increase'
    },
    { 
      label: t('admin.stats.riskZoneStudents'), 
      value: '24', 
      icon: AlertCircle, 
      color: 'red', 
      change: '-3%',
      changeType: 'decrease'
    },
  ];

  const pendingApprovals = [
    { type: t('admin.approvals.gradeUploads'), count: 8, department: t('admin.approvals.sciences') },
    { type: t('admin.approvals.leaveRequests'), count: 3, department: t('admin.approvals.various') },
    { type: t('admin.approvals.parentMessages'), count: 12, department: t('admin.approvals.communications') },
  ];

  const riskStudents = [
    { name: 'Alice Uwase', class: 'S5 Science', academic: '45%', attendance: '60%' },
    { name: 'Peter Gitonga', class: 'S4 Arts', academic: '52%', attendance: '70%' },
    { name: 'Eric Niyonshuti', class: 'S3 Science', academic: '58%', attendance: '65%' },
  ];

  const getColorClasses = (color) => {
    const colors = {
      green: {
        bg: 'bg-green-100 dark:bg-green-900/20',
        icon: 'text-green-600 dark:text-green-400',
      },
      blue: {
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        icon: 'text-blue-600 dark:text-blue-400',
      },
      amber: {
        bg: 'bg-amber-100 dark:bg-amber-900/20',
        icon: 'text-amber-600 dark:text-amber-400',
      },
      red: {
        bg: 'bg-red-100 dark:bg-red-900/20',
        icon: 'text-red-600 dark:text-red-400',
      }
    };
    return colors[color] || colors.green;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-green-100 dark:border-green-900/30">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('admin.dashboard.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('admin.dashboard.subtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const colors = getColorClasses(stat.color);
          return (
            <div 
              key={index} 
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-green-100 dark:border-green-900/30 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                  <span className={`text-xs inline-flex items-center gap-1 mt-1 ${
                    stat.changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stat.change}
                    {stat.changeType === 'increase' ? '↑' : '↓'}
                  </span>
                </div>
                <div className={`p-3 rounded-lg ${colors.bg} shrink-0 ml-3`}>
                  <stat.icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-green-100 dark:border-green-900/30 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.approvals.title')}
            </h2>
          </div>
          <div className="p-6 space-y-3">
            {pendingApprovals.map((item, index) => (
              <div 
                key={index} 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg shrink-0">
                    <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{item.type}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.department}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium whitespace-nowrap">
                    {item.count} {t('admin.approvals.pending')}
                  </span>
                  <button className="text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm font-medium flex items-center gap-1 transition-colors whitespace-nowrap">
                    <Eye className="w-3.5 h-3.5" />
                    {t('admin.approvals.review')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Zone Students */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-green-100 dark:border-green-900/30 bg-gradient-to-r from-red-50 to-transparent dark:from-red-900/10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.riskZone.title')}
            </h2>
          </div>
          <div className="p-6 space-y-3">
            {riskStudents.map((student, index) => (
              <div 
                key={index} 
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-red-50/30 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800/30 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <p className="font-medium text-gray-900 dark:text-white truncate">{student.name}</p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{student.class}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                  <div className="flex gap-3 text-sm">
                    <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      <span className="font-medium">{t('admin.riskZone.academic')}:</span> {student.academic}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      <span className="font-medium">{t('admin.riskZone.attendance')}:</span> {student.attendance}
                    </span>
                  </div>
                  <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t('admin.riskZone.intervene')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Reports */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-green-100 dark:border-green-900/30">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('admin.reports.title')}
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="group p-6 bg-green-50 dark:bg-green-900/20 rounded-xl text-center hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-200 hover:shadow-md">
              <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.reports.performance')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('admin.reports.performanceDesc')}</p>
            </button>
            <button className="group p-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all duration-200 hover:shadow-md">
              <DollarSign className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.reports.feeCollection')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('admin.reports.feeCollectionDesc')}</p>
            </button>
            <button className="group p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 hover:shadow-md">
              <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.reports.attendance')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('admin.reports.attendanceDesc')}</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;