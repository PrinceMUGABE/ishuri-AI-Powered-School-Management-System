import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, BookOpen, Upload, MessageSquare, TrendingUp, Clock } from 'lucide-react';

const TeacherDashboard = () => {
  const { t } = useTranslation();

  const stats = [
    { label: 'Total Students', value: '156', icon: Users, color: 'primary' },
    { label: 'Classes', value: '4', icon: BookOpen, color: 'info' },
    { label: 'Pending Approvals', value: '3', icon: Clock, color: 'warning' },
    { label: 'Messages', value: '12', icon: MessageSquare, color: 'success' },
  ];

  const recentActivity = [
    { action: 'Uploaded grades for Mathematics', time: '2 hours ago', status: 'pending' },
    { action: 'Recorded attendance for S5 Science', time: '5 hours ago', status: 'completed' },
    { action: 'New message from parent', time: '1 day ago', status: 'unread' },
    { action: 'Assignment uploaded for Biology', time: '2 days ago', status: 'completed' },
  ];

  const upcomingClasses = [
    { subject: 'Mathematics', class: 'S5 Science', time: '08:00 - 09:00', room: 'Rm 101' },
    { subject: 'Physics', class: 'S5 Science', time: '09:00 - 10:00', room: 'Lab 2' },
    { subject: 'Chemistry', class: 'S4 Science', time: '10:30 - 11:30', room: 'Lab 1' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back, Mr. Smith</p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Today's Schedule</h2>
          <div className="space-y-3">
            {upcomingClasses.map((class_, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium">{class_.subject}</p>
                  <p className="text-sm text-gray-500">{class_.class} • {class_.room}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{class_.time}</p>
                  <button className="text-xs text-primary-600 mt-1">Start Class</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm">{activity.action}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activity.status === 'pending' ? 'bg-warning/10 text-warning' :
                  activity.status === 'completed' ? 'bg-success/10 text-success' :
                  'bg-danger/10 text-danger'
                }`}>
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-center hover:bg-primary-100 transition-colors">
            <Upload className="w-6 h-6 text-primary-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Upload Grades</p>
          </button>
          <button className="p-4 bg-success/10 rounded-lg text-center hover:bg-success/20 transition-colors">
            <Users className="w-6 h-6 text-success mx-auto mb-2" />
            <p className="text-sm font-medium">Record Attendance</p>
          </button>
          <button className="p-4 bg-info/10 rounded-lg text-center hover:bg-info/20 transition-colors">
            <BookOpen className="w-6 h-6 text-info mx-auto mb-2" />
            <p className="text-sm font-medium">Upload Assignment</p>
          </button>
          <button className="p-4 bg-warning/10 rounded-lg text-center hover:bg-warning/20 transition-colors">
            <MessageSquare className="w-6 h-6 text-warning mx-auto mb-2" />
            <p className="text-sm font-medium">View Messages</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;