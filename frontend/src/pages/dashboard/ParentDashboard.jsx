import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, TrendingUp, CalendarCheck, MessageSquare, Bell, AlertCircle } from 'lucide-react';

const ParentDashboard = () => {
  const { t } = useTranslation();

  const children = [
    { name: 'John Doe', class: 'Senior 5', average: 78, attendance: 92, status: 'satisfactory' },
    { name: 'Jane Doe', class: 'Senior 3', average: 86, attendance: 96, status: 'satisfactory' }
  ];

  const notifications = [
    { message: 'New grade uploaded for John in Mathematics', time: '2 hours ago', type: 'grade' },
    { message: 'School fees deadline approaching', time: '1 day ago', type: 'fee' },
    { message: 'Parent-teacher meeting scheduled for Friday', time: '2 days ago', type: 'event' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Parent Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor your children's academic progress</p>
      </div>

      {/* Children Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children.map((child, index) => (
          <div key={index} className="card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold">{child.name}</h2>
                <p className="text-sm text-gray-500">{child.class}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                child.status === 'satisfactory' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              }`}>
                {t(`performance.${child.status === 'satisfactory' ? 'satisfactory' : 'nearDanger'}`)}
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Academic Average</span>
                  <span className="font-semibold">{child.average}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${child.average}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Attendance Rate</span>
                  <span className="font-semibold">{child.attendance}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-success h-2 rounded-full" style={{ width: `${child.attendance}%` }}></div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <button className="flex-1 btn-primary text-sm">View Details</button>
              <button className="flex-1 btn-secondary text-sm">Message Teacher</button>
            </div>
          </div>
        ))}
      </div>

      {/* Notifications and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Notifications</h2>
            <Bell className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {notifications.map((notif, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <AlertCircle className={`w-5 h-5 mt-0.5 ${
                  notif.type === 'grade' ? 'text-primary-500' :
                  notif.type === 'fee' ? 'text-warning' : 'text-info'
                }`} />
                <div className="flex-1">
                  <p className="text-sm">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Children</span>
              <span className="font-semibold">{children.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Average Performance</span>
              <span className="font-semibold text-success">82%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Unread Messages</span>
              <span className="font-semibold text-warning">3</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Fee Status</span>
              <span className="font-semibold text-success">Paid</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button className="w-full btn-primary">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Contact School
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;