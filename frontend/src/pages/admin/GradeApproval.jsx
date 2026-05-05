import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Eye, Clock, Download, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const GradeApproval = () => {
  const { t } = useTranslation();
  const [pendingUploads, setPendingUploads] = useState([
    { id: 1, teacher: 'Mr. Smith', subject: 'Mathematics', class: 'S5 Science', date: '2024-01-15', fileName: 'math_grades_q1.xlsx', status: 'pending' },
    { id: 2, teacher: 'Mrs. Kankunda', subject: 'Biology', class: 'S5 Science', date: '2024-01-14', fileName: 'bio_grades.xlsx', status: 'pending' },
    { id: 3, teacher: 'Mr. Mugisha', subject: 'Physics', class: 'S4 Science', date: '2024-01-13', fileName: 'physics_grades.xlsx', status: 'pending' },
    { id: 4, teacher: 'Ms. Uwase', subject: 'English', class: 'S5 Arts', date: '2024-01-12', fileName: 'english_grades.xlsx', status: 'reviewing' },
  ]);

  const [approvedUploads, setApprovedUploads] = useState([
    { id: 5, teacher: 'Mr. Kagame', subject: 'History', class: 'S4 Arts', date: '2024-01-10', fileName: 'history_grades.xlsx', status: 'approved' },
    { id: 6, teacher: 'Mrs. Uwimana', subject: 'Chemistry', class: 'S5 Science', date: '2024-01-09', fileName: 'chem_grades.xlsx', status: 'approved' },
  ]);

  const handleApprove = (upload) => {
    setPendingUploads(pendingUploads.filter(u => u.id !== upload.id));
    setApprovedUploads([...approvedUploads, { ...upload, status: 'approved' }]);
    toast.success(`Grades for ${upload.subject} approved and published`);
  };

  const handleReject = (upload) => {
    setPendingUploads(pendingUploads.filter(u => u.id !== upload.id));
    toast.warning(`Grades for ${upload.subject} rejected. Teacher notified to revise.`);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs bg-warning/10 text-warning flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
      case 'reviewing':
        return <span className="px-2 py-1 rounded-full text-xs bg-info/10 text-info flex items-center gap-1"><Eye className="w-3 h-3" /> Under Review</span>;
      case 'approved':
        return <span className="px-2 py-1 rounded-full text-xs bg-success/10 text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grade Approval</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Review and approve teacher grade submissions</p>
      </div>

      {/* Pending Approvals */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Pending Approval ({pendingUploads.length})</h2>
        <div className="space-y-4">
          {pendingUploads.map((upload) => (
            <div key={upload.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{upload.subject}</h3>
                    {getStatusBadge(upload.status)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Teacher: {upload.teacher}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Class: {upload.class}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Uploaded: {upload.date}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">File: {upload.fileName}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button 
                    onClick={() => handleApprove(upload)}
                    className="bg-success text-white px-4 py-2 rounded-lg hover:bg-success/90 transition-colors flex items-center gap-2 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button 
                    onClick={() => handleReject(upload)}
                    className="bg-danger text-white px-4 py-2 rounded-lg hover:bg-danger/90 transition-colors flex items-center gap-2 text-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
          {pendingUploads.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success" />
              <p>No pending grade approvals</p>
            </div>
          )}
        </div>
      </div>

      {/* Approved History */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Approved History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Teacher</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Class</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {approvedUploads.map((upload) => (
                <tr key={upload.id}>
                  <td className="px-4 py-3 text-sm">{upload.subject}</td>
                  <td className="px-4 py-3 text-sm">{upload.teacher}</td>
                  <td className="px-4 py-3 text-sm">{upload.class}</td>
                  <td className="px-4 py-3 text-sm">{upload.date}</td>
                  <td className="px-4 py-3">{getStatusBadge(upload.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guidelines */}
      <div className="card bg-info/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-info mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">Approval Guidelines</h3>
            <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
              <li>• Verify that grades follow the correct format and scale</li>
              <li>• Ensure all students in the class have been graded</li>
              <li>• Check for any obvious errors or outliers</li>
              <li>• Approved grades become immediately visible to students and parents</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradeApproval;