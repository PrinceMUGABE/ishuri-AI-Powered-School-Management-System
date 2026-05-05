import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';

const Assignments = () => {
  const { t } = useTranslation();

  const assignments = [
    {
      id: 1,
      title: 'Mathematics Homework - Chapter 5',
      subject: 'Mathematics',
      dueDate: '2024-01-20',
      description: 'Complete all exercises on quadratic equations',
      status: 'pending',
      fileUrl: '#'
    },
    {
      id: 2,
      title: 'Physics Lab Report - Motion',
      subject: 'Physics',
      dueDate: '2024-01-18',
      description: 'Write a lab report on the motion experiment',
      status: 'submitted',
      fileUrl: '#'
    },
    {
      id: 3,
      title: 'English Essay - Climate Change',
      subject: 'English',
      dueDate: '2024-01-22',
      description: 'Write a 500-word essay on climate change effects',
      status: 'pending',
      fileUrl: '#'
    },
    {
      id: 4,
      title: 'Chemistry Worksheet - Periodic Table',
      subject: 'Chemistry',
      dueDate: '2024-01-15',
      description: 'Complete the periodic table worksheet',
      status: 'overdue',
      fileUrl: '#'
    }
  ];

  const getStatusConfig = (status) => {
    switch(status) {
      case 'pending':
        return { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', label: 'Pending' };
      case 'submitted':
        return { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Submitted' };
      case 'overdue':
        return { icon: AlertCircle, color: 'text-danger', bg: 'bg-danger/10', label: 'Overdue' };
      default:
        return { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Unknown' };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.assignments')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">View and download your assignments</p>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {assignments.map((assignment) => {
          const statusConfig = getStatusConfig(assignment.status);
          const StatusIcon = statusConfig.icon;
          
          return (
            <div key={assignment.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                      <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{assignment.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{assignment.subject}</p>
                      <p className="text-sm text-gray-500 mt-2">{assignment.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs">
                        <span className="text-gray-500">Due: {assignment.dueDate}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="btn-primary flex items-center gap-2 text-sm">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  {assignment.status === 'pending' && (
                    <button className="btn-secondary text-sm">
                      Submit
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submission Guidelines */}
      <div className="card bg-primary-50 dark:bg-primary-900/20">
        <h3 className="font-semibold mb-2">Submission Guidelines</h3>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <li>• Submit assignments physically in class</li>
          <li>• All assignments must be submitted before the due date</li>
          <li>• Late submissions may incur point deductions</li>
          <li>• Contact your teacher for any clarification</li>
        </ul>
      </div>
    </div>
  );
};

export default Assignments;