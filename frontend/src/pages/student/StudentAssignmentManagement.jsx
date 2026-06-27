// StudentAssignments.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  FileText, Download, Eye, Search, Filter, ChevronLeft, ChevronRight,
  Calendar, Clock, BookOpen, GraduationCap, User, Sun, Moon,
  AlertCircle, CheckCircle, XCircle, ExternalLink, Loader2,
  File, FolderOpen, Link as LinkIcon, Award, ChevronDown,
  RefreshCw, Info, Activity, TrendingUp, Users,
  Calendar as CalendarIcon, Clock as ClockIcon, AlertTriangle, Archive
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================
// API Configuration
// ============================================================
const API_BASE_URL = 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  const language = localStorage.getItem('user_language') || 'en';
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  config.headers['X-Language'] = language;
  return config;
}, (error) => Promise.reject(error));

// ============================================================
// Helper Components
// ============================================================
const Spinner = ({ size = 6 }) => (
  <div className={`w-${size} h-${size} border-2 border-green-600 dark:border-green-500 border-t-transparent rounded-full animate-spin`} />
);

const StatusBadge = ({ status, isOverdue, t }) => {
  if (isOverdue && status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
        <AlertTriangle className="w-3 h-3" />
        {t('student_assignments.overdue')}
      </span>
    );
  }
  
  const statusConfig = {
    active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: CheckCircle },
    expired: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', icon: XCircle },
    archived: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', icon: Archive }
  };
  
  const config = statusConfig[status] || statusConfig.active;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {t(`student_assignments.${status}`)}
    </span>
  );
};

const AssignmentCard = ({ assignment, onView, onDownload, t }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const getDueStatus = () => {
    if (!assignment.due_date) return null;
    const dueDate = new Date(assignment.due_date);
    const today = new Date();
    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { text: t('student_assignments.overdue_by', { days: Math.abs(daysLeft) }), color: 'text-red-600' };
    if (daysLeft === 0) return { text: t('student_assignments.due_today'), color: 'text-orange-600' };
    if (daysLeft === 1) return { text: t('student_assignments.due_tomorrow'), color: 'text-yellow-600' };
    return { text: t('student_assignments.days_left', { days: daysLeft }), color: 'text-green-600' };
  };
  
  const dueStatus = assignment.due_date ? getDueStatus() : null;
  
  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl border transition-all duration-200 overflow-hidden ${
        isHovered 
          ? 'border-green-300 dark:border-green-600 shadow-lg transform -translate-y-0.5' 
          : 'border-gray-200 dark:border-gray-700 shadow-sm'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-800 dark:text-white truncate">
                  {assignment.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {assignment.subject_name}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    {assignment.class_level_name}
                  </span>
                  {assignment.teacher_name && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {assignment.teacher_name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <StatusBadge status={assignment.status} isOverdue={assignment.is_overdue} t={t} />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
          {assignment.due_date && (
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
              <div>
                <p className="text-gray-400 dark:text-gray-500">{t('student_assignments.due_date')}</p>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {new Date(assignment.due_date).toLocaleDateString()}
                  {assignment.due_time && ` ${assignment.due_time.slice(0, 5)}`}
                </p>
              </div>
            </div>
          )}
          
          {assignment.total_marks && (
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-gray-400" />
              <div>
                <p className="text-gray-400 dark:text-gray-500">{t('student_assignments.total_marks')}</p>
                <p className="font-medium text-gray-700 dark:text-gray-300">{assignment.total_marks}</p>
              </div>
            </div>
          )}
          
          {dueStatus && (
            <div className="flex items-center gap-1.5">
              <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
              <div>
                <p className="text-gray-400 dark:text-gray-500">{t('student_assignments.status')}</p>
                <p className={`font-medium ${dueStatus.color}`}>{dueStatus.text}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <div>
              <p className="text-gray-400 dark:text-gray-500">{t('student_assignments.posted')}</p>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {new Date(assignment.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        
        {assignment.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">
            {assignment.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onView(assignment)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium transition-colors"
          >
            <Eye className="w-4 h-4" />
            {t('student_assignments.view')}
          </button>
          <button
            onClick={() => onDownload(assignment)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('student_assignments.download')}
          </button>
        </div>
      </div>
    </div>
  );
};

const AssignmentDetailModal = ({ assignment, onClose, onDownload, t }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  if (!assignment) return null;
  
  const handleViewPDF = async () => {
    setIsLoading(true);
    try {
      const pdfUrl = assignment.pdf_url;
      if (!pdfUrl) {
        toast.error(t('student_assignments.no_pdf_error'));
        return;
      }
      
      let fullUrl = pdfUrl;
      if (pdfUrl.startsWith('/')) {
        fullUrl = `${API_BASE_URL}${pdfUrl}`;
      }
      
      const token = localStorage.getItem('access_token');
      if (token) {
        fullUrl += `${fullUrl.includes('?') ? '&' : '?'}token=${token}`;
      }
      
      window.open(fullUrl, '_blank');
    } catch (error) {
      console.error('Error viewing PDF:', error);
      toast.error(t('student_assignments.view_error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-700 dark:bg-green-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{assignment.title}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {assignment.subject_name} · {assignment.class_level_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('student_assignments.teacher')}</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">{assignment.teacher_name || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('student_assignments.due_date')}</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : t('student_assignments.not_specified')}
                {assignment.due_time && ` at ${assignment.due_time.slice(0, 5)}`}
              </p>
            </div>
            {assignment.total_marks && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('student_assignments.total_marks')}</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{assignment.total_marks}</p>
              </div>
            )}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('student_assignments.posted_on')}</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {new Date(assignment.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {assignment.description && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                {t('student_assignments.description')}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {assignment.description}
              </p>
            </div>
          )}
          
          {assignment.instructions && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-100 dark:border-amber-800">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                {t('student_assignments.instructions')}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 whitespace-pre-wrap">
                {assignment.instructions}
              </p>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleViewPDF}
              disabled={isLoading}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? <Spinner size={4} /> : <Eye className="w-4 h-4" />}
              {isLoading ? t('student_assignments.loading') : t('student_assignments.view_assignment')}
            </button>
            <button
              onClick={() => onDownload(assignment)}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('student_assignments.download_pdf')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================
const StudentAssignments = () => {
  const { t, i18n } = useTranslation();
  
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  
  // Filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [uniqueSubjects, setUniqueSubjects] = useState([]);
  
  const fetchStudentProfile = useCallback(async () => {
    try {
      const res = await apiClient.get('/students/me/');
      if (res.data.success) {
        setStudentProfile(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch student profile:', error);
    }
  }, []);
  
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      const res = await apiClient.get('/academics-records/assignments/', { params });
      
      let assignmentsList = [];
      if (res.data?.data?.results) {
        assignmentsList = res.data.data.results;
      } else if (res.data?.data) {
        assignmentsList = res.data.data;
      } else if (Array.isArray(res.data?.results)) {
        assignmentsList = res.data.results;
      } else if (Array.isArray(res.data)) {
        assignmentsList = res.data;
      }
      
      // Filter only active assignments for students
      const activeAssignments = assignmentsList.filter(a => a.status === 'active');
      setAssignments(activeAssignments);
      
      // Extract unique subjects for filter
      const subjects = [...new Set(activeAssignments.map(a => a.subject_name).filter(Boolean))];
      setUniqueSubjects(subjects);
      
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      toast.error(t('student_assignments.fetch_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);
  
  const handleViewAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setShowDetailModal(true);
  };
  
  const handleDownloadAssignment = async (assignment) => {
    try {
      const pdfUrl = assignment.pdf_url;
      if (!pdfUrl) {
        toast.error(t('student_assignments.no_pdf_error'));
        return;
      }
      
      let fullUrl = pdfUrl;
      if (pdfUrl.startsWith('/')) {
        fullUrl = `${API_BASE_URL}${pdfUrl}`;
      }
      
      const token = localStorage.getItem('access_token');
      if (token) {
        fullUrl += `${fullUrl.includes('?') ? '&' : '?'}token=${token}`;
      }
      
      // Create a temporary anchor to trigger download
      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = `${assignment.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(t('student_assignments.download_success'));
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(t('student_assignments.download_error'));
    }
  };
  
  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    let list = assignments;
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.subject_name?.toLowerCase().includes(q) ||
        a.class_level_name?.toLowerCase().includes(q) ||
        a.teacher_name?.toLowerCase().includes(q)
      );
    }
    
    if (filterSubject) {
      list = list.filter(a => a.subject_name === filterSubject);
    }
    
    if (filterStatus) {
      if (filterStatus === 'overdue') {
        list = list.filter(a => a.is_overdue === true);
      } else {
        list = list.filter(a => a.status === filterStatus);
      }
    }
    
    // Sort by due date (soonest first, null dates last)
    list.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
    
    return list;
  }, [assignments, searchTerm, filterSubject, filterStatus]);
  
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssignments.slice(start, start + itemsPerPage);
  }, [filteredAssignments, currentPage, itemsPerPage]);
  
  useEffect(() => {
    fetchStudentProfile();
    fetchAssignments();
  }, [fetchStudentProfile, fetchAssignments]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSubject, filterStatus]);
  
  const stats = useMemo(() => {
    const total = assignments.length;
    const upcoming = assignments.filter(a => a.due_date && new Date(a.due_date) > new Date() && !a.is_overdue).length;
    const overdue = assignments.filter(a => a.is_overdue).length;
    return { total, upcoming, overdue };
  }, [assignments]);
  
  const LanguageSwitcher = () => (
    <select
      value={i18n.language}
      onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('user_language', e.target.value); }}
      className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
      <option value="rw">Kinyarwanda</option>
    </select>
  );
  
  const StatsCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <FileText className="w-8 h-8 opacity-80" />
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <p className="text-sm font-medium opacity-80 mt-2">{t('student_assignments.total_assignments')}</p>
      </div>
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <Calendar className="w-8 h-8 opacity-80" />
          <p className="text-3xl font-bold">{stats.upcoming}</p>
        </div>
        <p className="text-sm font-medium opacity-80 mt-2">{t('student_assignments.upcoming')}</p>
      </div>
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <AlertTriangle className="w-8 h-8 opacity-80" />
          <p className="text-3xl font-bold">{stats.overdue}</p>
        </div>
        <p className="text-sm font-medium opacity-80 mt-2">{t('student_assignments.overdue')}</p>
      </div>
    </div>
  );
  
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 md:p-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-7 h-7 text-green-600 dark:text-green-500" />
              {t('student_assignments.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('student_assignments.subtitle')}
            </p>
          </div>
          {/* <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
            </button>
            <button
              onClick={fetchAssignments}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div> */}
        </div>
        
        {/* Stats */}
        <StatsCards />
        
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('student_assignments.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
              />
            </div>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
            >
              <option value="">{t('student_assignments.all_subjects')}</option>
              {uniqueSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
            >
              <option value="">{t('student_assignments.all_status')}</option>
              <option value="active">{t('student_assignments.active')}</option>
              <option value="overdue">{t('student_assignments.overdue')}</option>
            </select>
          </div>
        </div>
        
        {/* Assignments Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size={10} />
            <p className="mt-4 text-gray-500 dark:text-gray-400">{t('student_assignments.loading_assignments')}</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 text-center mt-6">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('student_assignments.no_assignments')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('student_assignments.no_assignments_message')}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
              {paginatedAssignments.map(assignment => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onView={handleViewAssignment}
                  onDownload={handleDownloadAssignment}
                  t={t}
                />
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{t('student_assignments.show')}</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-800"
                  >
                    {[6, 12, 18, 24].map(n => <option key={n}>{n}</option>)}
                  </select>
                  <span>{t('student_assignments.per_page')}</span>
                  <span className="hidden sm:inline">• {t('student_assignments.total')} {filteredAssignments.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('student_assignments.first')}
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('student_assignments.last')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Detail Modal */}
        {showDetailModal && selectedAssignment && (
          <AssignmentDetailModal
            assignment={selectedAssignment}
            onClose={() => { setShowDetailModal(false); setSelectedAssignment(null); }}
            onDownload={handleDownloadAssignment}
            t={t}
          />
        )}
      </div>
    </div>
  );
};

export default StudentAssignments;