import React from 'react';
import { useTranslation } from 'react-i18next';
import PerformanceChart from '../../components/Charts/PerformanceChart';
import { TrendingUp, CalendarCheck, FileText, CreditCard } from 'lucide-react';

const StudentDashboard = () => {
  const { t } = useTranslation();

  // Mock data
  const gradesData = [
    { subject: 'Mathematics', score: 85, grade: 'A' },
    { subject: 'English', score: 78, grade: 'B+' },
    { subject: 'Kinyarwanda', score: 92, grade: 'A' },
    { subject: 'Physics', score: 65, grade: 'C' },
    { subject: 'Chemistry', score: 70, grade: 'B-' },
    { subject: 'Biology', score: 88, grade: 'A-' }
  ];

  const stats = [
    { label: t('performance.academic'), value: '78%', color: 'primary', icon: TrendingUp },
    { label: t('attendance.rate'), value: '92%', color: 'success', icon: CalendarCheck },
    { label: 'Assignments', value: '4', color: 'warning', icon: FileText },
    { label: t('fees.status'), value: t('fees.paid'), color: 'info', icon: CreditCard }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Student Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Welcome back, John Doe
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/20`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">{t('performance.academic')}</h2>
          <PerformanceChart data={gradesData} />
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">{t('performance.disciplinary')}</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Attendance Rate</span>
                <span className="text-sm font-medium">92%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg performance-green">
              <p className="text-sm font-medium">Status: {t('performance.satisfactory')}</p>
              <p className="text-xs mt-1">You are performing well with no concerns.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Assignments</h2>
        <div className="space-y-3">
          {[
            { title: 'Mathematics Homework', due: '2024-01-20', status: 'pending' },
            { title: 'Physics Lab Report', due: '2024-01-18', status: 'submitted' },
            { title: 'English Essay', due: '2024-01-22', status: 'pending' }
          ].map((assignment, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <p className="font-medium">{assignment.title}</p>
                <p className="text-sm text-gray-500">Due: {assignment.due}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                assignment.status === 'submitted' 
                  ? 'bg-success/10 text-success' 
                  : 'bg-warning/10 text-warning'
              }`}>
                {assignment.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;