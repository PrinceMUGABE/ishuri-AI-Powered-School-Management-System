import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, Download, Trash2, Eye, Calendar, BookOpen, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const AssignmentUpload = () => {
  const { t } = useTranslation();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [assignments, setAssignments] = useState([
    {
      id: 1,
      title: 'Mathematics Homework - Chapter 5',
      subject: 'Mathematics',
      class: 'S5 Science',
      dueDate: '2024-01-20',
      description: 'Complete all exercises on quadratic equations',
      fileName: 'math_homework_ch5.pdf',
      uploadedDate: '2024-01-10',
      downloads: 28
    },
    {
      id: 2,
      title: 'Physics Lab Report Guidelines',
      subject: 'Physics',
      class: 'S5 Science',
      dueDate: '2024-01-25',
      description: 'Guidelines for writing lab report on motion experiment',
      fileName: 'physics_lab_guidelines.pdf',
      uploadedDate: '2024-01-12',
      downloads: 32
    },
    {
      id: 3,
      title: 'English Essay - Climate Change',
      subject: 'English',
      class: 'S5 Arts',
      dueDate: '2024-01-22',
      description: 'Write a 500-word essay on climate change effects',
      fileName: 'english_essay_climate.pdf',
      uploadedDate: '2024-01-08',
      downloads: 24
    },
    {
      id: 4,
      title: 'Chemistry Periodic Table Worksheet',
      subject: 'Chemistry',
      class: 'S4 Science',
      dueDate: '2024-01-18',
      description: 'Complete the periodic table worksheet',
      fileName: 'chemistry_worksheet.pdf',
      uploadedDate: '2024-01-05',
      downloads: 35
    }
  ]);

  const classes = ['S5 Science', 'S5 Arts', 'S4 Science', 'S4 Arts', 'S3 Science', 'S3 Arts'];
  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Kinyarwanda', 'History', 'Geography'];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast.error('Please upload a PDF file');
      e.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (!title || !description || !dueDate || !selectedClass || !selectedSubject) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }

    setUploading(true);
    
    // Simulate API upload
    setTimeout(() => {
      const newAssignment = {
        id: assignments.length + 1,
        title,
        subject: selectedSubject,
        class: selectedClass,
        dueDate,
        description,
        fileName: file.name,
        uploadedDate: new Date().toISOString().split('T')[0],
        downloads: 0
      };
      
      setAssignments([newAssignment, ...assignments]);
      
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate('');
      setSelectedClass('');
      setSelectedSubject('');
      setFile(null);
      document.getElementById('file-input').value = '';
      
      setUploading(false);
      toast.success('Assignment uploaded successfully!');
    }, 2000);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      setAssignments(assignments.filter(a => a.id !== id));
      toast.success('Assignment deleted successfully');
    }
  };

  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Assignments</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Share assignments and learning materials with your students</p>
      </div>

      {/* Upload Form */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Upload New Assignment</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Assignment Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mathematics Homework - Chapter 5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Subject *</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Class *</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Due Date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            placeholder="Describe the assignment requirements..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          ></textarea>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Assignment File (PDF) *</label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <FileText className="w-10 h-10 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {file ? file.name : 'Upload PDF file (Max 10MB)'}
            </p>
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => document.getElementById('file-input').click()}
              className="btn-secondary text-sm"
            >
              Select File
            </button>
          </div>
        </div>
        
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="btn-primary flex items-center gap-2 w-full md:w-auto"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Assignment
            </>
          )}
        </button>
      </div>

      {/* Existing Assignments */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Your Assignments</h2>
        
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const daysRemaining = getDaysRemaining(assignment.dueDate);
            const isOverdue = daysRemaining < 0;
            
            return (
              <div key={assignment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                        <FileText className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{assignment.title}</h3>
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {assignment.subject}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {assignment.class}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due: {assignment.dueDate}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {assignment.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-gray-500">Uploaded: {assignment.uploadedDate}</span>
                          <span className="text-gray-500">{assignment.downloads} downloads</span>
                          {!isOverdue && daysRemaining > 0 && (
                            <span className="text-success">{daysRemaining} days remaining</span>
                          )}
                          {isOverdue && (
                            <span className="text-danger">Overdue</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="View">
                      <Eye className="w-4 h-4 text-info" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Download">
                      <Download className="w-4 h-4 text-primary" />
                    </button>
                    <button 
                      onClick={() => handleDelete(assignment.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-danger" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {assignments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No assignments uploaded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Guidelines */}
      <div className="card bg-info/10">
        <h3 className="font-semibold mb-2">Guidelines for Uploading Assignments</h3>
        <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
          <li>• Upload assignments in PDF format for easy access across all devices</li>
          <li>• Include clear instructions and grading criteria in the assignment description</li>
          <li>• Set realistic due dates that give students adequate time to complete the work</li>
          <li>• Students will be notified when you upload new assignments</li>
          <li>• Students submit assignments physically in class, not through the system</li>
        </ul>
      </div>
    </div>
  );
};

export default AssignmentUpload;