// AdminGradeManagement.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, Download, Upload, FileSpreadsheet, Eye, Plus, X,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle, AlertCircle,
  GraduationCap, BookOpen, Calendar, Sun, Moon, Search, Filter,
  Clock, Award, Activity, UserCheck, Info, Loader2, FileText,
  TrendingUp, AlertTriangle, Shield, BarChart2, Percent,
  ChevronDown, CheckSquare, Book, Layers, Home, Hash, Star,
  Edit, Trash2, FolderOpen, File, Archive, AlertOctagon,
  Send, Ban, HelpCircle, User, Mail, Phone, MapPin, Briefcase,
  DollarSign, Clock as ClockIcon, Tag, ThumbsUp, ThumbsDown,
  MessageSquare, Settings, ShieldCheck, LayoutGrid
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// API Configuration
// ─────────────────────────────────────────────────────────────
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
  config.metadata = { startTime: Date.now() };
  console.log(`📤 REQUEST: ${config.method?.toUpperCase()} ${config.url}`, config.params || {});
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const duration = response.config.metadata
      ? `${Date.now() - response.config.metadata.startTime}ms`
      : '—';
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}`);
    return response;
  },
  (error) => {
    console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} -`, error.response?.status);
    console.error('Error details:', error.response?.data);
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const GRADE_TYPES = [
  { value: 'assignment', labelKey: 'adminGrades.gradeTypes.assignment' },
  { value: 'quiz', labelKey: 'adminGrades.gradeTypes.quiz' },
  { value: 'mid_term', labelKey: 'adminGrades.gradeTypes.midTerm' },
  { value: 'final_exam', labelKey: 'adminGrades.gradeTypes.finalExam' },
  { value: 'project', labelKey: 'adminGrades.gradeTypes.project' },
  { value: 'practical', labelKey: 'adminGrades.gradeTypes.practical' },
  { value: 'oral', labelKey: 'adminGrades.gradeTypes.oral' },
  { value: 'homework', labelKey: 'adminGrades.gradeTypes.homework' },
];

const GRADE_LETTERS = [
  { value: 'A+', min: 90, color: '#16a34a' },
  { value: 'A', min: 80, color: '#22c55e' },
  { value: 'B+', min: 75, color: '#84cc16' },
  { value: 'B', min: 70, color: '#eab308' },
  { value: 'C+', min: 65, color: '#f59e0b' },
  { value: 'C', min: 60, color: '#f97316' },
  { value: 'D', min: 50, color: '#ef4444' },
  { value: 'F', min: 0, color: '#dc2626' },
];

const getGradeLetter = (percentage) => {
  if (!percentage && percentage !== 0) return '—';
  const grade = GRADE_LETTERS.find(g => percentage >= g.min);
  return grade ? grade.value : 'F';
};

const getGradeColor = (percentage) => {
  if (!percentage && percentage !== 0) return '#94a3b8';
  const grade = GRADE_LETTERS.find(g => percentage >= g.min);
  return grade ? grade.color : '#dc2626';
};

// ─────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────
const Spinner = ({ size = 4 }) => (
  <div className={`w-${size} h-${size} border-2 border-green-700 dark:border-green-500 border-t-transparent rounded-full animate-spin`} />
);

const SelectField = ({ label, value, onChange, options = [], placeholder = 'Select...', loading = false, disabled = false, required = false, t }) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed pr-8 transition-all"
      >
        <option value="">{loading ? t('adminGrades.common.loading') : placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value ?? opt.id} value={opt.value ?? opt.id}>
            {opt.label ?? opt.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
    </div>
  </div>
);

const ModalWrapper = ({ children, title, subtitle, onClose, maxW = 'max-w-lg', icon: Icon, t }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ${maxW} w-full max-h-[92vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700`}>
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start flex-shrink-0 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-green-700 dark:bg-green-600 flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <X className="w-4.5 h-4.5" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 p-6 dark:bg-gray-900">{children}</div>
    </div>
  </div>
);

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
    {Icon && <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />}
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5 truncate">{value || '—'}</p>
    </div>
  </div>
);

const getStatusBadgeClass = (s) => {
  const map = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    needs_review: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  return map[s] || map.pending;
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const GradeApproval = () => {
  const { t, i18n } = useTranslation();

  // ── UI ──────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState('uploads'); // 'uploads' or 'manual'

  // ── Data lists ──────────────────────────────────────────────
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  // ── Grade uploads ───────────────────────────────────────────
  const [gradeUploads, setGradeUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  // ── Filters for grade uploads ───────────────────────────────
  const [fAcademicYear, setFAcademicYear] = useState('');
  const [fTerm, setFTerm] = useState('');
  const [fSchoolLevel, setFSchoolLevel] = useState('');
  const [fClassLevel, setFClassLevel] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fStatus, setFStatus] = useState('');

  // ── Manual grade entry form ─────────────────────────────────
  const [manualAcademicYear, setManualAcademicYear] = useState('');
  const [manualTerm, setManualTerm] = useState('');
  const [manualSchoolLevel, setManualSchoolLevel] = useState('');
  const [manualClassLevel, setManualClassLevel] = useState('');
  const [manualClassroom, setManualClassroom] = useState('');
  const [manualSubject, setManualSubject] = useState('');
  const [manualGradeType, setManualGradeType] = useState('assignment');
  const [manualStudent, setManualStudent] = useState('');
  const [manualScore, setManualScore] = useState('');
  const [manualMaxScore, setManualMaxScore] = useState(100);
  const [manualRemarks, setManualRemarks] = useState('');
  const [manualWeight, setManualWeight] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  // ── Filtered options for cascading selects ──────────────────
  const filteredTerms = useMemo(() => 
    terms.filter(t => !manualAcademicYear || t.academic_year_id === parseInt(manualAcademicYear))
  , [terms, manualAcademicYear]);

  const filteredClassLevels = useMemo(() =>
    classLevels.filter(cl =>
      !manualSchoolLevel || cl.school_level_id === parseInt(manualSchoolLevel)
    ), [classLevels, manualSchoolLevel]);

  const filteredClassrooms = useMemo(() =>
    classrooms.filter(cr =>
      !manualClassLevel || cr.assigned_class_level_id === parseInt(manualClassLevel)
    ), [classrooms, manualClassLevel]);

  const filteredStudents = useMemo(() =>
    students.filter(s =>
      !manualClassroom || s.current_classroom?.id === parseInt(manualClassroom)
    ), [students, manualClassroom]);

  // ── Modals ──────────────────────────────────────────────────
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [uploadGrades, setUploadGrades] = useState([]);

  // ── Fetch data ──────────────────────────────────────────────
  const fetchAcademicYears = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/academic-years/');
      const years = r.data?.data?.results || r.data?.data || r.data || [];
      setAcademicYears(years);
      if (years.length > 0 && !fAcademicYear) {
        setFAcademicYear(String(years[0].id));
      }
    } catch (e) {
      console.error('Failed to fetch academic years:', e);
    }
  }, [fAcademicYear]);

  const fetchTerms = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/terms/');
      const termsList = r.data?.data?.results || r.data?.data || r.data || [];
      setTerms(termsList);
    } catch (e) {
      console.error('Failed to fetch terms:', e);
    }
  }, []);

  const fetchSchoolLevels = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/school-levels/');
      const levels = r.data?.data?.results || r.data?.data || r.data || [];
      setSchoolLevels(levels);
    } catch (e) {
      console.error('Failed to fetch school levels:', e);
    }
  }, []);

  const fetchClassLevels = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/class-levels/');
      const levels = r.data?.data?.results || r.data?.data || r.data || [];
      setClassLevels(levels);
    } catch (e) {
      console.error('Failed to fetch class levels:', e);
    }
  }, []);

  const fetchClassrooms = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/class-rooms/');
      const rooms = r.data?.data?.results || r.data?.data || r.data || [];
      setClassrooms(rooms);
    } catch (e) {
      console.error('Failed to fetch classrooms:', e);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/subjects/');
      const subs = r.data?.data?.results || r.data?.data || r.data || [];
      setSubjects(subs);
    } catch (e) {
      console.error('Failed to fetch subjects:', e);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const r = await apiClient.get('/students/');
      const studentsList = r.data?.data?.results || r.data?.data || r.data || [];
      setStudents(studentsList);
    } catch (e) {
      console.error('Failed to fetch students:', e);
    }
  }, []);

  const fetchGradeUploads = useCallback(async () => {
    const params = {};
    if (fAcademicYear) params.academic_year_id = fAcademicYear;
    if (fTerm) params.term_id = fTerm;
    if (fSchoolLevel) params.school_level_id = fSchoolLevel;
    if (fClassLevel) params.class_level_id = fClassLevel;
    if (fSubject) params.subject_id = fSubject;
    if (fStatus) params.status = fStatus;

    setLoadingUploads(true);
    try {
      const r = await apiClient.get('/academics-records/grades/uploads/', { params });
      let uploads = r.data?.data?.results || r.data?.data || r.data || [];
      setGradeUploads(uploads);
    } catch (e) {
      console.error('Failed to fetch grade uploads:', e);
      toast.error(t('adminGrades.errors.fetchUploadsFailed'));
    } finally {
      setLoadingUploads(false);
    }
  }, [fAcademicYear, fTerm, fSchoolLevel, fClassLevel, fSubject, fStatus, t]);

  const fetchUploadGrades = useCallback(async (uploadId) => {
    try {
      const r = await apiClient.get(`/academics-records/grades/student-grades/?grade_upload_id=${uploadId}`);
      let grades = r.data?.data?.results || r.data?.data || r.data || [];
      setUploadGrades(grades);
    } catch (e) {
      console.error('Failed to fetch upload grades:', e);
      setUploadGrades([]);
    }
  }, []);

  // ── Review grade upload ─────────────────────────────────────
  const handleReviewUpload = async () => {
    if (!selectedUpload) return;
    
    setSubmittingReview(true);
    try {
      const payload = {
        action: reviewAction,
        rejection_reason: reviewAction === 'reject' ? rejectionReason : '',
        admin_notes: adminNotes
      };
      
      const r = await apiClient.post(
        `/academics-records/grades/upload/${selectedUpload.id}/approve/`,
        payload
      );
      
      if (r.data.success) {
        toast.success(reviewAction === 'approve' 
          ? t('adminGrades.review.approved') 
          : t('adminGrades.review.rejected'));
        setShowReviewModal(false);
        setSelectedUpload(null);
        setReviewAction('');
        setRejectionReason('');
        setAdminNotes('');
        fetchGradeUploads();
      } else {
        toast.error(r.data.message || t('adminGrades.review.failed'));
      }
    } catch (e) {
      console.error('Review error:', e);
      toast.error(e.response?.data?.message || t('adminGrades.review.error'));
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── Submit manual grade ─────────────────────────────────────
  const handleSubmitManualGrade = async () => {
    if (!manualAcademicYear || !manualTerm || !manualSchoolLevel || !manualClassLevel || 
        !manualSubject || !manualGradeType || !manualStudent || !manualScore) {
      toast.error(t('adminGrades.manual.missingFields'));
      return;
    }

    setSubmittingManual(true);
    try {
      // First, check if a grade upload already exists for this combination
      // If not, we need to create one
      const payload = {
        academic_year_id: manualAcademicYear,
        term_id: manualTerm,
        school_level_id: manualSchoolLevel,
        class_level_id: manualClassLevel,
        subject_id: manualSubject,
        grade_type: manualGradeType,
        student_id: manualStudent,
        score: parseFloat(manualScore),
        max_score: parseFloat(manualMaxScore),
        remarks: manualRemarks,
        weight_percentage: manualWeight ? parseFloat(manualWeight) : null
      };

      const r = await apiClient.post('/academics-records/grades/manual/', payload);
      
      if (r.data.success) {
        toast.success(t('adminGrades.manual.success'));
        // Reset form
        setManualStudent('');
        setManualScore('');
        setManualMaxScore(100);
        setManualRemarks('');
        setManualWeight('');
        fetchGradeUploads();
      } else {
        toast.error(r.data.message || t('adminGrades.manual.failed'));
      }
    } catch (e) {
      console.error('Manual grade submission error:', e);
      toast.error(e.response?.data?.message || t('adminGrades.manual.error'));
    } finally {
      setSubmittingManual(false);
    }
  };

  // ── View upload details ─────────────────────────────────────
  const viewUploadDetails = async (upload) => {
    setSelectedUpload(upload);
    await fetchUploadGrades(upload.id);
    setShowDetailModal(true);
  };

  // ── Open review modal ───────────────────────────────────────
  const openReviewModal = (upload, action) => {
    setSelectedUpload(upload);
    setReviewAction(action);
    setRejectionReason('');
    setAdminNotes('');
    setShowReviewModal(true);
  };

  // ── Helper: Get grade type label ────────────────────────────
  const getGradeTypeLabel = (gradeTypeValue) => {
    const gradeType = GRADE_TYPES.find(gt => gt.value === gradeTypeValue);
    return gradeType ? t(gradeType.labelKey) : gradeTypeValue;
  };

  // ── Initial data loading ────────────────────────────────────
  useEffect(() => {
    fetchAcademicYears();
    fetchTerms();
    fetchSchoolLevels();
    fetchClassLevels();
    fetchClassrooms();
    fetchSubjects();
    fetchStudents();
  }, [fetchAcademicYears, fetchTerms, fetchSchoolLevels, fetchClassLevels, fetchClassrooms, fetchSubjects, fetchStudents]);

  // ── Fetch uploads when filters change ───────────────────────
  useEffect(() => {
    if (fAcademicYear) {
      fetchGradeUploads();
    }
  }, [fetchGradeUploads, fAcademicYear, fTerm, fSchoolLevel, fClassLevel, fSubject, fStatus]);

  // ── Filtered uploads for search ─────────────────────────────
  const filteredUploads = useMemo(() => {
    let list = [...gradeUploads];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(u =>
        u.teacher_name?.toLowerCase().includes(q) ||
        u.subject_name?.toLowerCase().includes(q) ||
        u.class_level_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [gradeUploads, searchTerm]);

  const totalPages = Math.ceil(filteredUploads.length / itemsPerPage);
  const paginatedUploads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUploads.slice(start, start + itemsPerPage);
  }, [filteredUploads, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, fStatus]);

  // ── Language switcher ───────────────────────────────────────
  const LanguageSwitcher = () => (
    <select
      value={i18n.language}
      onChange={(e) => {
        i18n.changeLanguage(e.target.value);
        localStorage.setItem('user_language', e.target.value);
      }}
      className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
      <option value="rw">Kinyarwanda</option>
    </select>
  );

  // ── Stats cards ─────────────────────────────────────────────
  const StatsCards = () => {
    const stats = {
      total: gradeUploads.length,
      pending: gradeUploads.filter(u => u.status === 'pending').length,
      approved: gradeUploads.filter(u => u.status === 'approved').length,
      rejected: gradeUploads.filter(u => u.status === 'rejected').length,
      needs_review: gradeUploads.filter(u => u.status === 'needs_review').length,
    };

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: t('adminGrades.stats.total'), value: stats.total, color: 'from-gray-700 to-gray-900', icon: FileSpreadsheet },
          { label: t('adminGrades.stats.pending'), value: stats.pending, color: 'from-amber-500 to-amber-700', icon: Clock },
          { label: t('adminGrades.stats.approved'), value: stats.approved, color: 'from-green-500 to-green-700', icon: CheckCircle },
          { label: t('adminGrades.stats.rejected'), value: stats.rejected, color: 'from-red-500 to-red-700', icon: AlertCircle },
          { label: t('adminGrades.stats.needsReview'), value: stats.needs_review, color: 'from-orange-500 to-orange-700', icon: HelpCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white shadow-lg`}>
            <div className="flex items-center justify-between">
              <Icon className="w-5 h-5 opacity-80" />
              <p className="text-2xl font-bold">{value}</p>
            </div>
            <p className="text-xs font-medium opacity-80 mt-2">{label}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">

        {/* Header with Dark Mode and Language */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-green-700 dark:text-green-500" />
              {t('adminGrades.header.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('adminGrades.header.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('uploads')}
            className={`px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === 'uploads'
              ? 'text-green-700 dark:text-green-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              {t('adminGrades.tabs.gradeUploads')}
              <span className="ml-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                {gradeUploads.length}
              </span>
            </div>
            {activeTab === 'uploads' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700 dark:bg-green-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === 'manual'
              ? 'text-green-700 dark:text-green-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              {t('adminGrades.tabs.manualEntry')}
            </div>
            {activeTab === 'manual' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700 dark:bg-green-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Filter Bar (only for uploads tab) */}
        {activeTab === 'uploads' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-green-700 dark:text-green-500" />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('adminGrades.filters.title')}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <SelectField 
                label={t('adminGrades.filters.academicYear')} 
                value={fAcademicYear} 
                onChange={(v) => { setFAcademicYear(v); setFTerm(''); }}
                options={academicYears.map(y => ({ value: y.id, label: y.name }))}
                placeholder={t('adminGrades.filters.academicYearPlaceholder')} t={t} 
              />
              <SelectField 
                label={t('adminGrades.filters.term')} 
                value={fTerm} 
                onChange={setFTerm}
                options={terms.filter(t => !fAcademicYear || t.academic_year_id === parseInt(fAcademicYear)).map(tm => ({ value: tm.id, label: tm.name }))}
                placeholder={t('adminGrades.filters.termPlaceholder')} disabled={!fAcademicYear} t={t} 
              />
              <SelectField 
                label={t('adminGrades.filters.schoolLevel')} 
                value={fSchoolLevel} 
                onChange={(v) => { setFSchoolLevel(v); setFClassLevel(''); }}
                options={schoolLevels.map(sl => ({ value: sl.id, label: sl.name }))}
                placeholder={t('adminGrades.filters.schoolLevelPlaceholder')} t={t} 
              />
              <SelectField 
                label={t('adminGrades.filters.classLevel')} 
                value={fClassLevel} 
                onChange={setFClassLevel}
                options={classLevels.filter(cl => !fSchoolLevel || cl.school_level_id === parseInt(fSchoolLevel)).map(cl => ({ value: cl.id, label: cl.name }))}
                placeholder={t('adminGrades.filters.classLevelPlaceholder')} disabled={!fSchoolLevel} t={t} 
              />
              <SelectField 
                label={t('adminGrades.filters.subject')} 
                value={fSubject} 
                onChange={setFSubject}
                options={subjects.map(s => ({ value: s.id, label: s.name }))}
                placeholder={t('adminGrades.filters.subjectPlaceholder')} t={t} 
              />
              <SelectField 
                label={t('adminGrades.filters.status')} 
                value={fStatus} 
                onChange={setFStatus}
                options={[
                  { value: 'pending', label: t('adminGrades.statuses.pending') },
                  { value: 'approved', label: t('adminGrades.statuses.approved') },
                  { value: 'rejected', label: t('adminGrades.statuses.rejected') },
                  { value: 'needs_review', label: t('adminGrades.statuses.needs_review') },
                ]}
                placeholder={t('adminGrades.filters.statusPlaceholder')} t={t} 
              />
            </div>
            <div className="mt-3 flex justify-between items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                <input 
                  type="text" 
                  placeholder={t('adminGrades.search.placeholder')}
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200" 
                />
              </div>
              <button 
                onClick={() => { fetchGradeUploads(); toast.success(t('adminGrades.refreshed')); }}
                className="p-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Content - Grade Uploads */}
        {activeTab === 'uploads' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4.5 h-4.5 text-green-700 dark:text-green-500" />
                <h2 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t('adminGrades.uploads.title')}</h2>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                  {filteredUploads.length}
                </span>
              </div>
            </div>

            {loadingUploads ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <Spinner />
                <p className="text-sm text-gray-400 dark:text-gray-500">{t('adminGrades.common.loading')}</p>
              </div>
            ) : paginatedUploads.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center mx-auto mb-3">
                  <File className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">{t('adminGrades.uploads.noUploads')}</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{t('adminGrades.uploads.noUploadsHint')}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Teacher</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Academic Year</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Term</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grade Type</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weight</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Students</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {paginatedUploads.map((upload) => (
                        <tr key={upload.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white text-sm">{upload.teacher_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-700 dark:text-gray-300 text-sm">{upload.subject_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-700 dark:text-gray-300 text-sm">{upload.class_level_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">{upload.academic_year_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">{upload.term_name || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                              {getGradeTypeLabel(upload.grade_type)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{upload.weight_percentage}%</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-600 dark:text-gray-400 text-sm">{upload.grade_count || upload.grades_count || 0}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusBadgeClass(upload.status)}`}>
                              {t(`adminGrades.statuses.${upload.status}`)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => viewUploadDetails(upload)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title={t('adminGrades.actions.viewDetails')}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {upload.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => openReviewModal(upload, 'approve')}
                                    className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                    title={t('adminGrades.actions.approve')}
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openReviewModal(upload, 'needs_review')}
                                    className="p-1.5 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                                    title={t('adminGrades.actions.needsReview')}
                                  >
                                    <HelpCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openReviewModal(upload, 'reject')}
                                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    title={t('adminGrades.actions.reject')}
                                  >
                                    <ThumbsDown className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {upload.status === 'needs_review' && (
                                <>
                                  <button
                                    onClick={() => openReviewModal(upload, 'approve')}
                                    className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                    title={t('adminGrades.actions.approve')}
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openReviewModal(upload, 'reject')}
                                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    title={t('adminGrades.actions.reject')}
                                  >
                                    <ThumbsDown className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{t('adminGrades.pagination.show')}</span>
                    <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 bg-white dark:bg-gray-800">
                      {[5, 10, 25, 50].map(n => <option key={n}>{n}</option>)}
                    </select>
                    <span>{t('adminGrades.pagination.perPage')} · {filteredUploads.length} {t('adminGrades.pagination.total')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                      className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      {t('adminGrades.pagination.first')}
                    </button>
                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}
                      className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-medium text-gray-600 dark:text-gray-400">{currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}
                      className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}
                      className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      {t('adminGrades.pagination.last')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab Content - Manual Grade Entry */}
        {activeTab === 'manual' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <Edit className="w-5 h-5 text-green-700 dark:text-green-500" />
              <h2 className="font-bold text-gray-800 dark:text-gray-200 text-base">{t('adminGrades.manual.title')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Academic Year */}
              <SelectField 
                label={t('adminGrades.manual.academicYear')} 
                value={manualAcademicYear} 
                onChange={(v) => { setManualAcademicYear(v); setManualTerm(''); }}
                options={academicYears.map(y => ({ value: y.id, label: y.name }))}
                required t={t} 
              />

              {/* Term */}
              <SelectField 
                label={t('adminGrades.manual.term')} 
                value={manualTerm} 
                onChange={setManualTerm}
                options={filteredTerms.map(tm => ({ value: tm.id, label: tm.name }))}
                disabled={!manualAcademicYear} required t={t} 
              />

              {/* School Level */}
              <SelectField 
                label={t('adminGrades.manual.schoolLevel')} 
                value={manualSchoolLevel} 
                onChange={(v) => { setManualSchoolLevel(v); setManualClassLevel(''); }}
                options={schoolLevels.map(sl => ({ value: sl.id, label: sl.name }))}
                required t={t} 
              />

              {/* Class Level */}
              <SelectField 
                label={t('adminGrades.manual.classLevel')} 
                value={manualClassLevel} 
                onChange={(v) => { setManualClassLevel(v); setManualClassroom(''); }}
                options={filteredClassLevels.map(cl => ({ value: cl.id, label: cl.name }))}
                disabled={!manualSchoolLevel} required t={t} 
              />

              {/* Classroom */}
              <SelectField 
                label={t('adminGrades.manual.classroom')} 
                value={manualClassroom} 
                onChange={(v) => { setManualClassroom(v); setManualStudent(''); }}
                options={filteredClassrooms.map(cr => ({ value: cr.id, label: cr.name }))}
                disabled={!manualClassLevel} t={t} 
              />

              {/* Subject */}
              <SelectField 
                label={t('adminGrades.manual.subject')} 
                value={manualSubject} 
                onChange={setManualSubject}
                options={subjects.map(s => ({ value: s.id, label: s.name }))}
                required t={t} 
              />

              {/* Grade Type */}
              <SelectField 
                label={t('adminGrades.manual.gradeType')} 
                value={manualGradeType} 
                onChange={setManualGradeType}
                options={GRADE_TYPES.map(gt => ({ value: gt.value, label: t(gt.labelKey) }))}
                required t={t} 
              />

              {/* Weight Percentage */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('adminGrades.manual.weight')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manualWeight}
                  onChange={(e) => setManualWeight(e.target.value)}
                  placeholder="e.g., 10 (leave empty for default)"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500"
                />
              </div>

              {/* Student */}
              <SelectField 
                label={t('adminGrades.manual.student')} 
                value={manualStudent} 
                onChange={setManualStudent}
                options={filteredStudents.map(s => ({ value: s.id, label: `${s.full_name} (${s.roll_number})` }))}
                disabled={!manualClassroom && !manualClassLevel} required t={t} 
              />

              {/* Score */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('adminGrades.manual.score')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manualScore}
                  onChange={(e) => setManualScore(e.target.value)}
                  placeholder="0-100"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500"
                />
              </div>

              {/* Max Score */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('adminGrades.manual.maxScore')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manualMaxScore}
                  onChange={(e) => setManualMaxScore(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500"
                />
              </div>

              {/* Remarks */}
              <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('adminGrades.manual.remarks')}
                </label>
                <textarea
                  value={manualRemarks}
                  onChange={(e) => setManualRemarks(e.target.value)}
                  rows={2}
                  placeholder={t('adminGrades.manual.remarksPlaceholder')}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => {
                  setManualAcademicYear('');
                  setManualTerm('');
                  setManualSchoolLevel('');
                  setManualClassLevel('');
                  setManualClassroom('');
                  setManualSubject('');
                  setManualGradeType('assignment');
                  setManualStudent('');
                  setManualScore('');
                  setManualMaxScore(100);
                  setManualRemarks('');
                  setManualWeight('');
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                {t('adminGrades.manual.clear')}
              </button>
              <button
                onClick={handleSubmitManualGrade}
                disabled={submittingManual}
                className="px-6 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submittingManual ? <Spinner size={4} /> : <Send className="w-4 h-4" />}
                {submittingManual ? t('adminGrades.manual.submitting') : t('adminGrades.manual.submit')}
              </button>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && selectedUpload && (
          <ModalWrapper 
            title={reviewAction === 'approve' ? t('adminGrades.review.approveTitle') : reviewAction === 'reject' ? t('adminGrades.review.rejectTitle') : t('adminGrades.review.needsReviewTitle')}
            subtitle={`${selectedUpload.subject_name} - ${selectedUpload.teacher_name}`}
            onClose={() => { setShowReviewModal(false); setSelectedUpload(null); setReviewAction(''); setRejectionReason(''); setAdminNotes(''); }}
            maxW="max-w-md" 
            icon={reviewAction === 'approve' ? CheckCircle : reviewAction === 'reject' ? AlertCircle : HelpCircle}
            t={t}
          >
            <div className="space-y-4">
              {reviewAction === 'reject' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('adminGrades.review.rejectionReason')} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder={t('adminGrades.review.rejectionReasonPlaceholder')}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('adminGrades.review.adminNotes')}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder={t('adminGrades.review.adminNotesPlaceholder')}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleReviewUpload}
                  disabled={submittingReview || (reviewAction === 'reject' && !rejectionReason)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    reviewAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : reviewAction === 'reject' 
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                  } disabled:opacity-50`}
                >
                  {submittingReview ? <Spinner size={4} /> : (
                    reviewAction === 'approve' ? <ThumbsUp className="w-4 h-4" /> : 
                    reviewAction === 'reject' ? <ThumbsDown className="w-4 h-4" /> : 
                    <HelpCircle className="w-4 h-4" />
                  )}
                  {reviewAction === 'approve' ? t('adminGrades.review.confirmApprove') : 
                   reviewAction === 'reject' ? t('adminGrades.review.confirmReject') : 
                   t('adminGrades.review.confirmNeedsReview')}
                </button>
                <button
                  onClick={() => { setShowReviewModal(false); setSelectedUpload(null); setReviewAction(''); setRejectionReason(''); setAdminNotes(''); }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-all"
                >
                  {t('adminGrades.review.cancel')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* Upload Detail Modal */}
        {showDetailModal && selectedUpload && (
          <ModalWrapper 
            title={t('adminGrades.detail.title')}
            subtitle={`${selectedUpload.subject_name} - ${selectedUpload.class_level_name}`}
            onClose={() => { setShowDetailModal(false); setSelectedUpload(null); setUploadGrades([]); }}
            maxW="max-4xl" 
            icon={FileText}
            t={t}
          >
            <div className="space-y-5">
              {/* Upload Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <InfoRow label={t('adminGrades.detail.teacher')} value={selectedUpload.teacher_name} icon={User} />
                <InfoRow label={t('adminGrades.detail.subject')} value={selectedUpload.subject_name} icon={BookOpen} />
                <InfoRow label={t('adminGrades.detail.classLevel')} value={selectedUpload.class_level_name} icon={GraduationCap} />
                <InfoRow label={t('adminGrades.detail.academicYear')} value={selectedUpload.academic_year_name} icon={Calendar} />
                <InfoRow label={t('adminGrades.detail.term')} value={selectedUpload.term_name || '—'} icon={Tag} />
                <InfoRow label={t('adminGrades.detail.gradeType')} value={getGradeTypeLabel(selectedUpload.grade_type)} icon={FileSpreadsheet} />
                <InfoRow label={t('adminGrades.detail.weight')} value={`${selectedUpload.weight_percentage}%`} icon={Percent} />
                <InfoRow label={t('adminGrades.detail.status')} value={t(`adminGrades.statuses.${selectedUpload.status}`)} icon={Activity} />
                <InfoRow label={t('adminGrades.detail.uploadedAt')} value={new Date(selectedUpload.created_at).toLocaleString()} icon={ClockIcon} />
                {selectedUpload.reviewed_at && (
                  <InfoRow label={t('adminGrades.detail.reviewedAt')} value={new Date(selectedUpload.reviewed_at).toLocaleString()} icon={ClockIcon} />
                )}
                {selectedUpload.reviewed_by_name && (
                  <InfoRow label={t('adminGrades.detail.reviewedBy')} value={selectedUpload.reviewed_by_name} icon={UserCheck} />
                )}
              </div>

              {/* Rejection Reason / Admin Notes */}
              {selectedUpload.rejection_reason && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">{t('adminGrades.detail.rejectionReason')}</p>
                  <p className="text-sm text-red-600 dark:text-red-300">{selectedUpload.rejection_reason}</p>
                </div>
              )}
              {selectedUpload.admin_notes && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">{t('adminGrades.detail.adminNotes')}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">{selectedUpload.admin_notes}</p>
                </div>
              )}

              {/* Student Grades Table */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('adminGrades.detail.studentGrades')} ({uploadGrades.length})
                </h3>
                {uploadGrades.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    {t('adminGrades.detail.noGrades')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Roll Number</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Student Name</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Score</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Max Score</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Percentage</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Grade</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {uploadGrades.map((grade) => {
                          const percentage = (grade.score / grade.max_score) * 100;
                          return (
                            <tr key={grade.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-3 py-2 font-mono text-xs font-bold text-green-700 dark:text-green-400">
                                {grade.student_roll}
                              </td>
                              <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                                {grade.student_name}
                              </td>
                              <td className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">
                                {grade.score}
                              </td>
                              <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">
                                {grade.max_score}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`font-semibold ${percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                  {percentage.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getGradeColor(percentage) === '#16a34a' ? 'bg-green-100 text-green-700' :
                                  getGradeColor(percentage) === '#22c55e' ? 'bg-green-100 text-green-700' :
                                    getGradeColor(percentage) === '#84cc16' ? 'bg-lime-100 text-lime-700' :
                                      getGradeColor(percentage) === '#eab308' ? 'bg-yellow-100 text-yellow-700' :
                                        getGradeColor(percentage) === '#f59e0b' ? 'bg-amber-100 text-amber-700' :
                                          getGradeColor(percentage) === '#f97316' ? 'bg-orange-100 text-orange-700' :
                                            getGradeColor(percentage) === '#ef4444' ? 'bg-red-100 text-red-700' :
                                              'bg-gray-100 text-gray-700'
                                  }`}>
                                  {getGradeLetter(percentage)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">
                                {grade.remarks || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </ModalWrapper>
        )}
      </div>
    </div>
  );
};



export default GradeApproval;