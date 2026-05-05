import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, TrendingUp, CalendarCheck, FileText, CreditCard } from 'lucide-react';
import PerformanceChart from '../../components/Charts/PerformanceChart';

const ChildProfile = () => {
  const { t } = useTranslation();
  const [selectedChild, setSelectedChild] = useState(0);

  const children = [
    {
      id: 1,
      name: 'John Doe',
      class: 'Senior 5 - Science',
      registration: '2024-00123',
      grades: [
        { subject: 'Mathematics', score: 85 },
        { subject: 'English', score: 78 },
        { subject: 'Kinyarwanda', score: 92 },
        { subject: 'Physics', score: 65 },
        { subject: 'Chemistry', score: 70 },
        { subject: 'Biology', score: 88 }
      ],
      attendance: 92,
      fees: 'paid'
    },
    {
      id: 2,
      name: 'Jane Doe',
      class: 'Senior 3 - Science',
      registration: '2024-00124',
      grades: [
        { subject: 'Mathematics', score: 90 },
        { subject: 'English', score: 85 },
        { subject: 'Kinyarwanda', score: 88 },
        { subject: 'Physics', score: 82 },
        { subject: 'Chemistry', score: 79 },
        { subject: 'Biology', score: 91 }
      ],
      attendance: 96,
      fees: 'paid'
    }
  ];

  const currentChild = children[selectedChild];
  const overallAverage = (currentChild.grades.reduce((sum, g) => sum + g.score, 0) / currentChild.grades.length).toFixed(1);

  const stats = [
    { label: t('performance.academic'), value: `${overallAverage}%`, color: 'primary', icon: TrendingUp },
    { label: t('attendance.rate'), value: `${currentChild.attendance}%`, color: 'success', icon: CalendarCheck },
    { label: 'Subjects', value: currentChild.grades.length.toString(), color: 'info', icon: FileText },
    { label: t('fees.status'), value: t('fees.paid'), color: 'success', icon: CreditCard }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Child Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor your children's academic progress</p>
      </div>

      {/* Child Selector */}
      {children.length > 1 && (
        <div className="card">
          <div className="flex gap-4">
            {children.map((child, index) => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(index)}
                className={`flex-1 p-4 rounded-lg text-center transition-all ${
                  selectedChild === index
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                    : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <p className="font-semibold">{child.name}</p>
                <p className="text-sm text-gray-500">{child.class}</p>
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Performance Chart */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">{t('performance.academic')}</h2>
        <PerformanceChart data={currentChild.grades} />
      </div>

      {/* Subject Details */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Subject Performance</h2>
        <div className="space-y-4">
          {currentChild.grades.map((subject, index) => (
            <div key={index}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{subject.subject}</span>
                <span className={`text-sm font-medium ${
                  subject.score >= 70 ? 'text-success' : 
                  subject.score >= 50 ? 'text-warning' : 'text-danger'
                }`}>{subject.score}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    subject.score >= 70 ? 'bg-success' : 
                    subject.score >= 50 ? 'bg-warning' : 'bg-danger'
                  }`} 
                  style={{ width: `${subject.score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Recent Updates</h2>
          <div className="space-y-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <p className="text-sm">New grade uploaded in Mathematics</p>
              <p className="text-xs text-gray-500">2 days ago</p>
            </div>
            <div className="p-3 bg-warning/10 rounded-lg">
              <p className="text-sm">Assignment due: English Essay</p>
              <p className="text-xs text-gray-500">Due in 3 days</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Teacher Comments</h2>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm">"John is improving well in Mathematics"</p>
              <p className="text-xs text-gray-500 mt-1">- Mr. Smith, Mathematics Teacher</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm">"Excellent performance in Biology"</p>
              <p className="text-xs text-gray-500 mt-1">- Mrs. Kankunda, Biology Teacher</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChildProfile;