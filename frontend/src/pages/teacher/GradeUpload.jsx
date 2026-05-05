import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const GradeUpload = () => {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState([
    { id: 1, date: '2024-01-10', subject: 'Mathematics', status: 'approved', fileName: 'math_grades_q1.xlsx' },
    { id: 2, date: '2024-01-05', subject: 'Physics', status: 'pending', fileName: 'physics_grades.xlsx' },
    { id: 3, date: '2023-12-20', subject: 'Chemistry', status: 'rejected', fileName: 'chem_grades.xlsx' }
  ]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.name.endsWith('.xlsx'))) {
      setFile(selectedFile);
    } else {
      toast.error('Please upload an Excel file (.xlsx format)');
      e.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    // Simulate API call
    setTimeout(() => {
      toast.success('Grades uploaded successfully! Pending admin approval.');
      setFile(null);
      setUploading(false);
      // Reset file input
      document.getElementById('file-input').value = '';
    }, 2000);
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-success" />;
      case 'pending': return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-danger" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grade Upload</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Upload student grades for admin approval</p>
      </div>

      {/* Upload Section */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Upload New Grades</h2>
        
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Upload Excel file (.xlsx format) with student grades
          </p>
          <p className="text-sm text-gray-500 mb-4">
            File must follow the required template format
          </p>
          <input
            id="file-input"
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => document.getElementById('file-input').click()}
              className="btn-secondary"
            >
              Select File
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn-primary flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Grades
                </>
              )}
            </button>
          </div>
          {file && (
            <p className="mt-4 text-sm text-primary-600">
              Selected: {file.name}
            </p>
          )}
        </div>
      </div>

      {/* Upload History */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Upload History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">File Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {uploadHistory.map((upload) => (
                <tr key={upload.id}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{upload.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{upload.subject}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{upload.fileName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(upload.status)}
                      <span className={`text-sm capitalize ${
                        upload.status === 'approved' ? 'text-success' : 
                        upload.status === 'pending' ? 'text-warning' : 'text-danger'
                      }`}>{upload.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructions */}
      <div className="card bg-info/10">
        <h3 className="font-semibold mb-2">Important Notes:</h3>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <li>• Grades must be uploaded using the provided Excel template</li>
          <li>• All uploaded grades will be reviewed by the administrator before publication</li>
          <li>• Students and parents will only see grades after admin approval</li>
          <li>• You will be notified if your submission requires revision</li>
        </ul>
      </div>
    </div>
  );
};

export default GradeUpload;