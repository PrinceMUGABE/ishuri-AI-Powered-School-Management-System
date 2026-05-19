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
// API Configuration with Response Logging
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
  console.log(`📤 REQUEST: ${config.method?.toUpperCase()} ${config.url}`, {
    params: config.params || {},
    data: config.data || {},
  });
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const duration = response.config.metadata
      ? `${Date.now() - response.config.metadata.startTime}ms`
      : '—';
    console.log(`✅ RESPONSE [${duration}]: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`❌ ERROR: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────
// Helper: safely extract list from various API response shapes
// Handles: { data: { results: [] } }, { data: { data: [] } },
//          { data: [] }, []
// ─────────────────────────────────────────────────────────────
const extractList = (responseData) => {
  if (!responseData) return [];
  if (Array.isArray(responseData)) return responseData;
  const d = responseData.data;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.results)) return d.results;
  if (Array.isArray(d.data)) return d.data;
  return [];
};

// ─────────────────────────────────────────────────────────────
// Helper: resolve a nested field, e.g. "subject.name" or "subject_name"
// ─────────────────────────────────────────────────────────────
const resolve = (obj, ...keys) => {
  for (const key of keys) {
    const parts = key.split('.');
    let val = obj;
    for (const p of parts) {
      val = val?.[p];
    }
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return '—';
};

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
  if (percentage === undefined || percentage === null) return '—';
  const grade = GRADE_LETTERS.find(g => percentage >= g.min);
  return grade ? grade.value : 'F';
};

const getGradeColor = (percentage) => {
  if (percentage === undefined || percentage === null) return '#94a3b8';
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
        <option value="">{loading ? (t ? t('adminGrades.common.loading') : 'Loading...') : placeholder}</option>
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
// Helpers to read grade upload fields.
// The API returns flat strings: { teacher: "Name", subject: "Math", ... }
// We try the flat key first, then common nested/suffixed variants.
// ─────────────────────────────────────────────────────────────
const getUploadTeacher = (u) =>
  resolve(u,
    'teacher',           // ← API: plain string "Teacher Ndayisaba T2"
    'teacher_name',
    'teacher.full_name',
    'teacher.name',
    'uploaded_by_name',
    'uploaded_by.full_name',
    'uploaded_by.name',
  );

const getUploadSubject = (u) =>
  resolve(u,
    'subject',           // ← API: plain string "Science"
    'subject_name',
    'subject.name',
  );

const getUploadClassLevel = (u) =>
  resolve(u,
    'class_level',       // ← API: plain string "Little"
    'class_level_name',
    'class_level.name',
  );

const getUploadSchoolLevel = (u) =>
  resolve(u,
    'school_level',
    'school_level_name',
    'school_level.name',
  );

const getUploadAcademicYear = (u) =>
  resolve(u,
    'academic_year',     // ← API: plain string "2026-2027"
    'academic_year_name',
    'academic_year.name',
  );

const getUploadTerm = (u) =>
  resolve(u,
    'term',              // ← API: plain string "Summer"
    'term_name',
    'term.name',
  );

// grade_type comes back as a human-readable string from the API
// e.g. "Oral Assessment", "Final Exam" — display as-is, no lookup needed.
const getUploadGradeType = (u) =>
  resolve(u, 'grade_type');

const getUploadStudentCount = (u) =>
  u.grade_count ?? u.grades_count ?? u.student_count ?? u.students_count ?? u.total_students ?? 0;

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const AdminGradeManagement = () => {
  const { t, i18n } = useTranslation();

  // ── UI ──────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState('uploads');

  // ── Raw data lists (full, unfiltered) ───────────────────────
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // ── Grade uploads ───────────────────────────────────────────
  const [gradeUploads, setGradeUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  // ── Filters for grade-uploads tab ───────────────────────────
  const [fAcademicYear, setFAcademicYear] = useState('');
  const [fTerm, setFTerm] = useState('');
  const [fSchoolLevel, setFSchoolLevel] = useState('');
  const [fClassLevel, setFClassLevel] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fTeacher, setFTeacher] = useState('');
  const [fStatus, setFStatus] = useState('');

  // ── Manual grade entry ──────────────────────────────────────
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

  // ── Modals ──────────────────────────────────────────────────
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [uploadGrades, setUploadGrades] = useState([]);
  const [filePreviewData, setFilePreviewData] = useState(null);
  const [loadingFilePreview, setLoadingFilePreview] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // Cascading options — FILTER TAB
  // Terms: API returns { academic_year: 1 } (integer id, not academic_year_id)
  // ─────────────────────────────────────────────────────────────
  const filterTermOptions = useMemo(() => {
    if (!fAcademicYear) return terms;
    const ayId = parseInt(fAcademicYear, 10);
    return terms.filter(tm =>
      tm.academic_year === ayId ||
      tm.academic_year_id === ayId ||
      tm.academic_year?.id === ayId
    );
  }, [terms, fAcademicYear]);

  const filterClassLevelOptions = useMemo(() => {
    if (!fSchoolLevel) return classLevels;
    const slId = parseInt(fSchoolLevel, 10);
    return classLevels.filter(cl =>
      cl.school_level === slId ||
      cl.school_level_id === slId ||
      cl.school_level?.id === slId
    );
  }, [classLevels, fSchoolLevel]);

  // ─────────────────────────────────────────────────────────────
  // Cascading options — MANUAL ENTRY TAB
  // ─────────────────────────────────────────────────────────────
  const manualTermOptions = useMemo(() => {
    if (!manualAcademicYear) return terms;
    const ayId = parseInt(manualAcademicYear, 10);
    return terms.filter(tm =>
      tm.academic_year === ayId ||
      tm.academic_year_id === ayId ||
      tm.academic_year?.id === ayId
    );
  }, [terms, manualAcademicYear]);

  const manualClassLevelOptions = useMemo(() => {
    if (!manualSchoolLevel) return classLevels;
    const slId = parseInt(manualSchoolLevel, 10);
    return classLevels.filter(cl =>
      cl.school_level === slId ||
      cl.school_level_id === slId ||
      cl.school_level?.id === slId
    );
  }, [classLevels, manualSchoolLevel]);

  // Classrooms: API returns { assigned_class_level: 1 } (integer id)
  const manualClassroomOptions = useMemo(() => {
    if (!manualClassLevel) return classrooms;
    const clId = parseInt(manualClassLevel, 10);
    return classrooms.filter(cr =>
      cr.assigned_class_level === clId ||
      cr.assigned_class_level_id === clId ||
      cr.class_level === clId ||
      cr.class_level_id === clId ||
      cr.assigned_class_level?.id === clId
    );
  }, [classrooms, manualClassLevel]);

  // Students: API returns { current_classroom: { id: 17 } }
  const manualStudentOptions = useMemo(() => {
    if (!manualClassroom) return students;
    const crId = parseInt(manualClassroom, 10);
    return students.filter(s =>
      s.current_classroom?.id === crId ||
      s.classroom_id === crId ||
      s.classroom?.id === crId
    );
  }, [students, manualClassroom]);

  // ─────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────
  const fetchAcademicYears = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/academic-years/');
      const years = extractList(r.data);
      setAcademicYears(years);
      // Auto-select the first (current) year for the filter tab
      if (years.length > 0 && !fAcademicYear) {
        const current = years.find(y => y.is_current) || years[0];
        setFAcademicYear(String(current.id));
      }
    } catch (e) {
      console.error('Failed to fetch academic years:', e);
    }
  }, []); // intentionally no deps — run once

  const fetchTerms = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/terms/');
      setTerms(extractList(r.data));
    } catch (e) { console.error('Failed to fetch terms:', e); }
  }, []);

  const fetchSchoolLevels = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/school-levels/');
      setSchoolLevels(extractList(r.data));
    } catch (e) { console.error('Failed to fetch school levels:', e); }
  }, []);

  const fetchClassLevels = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/class-levels/');
      setClassLevels(extractList(r.data));
    } catch (e) { console.error('Failed to fetch class levels:', e); }
  }, []);

  const fetchClassrooms = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/class-rooms/');
      setClassrooms(extractList(r.data));
    } catch (e) { console.error('Failed to fetch classrooms:', e); }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const r = await apiClient.get('/academics/subjects/');
      setSubjects(extractList(r.data));
    } catch (e) { console.error('Failed to fetch subjects:', e); }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const r = await apiClient.get('/students/');
      setStudents(extractList(r.data));
    } catch (e) { console.error('Failed to fetch students:', e); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const r = await apiClient.get('/teachers/teachers/');
      const list = extractList(r.data);
      console.log('🎓 Teachers fetched:', list.length, list[0] ? Object.keys(list[0]) : []);
      setTeachers(list);
    } catch (e) { console.error('Failed to fetch teachers:', e); }
  }, []);

  const fetchGradeUploads = useCallback(async () => {
    const params = {};
    if (fAcademicYear) params.academic_year_id = fAcademicYear;
    if (fTerm) params.term_id = fTerm;
    if (fSchoolLevel) params.school_level_id = fSchoolLevel;
    if (fClassLevel) params.class_level_id = fClassLevel;
    if (fSubject) params.subject_id = fSubject;
    if (fTeacher) params.teacher_id = fTeacher;
    if (fStatus) params.status = fStatus;

    setLoadingUploads(true);
    try {
      const r = await apiClient.get('/academics-records/grades/uploads/', { params });
      const uploads = extractList(r.data);
      console.log('🎯 Grade uploads extracted:', uploads.length, 'records');
      if (uploads.length > 0) {
        console.log('🔍 First upload fields:', Object.keys(uploads[0]));
        console.log('🔍 First upload sample:', uploads[0]);
      }
      setGradeUploads(uploads);
    } catch (e) {
      console.error('Failed to fetch grade uploads:', e);
      toast.error(t('adminGrades.errors.fetchUploadsFailed'));
    } finally {
      setLoadingUploads(false);
    }
  }, [fAcademicYear, fTerm, fSchoolLevel, fClassLevel, fSubject, fTeacher, fStatus, t]);

  const fetchUploadGrades = useCallback(async (uploadId) => {
    try {
      const r = await apiClient.get(`/academics-records/grades/student-grades/?grade_upload_id=${uploadId}`);
      const grades = extractList(r.data);
      setUploadGrades(grades);
    } catch (e) {
      console.error('Failed to fetch upload grades:', e);
      setUploadGrades([]);
    }
  }, []);

  const fetchFilePreview = useCallback(async (uploadId) => {
    setLoadingFilePreview(true);
    try {
      const r = await apiClient.get(`/academics-records/grades/upload/${uploadId}/preview/`);
      if (r.data.success) {
        setFilePreviewData(r.data.data);
        setShowFilePreview(true);
      } else {
        toast.error(r.data.message || 'Failed to load file preview');
      }
    } catch (e) {
      console.error('Failed to fetch file preview:', e);
      toast.error(e.response?.data?.message || 'Failed to load file preview');
    } finally {
      setLoadingFilePreview(false);
    }
  }, []);

  // ── Actions ─────────────────────────────────────────────────
  const handleReviewUpload = async () => {
    if (!selectedUpload) return;
    setSubmittingReview(true);
    try {
      const payload = {
        action: reviewAction,
        rejection_reason: reviewAction === 'reject' ? rejectionReason : '',
        admin_notes: adminNotes,
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

  const handleSubmitManualGrade = async () => {
    if (!manualAcademicYear || !manualTerm || !manualSchoolLevel || !manualClassLevel ||
      !manualSubject || !manualGradeType || !manualStudent || !manualScore) {
      toast.error(t('adminGrades.manual.missingFields'));
      return;
    }
    setSubmittingManual(true);
    try {
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
        weight_percentage: manualWeight ? parseFloat(manualWeight) : null,
      };
      const r = await apiClient.post('/academics-records/grades/manual/', payload);
      if (r.data.success) {
        toast.success(t('adminGrades.manual.success'));
        setManualStudent(''); setManualScore(''); setManualMaxScore(100);
        setManualRemarks(''); setManualWeight('');
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

  const viewUploadDetails = async (upload) => {
    setSelectedUpload(upload);
    setUploadGrades([]);
    setFilePreviewData(null);
    setShowFilePreview(false);
    await Promise.all([
      fetchUploadGrades(upload.id),
      fetchFilePreview(upload.id),
    ]);
    setShowDetailModal(true);
  };

  const openReviewModal = (upload, action) => {
    setSelectedUpload(upload);
    setReviewAction(action);
    setRejectionReason('');
    setAdminNotes('');
    setShowReviewModal(true);
  };

  const getGradeTypeLabel = (gradeTypeValue) => {
    const gradeType = GRADE_TYPES.find(gt => gt.value === gradeTypeValue);
    return gradeType ? t(gradeType.labelKey) : (gradeTypeValue || '—');
  };

  const clearManualForm = () => {
    setManualAcademicYear(''); setManualTerm(''); setManualSchoolLevel('');
    setManualClassLevel(''); setManualClassroom(''); setManualSubject('');
    setManualGradeType('assignment'); setManualStudent(''); setManualScore('');
    setManualMaxScore(100); setManualRemarks(''); setManualWeight('');
  };

  // ── Initial load ────────────────────────────────────────────
  useEffect(() => {
    fetchAcademicYears();
    fetchTerms();
    fetchSchoolLevels();
    fetchClassLevels();
    fetchClassrooms();
    fetchSubjects();
    fetchStudents();
    fetchTeachers();
  }, []);  // eslint-disable-line

  // ── Fetch uploads when filters change ───────────────────────
  useEffect(() => {
    fetchGradeUploads();
  }, [fetchGradeUploads]);

  // ── Client-side search ───────────────────────────────────────
  const filteredUploads = useMemo(() => {
    let list = gradeUploads;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(u =>
        getUploadTeacher(u).toLowerCase().includes(q) ||
        getUploadSubject(u).toLowerCase().includes(q) ||
        getUploadClassLevel(u).toLowerCase().includes(q) ||
        getUploadSchoolLevel(u).toLowerCase().includes(q) ||
        getUploadTerm(u).toLowerCase().includes(q) ||
        getUploadAcademicYear(u).toLowerCase().includes(q)
      );
    }
    return list;
  }, [gradeUploads, searchTerm]);

  const totalPages = Math.ceil(filteredUploads.length / itemsPerPage);
  const paginatedUploads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUploads.slice(start, start + itemsPerPage);
  }, [filteredUploads, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, fStatus, fTeacher]);

  // ─────────────────────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // Grade letter badge style helper
  // ─────────────────────────────────────────────────────────────
  const gradeBadgeClass = (pct) => {
    if (pct >= 90) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (pct >= 80) return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    if (pct >= 70) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (pct >= 60) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    if (pct >= 50) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">

        {/* Header */}
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

        {/* Stats */}
        <StatsCards />

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {[
            { key: 'uploads', icon: FolderOpen, label: t('adminGrades.tabs.gradeUploads'), badge: gradeUploads.length },
            { key: 'manual', icon: Edit, label: t('adminGrades.tabs.manualEntry') },
          ].map(({ key, icon: Icon, label, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === key
                  ? 'text-green-700 dark:text-green-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {label}
                {badge !== undefined && (
                  <span className="ml-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">{badge}</span>
                )}
              </div>
              {activeTab === key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700 dark:bg-green-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── GRADE UPLOADS TAB ─────────────────────────────── */}
        {activeTab === 'uploads' && (
          <>
            {/* Filter Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-green-700 dark:text-green-500" />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('adminGrades.filters.title')}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {/* Academic Year — always shows all years */}
                <SelectField
                  label={t('adminGrades.filters.academicYear')}
                  value={fAcademicYear}
                  onChange={(v) => { setFAcademicYear(v); setFTerm(''); }}
                  options={academicYears.map(y => ({ value: y.id, label: y.name }))}
                  placeholder={t('adminGrades.filters.academicYearPlaceholder')}
                  t={t}
                />
                {/* Term — filtered by selected academic year */}
                <SelectField
                  label={t('adminGrades.filters.term')}
                  value={fTerm}
                  onChange={setFTerm}
                  options={filterTermOptions.map(tm => ({ value: tm.id, label: tm.name }))}
                  placeholder={t('adminGrades.filters.termPlaceholder')}
                  t={t}
                />
                {/* School Level — always shows all */}
                <SelectField
                  label={t('adminGrades.filters.schoolLevel')}
                  value={fSchoolLevel}
                  onChange={(v) => { setFSchoolLevel(v); setFClassLevel(''); }}
                  options={schoolLevels.map(sl => ({ value: sl.id, label: sl.name }))}
                  placeholder={t('adminGrades.filters.schoolLevelPlaceholder')}
                  t={t}
                />
                {/* Class Level — filtered by selected school level */}
                <SelectField
                  label={t('adminGrades.filters.classLevel')}
                  value={fClassLevel}
                  onChange={setFClassLevel}
                  options={filterClassLevelOptions.map(cl => ({ value: cl.id, label: cl.name }))}
                  placeholder={t('adminGrades.filters.classLevelPlaceholder')}
                  t={t}
                />
                {/* Subject — always shows all */}
                <SelectField
                  label={t('adminGrades.filters.subject')}
                  value={fSubject}
                  onChange={setFSubject}
                  options={subjects.map(s => ({ value: s.id, label: s.name }))}
                  placeholder={t('adminGrades.filters.subjectPlaceholder')}
                  t={t}
                />
                {/* Teacher — always shows all */}
                {/* <SelectField
                  label="Teacher"
                  value={fTeacher}
                  onChange={setFTeacher}
                  options={teachers.map(tc => ({
                    value: tc.id,
                    label: tc.full_name || tc.name || tc.user?.full_name || tc.user?.username || `Teacher ${tc.id}`,
                  }))}
                  placeholder="All Teachers"
                  t={t}
                /> */}
                {/* Status */}
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
                  placeholder={t('adminGrades.filters.statusPlaceholder')}
                  t={t}
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
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Uploads Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-green-700 dark:text-green-500" />
                <h2 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t('adminGrades.uploads.title')}</h2>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                  {filteredUploads.length}
                </span>
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
                          {['Teacher', 'Subject', 'Class Level', 'Academic Year', 'Term', 'Grade Type', 'Weight', 'Students', 'Status', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {paginatedUploads.map((upload) => (
                          <tr key={upload.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{getUploadTeacher(upload)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-gray-700 dark:text-gray-300 text-sm">{getUploadSubject(upload)}</p>
                            </td>

                            <td className="px-4 py-3">
                              <p className="text-gray-700 dark:text-gray-300 text-sm">{getUploadClassLevel(upload)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-gray-500 dark:text-gray-400 text-xs">{getUploadAcademicYear(upload)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-gray-500 dark:text-gray-400 text-xs">{getUploadTerm(upload)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                {getUploadGradeType(upload)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                                {upload.weight_percentage != null ? `${upload.weight_percentage}%` : '—'}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-gray-600 dark:text-gray-400 text-sm">{getUploadStudentCount(upload)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap ${getStatusBadgeClass(upload.status)}`}>
                                {t(`adminGrades.statuses.${upload.status}`, { defaultValue: upload.status })}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => viewUploadDetails(upload)}
                                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                  title={t('adminGrades.actions.viewDetails')}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {(upload.status === 'pending' || upload.status === 'needs_review') && (
                                  <>
                                    <button
                                      onClick={() => openReviewModal(upload, 'approve')}
                                      className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                      title={t('adminGrades.actions.approve')}
                                    >
                                      <ThumbsUp className="w-4 h-4" />
                                    </button>
                                    {upload.status === 'pending' && (
                                      <button
                                        onClick={() => openReviewModal(upload, 'needs_review')}
                                        className="p-1.5 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                                        title={t('adminGrades.actions.needsReview')}
                                      >
                                        <HelpCircle className="w-4 h-4" />
                                      </button>
                                    )}
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
                      <select
                        value={itemsPerPage}
                        onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 bg-white dark:bg-gray-800"
                      >
                        {[5, 10, 25, 50].map(n => <option key={n}>{n}</option>)}
                      </select>
                      <span>{t('adminGrades.pagination.perPage')} · {filteredUploads.length} {t('adminGrades.pagination.total')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[
                        { label: t('adminGrades.pagination.first'), onClick: () => setCurrentPage(1), disabled: currentPage === 1, text: true },
                        { label: <ChevronLeft className="w-3.5 h-3.5" />, onClick: () => setCurrentPage(p => p - 1), disabled: currentPage === 1 },
                        { label: <ChevronRight className="w-3.5 h-3.5" />, onClick: () => setCurrentPage(p => p + 1), disabled: currentPage >= totalPages },
                        { label: t('adminGrades.pagination.last'), onClick: () => setCurrentPage(totalPages), disabled: currentPage >= totalPages, text: true },
                      ].map((btn, i) => (
                        <button
                          key={i}
                          onClick={btn.onClick}
                          disabled={btn.disabled}
                          className={`${btn.text ? 'px-2 py-1 text-xs' : 'p-1.5'} border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                        >
                          {btn.label}
                        </button>
                      ))}
                      <span className="px-3 text-xs font-medium text-gray-600 dark:text-gray-400">
                        {currentPage} / {totalPages || 1}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── MANUAL GRADE ENTRY TAB ────────────────────────── */}
        {activeTab === 'manual' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <Edit className="w-5 h-5 text-green-700 dark:text-green-500" />
              <h2 className="font-bold text-gray-800 dark:text-gray-200 text-base">{t('adminGrades.manual.title')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Academic Year — always full list */}
              <SelectField
                label={t('adminGrades.manual.academicYear')}
                value={manualAcademicYear}
                onChange={(v) => { setManualAcademicYear(v); setManualTerm(''); }}
                options={academicYears.map(y => ({ value: y.id, label: y.name }))}
                placeholder="Select Academic Year"
                required t={t}
              />

              {/* Term — filtered by academic year, full list if none selected */}
              <SelectField
                label={t('adminGrades.manual.term')}
                value={manualTerm}
                onChange={setManualTerm}
                options={manualTermOptions.map(tm => ({ value: tm.id, label: tm.name }))}
                placeholder={manualAcademicYear ? 'Select Term' : 'Select Academic Year first'}
                required t={t}
              />

              {/* School Level — always full list */}
              <SelectField
                label={t('adminGrades.manual.schoolLevel')}
                value={manualSchoolLevel}
                onChange={(v) => { setManualSchoolLevel(v); setManualClassLevel(''); setManualClassroom(''); setManualStudent(''); }}
                options={schoolLevels.map(sl => ({ value: sl.id, label: sl.name }))}
                placeholder="Select School Level"
                required t={t}
              />

              {/* Class Level — filtered by school level, full list if none selected */}
              <SelectField
                label={t('adminGrades.manual.classLevel')}
                value={manualClassLevel}
                onChange={(v) => { setManualClassLevel(v); setManualClassroom(''); setManualStudent(''); }}
                options={manualClassLevelOptions.map(cl => ({ value: cl.id, label: cl.name }))}
                placeholder={manualSchoolLevel ? 'Select Class Level' : 'Select School Level first'}
                required t={t}
              />

              {/* Classroom — filtered by class level, full list if none selected */}
              <SelectField
                label={t('adminGrades.manual.classroom')}
                value={manualClassroom}
                onChange={(v) => { setManualClassroom(v); setManualStudent(''); }}
                options={manualClassroomOptions.map(cr => ({ value: cr.id, label: `${cr.name} (${cr.code})` }))}
                placeholder={manualClassLevel ? 'Select Classroom' : 'Select Class Level first'}
                t={t}
              />

              {/* Subject — always full list */}
              <SelectField
                label={t('adminGrades.manual.subject')}
                value={manualSubject}
                onChange={setManualSubject}
                options={subjects.map(s => ({ value: s.id, label: s.name }))}
                placeholder="Select Subject"
                required t={t}
              />

              {/* Grade Type */}
              <SelectField
                label={t('adminGrades.manual.gradeType')}
                value={manualGradeType}
                onChange={setManualGradeType}
                options={GRADE_TYPES.map(gt => ({ value: gt.value, label: t(gt.labelKey) }))}
                placeholder="Select Grade Type"
                required t={t}
              />

              {/* Weight */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('adminGrades.manual.weight')}
                </label>
                <input
                  type="number" step="0.01" value={manualWeight}
                  onChange={(e) => setManualWeight(e.target.value)}
                  placeholder="e.g., 10 (optional)"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500"
                />
              </div>

              {/* Student — filtered by classroom (or class level), full list if neither selected */}
              <SelectField
                label={t('adminGrades.manual.student')}
                value={manualStudent}
                onChange={setManualStudent}
                options={manualStudentOptions.map(s => ({
                  value: s.id,
                  label: `${s.full_name || s.name} (${s.roll_number || s.id})`,
                }))}
                placeholder={manualClassroom ? 'Select Student' : 'Select Classroom first'}
                required t={t}
              />

              {/* Score */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('adminGrades.manual.score')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number" step="0.01" value={manualScore}
                  onChange={(e) => setManualScore(e.target.value)}
                  placeholder={`0 – ${manualMaxScore}`}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500"
                />
              </div>

              {/* Max Score */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('adminGrades.manual.maxScore')}
                </label>
                <input
                  type="number" step="0.01" value={manualMaxScore}
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

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={clearManualForm}
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

        {/* ── DETAIL MODAL ──────────────────────────────────── */}
        {showDetailModal && selectedUpload && (
          <ModalWrapper
            title={t('adminGrades.detail.title')}
            subtitle={`${getUploadSubject(selectedUpload)} — ${getUploadClassLevel(selectedUpload)}`}
            onClose={() => { setShowDetailModal(false); setSelectedUpload(null); setUploadGrades([]); setFilePreviewData(null); setShowFilePreview(false); }}
            maxW="max-w-5xl"
            icon={FileText}
            t={t}
          >
            <div className="space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <InfoRow label={t('adminGrades.detail.teacher')} value={getUploadTeacher(selectedUpload)} icon={User} />
                <InfoRow label={t('adminGrades.detail.subject')} value={getUploadSubject(selectedUpload)} icon={BookOpen} />
                <InfoRow label="School Level" value={getUploadSchoolLevel(selectedUpload)} icon={Layers} />
                <InfoRow label={t('adminGrades.detail.classLevel')} value={getUploadClassLevel(selectedUpload)} icon={GraduationCap} />
                <InfoRow label={t('adminGrades.detail.academicYear')} value={getUploadAcademicYear(selectedUpload)} icon={Calendar} />
                <InfoRow label={t('adminGrades.detail.term')} value={getUploadTerm(selectedUpload)} icon={Tag} />
                <InfoRow label={t('adminGrades.detail.gradeType')} value={getUploadGradeType(selectedUpload)} icon={FileSpreadsheet} />
                <InfoRow label={t('adminGrades.detail.weight')} value={selectedUpload.weight_percentage != null ? `${selectedUpload.weight_percentage}%` : '—'} icon={Percent} />
                <InfoRow label="Students" value={String(getUploadStudentCount(selectedUpload))} icon={Users} />
                <InfoRow label={t('adminGrades.detail.status')} value={t(`adminGrades.statuses.${selectedUpload.status}`, { defaultValue: selectedUpload.status })} icon={Activity} />
                <InfoRow label={t('adminGrades.detail.uploadedAt')} value={new Date(selectedUpload.created_at).toLocaleString()} icon={ClockIcon} />
                {selectedUpload.reviewed_at && (
                  <InfoRow label={t('adminGrades.detail.reviewedAt')} value={new Date(selectedUpload.reviewed_at).toLocaleString()} icon={ClockIcon} />
                )}
                {selectedUpload.reviewed_by_name && (
                  <InfoRow label={t('adminGrades.detail.reviewedBy')} value={selectedUpload.reviewed_by_name} icon={UserCheck} />
                )}
              </div>

              {/* Rejection / notes banners */}
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

              {/* Sub-tabs: Student Grades / File Preview */}
              <div>
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
                  {[
                    { show: false, icon: Users, label: `${t('adminGrades.detail.studentGrades')} (${uploadGrades.length})` },
                    { show: true, icon: FileSpreadsheet, label: `${t('adminGrades.detail.filePreview')}${filePreviewData ? ` (${filePreviewData.total_rows} rows)` : ''}` },
                  ].map(({ show, icon: Icon, label }) => (
                    <button
                      key={String(show)}
                      onClick={() => setShowFilePreview(show)}
                      className={`px-4 py-2 text-sm font-semibold transition-all relative ${showFilePreview === show
                          ? 'text-green-700 dark:text-green-500'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                      <div className="flex items-center gap-2"><Icon className="w-4 h-4" />{label}</div>
                      {showFilePreview === show && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700 dark:bg-green-500 rounded-full" />}
                    </button>
                  ))}
                </div>

                {/* Student Grades */}
                {!showFilePreview && (
                  uploadGrades.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">{t('adminGrades.detail.noGrades')}</div>
                  ) : (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            {['Roll Number', 'Student Name', 'Score', 'Max Score', 'Percentage', 'Grade', 'Remarks'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {uploadGrades.map((grade) => {
                            const pct = grade.max_score ? (grade.score / grade.max_score) * 100 : 0;
                            return (
                              <tr key={grade.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="px-3 py-2 font-mono text-xs font-bold text-green-700 dark:text-green-400">
                                  {grade.student_roll || grade.roll_number || '—'}
                                </td>
                                <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                                  {grade.student_name || grade.student?.full_name || '—'}
                                </td>
                                <td className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">{grade.score}</td>
                                <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">{grade.max_score}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`font-semibold ${pct >= 50 ? 'text-green-600' : 'text-red-600'}`}>{pct.toFixed(1)}%</span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${gradeBadgeClass(pct)}`}>
                                    {getGradeLetter(pct)}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">{grade.remarks || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* File Preview */}
                {/* File Preview - Vertical Card Layout */}
                {showFilePreview && (
                  loadingFilePreview ? (
                    <div className="text-center py-12 flex flex-col items-center gap-2">
                      <Spinner />
                      <p className="text-sm text-gray-400 dark:text-gray-500">Loading file preview…</p>
                    </div>
                  ) : filePreviewData ? (
                    <div>
                      <div className="mb-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>{filePreviewData.file_name}</span>
                        <span>•</span><span>{filePreviewData.file_size_mb} MB</span>
                        <span>•</span><span>{filePreviewData.total_rows} rows</span>
                      </div>

                      {/* Vertical card view instead of table */}
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filePreviewData.data_rows.map((row, ri) => (
                          <div key={ri} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-xs font-bold text-green-700 dark:text-green-400">
                                Row {ri + 1}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {ri === 0 ? 'Header Row' : `Record ${ri}`}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {row.map((cell, ci) => {
                                const header = filePreviewData.headers[ci] || `Column ${ci + 1}`;
                                const isSpecial = header === 'Roll Number' || header === 'Student Full Name' || header === 'RollNo';
                                return (
                                  <div key={ci} className="flex flex-col">
                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">
                                      {header}
                                    </span>
                                    <span className={`text-sm font-medium ${isSpecial ? 'text-green-700 dark:text-green-400 font-mono' : 'text-gray-800 dark:text-gray-200'}`}>
                                      {cell || '—'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {filePreviewData.has_more && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 text-center">
                          Showing first {filePreviewData.data_rows.length} of {filePreviewData.total_rows} rows.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">Unable to load file preview</div>
                  )
                )}
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* ── REVIEW MODAL ──────────────────────────────────── */}
        {showReviewModal && selectedUpload && (
          <ModalWrapper
            title={
              reviewAction === 'approve' ? t('adminGrades.review.approveTitle') :
                reviewAction === 'reject' ? t('adminGrades.review.rejectTitle') :
                  t('adminGrades.review.needsReviewTitle')
            }
            subtitle={`${getUploadSubject(selectedUpload)} — ${getUploadTeacher(selectedUpload)}`}
            onClose={() => { setShowReviewModal(false); setSelectedUpload(null); }}
            maxW="max-w-lg"
            icon={reviewAction === 'approve' ? ThumbsUp : reviewAction === 'reject' ? ThumbsDown : HelpCircle}
            t={t}
          >
            <div className="space-y-4">
              <div className={`p-3 rounded-xl text-sm font-medium ${reviewAction === 'approve' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                  reviewAction === 'reject' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                    'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
                }`}>
                {reviewAction === 'approve' ? t('adminGrades.review.approveConfirm') :
                  reviewAction === 'reject' ? t('adminGrades.review.rejectConfirm') :
                    t('adminGrades.review.needsReviewConfirm')}
              </div>

              {reviewAction === 'reject' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('adminGrades.review.rejectionReason')} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder={t('adminGrades.review.rejectionReasonPlaceholder')}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 text-gray-800 dark:text-gray-200"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('adminGrades.review.adminNotes')}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  placeholder={t('adminGrades.review.adminNotesPlaceholder')}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 text-gray-800 dark:text-gray-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setShowReviewModal(false); setSelectedUpload(null); }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  {t('adminGrades.common.cancel')}
                </button>
                <button
                  onClick={handleReviewUpload}
                  disabled={submittingReview || (reviewAction === 'reject' && !rejectionReason.trim())}
                  className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50 text-white ${reviewAction === 'approve' ? 'bg-green-700 hover:bg-green-800' :
                      reviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                        'bg-orange-600 hover:bg-orange-700'
                    }`}
                >
                  {submittingReview ? <Spinner size={4} /> : (
                    reviewAction === 'approve' ? <ThumbsUp className="w-4 h-4" /> :
                      reviewAction === 'reject' ? <ThumbsDown className="w-4 h-4" /> :
                        <HelpCircle className="w-4 h-4" />
                  )}
                  {submittingReview ? t('adminGrades.common.loading') : (
                    reviewAction === 'approve' ? t('adminGrades.actions.approve') :
                      reviewAction === 'reject' ? t('adminGrades.actions.reject') :
                        t('adminGrades.actions.needsReview')
                  )}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

      </div>
    </div>
  );
};

export default AdminGradeManagement;