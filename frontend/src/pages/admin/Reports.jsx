import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  Users, 
  GraduationCap,
  AlertTriangle,
  FileText,
  PieChart,
  Activity
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import toast from 'react-hot-toast';

const Reports = () => {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState('academic');
  const [dateRange, setDateRange] = useState('term1');

  // Mock data for charts
  const classPerformance = [
    { class: 'S5 Science', average: 78, students: 45 },
    { class: 'S5 Arts', average: 72, students: 38 },
    { class: 'S4 Science', average: 75, students: 42 },
    { class: 'S4 Arts', average: 70, students: 40 },
    { class: 'S3 Science', average: 80, students: 35 },
    { class: 'S3 Arts', average: 74, students: 33 },
  ];

  const riskDistribution = [
    { name: 'Green (Satisfactory)', value: 324, color: '#10b981' },
    { name: 'Yellow (Near Danger)', value: 98, color: '#f59e0b' },
    { name: 'Red (Danger)', value: 24, color: '#ef4444' },
  ];

  const attendanceTrend = [
    { month: 'Sep', rate: 88 },
    { month: 'Oct', rate: 90 },
    { month: 'Nov', rate: 87 },
    { month: 'Dec', rate: 85 },
    { month: 'Jan', rate: 92 },
    { month: 'Feb', rate: 89 },
  ];

  const teacherAttendance = [
    { name: 'Mr. Smith', rate: 95 },
    { name: 'Mrs. Kankunda', rate: 98 },
    { name: 'Mr. Mugisha', rate: 92 },
    { name: 'Ms. Uwase', rate: 88 },
    { name: 'Mr. Kagame', rate: 96 },
  ];

  const riskStudents = [
    { name: 'Alice Uwase', class: 'S5 Science', academic: 45, attendance: 60, status: 'danger' },
    { name: 'Peter Gitonga', class: 'S4 Arts', academic: 52, attendance: 70, status: 'danger' },
    { name: 'Eric Niyonshuti', class: 'S3 Science', academic: 48, attendance: 55, status: 'danger' },
    { name: 'David Habimana', class: 'S5 Arts', academic: 58, attendance: 65, status: 'yellow' },
    { name: 'Sarah Iradukunda', class: 'S4 Science', academic: 55, attendance: 68, status: 'yellow' },
  ];

  const handleExport = (format) => {
    toast.success(`Report exported as ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Generate and export school performance reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('pdf')} className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button onClick={() => handleExport('excel')} className="btn-secondary flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Report Controls */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setReportType('academic')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                reportType === 'academic' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }`}
            >
              Academic Report
            </button>
            <button
              onClick={() => setReportType('attendance')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                reportType === 'attendance' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }`}
            >
              Attendance Report
            </button>
            <button
              onClick={() => setReportType('risk')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                reportType === 'risk' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }`}
            >
              Risk Analysis
            </button>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <option value="term1">Term 1, 2024</option>
            <option value="term2">Term 2, 2024</option>
            <option value="term3">Term 3, 2024</option>
            <option value="year">Full Year 2024</option>
          </select>
        </div>
      </div>

      {/* Academic Performance Report */}
      {reportType === 'academic' && (
        <>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Class Performance Overview</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={classPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" name="Average Score (%)" fill="#6366f1" radius={[8, 8, 0, 0]} />
                <Bar dataKey="students" name="Number of Students" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Subject Performance Highlights</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg">
                  <span>Best Performing Subject</span>
                  <span className="font-bold text-success">Kinyarwanda (85%)</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-danger/10 rounded-lg">
                  <span>Lowest Performing Subject</span>
                  <span className="font-bold text-danger">Physics (62%)</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                  <span>Most Improved Subject</span>
                  <span className="font-bold text-primary">Mathematics (+8%)</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Grade Distribution</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>A (80-100%)</span>
                    <span className="font-semibold">156 students</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-success h-2 rounded-full" style={{ width: '35%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>B (60-79%)</span>
                    <span className="font-semibold">210 students</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '47%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>C (40-59%)</span>
                    <span className="font-semibold">68 students</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-warning h-2 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>D/F (Below 40%)</span>
                    <span className="font-semibold">12 students</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-danger h-2 rounded-full" style={{ width: '3%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Attendance Report */}
      {reportType === 'attendance' && (
        <>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Attendance Trends (Last 6 Months)</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rate" name="Attendance Rate (%)" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Teacher Attendance Rate</h2>
              <div className="space-y-4">
                {teacherAttendance.map((teacher, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">{teacher.name}</span>
                      <span className="text-sm font-semibold">{teacher.rate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${teacher.rate >= 95 ? 'bg-success' : teacher.rate >= 85 ? 'bg-primary' : 'bg-warning'}`}
                        style={{ width: `${teacher.rate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Attendance Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span>Overall Student Attendance</span>
                  <span className="text-2xl font-bold text-success">89%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <span>Best Attending Class</span>
                  <span className="font-bold text-primary">S3 Science (94%)</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                  <span>Lowest Attending Class</span>
                  <span className="font-bold text-warning">S5 Arts (82%)</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-info-50 dark:bg-info-900/20 rounded-lg">
                  <span>Teachers with Perfect Attendance</span>
                  <span className="font-bold text-info">8 teachers</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Risk Analysis Report */}
      {reportType === 'risk' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Student Risk Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  <span className="inline-block w-3 h-3 bg-success rounded-full mx-1"></span> Satisfactory: 324
                  <span className="inline-block w-3 h-3 bg-warning rounded-full mx-1 ml-2"></span> Near Danger: 98
                  <span className="inline-block w-3 h-3 bg-danger rounded-full mx-1 ml-2"></span> Danger: 24
                </p>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Students in Danger Zone</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {riskStudents.map((student, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${
                    student.status === 'danger' ? 'border-danger/30 bg-danger/5' : 'border-warning/30 bg-warning/5'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.class}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        student.status === 'danger' ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'
                      }`}>
                        {student.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Academic:</span>
                        <span className={`ml-1 font-medium ${student.academic < 50 ? 'text-danger' : 'text-warning'}`}>
                          {student.academic}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Attendance:</span>
                        <span className={`ml-1 font-medium ${student.attendance < 70 ? 'text-danger' : 'text-warning'}`}>
                          {student.attendance}%
                        </span>
                      </div>
                    </div>
                    <button className="mt-2 text-xs text-primary-600 hover:text-primary-700">
                      View Intervention Plan →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Risk Analysis Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-danger/5 rounded-lg border border-danger/20">
                <AlertTriangle className="w-8 h-8 text-danger mb-2" />
                <p className="font-semibold">24 Students in Danger Zone</p>
                <p className="text-sm text-gray-500 mt-1">Require immediate academic intervention</p>
              </div>
              <div className="p-4 bg-warning/5 rounded-lg border border-warning/20">
                <Activity className="w-8 h-8 text-warning mb-2" />
                <p className="font-semibold">98 Students in Near Danger</p>
                <p className="text-sm text-gray-500 mt-1">Early intervention recommended</p>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <TrendingUp className="w-8 h-8 text-primary mb-2" />
                <p className="font-semibold">78% Overall Performance</p>
                <p className="text-sm text-gray-500 mt-1">+5% improvement from last term</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;