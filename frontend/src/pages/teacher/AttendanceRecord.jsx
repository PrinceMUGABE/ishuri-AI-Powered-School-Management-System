import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Clock, Users, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const AttendanceRecord = () => {
  const { t } = useTranslation();
  const [selectedClass, setSelectedClass] = useState('S5 Science');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const students = [
    { id: 1, name: 'John Doe', registration: '2024-001', status: 'present' },
    { id: 2, name: 'Jane Smith', registration: '2024-002', status: 'present' },
    { id: 3, name: 'Peter Gitonga', registration: '2024-003', status: 'late' },
    { id: 4, name: 'Alice Uwase', registration: '2024-004', status: 'absent' },
    { id: 5, name: 'Eric Niyonshuti', registration: '2024-005', status: 'present' },
    { id: 6, name: 'Grace Mukamana', registration: '2024-006', status: 'present' },
    { id: 7, name: 'David Habimana', registration: '2024-007', status: 'late' },
    { id: 8, name: 'Sarah Iradukunda', registration: '2024-008', status: 'present' },
  ];

  const [attendance, setAttendance] = useState(students);

  const updateStatus = (studentId, newStatus) => {
    setAttendance(prev => prev.map(student =>
      student.id === studentId ? { ...student, status: newStatus } : student
    ));
    toast.success(`Attendance updated for student`);
  };

  const saveAttendance = () => {
    toast.success('Attendance saved successfully!');
  };

  const getStatusButtonClass = (current, status) => {
    if (current === status) {
      switch(status) {
        case 'present': return 'bg-success text-white';
        case 'late': return 'bg-warning text-white';
        case 'absent': return 'bg-danger text-white';
        default: return 'bg-gray-200 dark:bg-gray-700';
      }
    }
    return 'bg-gray-200 dark:bg-gray-700 hover:bg-opacity-70';
  };

  const stats = {
    present: attendance.filter(s => s.status === 'present').length,
    late: attendance.filter(s => s.status === 'late').length,
    absent: attendance.filter(s => s.status === 'absent').length,
    total: attendance.length
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Record Attendance</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Mark student attendance for your classes</p>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option>S5 Science</option>
              <option>S5 Arts</option>
              <option>S4 Science</option>
              <option>S4 Arts</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-primary-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Present</p>
              <p className="text-2xl font-bold text-success mt-1">{stats.present}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Late</p>
              <p className="text-2xl font-bold text-warning mt-1">{stats.late}</p>
            </div>
            <Clock className="w-8 h-8 text-warning" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Absent</p>
              <p className="text-2xl font-bold text-danger mt-1">{stats.absent}</p>
            </div>
            <XCircle className="w-8 h-8 text-danger" />
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reg No.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {attendance.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{student.registration}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{student.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      student.status === 'present' ? 'bg-success/10 text-success' :
                      student.status === 'late' ? 'bg-warning/10 text-warning' :
                      'bg-danger/10 text-danger'
                    }`}>
                      {student.status === 'present' && <CheckCircle className="w-3 h-3" />}
                      {student.status === 'late' && <Clock className="w-3 h-3" />}
                      {student.status === 'absent' && <XCircle className="w-3 h-3" />}
                      {student.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(student.id, 'present')}
                        className={`px-3 py-1 rounded-lg text-xs transition-colors ${getStatusButtonClass(student.status, 'present')}`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => updateStatus(student.id, 'late')}
                        className={`px-3 py-1 rounded-lg text-xs transition-colors ${getStatusButtonClass(student.status, 'late')}`}
                      >
                        Late
                      </button>
                      <button
                        onClick={() => updateStatus(student.id, 'absent')}
                        className={`px-3 py-1 rounded-lg text-xs transition-colors ${getStatusButtonClass(student.status, 'absent')}`}
                      >
                        Absent
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button onClick={saveAttendance} className="btn-primary">
            Save Attendance
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceRecord;