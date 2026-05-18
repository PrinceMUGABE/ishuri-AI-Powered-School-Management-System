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
  Edit, Trash2, FolderOpen, File, Archive, AlertOctagon
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

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  const language = localStorage.getItem('user_language') || 'en';
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  config.headers['X-Language'] = language;
  config.metadata = { startTime: Date.now() };
  console.log(`📤 REQUEST: ${config.method?.toUpperCase()} ${config.url}`, config.params || {});
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    const duration = response.config.metadata
      ? `${Date.now() - response.config.metadata.startTime}ms`
      : '—';
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}`);
    console.log(`📦 RESPONSE DATA:`, response.data);
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
  { value: 'assignment', labelKey: 'teacherGrades.gradeTypes.assignment' },
  { value: 'quiz', labelKey: 'teacherGrades.gradeTypes.quiz' },
  { value: 'mid_term', labelKey: 'teacherGrades.gradeTypes.midTerm' },
  { value: 'final_exam', labelKey: 'teacherGrades.gradeTypes.finalExam' },
  { value: 'project', labelKey: 'teacherGrades.gradeTypes.project' },
  { value: 'practical', labelKey: 'teacherGrades.gradeTypes.practical' },
  { value: 'oral', labelKey: 'teacherGrades.gradeTypes.oral' },
  { value: 'homework', labelKey: 'teacherGrades.gradeTypes.homework' },
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
// Helper Components with Dark Mode Support
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
        <option value="">{loading ? t('teacherGrades.common.loading') : placeholder}</option>
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
const TeacherAcademicGrades = () => {
  const { t, i18n } = useTranslation();

  // ── UI ──────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState('grades');

  // ── Teacher data ────────────────────────────────────────────
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [myAssignments, setMyAssignments] = useState({
    school_levels: [], class_levels: [], classrooms: [], subjects: [],
  });

  // ── Lookup lists ────────────────────────────────────────────
  const [academicYears, setAcademicYears] = useState([]);
  const [filterTerms, setFilterTerms] = useState([]);
  const [uTerms, setUTerms] = useState([]);

  // ── Shared filter state ─────────────────────────────────────
  const [fAcademicYear, setFAcademicYear] = useState('');
  const [fTerm, setFTerm] = useState('');
  const [fSchoolLevel, setFSchoolLevel] = useState('');
  const [fClassLevel, setFClassLevel] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fGradeType, setFGradeType] = useState('');
  const [fClassroom, setFClassroom] = useState('');
  const [fStudent, setFStudent] = useState('');
  const [dTerms, setDTerms] = useState('');

  // ── Derived filtered lists ──────────────────────────────────
  const filteredClassLevels = useMemo(() =>
    myAssignments.class_levels.filter(cl =>
      !fSchoolLevel || String(cl.school_level_id) === String(fSchoolLevel)
    ), [myAssignments.class_levels, fSchoolLevel]);

  const filteredClassrooms = useMemo(() =>
    myAssignments.classrooms.filter(cr =>
      !fClassLevel || String(cr.class_level_id) === String(fClassLevel)
    ), [myAssignments.classrooms, fClassLevel]);

  // ── Students in selected classroom ─────────────────────────
  const [classroomStudents, setClassroomStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // ── GRADE MANAGEMENT DATA ───────────────────────────────────
  const [studentGrades, setStudentGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // ── Grade Uploads (File Management) ─────────────────────────
  const [gradeUploads, setGradeUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  // ── Modals ──────────────────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showEditGradeModal, setShowEditGradeModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showUploadDetailModal, setShowUploadDetailModal] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [studentDetailData, setStudentDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Edit Grade Form ─────────────────────────────────────────
  const [editGradeForm, setEditGradeForm] = useState({
    score: '',
    max_score: 100,
    remarks: '',
    custom_grade_letter: ''
  });

  // ── Upload form ─────────────────────────────────────────────
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uAcademicYear, setUAcademicYear] = useState('');
  const [uTerm, setUTerm] = useState('');
  const [uSchoolLevel, setUSchoolLevel] = useState('');
  const [uClassLevel, setUClassLevel] = useState('');
  const [uSubject, setUSubject] = useState('');
  const [uGradeType, setUGradeType] = useState('assignment');

  // ── Download form ───────────────────────────────────────────
  const [dAcademicYear, setDAcademicYear] = useState('');
  const [dTerm, setDTerm] = useState('');
  const [dSchoolLevel, setDSchoolLevel] = useState('');
  const [dClassLevel, setDClassLevel] = useState('');
  const [dSubject, setDSubject] = useState('');
  const [dGradeType, setDGradeType] = useState('assignment');
  const [downloading, setDownloading] = useState(false);

  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedPerformanceStudent, setSelectedPerformanceStudent] = useState(null);
  const [studentPerformance, setStudentPerformance] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  const fileInputRef = useRef(null);

  // Helper function to get translated grade type label
  const getGradeTypeLabel = (gradeTypeValue) => {
    const gradeType = GRADE_TYPES.find(gt => gt.value === gradeTypeValue);
    if (gradeType) {
      return t(gradeType.labelKey);
    }
    return gradeTypeValue;
  };

  // ────────────────────────────────────────────────────────────
  // Data Fetching Functions with Enhanced Logging
  // ────────────────────────────────────────────────────────────

  const fetchTeacherProfile = useCallback(async () => {
    try {
      console.log('🔍 Fetching teacher profile...');
      const r = await apiClient.get('/teachers/me/');
      console.log('📊 Teacher profile response:', r.data);
      const profileData = r.data.data || r.data;
      setTeacherProfile(profileData);
      console.log('✅ Teacher profile set:', profileData);
    } catch (e) {
      console.error('❌ Failed to fetch teacher profile:', e);
    }
  }, []);

  const fetchAcademicYears = useCallback(async () => {
    try {
      console.log('🔍 Fetching academic years...');
      const r = await apiClient.get('/academics/academic-years/');
      console.log('📊 Academic years response:', r.data);
      const years = r.data.data?.results || r.data.data || r.data || [];
      setAcademicYears(years);
      console.log('✅ Academic years set:', years.length, 'years found');

      const current = years.find(y => y.is_current);
      const defaultYear = current?.id || years[0]?.id;
      if (defaultYear) {
        console.log('📅 Setting default academic year:', defaultYear);
        setFAcademicYear(String(defaultYear));
        setUAcademicYear(String(defaultYear));
        setDAcademicYear(String(defaultYear));
      }
      return years;
    } catch (e) {
      console.error('❌ Failed to fetch academic years:', e);
      return [];
    }
  }, []);

  const fetchTermsFor = useCallback(async (yearId, setter) => {
    if (!yearId) {
      console.log('⚠️ No year ID provided for terms fetch');
      setter([]);
      return null;
    }
    try {
      console.log(`🔍 Fetching terms for academic year: ${yearId}`);
      const r = await apiClient.get(`/academics/terms/?academic_year=${yearId}`);
      console.log(`📊 Terms response for year ${yearId}:`, r.data);
      const list = r.data.data?.results || r.data.data || r.data || [];
      setter(list);
      console.log(`✅ Terms set for year ${yearId}:`, list.length, 'terms found');
      const current = list.find(tm => tm.is_current);
      return current?.id || list[0]?.id;
    } catch (e) {
      console.error(`❌ Failed to fetch terms for year ${yearId}:`, e);
      setter([]);
      return null;
    }
  }, []);

  const fetchMyAssignments = useCallback(async () => {
    try {
      console.log('🔍 Fetching teacher assignments...');
      const r = await apiClient.get('/teachers/timetable/my-assignments/');
      console.log('📊 Assignments response:', r.data);
      const data = r.data.data || r.data || {};
      const assignments = {
        school_levels: data.school_levels || [],
        class_levels: data.class_levels || [],
        classrooms: data.classrooms || [],
        subjects: data.subjects || [],
      };
      setMyAssignments(assignments);
      console.log('✅ Assignments set:', {
        schoolLevels: assignments.school_levels.length,
        classLevels: assignments.class_levels.length,
        classrooms: assignments.classrooms.length,
        subjects: assignments.subjects.length
      });
    } catch (e) {
      console.error('❌ Failed to fetch assignments:', e);
    }
  }, []);

  const fetchStudentsInClassroom = useCallback(async (classroomId) => {
    if (!classroomId) {
      console.log('⚠️ No classroom ID provided');
      setClassroomStudents([]);
      return;
    }
    setLoadingStudents(true);
    try {
      console.log(`🔍 Fetching students for classroom: ${classroomId}`);
      const r = await apiClient.get(`/students/teacher/classroom/${classroomId}/students/`);
      console.log(`📊 Students response for classroom ${classroomId}:`, r.data);
      const students = r.data.data?.students || r.data.data || r.data || [];
      setClassroomStudents(students);
      console.log(`✅ Students set for classroom ${classroomId}:`, students.length, 'students found');
    } catch (e) {
      console.error(`❌ Failed to fetch students for classroom ${classroomId}:`, e);
      setClassroomStudents([]);
    } finally { setLoadingStudents(false); }
  }, []);

  const fetchStudentGrades = useCallback(async () => {
    const params = {};
    if (fAcademicYear) params.academic_year_id = fAcademicYear;
    if (fTerm) params.term_id = fTerm;
    if (fClassLevel) params.class_level_id = fClassLevel;
    if (fSubject) params.subject_id = fSubject;
    if (fGradeType) params.grade_type = fGradeType;
    if (fStudent) params.student_id = fStudent;

    console.log('🔍 Fetching student grades with params:', params);
    setLoadingGrades(true);
    try {
      const response = await apiClient.get('/academics-records/grades/student-grades/', { params });
      console.log('📊 Student grades response:', response.data);

      let grades = [];
      if (response.data?.data?.results) {
        grades = response.data.data.results;
      } else if (response.data?.data) {
        grades = response.data.data;
      } else if (Array.isArray(response.data)) {
        grades = response.data;
      } else if (response.data?.results) {
        grades = response.data.results;
      } else {
        grades = [];
      }

      console.log(`✅ Student grades set: ${grades.length} grades found`);
      console.log('📝 First few grades:', grades.slice(0, 3));
      setStudentGrades(grades);
    } catch (error) {
      console.error('❌ Failed to fetch student grades:', error);
      console.error('Error details:', error.response?.data);
      toast.error(t('teacherGrades.errors.fetchGradesFailed'));
      setStudentGrades([]);
    } finally {
      setLoadingGrades(false);
    }
  }, [fAcademicYear, fTerm, fClassLevel, fSubject, fGradeType, fStudent, t]);

  const fetchGradeUploads = useCallback(async () => {
    const params = {};
    if (fAcademicYear) params.academic_year_id = fAcademicYear;
    if (fTerm) params.term_id = fTerm;
    if (fClassLevel) params.class_level_id = fClassLevel;
    if (fSubject) params.subject_id = fSubject;

    console.log('🔍 Fetching grade uploads with params:', params);
    setLoadingUploads(true);
    try {
      const r = await apiClient.get('/academics-records/grades/uploads/', { params });
      console.log('📊 Grade uploads response:', r.data);

      let uploads = [];
      if (r.data?.data?.results) {
        uploads = r.data.data.results;
      } else if (r.data?.data) {
        uploads = r.data.data;
      } else if (Array.isArray(r.data)) {
        uploads = r.data;
      } else if (r.data?.results) {
        uploads = r.data.results;
      } else {
        uploads = [];
      }

      console.log(`✅ Grade uploads set: ${uploads.length} uploads found`);
      console.log('📝 Uploads details:', uploads);
      setGradeUploads(uploads);
    } catch (e) {
      console.error('❌ Failed to fetch grade uploads:', e);
      console.error('Error details:', e.response?.data);
      toast.error(t('teacherGrades.errors.fetchUploadsFailed'));
      setGradeUploads([]);
    } finally {
      setLoadingUploads(false);
    }
  }, [fAcademicYear, fTerm, fClassLevel, fSubject, t]);

  const fetchStudentPerformance = useCallback(async (student) => {
    if (!student || !fAcademicYear) {
      toast.error(t('teacherGrades.errors.noAcademicYearSelected'));
      return;
    }

    setSelectedPerformanceStudent(student);
    setShowPerformanceModal(true);
    setLoadingPerformance(true);

    try {
      // Build query params
      const params = {
        academic_year_id: fAcademicYear
      };
      if (fTerm) {
        params.term_id = fTerm;
      }

      console.log(`🔍 Fetching performance for student: ${student.id}`, params);
      const response = await apiClient.get(`/academics-records/performance/student/${student.id}/`, { params });
      console.log('📊 Student performance response:', response.data);

      const performanceData = response.data?.data || response.data;
      setStudentPerformance(performanceData);
    } catch (error) {
      console.error('❌ Failed to fetch student performance:', error);
      console.error('Error details:', error.response?.data);
      toast.error(t('teacherGrades.errors.fetchPerformanceFailed'));
      setStudentPerformance(null);
    } finally {
      setLoadingPerformance(false);
    }
  }, [fAcademicYear, fTerm, t]);

  const renderPerformanceModalContent = () => {
    if (!studentPerformance) return null;

    const { student, academic_year, term, academic_performance, discipline } = studentPerformance;

    return (
      <div className="space-y-6">
        {/* Student Header */}
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-xl">
          <div className="w-16 h-16 rounded-full bg-green-700 flex items-center justify-center text-white text-xl font-bold">
            {student?.full_name?.[0] || 'S'}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{student?.full_name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Roll Number: {student?.roll_number}</p>
            <div className="flex gap-3 mt-1 text-xs">
              <span className="text-gray-500">{academic_year}</span>
              {term && <span className="text-gray-500">• {term}</span>}
              <span className="text-gray-500">• {student?.current_class_level}</span>
            </div>
          </div>
          {academic_performance?.overall_average && (
            <div className="text-center">
              <div className={`text-2xl font-bold ${academic_performance.overall_average >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {academic_performance.overall_average.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Overall Average</div>
            </div>
          )}
        </div>

        {/* Academic Performance Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{academic_performance?.subjects_with_grades || 0}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Subjects with Grades</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{academic_performance?.subjects_passed || 0}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Subjects Passed</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{academic_performance?.subjects_failed || 0}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Subjects Failed</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{academic_performance?.grade_letter || 'N/A'}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Grade Letter</p>
          </div>
        </div>

        {/* Subject Performance Table */}
        {academic_performance?.subject_results && academic_performance.subject_results.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Subject Performance
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Subject</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Average</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Grade</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {academic_performance.subject_results.map((subject, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{subject.subject_name}</td>
                      <td className="px-3 py-2 text-center">
                        {subject.final_percentage ? `${subject.final_percentage.toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${subject.grade_letter === 'A+' || subject.grade_letter === 'A' ? 'bg-green-100 text-green-700' :
                          subject.grade_letter === 'B+' || subject.grade_letter === 'B' ? 'bg-blue-100 text-blue-700' :
                            subject.grade_letter === 'C+' || subject.grade_letter === 'C' ? 'bg-yellow-100 text-yellow-700' :
                              subject.grade_letter === 'D' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                          }`}>
                          {subject.grade_letter || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${subject.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {subject.passed ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Discipline / Attendance Summary */}
        {discipline && (
          <div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Attendance & Discipline
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{discipline.total_sessions || 0}</p>
                <p className="text-xs text-gray-500">Total Sessions</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{discipline.present || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Present</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{discipline.late || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Late</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-red-700 dark:text-red-400">{discipline.absent || 0}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Absent</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{discipline.attendance_rate?.toFixed(1) || 0}%</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Attendance Rate</p>
              </div>
            </div>

            {/* Discipline Score */}
            {discipline.discipline_score && (
              <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Discipline Score</span>
                  <span className={`text-lg font-bold ${discipline.discipline_score >= 80 ? 'text-green-600' :
                    discipline.discipline_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                    {discipline.discipline_score.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${discipline.discipline_score >= 80 ? 'bg-green-600' :
                      discipline.discipline_score >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                    style={{ width: `${discipline.discipline_score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Zone: {discipline.discipline_zone === 'high' ? 'Excellent' : discipline.discipline_zone === 'medium' ? 'Good' : 'Needs Improvement'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Generated Timestamp */}
        <div className="text-center pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400">Report generated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    );
  };

  const handleEditGrade = async () => {
    if (!selectedGrade) return;

    try {
      const payload = {
        score: parseFloat(editGradeForm.score),
        max_score: parseFloat(editGradeForm.max_score),
        remarks: editGradeForm.remarks,
        custom_grade_letter: editGradeForm.custom_grade_letter
      };

      console.log('✏️ Updating grade:', selectedGrade.id, payload);
      const response = await apiClient.patch(
        `/academics-records/grades/student-grade/${selectedGrade.id}/`,
        payload
      );

      if (response.data.success) {
        console.log('✅ Grade updated successfully:', response.data);
        toast.success(t('teacherGrades.grades.updateSuccess'));
        setShowEditGradeModal(false);
        fetchStudentGrades();
        fetchGradeUploads();
      } else {
        console.error('❌ Grade update failed:', response.data);
        toast.error(response.data.message || t('teacherGrades.grades.updateFailed'));
      }
    } catch (error) {
      console.error('❌ Edit grade error:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || t('teacherGrades.grades.updateFailed'));
    }
  };

  const handleDeleteGrade = async () => {
    if (!selectedGrade) return;

    try {
      console.log('🗑️ Deleting grade:', selectedGrade.id);
      const response = await apiClient.delete(
        `/academics-records/grades/student-grade/${selectedGrade.id}/`
      );

      if (response.data.success) {
        console.log('✅ Grade deleted successfully:', response.data);
        toast.success(t('teacherGrades.grades.deleteSuccess'));
        setShowDeleteConfirmModal(false);
        setSelectedGrade(null);
        fetchStudentGrades();
        fetchGradeUploads();
      } else {
        console.error('❌ Grade deletion failed:', response.data);
        toast.error(response.data.message || t('teacherGrades.grades.deleteFailed'));
      }
    } catch (error) {
      console.error('❌ Delete grade error:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || t('teacherGrades.grades.deleteFailed'));
    }
  };

  const handleDeleteUpload = async (uploadId) => {
    if (!window.confirm(t('teacherGrades.uploads.deleteConfirm'))) {
      return;
    }

    try {
      console.log('🗑️ Deleting upload:', uploadId);
      const response = await apiClient.delete(`/academics-records/grades/upload/${uploadId}/`);
      if (response.data.success) {
        console.log('✅ Upload deleted successfully:', response.data);
        toast.success(t('teacherGrades.uploads.deleteSuccess'));
        fetchGradeUploads();
        fetchStudentGrades();
      } else {
        console.error('❌ Upload deletion failed:', response.data);
        toast.error(response.data.message || t('teacherGrades.uploads.deleteFailed'));
      }
    } catch (error) {
      console.error('❌ Delete upload error:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || t('teacherGrades.uploads.deleteFailed'));
    }
  };

  const handleDownloadUploadFile = async (upload) => {
    try {
      console.log('📥 Downloading upload file:', upload.id);
      const response = await apiClient.get(`/academics-records/grades/upload/${upload.id}/download/`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `grade_upload_${upload.id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      console.log('✅ File downloaded successfully');
      toast.success(t('teacherGrades.uploads.downloadSuccess'));
    } catch (error) {
      console.error('❌ Download error:', error);
      console.error('Error details:', error.response?.data);
      toast.error(t('teacherGrades.uploads.downloadFailed'));
    }
  };

  const handleUploadGrades = async () => {
    if (!uploadFile) { toast.error(t('teacherGrades.uploads.noFile')); return; }
    if (!uAcademicYear || !uTerm || !uSchoolLevel || !uClassLevel || !uSubject || !uGradeType) {
      toast.error(t('teacherGrades.uploads.missingFields'));
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('excel_file', uploadFile);
    fd.append('academic_year_id', uAcademicYear);
    fd.append('term_id', uTerm);
    fd.append('school_level_id', uSchoolLevel);
    fd.append('class_level_id', uClassLevel);
    fd.append('subject_id', uSubject);
    fd.append('grade_type', uGradeType);

    console.log('📤 Uploading grades file:', {
      academic_year_id: uAcademicYear,
      term_id: uTerm,
      school_level_id: uSchoolLevel,
      class_level_id: uClassLevel,
      subject_id: uSubject,
      grade_type: uGradeType,
      file: uploadFile.name
    });

    try {
      const r = await apiClient.post('/academics-records/templates/grades/upload/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('📊 Upload response:', r.data);
      if (r.data.success) {
        toast.success(r.data.message || t('teacherGrades.uploads.uploadSuccess'));
        setShowUploadModal(false);
        setUploadFile(null);
        fetchGradeUploads();
        fetchStudentGrades();
      } else {
        console.error('❌ Upload failed:', r.data);
        toast.error(r.data.message || t('teacherGrades.uploads.uploadFailed'));
      }
    } catch (e) {
      console.error('❌ Upload error:', e);
      console.error('Error details:', e.response?.data);
      toast.error(e.response?.data?.message || t('teacherGrades.uploads.uploadError'));
    } finally { setUploading(false); }
  };

  const handleDownloadTemplate = async () => {
    if (!dAcademicYear || !dTerm || !dSchoolLevel || !dClassLevel || !dSubject || !dGradeType) {
      toast.error(t('teacherGrades.download.missingFields'));
      return;
    }
    setDownloading(true);
    try {
      console.log('📥 Downloading template with params:', {
        academic_year_id: dAcademicYear,
        term_id: dTerm,
        school_level_id: dSchoolLevel,
        class_level_id: dClassLevel,
        subject_id: dSubject,
        grade_type: dGradeType
      });

      const r = await apiClient.get('/academics-records/templates/grades/', {
        params: {
          academic_year_id: dAcademicYear,
          term_id: dTerm,
          school_level_id: dSchoolLevel,
          class_level_id: dClassLevel,
          subject_id: dSubject,
          grade_type: dGradeType,
          lang: localStorage.getItem('user_language') || 'en',
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `grades_template_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      console.log('✅ Template downloaded successfully');
      toast.success(t('teacherGrades.download.success'));
      setShowDownloadModal(false);
    } catch (e) {
      console.error('❌ Download failed:', e);
      toast.error(t('teacherGrades.download.failed'));
    } finally { setDownloading(false); }
  };

  const openStudentModal = async (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
    setLoadingDetail(true);
    try {
      console.log('🔍 Fetching student details:', student.id);
      const [perfRes, detailRes] = await Promise.allSettled([
        fAcademicYear
          ? apiClient.get(`/academics-records/performance/student/${student.id}/`, {
            params: { academic_year_id: fAcademicYear, ...(fTerm ? { term_id: fTerm } : {}) },
          })
          : Promise.resolve(null),
        apiClient.get(`/students/${student.id}/`),
      ]);
      setStudentDetailData({
        performance: perfRes.status === 'fulfilled' ? perfRes.value?.data?.data : null,
        detail: detailRes.status === 'fulfilled' ? detailRes.value?.data?.data : null,
      });
      console.log('✅ Student details fetched');
    } catch (e) {
      console.error('❌ Failed to fetch student details:', e);
      setStudentDetailData(null);
    } finally { setLoadingDetail(false); }
  };

  const openEditGradeModal = (grade) => {
    setSelectedGrade(grade);
    setEditGradeForm({
      score: grade.score,
      max_score: grade.max_score || 100,
      remarks: grade.remarks || '',
      custom_grade_letter: grade.custom_grade_letter || getGradeLetter(grade.percentage)
    });
    setShowEditGradeModal(true);
  };

  const openDeleteConfirm = (grade) => {
    setSelectedGrade(grade);
    setShowDeleteConfirmModal(true);
  };

  const viewUploadDetails = (upload) => {
    setSelectedUpload(upload);
    setShowUploadDetailModal(true);
  };

  const filteredGrades = useMemo(() => {
    let list = [...studentGrades];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(g =>
        g.student_name?.toLowerCase().includes(q) ||
        g.student_roll?.toLowerCase().includes(q) ||
        g.subject_name?.toLowerCase().includes(q)
      );
    }
    console.log(`🔍 Filtered grades: ${list.length} out of ${studentGrades.length}`);
    return list;
  }, [studentGrades, searchTerm]);

  const totalPages = Math.ceil(filteredGrades.length / itemsPerPage);
  const paginatedGrades = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGrades.slice(start, start + itemsPerPage);
  }, [filteredGrades, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, fSubject, fClassLevel, fGradeType, fStudent]);

  const uClassLevels = useMemo(() =>
    myAssignments.class_levels.filter(cl =>
      !uSchoolLevel || String(cl.school_level_id) === String(uSchoolLevel)
    ), [myAssignments.class_levels, uSchoolLevel]);

  const dClassLevels = useMemo(() =>
    myAssignments.class_levels.filter(cl =>
      !dSchoolLevel || String(cl.school_level_id) === String(dSchoolLevel)
    ), [myAssignments.class_levels, dSchoolLevel]);

  // Initial data loading
  useEffect(() => {
    console.log('🚀 Initializing TeacherAcademicGrades component...');
    fetchTeacherProfile();
    fetchAcademicYears();
    fetchMyAssignments();
  }, [fetchTeacherProfile, fetchAcademicYears, fetchMyAssignments]);

  // Fetch terms when academic years change
  useEffect(() => {
    console.log('📅 Academic year changed:', fAcademicYear);
    fetchTermsFor(fAcademicYear, setFilterTerms);
  }, [fAcademicYear, fetchTermsFor]);

  useEffect(() => {
    console.log('📅 Upload academic year changed:', uAcademicYear);
    fetchTermsFor(uAcademicYear, setUTerms);
  }, [uAcademicYear, fetchTermsFor]);

  useEffect(() => {
    console.log('📅 Download academic year changed:', dAcademicYear);
    fetchTermsFor(dAcademicYear, setDTerms);
  }, [dAcademicYear, fetchTermsFor]);

  // Fetch grades and uploads when filters change
  useEffect(() => {
    if (fAcademicYear) {
      console.log('🔄 Filters changed, fetching data...');
      fetchStudentGrades();
      fetchGradeUploads();
    } else {
      console.log('⚠️ No academic year selected, skipping data fetch');
    }
  }, [fAcademicYear, fTerm, fClassLevel, fSubject, fGradeType, fStudent, fetchStudentGrades, fetchGradeUploads]);

  useEffect(() => {
    if (fClassroom) {
      fetchStudentsInClassroom(fClassroom);
    }
  }, [fClassroom, fetchStudentsInClassroom]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('📊 Current state summary:', {
      studentGradesCount: studentGrades.length,
      gradeUploadsCount: gradeUploads.length,
      activeTab,
      fAcademicYear,
      fTerm,
      fClassLevel,
      fSubject,
      fGradeType,
      fStudent
    });
  }, [studentGrades, gradeUploads, activeTab, fAcademicYear, fTerm, fClassLevel, fSubject, fGradeType, fStudent]);

  const GradeLetterBadge = ({ percentage }) => {
    const letter = getGradeLetter(percentage);
    const color = getGradeColor(percentage);
    if (letter === '—') return <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>;
    return (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-black"
        style={{ background: `${color}18`, color: color, border: `1.5px solid ${color}40` }}>
        {letter}
      </span>
    );
  };

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

  // Teacher Welcome Banner Component
  const TeacherWelcomeBanner = () => (
    <div className="bg-gradient-to-r from-green-700 to-green-800 rounded-2xl p-5 text-white shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('teacherGrades.header.title')}</h1>
          <p className="text-green-100 text-sm mt-1">
            {teacherProfile ? `${teacherProfile.full_name} · ` : ''}{t('teacherGrades.header.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl">
          <GraduationCap className="w-4 h-4" />
          <span className="text-sm font-medium">
            {myAssignments.subjects.length} {t('teacherGrades.subjectsAssigned')}
          </span>
        </div>
      </div>
    </div>
  );

  // Stats Cards Component
  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: t('teacherGrades.stats.totalGrades'), value: studentGrades.length, color: 'from-green-700 to-green-900', icon: FileSpreadsheet },
        { label: t('teacherGrades.stats.totalUploads'), value: gradeUploads.length, color: 'from-green-500 to-green-700', icon: Upload },
        { label: t('teacherGrades.stats.subjects'), value: myAssignments.subjects.length, color: 'from-blue-500 to-blue-700', icon: BookOpen },
        { label: t('teacherGrades.stats.classrooms'), value: myAssignments.classrooms.length, color: 'from-amber-500 to-amber-700', icon: Users },
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

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">

        {/* Dark Mode Toggle */}
        <div className="flex justify-between items-center">
          <LanguageSwitcher />
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
          </button>
        </div>

        {/* Welcome Banner */}
        <TeacherWelcomeBanner />

        {/* Stats Cards */}
        <StatsCards />

        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-green-700 dark:text-green-500" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('teacherGrades.filters.title')}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">— {t('teacherGrades.filters.subtitle')}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <SelectField label={t('teacherGrades.filters.academicYear')} value={fAcademicYear}
              onChange={(v) => { setFAcademicYear(v); setFTerm(''); }}
              options={academicYears.map(y => ({ value: y.id, label: y.name }))}
              placeholder={t('teacherGrades.filters.academicYearPlaceholder')} t={t} />
            <SelectField label={t('teacherGrades.filters.term')} value={fTerm} onChange={setFTerm}
              options={filterTerms.map(tm => ({ value: tm.id, label: tm.name }))}
              placeholder={t('teacherGrades.filters.termPlaceholder')} disabled={!fAcademicYear} t={t} />
            <SelectField label={t('teacherGrades.filters.schoolLevel')} value={fSchoolLevel}
              onChange={(v) => { setFSchoolLevel(v); setFClassLevel(''); setFClassroom(''); setFStudent(''); }}
              options={myAssignments.school_levels.map(sl => ({ value: sl.id, label: sl.name }))}
              placeholder={t('teacherGrades.filters.schoolLevelPlaceholder')} t={t} />
            <SelectField label={t('teacherGrades.filters.classLevel')} value={fClassLevel}
              onChange={(v) => { setFClassLevel(v); setFClassroom(''); setFStudent(''); }}
              options={filteredClassLevels.map(cl => ({ value: cl.id, label: cl.name }))}
              placeholder={t('teacherGrades.filters.classLevelPlaceholder')} disabled={!fSchoolLevel} t={t} />
            <SelectField label={t('teacherGrades.filters.subject')} value={fSubject} onChange={setFSubject}
              options={myAssignments.subjects.map(s => ({ value: s.id, label: s.name }))}
              placeholder={t('teacherGrades.filters.subjectPlaceholder')} t={t} />
            <SelectField label={t('teacherGrades.filters.gradeType')} value={fGradeType} onChange={setFGradeType}
              options={GRADE_TYPES.map(gt => ({ value: gt.value, label: t(gt.labelKey) }))}
              placeholder={t('teacherGrades.filters.gradeTypePlaceholder')} t={t} />
            <SelectField label={t('teacherGrades.filters.student')} value={fStudent} onChange={setFStudent}
              options={classroomStudents.map(s => ({ value: s.id, label: `${s.full_name} (${s.roll_number})` }))}
              placeholder={t('teacherGrades.filters.studentPlaceholder')} disabled={!fClassroom} loading={loadingStudents} t={t} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('grades')}
            className={`px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === 'grades'
              ? 'text-green-700 dark:text-green-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              {t('teacherGrades.tabs.studentGrades')}
              <span className="ml-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                {studentGrades.length}
              </span>
            </div>
            {activeTab === 'grades' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700 dark:bg-green-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('uploads')}
            className={`px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === 'uploads'
              ? 'text-green-700 dark:text-green-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              {t('teacherGrades.tabs.gradeUploads')}
              <span className="ml-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                {gradeUploads.length}
              </span>
            </div>
            {activeTab === 'uploads' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700 dark:bg-green-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button onClick={() => setShowDownloadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 rounded-xl text-sm font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition-all">
            <Download className="w-4 h-4" />
            {t('teacherGrades.buttons.downloadTemplate')}
          </button>
          <button onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-green-200 dark:shadow-green-900/30">
            <Upload className="w-4 h-4" />
            {t('teacherGrades.buttons.uploadGrades')}
          </button>
        </div>

        {/* Tab Content - Grades Table */}
        {activeTab === 'grades' ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4.5 h-4.5 text-green-700 dark:text-green-500" />
                <h2 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t('teacherGrades.grades.title')}</h2>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                  {filteredGrades.length}
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                <input type="text" placeholder={t('teacherGrades.grades.searchPlaceholder')}
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200" />
              </div>
            </div>

            {loadingGrades ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <Spinner />
                <p className="text-sm text-gray-400 dark:text-gray-500">{t('teacherGrades.common.loading')}</p>
              </div>
            ) : paginatedGrades.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">{t('teacherGrades.grades.noGrades')}</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{t('teacherGrades.grades.noGradesHint')}</p>
                {studentGrades.length > 0 && paginatedGrades.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Note: {studentGrades.length} grades exist but don't match the current filters or search term.</p>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        {/* Each <th> gets whitespace-nowrap + a sensible min-width */}
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                          {t('teacherGrades.grades.columns.rollNo')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[140px]">
                          {t('teacherGrades.grades.columns.studentName')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[110px]">
                          {t('teacherGrades.grades.columns.academicYear')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[90px]">
                          {t('teacherGrades.grades.columns.term')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[110px]">
                          {t('teacherGrades.grades.columns.schoolLevel')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[110px]">
                          {t('teacherGrades.grades.columns.classLevel')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[110px]">
                          {t('teacherGrades.grades.columns.subject')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[130px]">
                          {t('teacherGrades.grades.columns.gradeType')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                          {t('teacherGrades.grades.columns.score')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[70px]">
                          {t('teacherGrades.grades.columns.grade')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[90px]">
                          {t('teacherGrades.grades.columns.status')}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                          {t('teacherGrades.grades.columns.actions')}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {paginatedGrades.map((grade) => {
                        const percentage =
                          grade.percentage ?? (grade.score / grade.max_score) * 100;

                        return (
                          <tr
                            key={grade.id}
                            className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors"
                          >
                            {/* Roll No — monospace badge, never truncated */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-mono text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-md">
                                {grade.student_roll}
                              </span>
                            </td>

                            {/* Student Name */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                {grade.student_name}
                              </p>
                            </td>

                            {/* Academic Year */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                              {grade.academic_year_name || '—'}
                            </td>

                            {/* Term */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                              {grade.term_name || '—'}
                            </td>

                            {/* School Level */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                              {grade.school_level_name || '—'}
                            </td>

                            {/* Class Level */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                              {grade.class_level_name || '—'}
                            </td>

                            {/* Subject */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {grade.subject_name}
                            </td>

                            {/* Grade Type */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                                {getGradeTypeLabel(grade.grade_type)}
                              </span>
                            </td>

                            {/* Score / Percentage */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {percentage.toFixed(1)}%
                              </span>
                            </td>

                            {/* Grade Letter */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <GradeLetterBadge percentage={percentage} />
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-semibold ${grade.is_published
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                  }`}
                              >
                                {grade.is_published
                                  ? t('teacherGrades.grades.status.published')
                                  : t('teacherGrades.grades.status.pending')}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                {/* View Performance */}
                                <button
                                  onClick={() =>
                                    fetchStudentPerformance({
                                      id: grade.student_id,
                                      full_name: grade.student_name,
                                      roll_number: grade.student_roll,
                                      current_class_level: grade.class_level_name,
                                    })
                                  }
                                  className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                  title={t('teacherGrades.grades.viewPerformance')}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Edit */}
                                <button
                                  onClick={() => openEditGradeModal(grade)}
                                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                  title={t('teacherGrades.grades.editGrade')}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                {/* Delete */}
                                <button
                                  onClick={() => openDeleteConfirm(grade)}
                                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                  title={t('teacherGrades.grades.deleteGrade')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{t('teacherGrades.pagination.show')}</span>
                    <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 bg-white dark:bg-gray-800">
                      {[5, 10, 25, 50].map(n => <option key={n}>{n}</option>)}
                    </select>
                    <span>{t('teacherGrades.pagination.perPage')} · {filteredGrades.length} {t('teacherGrades.pagination.total')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                      className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">{t('teacherGrades.pagination.first')}</button>
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
                      className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">{t('teacherGrades.pagination.last')}</button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          // Uploads Tab Content (simplified - same dark mode pattern applies)
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4.5 h-4.5 text-green-700 dark:text-green-500" />
                <h2 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t('teacherGrades.uploads.title')}</h2>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                  {gradeUploads.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('teacherGrades.uploads.subtitle')}</p>
            </div>

            {loadingUploads ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <Spinner />
                <p className="text-sm text-gray-400 dark:text-gray-500">{t('teacherGrades.common.loading')}</p>
              </div>
            ) : gradeUploads.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center mx-auto mb-3">
                  <File className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">{t('teacherGrades.uploads.noUploads')}</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{t('teacherGrades.uploads.noUploadsHint')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {gradeUploads.map((upload) => (
                  <div key={upload.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Upload item content with dark mode classes */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <FileExcel className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                              {upload.subject_name} - {getGradeTypeLabel(upload.grade_type)}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {upload.class_level_name} · {upload.academic_year_name}
                              {upload.term_name && ` · ${upload.term_name}`}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                          <div>
                            <span className="text-gray-400 dark:text-gray-500">{t('teacherGrades.uploads.uploaded')}:</span>
                            <p className="font-medium text-gray-700 dark:text-gray-300">{new Date(upload.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 dark:text-gray-500">{t('teacherGrades.uploads.gradesCount')}:</span>
                            <p className="font-medium text-gray-700 dark:text-gray-300">{upload.grades_count || upload.grade_count || 0} {t('teacherGrades.uploads.students')}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 dark:text-gray-500">{t('teacherGrades.uploads.weight')}:</span>
                            <p className="font-medium text-gray-700 dark:text-gray-300">{upload.weight_percentage}%</p>
                          </div>
                          <div>
                            <span className="text-gray-400 dark:text-gray-500">{t('teacherGrades.uploads.status')}:</span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(upload.status)}`}>
                              {t(`teacherGrades.uploads.statuses.${upload.status}`)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={() => viewUploadDetails(upload)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title={t('teacherGrades.uploads.viewDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadUploadFile(upload)}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title={t('teacherGrades.uploads.downloadFile')}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUpload(upload.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title={t('teacherGrades.uploads.deleteUpload')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modals - Include all modal components here (same as before) */}
        {/* Edit Grade Modal */}
        {showEditGradeModal && selectedGrade && (
          <ModalWrapper title={t('teacherGrades.modals.editGrade.title')} subtitle={`${selectedGrade.student_name} - ${selectedGrade.subject_name}`}
            onClose={() => { setShowEditGradeModal(false); setSelectedGrade(null); }}
            maxW="max-w-md" icon={Edit} t={t}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('teacherGrades.modals.editGrade.score')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editGradeForm.score}
                    onChange={(e) => setEditGradeForm({ ...editGradeForm, score: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('teacherGrades.modals.editGrade.maxScore')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editGradeForm.max_score}
                    onChange={(e) => setEditGradeForm({ ...editGradeForm, max_score: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('teacherGrades.modals.editGrade.customGradeLetter')}</label>
                <select
                  value={editGradeForm.custom_grade_letter}
                  onChange={(e) => setEditGradeForm({ ...editGradeForm, custom_grade_letter: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{t('teacherGrades.modals.editGrade.autoCalculate')}</option>
                  {GRADE_LETTERS.map(g => (
                    <option key={g.value} value={g.value}>{g.value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('teacherGrades.modals.editGrade.remarks')}</label>
                <textarea
                  value={editGradeForm.remarks}
                  onChange={(e) => setEditGradeForm({ ...editGradeForm, remarks: e.target.value })}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={t('teacherGrades.modals.editGrade.remarksPlaceholder')}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleEditGrade}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all">
                  {t('teacherGrades.modals.editGrade.saveChanges')}
                </button>
                <button onClick={() => { setShowEditGradeModal(false); setSelectedGrade(null); }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all">
                  {t('teacherGrades.modals.editGrade.cancel')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmModal && selectedGrade && (
          <ModalWrapper title={t('teacherGrades.modals.deleteGrade.title')} subtitle={t('teacherGrades.modals.deleteGrade.subtitle')}
            onClose={() => { setShowDeleteConfirmModal(false); setSelectedGrade(null); }}
            maxW="max-w-md" icon={AlertTriangle} t={t}>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700">
                  {t('teacherGrades.modals.deleteGrade.confirmMessage')} <strong>{selectedGrade.student_name}</strong>
                  {t('teacherGrades.modals.deleteGrade.inSubject')} <strong>{selectedGrade.subject_name}</strong>?
                </p>
                <p className="text-xs text-red-600 mt-2">{t('teacherGrades.modals.deleteGrade.warning')}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleDeleteGrade}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all">
                  {t('teacherGrades.modals.deleteGrade.confirm')}
                </button>
                <button onClick={() => { setShowDeleteConfirmModal(false); setSelectedGrade(null); }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all">
                  {t('teacherGrades.modals.deleteGrade.cancel')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* Upload Detail Modal */}
        {showUploadDetailModal && selectedUpload && (
          <ModalWrapper title={t('teacherGrades.modals.uploadDetails.title')} subtitle={`${t('teacherGrades.modals.uploadDetails.file')}: ${selectedUpload.excel_file?.split('/').pop() || t('teacherGrades.modals.uploadDetails.gradeUpload')}`}
            onClose={() => { setShowUploadDetailModal(false); setSelectedUpload(null); }}
            maxW="max-w-lg" icon={FileText} t={t}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label={t('teacherGrades.modals.uploadDetails.academicYear')} value={selectedUpload.academic_year_name} />
                <InfoRow label={t('teacherGrades.modals.uploadDetails.term')} value={selectedUpload.term_name || '—'} />
                <InfoRow label={t('teacherGrades.modals.uploadDetails.schoolLevel')} value={selectedUpload.school_level_name} />
                <InfoRow label={t('teacherGrades.modals.uploadDetails.classLevel')} value={selectedUpload.class_level_name} />
                <InfoRow label={t('teacherGrades.modals.uploadDetails.subject')} value={selectedUpload.subject_name} />
                <InfoRow label={t('teacherGrades.modals.uploadDetails.gradeType')} value={getGradeTypeLabel(selectedUpload.grade_type)} />
                <InfoRow label={t('teacherGrades.modals.uploadDetails.weight')} value={`${selectedUpload.weight_percentage}%`} />
                <InfoRow label={t('teacherGrades.modals.uploadDetails.students')} value={selectedUpload.grades_count || selectedUpload.grade_count || 0} />
                <InfoRow label={t('teacherGrades.modals.uploadDetails.status')} value={t(`teacherGrades.uploads.statuses.${selectedUpload.status}`)} />
                <InfoRow label={t('teacherGrades.modals.uploadDetails.uploaded')} value={new Date(selectedUpload.created_at).toLocaleString()} />
                {selectedUpload.reviewed_at && (
                  <InfoRow label={t('teacherGrades.modals.uploadDetails.reviewed')} value={new Date(selectedUpload.reviewed_at).toLocaleString()} />
                )}
                {selectedUpload.reviewed_by_name && (
                  <InfoRow label={t('teacherGrades.modals.uploadDetails.reviewedBy')} value={selectedUpload.reviewed_by_name} />
                )}
              </div>
              {selectedUpload.rejection_reason && (
                <div className="bg-red-50 rounded-lg p-3 mt-2">
                  <p className="text-xs font-semibold text-red-700 mb-1">{t('teacherGrades.modals.uploadDetails.rejectionReason')}</p>
                  <p className="text-sm text-red-600">{selectedUpload.rejection_reason}</p>
                </div>
              )}
              {selectedUpload.admin_notes && (
                <div className="bg-blue-50 rounded-lg p-3 mt-2">
                  <p className="text-xs font-semibold text-blue-700 mb-1">{t('teacherGrades.modals.uploadDetails.adminNotes')}</p>
                  <p className="text-sm text-blue-600">{selectedUpload.admin_notes}</p>
                </div>
              )}
            </div>
          </ModalWrapper>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <ModalWrapper title={t('teacherGrades.modals.upload.title')} subtitle={t('teacherGrades.modals.upload.subtitle')}
            onClose={() => { setShowUploadModal(false); setUploadFile(null); }}
            maxW="max-w-xl" icon={Upload} t={t}>
            <div className="space-y-4">
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all">
                <FileSpreadsheet className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                {uploadFile ? (
                  <p className="text-sm font-semibold text-emerald-700">{uploadFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-600">{t('teacherGrades.modals.upload.selectFile')}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('teacherGrades.modals.upload.fileTypes')}</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={(e) => setUploadFile(e.target.files[0])} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField label={t('teacherGrades.modals.upload.academicYear')} value={uAcademicYear}
                  onChange={(v) => { setUAcademicYear(v); setUTerm(''); }}
                  options={academicYears.map(y => ({ value: y.id, label: y.name }))}
                  required placeholder={t('teacherGrades.modals.upload.selectYear')} t={t} />
                <SelectField label={t('teacherGrades.modals.upload.term')} value={uTerm} onChange={setUTerm}
                  options={uTerms.map(tm => ({ value: tm.id, label: tm.name }))}
                  disabled={!uAcademicYear} required placeholder={t('teacherGrades.modals.upload.selectTerm')} t={t} />
                <SelectField label={t('teacherGrades.modals.upload.schoolLevel')} value={uSchoolLevel}
                  onChange={(v) => { setUSchoolLevel(v); setUClassLevel(''); }}
                  options={myAssignments.school_levels.map(sl => ({ value: sl.id, label: sl.name }))}
                  required placeholder={t('teacherGrades.modals.upload.selectLevel')} t={t} />
                <SelectField label={t('teacherGrades.modals.upload.classLevel')} value={uClassLevel} onChange={setUClassLevel}
                  options={uClassLevels.map(cl => ({ value: cl.id, label: cl.name }))}
                  disabled={!uSchoolLevel} required placeholder={t('teacherGrades.modals.upload.selectClass')} t={t} />
                <SelectField label={t('teacherGrades.modals.upload.subject')} value={uSubject} onChange={setUSubject}
                  options={myAssignments.subjects.map(s => ({ value: s.id, label: s.name }))}
                  required placeholder={t('teacherGrades.modals.upload.selectSubject')} t={t} />
                <SelectField label={t('teacherGrades.modals.upload.gradeType')} value={uGradeType} onChange={setUGradeType}
                  options={GRADE_TYPES.map(gt => ({ value: gt.value, label: t(gt.labelKey) }))}
                  required t={t} />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={handleUploadGrades} disabled={uploading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {uploading ? <Spinner size={4} color="white" /> : <Upload className="w-4 h-4" />}
                  {uploading ? t('teacherGrades.modals.upload.uploading') : t('teacherGrades.modals.upload.submit')}
                </button>
                <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold">
                  {t('teacherGrades.modals.upload.cancel')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* Download Modal */}
        {showDownloadModal && (
          <ModalWrapper title={t('teacherGrades.modals.download.title')}
            subtitle={t('teacherGrades.modals.download.subtitle')}
            onClose={() => setShowDownloadModal(false)}
            maxW="max-w-xl" icon={Download} t={t}>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  {t('teacherGrades.modals.download.info')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField label={t('teacherGrades.modals.download.academicYear')} value={dAcademicYear}
                  onChange={(v) => { setDAcademicYear(v); setDTerm(''); }}
                  options={academicYears.map(y => ({ value: y.id, label: y.name }))}
                  required placeholder={t('teacherGrades.modals.download.selectYear')} t={t} />
                <SelectField label={t('teacherGrades.modals.download.term')} value={dTerm} onChange={setDTerm}
                  options={dTerms.map(tm => ({ value: tm.id, label: tm.name }))}
                  disabled={!dAcademicYear} required placeholder={t('teacherGrades.modals.download.selectTerm')} t={t} />
                <SelectField label={t('teacherGrades.modals.download.schoolLevel')} value={dSchoolLevel}
                  onChange={(v) => { setDSchoolLevel(v); setDClassLevel(''); }}
                  options={myAssignments.school_levels.map(sl => ({ value: sl.id, label: sl.name }))}
                  required placeholder={t('teacherGrades.modals.download.selectLevel')} t={t} />
                <SelectField label={t('teacherGrades.modals.download.classLevel')} value={dClassLevel} onChange={setDClassLevel}
                  options={dClassLevels.map(cl => ({ value: cl.id, label: cl.name }))}
                  disabled={!dSchoolLevel} required placeholder={t('teacherGrades.modals.download.selectClass')} t={t} />
                <SelectField label={t('teacherGrades.modals.download.subject')} value={dSubject} onChange={setDSubject}
                  options={myAssignments.subjects.map(s => ({ value: s.id, label: s.name }))}
                  required placeholder={t('teacherGrades.modals.download.selectSubject')} t={t} />
                <SelectField label={t('teacherGrades.modals.download.gradeType')} value={dGradeType} onChange={setDGradeType}
                  options={GRADE_TYPES.map(gt => ({ value: gt.value, label: t(gt.labelKey) }))}
                  required t={t} />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={handleDownloadTemplate} disabled={downloading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                  {downloading ? <Spinner size={4} color="white" /> : <Download className="w-4 h-4" />}
                  {downloading ? t('teacherGrades.modals.download.generating') : t('teacherGrades.modals.download.download')}
                </button>
                <button onClick={() => setShowDownloadModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold">
                  {t('teacherGrades.modals.download.cancel')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* Student Detail Modal */}
        {showStudentModal && selectedStudent && (
          <ModalWrapper
            title={selectedStudent.full_name}
            subtitle={`${t('teacherGrades.modals.student.roll')}: ${selectedStudent.roll_number}`}
            onClose={() => { setShowStudentModal(false); setStudentDetailData(null); }}
            maxW="max-w-2xl" icon={GraduationCap} t={t}>
            {loadingDetail ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Spinner size={8} />
                <p className="text-sm text-slate-400">{t('teacherGrades.common.loading')}</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl p-4 flex items-center gap-4 bg-gradient-to-r from-emerald-50 to-blue-50">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xl font-black">
                    {selectedStudent.full_name?.[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-slate-900 text-lg">{selectedStudent.full_name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs bg-emerald-100 text-emerald-700 font-mono font-bold px-2.5 py-0.5 rounded-full">
                        {selectedStudent.roll_number}
                      </span>
                      {selectedStudent.current_class_level && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
                          {selectedStudent.current_class_level?.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">{t('teacherGrades.modals.student.personalInfo')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <InfoRow label={t('teacherGrades.modals.student.email')} value={selectedStudent.email} icon={Info} />
                    <InfoRow label={t('teacherGrades.modals.student.phone')} value={selectedStudent.phone_number} icon={Info} />
                  </div>
                </div>
              </div>
            )}
          </ModalWrapper>
        )}

        {/* Performance Modal */}
        {showPerformanceModal && selectedPerformanceStudent && (
          <ModalWrapper
            title={t('teacherGrades.modals.performance.title')}
            subtitle={`${selectedPerformanceStudent.full_name} - ${t('teacherGrades.modals.performance.academicPerformance')}`}
            onClose={() => {
              setShowPerformanceModal(false);
              setSelectedPerformanceStudent(null);
              setStudentPerformance(null);
            }}
            maxW="max-4xl"
            icon={TrendingUp}
            t={t}
          >
            {loadingPerformance ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <Spinner />
                <p className="text-sm text-gray-400 dark:text-gray-500">{t('teacherGrades.common.loading')}</p>
              </div>
            ) : studentPerformance ? (
              renderPerformanceModalContent()
            ) : (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('teacherGrades.errors.noPerformanceData')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('teacherGrades.errors.noPerformanceDataHint')}</p>
              </div>
            )}
          </ModalWrapper>
        )}

      </div>
    </div>
  );
};

const FileExcel = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M10 12h4" />
    <path d="M12 10v4" />
    <path d="M8 16h8" />
  </svg>
);

export default TeacherAcademicGrades;