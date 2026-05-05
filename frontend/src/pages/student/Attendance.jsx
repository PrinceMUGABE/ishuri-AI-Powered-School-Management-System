import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

const Attendance = () => {
  const { t } = useTranslation();

  const monthlyAttendance = [
    { date: '2024-01-02', status: 'present', subject: 'Mathematics' },
    { date: '2024-01-02', status: 'present', subject: 'English' },
    { date: '2024-01-03', status: 'present', subject: 'Physics' },
    { date: '2024-01-03', status: 'late', subject: 'Chemistry' },
    { date: '2024-01-04', status: 'present', subject: 'Biology' },
    { date: '2024-01-04', status: 'present', subject: 'History' },
    { date: '2024-01-05', status: 'absent', subject: 'Mathematics' },
    { date: '2024-01-05', status: 'present', subject: 'English' },
    { date: '2024-01-06', status: 'present', subject: 'Kinyarwanda' },
    { date: '2024-01-06', status: 'present', subject: 'Geography' },
  ];

  const subjectAttendance = [
    { subject: 'Mathematics', present: 18, total: 20, percentage: 90 },
    { subject: 'English', present: 19, total: 20, percentage: 95 },
    { subject: 'Kinyarwanda', present: 20, total: 20, percentage: 100 },
    { subject: 'Physics', present: 16, total: 20, percentage: 80 },
    { subject: 'Chemistry', present: 17, total: 20, percentage: 85 },
    { subject: 'Biology', present: 19, total: 20, percentage: 95 },
    { subject: 'History', present: 15, total: 20, percentage: 75 },
    { subject: 'Geography', present: 18, total: 20, percentage: 90 },
  ];

  const totalPresent = monthlyAttendance.filter(a => a.status === 'present').length;
  const totalLate = monthlyAttendance.filter(a => a.status === 'late').length;
  const totalAbsent = monthlyAttendance.filter(a => a.status === 'absent').length;
  const overallAttendance = ((totalPresent + totalLate * 0.5) / monthlyAttendance.length * 100).toFixed(1);

  const getStatusIcon = (status) => {
    switch(status) {
      case 'present': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'late': return <Clock className="w-4 h-4 text-warning" />;
      case 'absent': return <XCircle className="w-4 h-4 text-danger" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('attendance.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Track your attendance records</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Overall Attendance</p>
              <p className="text-3xl font-bold mt-1">{overallAttendance}%</p>
            </div>
            <Calendar className="w-8 h-8 text-primary-500" />
          </div>
          <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${overallAttendance}%` }}></div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Present</p>
              <p className="text-3xl font-bold text-success mt-1">{totalPresent}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Late</p>
              <p className="text-3xl font-bold text-warning mt-1">{totalLate}</p>
            </div>
            <Clock className="w-8 h-8 text-warning" />
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Absent</p>
              <p className="text-3xl font-bold text-danger mt-1">{totalAbsent}</p>
            </div>
            <XCircle className="w-8 h-8 text-danger" />
          </div>
        </div>
      </div>

      {/* Subject-wise Attendance */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Attendance by Subject</h2>
        <div className="space-y-4">
          {subjectAttendance.map((subject, index) => (
            <div key={index}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{subject.subject}</span>
                <span className={`text-sm font-medium ${
                  subject.percentage >= 90 ? 'text-success' : 
                  subject.percentage >= 75 ? 'text-warning' : 'text-danger'
                }`}>{subject.percentage}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      subject.percentage >= 90 ? 'bg-success' : 
                      subject.percentage >= 75 ? 'bg-warning' : 'bg-danger'
                    }`} 
                    style={{ width: `${subject.percentage}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">{subject.present}/{subject.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Attendance Records */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Attendance Records</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {monthlyAttendance.map((record, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{record.subject}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record.status)}
                      <span className={`text-sm capitalize ${
                        record.status === 'present' ? 'text-success' : 
                        record.status === 'late' ? 'text-warning' : 'text-danger'
                      }`}>{record.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;