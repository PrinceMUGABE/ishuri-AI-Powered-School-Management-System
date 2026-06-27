// TeacherAssignmentManagement.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, Calendar, Clock, CheckCircle, XCircle, AlertCircle,
  Search, Filter, ChevronLeft, ChevronRight, RefreshCw,
  Download, Upload, Eye, Edit, Trash2, Plus, X,
  FileText, File, FolderOpen, Sun, Moon, ExternalLink,
  GraduationCap, BookOpen, UserCheck, AlertTriangle,
  ChevronDown, Info, Loader2, Activity, Send,
  Link as LinkIcon, Calendar as CalendarIcon, Clock as ClockIcon,
  FileSignature, Paperclip, Link, Eye as EyeIcon, Award
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
    return Promise.reject(error);
  }
);

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
        <option value="">{loading ? t('assignment.loading') : placeholder}</option>
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
          <X className="w-4 h-4" />
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

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const TeacherAssignmentManagement = () => {
  const { t, i18n } = useTranslation();

  // ── UI State ────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ── Teacher Data ────────────────────────────────────────────
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [myAssignments, setMyAssignments] = useState({
    school_levels: [], class_levels: [], classrooms: [], subjects: [],
  });

  // ── Lookup Lists ────────────────────────────────────────────
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);

  // ── Filter State ────────────────────────────────────────────
  const [fAcademicYear, setFAcademicYear] = useState('');
  const [fTerm, setFTerm] = useState('');
  const [fSchoolLevel, setFSchoolLevel] = useState('');
  const [fClassLevel, setFClassLevel] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fClassroom, setFClassroom] = useState('');

  // ── Assignments Data ────────────────────────────────────────
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // ── Modals ──────────────────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // ── Upload Form State ───────────────────────────────────────
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [uAcademicYear, setUAcademicYear] = useState('');
  const [uTerm, setUTerm] = useState('');
  const [uSchoolLevel, setUSchoolLevel] = useState('');
  const [uClassLevel, setUClassLevel] = useState('');
  const [uSubject, setUSubject] = useState('');
  const [uClassroom, setUClassroom] = useState('');

  // ── Edit Form State ─────────────────────────────────────────
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editTotalMarks, setEditTotalMarks] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // ── Selected Assignment for Detail ──────────────────────────
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const fileInputRef = useRef(null);

  // ────────────────────────────────────────────────────────────
  // Data Fetching Functions
  // ────────────────────────────────────────────────────────────

  const fetchTeacherProfile = useCallback(async () => {
    try {
      const r = await apiClient.get('/teachers/me/');
      const profileData = r.data.data || r.data;
      setTeacherProfile(profileData);
    } catch (e) {
      console.error('Failed to fetch teacher profile:', e);
    }
  }, []);

  const fetchAcademicYears = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/academic-years/');
      const years = r.data.data?.results || r.data.data || r.data || [];
      setAcademicYears(years);
      const current = years.find(y => y.is_current);
      const defaultYear = current?.id || years[0]?.id;
      if (defaultYear) {
        setFAcademicYear(String(defaultYear));
        setUAcademicYear(String(defaultYear));
      }
    } catch (e) {
      console.error('Failed to fetch academic years:', e);
    }
  }, []);

  const fetchTerms = useCallback(async (yearId, setter) => {
    if (!yearId) return;
    try {
      const r = await apiClient.get(`/academics/terms/?academic_year=${yearId}`);
      const list = r.data.data?.results || r.data.data || r.data || [];
      setter(list);
    } catch (e) {
      console.error('Failed to fetch terms:', e);
      setter([]);
    }
  }, []);

  const fetchMyAssignments = useCallback(async () => {
    try {
      const r = await apiClient.get('/teachers/timetable/my-assignments/');
      const data = r.data.data || r.data || {};
      setMyAssignments({
        school_levels: data.school_levels || [],
        class_levels: data.class_levels || [],
        classrooms: data.classrooms || [],
        subjects: data.subjects || [],
      });
    } catch (e) {
      console.error('Failed to fetch assignments:', e);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    const params = {};
    if (fAcademicYear) params.academic_year_id = fAcademicYear;
    if (fTerm) params.term_id = fTerm;
    if (fClassLevel) params.class_level_id = fClassLevel;
    if (fSubject) params.subject_id = fSubject;
    if (fClassroom) params.classroom_id = fClassroom;

    console.log('📤 Fetching assignments with params:', params);
    setLoadingAssignments(true);
    try {
      const r = await apiClient.get('/academics-records/assignments/', { params });
      console.log('📥 Assignments response:', r.data);

      let assignmentsList = [];
      if (r.data?.data?.results) {
        assignmentsList = r.data.data.results;
      } else if (r.data?.data) {
        assignmentsList = r.data.data;
      } else if (Array.isArray(r.data?.results)) {
        assignmentsList = r.data.results;
      } else if (Array.isArray(r.data)) {
        assignmentsList = r.data;
      }

      setAssignments(assignmentsList);
    } catch (e) {
      console.error('Failed to fetch assignments:', e);
      toast.error(t('assignment.fetch_assignments_error'));
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }, [fAcademicYear, fTerm, fClassLevel, fSubject, fClassroom, t]);

  // ── Cascading Options ───────────────────────────────────────
  const filteredClassLevels = useMemo(() =>
    myAssignments.class_levels.filter(cl =>
      !fSchoolLevel || String(cl.school_level_id) === String(fSchoolLevel)
    ), [myAssignments.class_levels, fSchoolLevel]);

  const filteredSubjects = useMemo(() =>
    myAssignments.subjects, [myAssignments.subjects]);

  const filteredClassrooms = useMemo(() =>
    myAssignments.classrooms.filter(cr =>
      !fClassLevel || String(cr.class_level_id) === String(fClassLevel)
    ), [myAssignments.classrooms, fClassLevel]);

  // ── Upload Form Handlers ────────────────────────────────────
  const handleUploadAssignment = async () => {
    if (!uploadFile) {
      toast.error(t('assignment.select_pdf_error'));
      return;
    }
    if (!uAcademicYear || !uClassLevel || !uSubject || !title) {
      toast.error(t('assignment.required_fields_error'));
      return;
    }
    if (uploadFile.type !== 'application/pdf') {
      toast.error(t('assignment.pdf_only_error'));
      return;
    }

    setUploading(true);
    const fd = new FormData();
    fd.append('pdf_file', uploadFile);
    fd.append('academic_year_id', uAcademicYear);
    fd.append('class_level_id', uClassLevel);
    fd.append('subject_id', uSubject);
    fd.append('title', title);

    if (uTerm) fd.append('term_id', uTerm);
    if (uSchoolLevel) fd.append('school_level_id', uSchoolLevel);
    if (uClassroom) fd.append('classroom_id', uClassroom);
    if (description) fd.append('description', description);
    if (instructions) fd.append('instructions', instructions);
    if (dueDate) fd.append('due_date', dueDate);
    if (dueTime) fd.append('due_time', dueTime);
    if (totalMarks) fd.append('total_marks', totalMarks);

    try {
      const r = await apiClient.post('/academics-records/assignments/upload/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (r.data.success) {
        toast.success(t('assignment.upload_success'));
        setShowUploadModal(false);
        resetUploadForm();
        fetchAssignments();
      } else {
        toast.error(r.data.message || t('assignment.upload_failed'));
      }
    } catch (e) {
      console.error('Upload error:', e);
      toast.error(e.response?.data?.message || t('assignment.upload_failed'));
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setTitle('');
    setDescription('');
    setInstructions('');
    setDueDate('');
    setDueTime('');
    setTotalMarks('');
    setUAcademicYear('');
    setUTerm('');
    setUSchoolLevel('');
    setUClassLevel('');
    setUSubject('');
    setUClassroom('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Edit Assignment Handlers ─────────────────────────────────
  const handleEditAssignment = async () => {
    if (!editingAssignment) return;

    setSubmittingEdit(true);
    try {
      const payload = {
        title: editTitle,
        description: editDescription,
        instructions: editInstructions,
        due_date: editDueDate || null,
        due_time: editDueTime || null,
        total_marks: editTotalMarks || null,
        status: editStatus
      };

      const r = await apiClient.patch(`/academics-records/assignments/${editingAssignment.id}/`, payload);

      if (r.data.success) {
        toast.success(t('assignment.update_success'));
        setShowEditModal(false);
        setEditingAssignment(null);
        fetchAssignments();
      } else {
        toast.error(r.data.message || t('assignment.update_failed'));
      }
    } catch (e) {
      console.error('Edit error:', e);
      toast.error(e.response?.data?.message || t('assignment.update_failed'));
    } finally {
      setSubmittingEdit(false);
    }
  };

  // ── Delete Assignment Handler ────────────────────────────────
  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      const r = await apiClient.delete(`/academics-records/assignments/${selectedAssignment.id}/`);

      if (r.data.success) {
        toast.success(t('assignment.delete_success'));
        setShowDeleteConfirmModal(false);
        setSelectedAssignment(null);
        fetchAssignments();
      } else {
        toast.error(r.data.message || t('assignment.delete_failed'));
      }
    } catch (e) {
      console.error('Delete error:', e);
      toast.error(e.response?.data?.message || t('assignment.delete_failed'));
    }
  };

  // ── View PDF Handler ─────────────────────────────────────────
  const viewPDF = (pdfUrl) => {
    if (!pdfUrl) {
      toast.error(t('assignment.no_pdf_error'));
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
  };

  // ── Open Modals ──────────────────────────────────────────────
  const openDetailModal = (assignment) => {
    setSelectedAssignment(assignment);
    setShowDetailModal(true);
  };

  const openEditModal = (assignment) => {
    setEditingAssignment(assignment);
    setEditTitle(assignment.title);
    setEditDescription(assignment.description || '');
    setEditInstructions(assignment.instructions || '');
    setEditDueDate(assignment.due_date || '');
    setEditDueTime(assignment.due_time || '');
    setEditTotalMarks(assignment.total_marks || '');
    setEditStatus(assignment.status || 'active');
    setShowEditModal(true);
  };

  const openDeleteConfirmModal = (assignment) => {
    setSelectedAssignment(assignment);
    setShowDeleteConfirmModal(true);
  };

  // ── Filtered Assignments ─────────────────────────────────────
  const filteredAssignments = useMemo(() => {
    let list = assignments;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.subject_name?.toLowerCase().includes(q) ||
        a.class_level_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [assignments, searchTerm]);

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssignments.slice(start, start + itemsPerPage);
  }, [filteredAssignments, currentPage, itemsPerPage]);

  // ── Effects ──────────────────────────────────────────────────
  useEffect(() => {
    fetchTeacherProfile();
    fetchAcademicYears();
    fetchMyAssignments();
  }, []);

  useEffect(() => {
    if (fAcademicYear) {
      fetchTerms(fAcademicYear, setTerms);
    }
  }, [fAcademicYear, fetchTerms]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fSubject, fClassLevel]);

  // ── Stats Calculation ────────────────────────────────────────
  const stats = useMemo(() => {
    const total = assignments.length;
    const active = assignments.filter(a => a.status === 'active').length;
    const overdue = assignments.filter(a => a.is_overdue).length;
    const expired = assignments.filter(a => a.status === 'expired').length;
    return { total, active, overdue, expired };
  }, [assignments]);

  // ── Render Components ────────────────────────────────────────
  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: t('assignment.total_assignments'), value: stats.total, color: 'from-gray-700 to-gray-900', icon: FileText },
        { label: t('assignment.active'), value: stats.active, color: 'from-green-500 to-green-700', icon: CheckCircle },
        { label: t('assignment.overdue'), value: stats.overdue, color: 'from-red-500 to-red-700', icon: AlertCircle },
        { label: t('assignment.expired'), value: stats.expired, color: 'from-yellow-500 to-yellow-700', icon: Clock },
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

  const LanguageSwitcher = () => (
    <select
      value={i18n.language}
      onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('user_language', e.target.value); }}
      className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
      <option value="rw">Kinyarwanda</option>
    </select>
  );

  const StatusBadge = ({ status, isOverdue }) => {
  if (isOverdue && status === 'active') {
    return <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">{t('assignment.overdue')}</span>;
  }
  const colors = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    archived: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
  };
  return <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || colors.active}`}>{t(`assignment.${status}`)}</span>;
};

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileSignature className="w-6 h-6 text-green-700 dark:text-green-500" />
              {t('assignment.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {teacherProfile?.full_name} · {t('assignment.subtitle')}
            </p>
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

        {/* Stats */}
        <StatsCards />

        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-green-700 dark:text-green-500" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('assignment.filters')}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SelectField
              label={t('assignment.academic_year')}
              value={fAcademicYear}
              onChange={(v) => setFAcademicYear(v)}
              options={academicYears.map(y => ({ value: y.id, label: y.name }))}
              placeholder={t('assignment.all_years')}
              t={t}
            />
            <SelectField
              label={t('assignment.term')}
              value={fTerm}
              onChange={setFTerm}
              options={terms.map(tm => ({ value: tm.id, label: tm.name }))}
              placeholder={t('assignment.all_terms')}
              disabled={!fAcademicYear}
              t={t}
            />
            <SelectField
              label={t('assignment.school_level')}
              value={fSchoolLevel}
              onChange={(v) => { setFSchoolLevel(v); setFClassLevel(''); }}
              options={myAssignments.school_levels.map(sl => ({ value: sl.id, label: sl.name }))}
              placeholder={t('assignment.all_levels')}
              t={t}
            />
            <SelectField
              label={t('assignment.class_level')}
              value={fClassLevel}
              onChange={(v) => { setFClassLevel(v); setFClassroom(''); }}
              options={filteredClassLevels.map(cl => ({ value: cl.id, label: cl.name }))}
              placeholder={t('assignment.all_classes')}
              disabled={!fSchoolLevel}
              t={t}
            />
            <SelectField
              label={t('assignment.subject')}
              value={fSubject}
              onChange={setFSubject}
              options={filteredSubjects.map(s => ({ value: s.id, label: s.name }))}
              placeholder={t('assignment.all_subjects')}
              t={t}
            />
            <SelectField
              label={t('assignment.classroom')}
              value={fClassroom}
              onChange={setFClassroom}
              options={filteredClassrooms.map(cr => ({ value: cr.id, label: cr.name }))}
              placeholder={t('assignment.all_classrooms')}
              disabled={!fClassLevel}
              t={t}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-green-200 dark:shadow-green-900/30"
          >
            <Upload className="w-4 h-4" />
            {t('assignment.upload_assignment')}
          </button>
        </div>

        {/* Assignments List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-700 dark:text-green-500" />
              <h2 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t('assignment.my_assignments')}</h2>
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                {filteredAssignments.length}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={t('assignment.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
              />
            </div>
          </div>

          {loadingAssignments ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <Spinner />
              <p className="text-sm text-gray-400 dark:text-gray-500">{t('assignment.loading_assignments')}</p>
            </div>
          ) : paginatedAssignments.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">{t('assignment.no_assignments')}</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{t('assignment.upload_first')}</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                              {assignment.title}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {assignment.subject_name} · {assignment.class_level_name}
                              {assignment.academic_year_name && ` · ${assignment.academic_year_name}`}
                            </p>
                          </div>
                          <StatusBadge status={assignment.status} isOverdue={assignment.is_overdue} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                          <div>
                            <span className="text-gray-400 dark:text-gray-500">{t('assignment.due_date')}:</span>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                              {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : t('assignment.no_due_date')}
                              {assignment.due_time && ` ${t('assignment.at')} ${assignment.due_time}`}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400 dark:text-gray-500">{t('assignment.total_marks')}:</span>
                            <p className="font-medium text-gray-700 dark:text-gray-300">{assignment.total_marks || t('assignment.not_specified')}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 dark:text-gray-500">{t('assignment.created')}:</span>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                              {new Date(assignment.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400 dark:text-gray-500">{t('assignment.teacher')}:</span>
                            <p className="font-medium text-gray-700 dark:text-gray-300">{assignment.teacher_name}</p>
                          </div>
                        </div>

                        {assignment.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                            {assignment.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={() => viewPDF(assignment.pdf_url)}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title={t('assignment.view_pdf')}
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDetailModal(assignment)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title={t('assignment.view_details')}
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(assignment)}
                          className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                          title={t('assignment.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirmModal(assignment)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title={t('assignment.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{t('assignment.show')}</span>
                  <select
                    value={itemsPerPage}
                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 bg-white dark:bg-gray-800"
                  >
                    {[5, 10, 25, 50].map(n => <option key={n}>{n}</option>)}
                  </select>
                  <span>{t('assignment.per_page')} · {t('assignment.total')} {filteredAssignments.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                    className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {t('assignment.first')}
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
                    {t('assignment.last')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── UPLOAD MODAL ──────────────────────────────────────── */}
        {showUploadModal && (
          <ModalWrapper
            title={t('assignment.upload_title')}
            subtitle={t('assignment.upload_subtitle')}
            onClose={() => { setShowUploadModal(false); resetUploadForm(); }}
            maxW="max-2xl"
            icon={Upload}
            t={t}
          >
            <div className="space-y-4">
              {/* File Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-green-200 dark:border-green-700 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all"
              >
                <FileText className="w-10 h-10 text-green-300 mx-auto mb-2" />
                {uploadFile ? (
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">{uploadFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('assignment.click_to_select')}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('assignment.pdf_only')}</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setUploadFile(e.target.files[0])} />
              </div>

              {/* Assignment Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('assignment.title_label')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('assignment.title_placeholder')}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>

                <SelectField
                  label={t('assignment.academic_year')}
                  value={uAcademicYear}
                  onChange={(v) => setUAcademicYear(v)}
                  options={academicYears.map(y => ({ value: y.id, label: y.name }))}
                  required placeholder={t('assignment.select_year')}
                  t={t}
                />
                <SelectField
                  label={t('assignment.term')}
                  value={uTerm}
                  onChange={setUTerm}
                  options={terms.map(tm => ({ value: tm.id, label: tm.name }))}
                  disabled={!uAcademicYear}
                  placeholder={t('assignment.select_term')}
                  t={t}
                />
                <SelectField
                  label={t('assignment.school_level')}
                  value={uSchoolLevel}
                  onChange={(v) => { setUSchoolLevel(v); setUClassLevel(''); }}
                  options={myAssignments.school_levels.map(sl => ({ value: sl.id, label: sl.name }))}
                  placeholder={t('assignment.select_level')}
                  t={t}
                />
                <SelectField
                  label={t('assignment.class_level')}
                  value={uClassLevel}
                  onChange={setUClassLevel}
                  options={myAssignments.class_levels.map(cl => ({ value: cl.id, label: cl.name }))}
                  disabled={!uSchoolLevel}
                  required placeholder={t('assignment.select_class')}
                  t={t}
                />
                <SelectField
                  label={t('assignment.subject')}
                  value={uSubject}
                  onChange={setUSubject}
                  options={myAssignments.subjects.map(s => ({ value: s.id, label: s.name }))}
                  required placeholder={t('assignment.select_subject')}
                  t={t}
                />
                <SelectField
                  label={t('assignment.classroom')}
                  value={uClassroom}
                  onChange={setUClassroom}
                  options={myAssignments.classrooms.map(cr => ({ value: cr.id, label: cr.name }))}
                  disabled={!uClassLevel}
                  placeholder={t('assignment.select_classroom')}
                  t={t}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('assignment.due_date_label')}</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('assignment.due_time_label')}</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('assignment.total_marks_label')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  placeholder={t('assignment.marks_placeholder')}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('assignment.description_label')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder={t('assignment.description_placeholder')}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('assignment.instructions_label')}</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder={t('assignment.instructions_placeholder')}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleUploadAssignment}
                  disabled={uploading}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? <Spinner size={4} /> : <Upload className="w-4 h-4" />}
                  {uploading ? t('assignment.uploading') : t('assignment.upload_button')}
                </button>
                <button
                  onClick={() => { setShowUploadModal(false); resetUploadForm(); }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold"
                >
                  {t('assignment.cancel')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* ── DETAIL MODAL ──────────────────────────────────────── */}
        {showDetailModal && selectedAssignment && (
          <ModalWrapper
            title={t('assignment.details_title')}
            subtitle={selectedAssignment.title}
            onClose={() => { setShowDetailModal(false); setSelectedAssignment(null); }}
            maxW="max-2xl"
            icon={FileText}
            t={t}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label={t('assignment.subject')} value={selectedAssignment.subject_name} icon={BookOpen} />
                <InfoRow label={t('assignment.class')} value={selectedAssignment.class_level_name} icon={GraduationCap} />
                <InfoRow label={t('assignment.academic_year')} value={selectedAssignment.academic_year_name} icon={CalendarIcon} />
                <InfoRow label={t('assignment.teacher')} value={selectedAssignment.teacher_name} icon={UserCheck} />
                <InfoRow label={t('assignment.status')} value={t(`assignment.${selectedAssignment.status}`)} icon={Activity} />
                <InfoRow label={t('assignment.due_date')} value={selectedAssignment.due_date ? new Date(selectedAssignment.due_date).toLocaleDateString() : t('assignment.not_set')} icon={CalendarIcon} />
                {selectedAssignment.due_time && <InfoRow label={t('assignment.due_time')} value={selectedAssignment.due_time} icon={ClockIcon} />}
                {selectedAssignment.total_marks && <InfoRow label={t('assignment.total_marks')} value={selectedAssignment.total_marks} icon={Award} />}
              </div>

              {selectedAssignment.description && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">{t('assignment.description_label')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedAssignment.description}</p>
                </div>
              )}

              {selectedAssignment.instructions && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">{t('assignment.instructions_label')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedAssignment.instructions}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => viewPDF(selectedAssignment.pdf_url)}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  <EyeIcon className="w-4 h-4" />
                  {t('assignment.view_pdf')}
                </button>
                <button
                  onClick={() => { setShowDetailModal(false); setSelectedAssignment(null); }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold"
                >
                  {t('assignment.close')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* ── EDIT MODAL ────────────────────────────────────────── */}
        {showEditModal && editingAssignment && (
          <ModalWrapper
            title={t('assignment.edit_title')}
            subtitle={editingAssignment.title}
            onClose={() => { setShowEditModal(false); setEditingAssignment(null); }}
            maxW="max-2xl"
            icon={Edit}
            t={t}
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('assignment.title_label')}</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('assignment.due_date_label')}</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('assignment.due_time_label')}</label>
                  <input
                    type="time"
                    value={editDueTime}
                    onChange={(e) => setEditDueTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('assignment.total_marks_label')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editTotalMarks}
                    onChange={(e) => setEditTotalMarks(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('assignment.status_label')}</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  >
                    <option value="active">{t('assignment.active')}</option>
                    <option value="expired">{t('assignment.expired')}</option>
                    <option value="archived">{t('assignment.archived')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('assignment.description_label')}</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('assignment.instructions_label')}</label>
                <textarea
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleEditAssignment}
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingEdit ? <Spinner size={4} /> : <CheckCircle className="w-4 h-4" />}
                  {submittingEdit ? t('assignment.saving') : t('assignment.save_changes')}
                </button>
                <button
                  onClick={() => { setShowEditModal(false); setEditingAssignment(null); }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold"
                >
                  {t('assignment.cancel')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* ── DELETE CONFIRM MODAL ───────────────────────────────── */}
        {showDeleteConfirmModal && selectedAssignment && (
          <ModalWrapper
            title={t('assignment.delete_title')}
            subtitle={t('assignment.delete_subtitle')}
            onClose={() => { setShowDeleteConfirmModal(false); setSelectedAssignment(null); }}
            maxW="max-md"
            icon={AlertTriangle}
            t={t}
          >
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {t('assignment.delete_confirmation')} <strong>"{selectedAssignment.title}"</strong>?
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  {t('assignment.delete_warning')}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAssignment}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all"
                >
                  {t('assignment.yes_delete')}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirmModal(false); setSelectedAssignment(null); }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-all"
                >
                  {t('assignment.cancel')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

      </div>
    </div>
  );
};

export default TeacherAssignmentManagement;