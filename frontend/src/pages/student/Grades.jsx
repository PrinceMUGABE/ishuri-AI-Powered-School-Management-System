import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Eye } from 'lucide-react';

const Grades = () => {
  const { t } = useTranslation();

  const gradesData = [
    { subject: 'Mathematics', assignment1: 85, assignment2: 88, exam: 82, final: 85, grade: 'A', status: 'green' },
    { subject: 'English', assignment1: 78, assignment2: 75, exam: 80, final: 78, grade: 'B+', status: 'green' },
    { subject: 'Kinyarwanda', assignment1: 92, assignment2: 90, exam: 94, final: 92, grade: 'A', status: 'green' },
    { subject: 'Physics', assignment1: 65, assignment2: 68, exam: 62, final: 65, grade: 'C', status: 'yellow' },
    { subject: 'Chemistry', assignment1: 70, assignment2: 72, exam: 68, final: 70, grade: 'B-', status: 'yellow' },
    { subject: 'Biology', assignment1: 88, assignment2: 85, exam: 90, final: 88, grade: 'A-', status: 'green' },
    { subject: 'History', assignment1: 55, assignment2: 58, exam: 52, final: 55, grade: 'D', status: 'red' },
    { subject: 'Geography', assignment1: 75, assignment2: 78, exam: 72, final: 75, grade: 'B', status: 'green' }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'green': return 'bg-success/10 text-success border-success/20';
      case 'yellow': return 'bg-warning/10 text-warning border-warning/20';
      case 'red': return 'bg-danger/10 text-danger border-danger/20';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const overallAverage = (gradesData.reduce((sum, g) => sum + g.final, 0) / gradesData.length).toFixed(1);
  const overallStatus = overallAverage >= 70 ? 'green' : overallAverage >= 50 ? 'yellow' : 'red';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('grades.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">View your academic performance across all subjects</p>
      </div>

      {/* Overall Performance Card */}
      <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-90">Overall Average</p>
            <p className="text-4xl font-bold mt-1">{overallAverage}%</p>
            <p className="text-sm mt-2 opacity-90">Performance Status: {t(`performance.${overallStatus === 'green' ? 'satisfactory' : overallStatus === 'yellow' ? 'nearDanger' : 'danger'}`)}</p>
          </div>
          <div className={`p-4 rounded-full bg-white/20 ${overallStatus === 'green' ? 'ring-4 ring-green-300' : overallStatus === 'yellow' ? 'ring-4 ring-yellow-300' : 'ring-4 ring-red-300'}`}>
            <span className="text-3xl">{overallStatus === 'green' ? '✓' : overallStatus === 'yellow' ? '!' : '⚠'}</span>
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assignment 1</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assignment 2</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Final</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {gradesData.map((grade, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{grade.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{grade.assignment1}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{grade.assignment2}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{grade.exam}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{grade.final}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{grade.grade}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(grade.status)}`}>
                      {grade.status === 'green' ? 'Satisfactory' : grade.status === 'yellow' ? 'Near Danger' : 'Danger'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-3">Grade Distribution</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>A (90-100%)</span>
              <span className="font-semibold">2 subjects</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>B (80-89%)</span>
              <span className="font-semibold">2 subjects</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>C (70-79%)</span>
              <span className="font-semibold">1 subject</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>D (60-69%)</span>
              <span className="font-semibold">2 subjects</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>F (&lt;60%)</span>
              <span className="font-semibold">1 subject</span>
            </div>
          </div>
        </div>

        <div className="card md:col-span-2">
          <h3 className="font-semibold mb-3">Performance Summary</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Strongest Subject: Biology</span>
                <span className="font-semibold text-success">88%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Weakest Subject: History</span>
                <span className="font-semibold text-danger">55%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-danger h-2 rounded-full" style={{ width: '55%' }}></div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-warning/10 rounded-lg">
            <p className="text-sm text-warning">⚠️ Recommendation: Focus on improving History and Physics to reach satisfactory level.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Grades;