// TeacherAttendanceManagement.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, Calendar, Clock, CheckCircle, XCircle, AlertCircle,
  Search, Filter, ChevronLeft, ChevronRight, RefreshCw,
  Download, Upload, Eye, Edit, Trash2, Plus, X,
  FileSpreadsheet, FileText, FolderOpen, Sun, Moon,
  GraduationCap, BookOpen, UserCheck, UserX, AlertTriangle,
  CheckSquare, Square, Clock as ClockIcon, TrendingUp,
  ChevronDown, Info, Loader2, Activity, Award, Percent,
  ThumbsUp, ThumbsDown, HelpCircle, Send, Home, Settings
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
// Constants
// ─────────────────────────────────────────────────────────────
const ATTENDANCE_STATUSES = [
  { value: 'present', labelKey: 'attendance.status.present', color: 'green', icon: CheckCircle },
  { value: 'absent', labelKey: 'attendance.status.absent', color: 'red', icon: XCircle },
  { value: 'late', labelKey: 'attendance.status.late', color: 'yellow', icon: ClockIcon },
  { value: 'excused', labelKey: 'attendance.status.excused', color: 'blue', icon: AlertCircle },
];

const STATUS_COLORS = {
  present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  excused: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
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
        <option value="">{loading ? 'Loading...' : placeholder}</option>
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
const TeacherAttendanceManagement = () => {
  const { t, i18n } = useTranslation();

  // ── UI State ────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState('sessions');

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

  // ── Students in selected classroom ──────────────────────────
  const [classroomStudents, setClassroomStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // ── Attendance Sessions ─────────────────────────────────────
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // ── Current Session Data ────────────────────────────────────
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const [sessionDate, setSessionDate] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // ── Manual Attendance Entry ─────────────────────────────────
  const [manualAttendance, setManualAttendance] = useState({});
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // ── Modals ──────────────────────────────────────────────────
  const [showTakeAttendanceModal, setShowTakeAttendanceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // ── Upload Form State ───────────────────────────────────────
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uAcademicYear, setUAcademicYear] = useState('');
  const [uTerm, setUTerm] = useState('');
  const [uSchoolLevel, setUSchoolLevel] = useState('');
  const [uClassLevel, setUClassLevel] = useState('');
  const [uSubject, setUSubject] = useState('');
  const [uSessionDate, setUSessionDate] = useState('');

  // ── Download Form State ─────────────────────────────────────
  const [dAcademicYear, setDAcademicYear] = useState('');
  const [dTerm, setDTerm] = useState('');
  const [dSchoolLevel, setDSchoolLevel] = useState('');
  const [dClassLevel, setDClassLevel] = useState('');
  const [dSubject, setDSubject] = useState('');
  const [dSessionDate, setDSessionDate] = useState('');
  const [downloading, setDownloading] = useState(false);

  // ── Edit Attendance ─────────────────────────────────────────
  const [editingRecord, setEditingRecord] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

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
        setDAcademicYear(String(defaultYear));
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

  const fetchStudentsInClassroom = useCallback(async () => {
    if (!fClassroom) {
      setClassroomStudents([]);
      return;
    }
    setLoadingStudents(true);
    try {
      const r = await apiClient.get(`/students/teacher/classroom/${fClassroom}/students/`);
      const students = r.data.data?.students || r.data.data || r.data || [];
      setClassroomStudents(students);
    } catch (e) {
      console.error('Failed to fetch students:', e);
      setClassroomStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [fClassroom]);

  const fetchAttendanceSessions = useCallback(async () => {
    const params = {};
    if (fAcademicYear) params.academic_year_id = fAcademicYear;
    if (fTerm) params.term_id = fTerm;
    if (fClassLevel) params.class_level_id = fClassLevel;
    if (fSubject) params.subject_id = fSubject;
    if (fClassroom) params.classroom_id = fClassroom;

    setLoadingSessions(true);
    try {
      const r = await apiClient.get('/academics-records/attendance/sessions/', { params });
      // Handle the response structure correctly
      const sessions = r.data.data || r.data.results || [];
      setAttendanceSessions(sessions);
    } catch (e) {
      console.error('Failed to fetch attendance sessions:', e);
      toast.error(t('attendance.errors.fetchSessionsFailed'));
      setAttendanceSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [fAcademicYear, fTerm, fClassLevel, fSubject, fClassroom, t]);


  const fetchSessionAttendance = useCallback(async (sessionId) => {
    try {
      console.log(`📤 FETCHING SESSION DETAILS: /academics-records/attendance/session/${sessionId}/`);
      const r = await apiClient.get(`/academics-records/attendance/session/${sessionId}/`);

      // Log the full response
      console.log('📥 SESSION DETAILS RESPONSE:', {
        status: r.status,
        data: r.data,
        fullResponse: JSON.stringify(r.data, null, 2)
      });

      const data = r.data.data || r.data;
      console.log('📊 PARSED SESSION DATA:', data);

      setSelectedSession(data);
      setSessionAttendance(data.records || []);

      // Fix: Use session_date instead of date
      const dateValue = data.session_date || data.date;
      console.log('📅 DATE VALUE:', dateValue, 'Type:', typeof dateValue);

      setSessionDate(dateValue || '');
      setSessionNotes(data.notes || '');
      setStartTime(data.start_time || '');
      setEndTime(data.end_time || '');

      // Log the records
      console.log('📋 ATTENDANCE RECORDS:', data.records?.length || 0, 'records');
      if (data.records && data.records.length > 0) {
        console.log('📝 First record:', data.records[0]);
      }
    } catch (e) {
      console.error('❌ Failed to fetch session attendance:', e);
      console.error('Error response:', e.response?.data);
      toast.error(t('attendance.errors.fetchAttendanceFailed'));
    }
  }, [t]);

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

  // ── Manual Attendance Handlers ──────────────────────────────
  const handleStatusChange = (studentId, status) => {
    setManualAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleRemarksChange = (studentId, remarks) => {
    setManualAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks }
    }));
  };

  const initializeManualAttendance = () => {
    const initial = {};
    classroomStudents.forEach(student => {
      initial[student.id] = {
        student_id: student.id,
        status: 'present',
        remarks: ''
      };
    });
    setManualAttendance(initial);
  };

  const handleSubmitAttendance = async () => {
    if (!fAcademicYear || !fClassLevel || !fSubject || !sessionDate) {
      toast.error(t('attendance.errors.missingFields'));
      return;
    }

    const attendanceRecords = Object.values(manualAttendance).filter(record => record.status);
    if (attendanceRecords.length === 0) {
      toast.error(t('attendance.errors.noRecords'));
      return;
    }

    setSubmittingAttendance(true);
    try {
      const payload = {
        academic_year_id: parseInt(fAcademicYear),
        term_id: fTerm ? parseInt(fTerm) : null,
        class_level_id: parseInt(fClassLevel),
        subject_id: parseInt(fSubject),
        classroom_id: fClassroom ? parseInt(fClassroom) : null,
        session_date: sessionDate,
        start_time: startTime || null,
        end_time: endTime || null,
        notes: sessionNotes,
        records: attendanceRecords.map(record => ({
          student_id: record.student_id,
          status: record.status,
          remarks: record.remarks || ''
        }))
      };

      // Use the new create endpoint
      const r = await apiClient.post('/academics-records/attendance/sessions/create/', payload);

      if (r.data.success) {
        toast.success(t('attendance.success.submitSuccess'));
        setShowTakeAttendanceModal(false);
        setManualAttendance({});
        setSessionDate('');
        setSessionNotes('');
        setStartTime('');
        setEndTime('');
        fetchAttendanceSessions();
      } else {
        toast.error(r.data.message || t('attendance.errors.submitFailed'));
      }
    } catch (e) {
      console.error('Attendance submission error:', e);
      toast.error(e.response?.data?.message || t('attendance.errors.submitError'));
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // ── Upload Attendance Handler ───────────────────────────────
  const handleUploadAttendance = async () => {
    if (!uploadFile) {
      toast.error(t('attendance.upload.noFile'));
      return;
    }
    if (!uAcademicYear || !uClassLevel || !uSubject) {
      toast.error(t('attendance.upload.missingFields'));
      return;
    }

    setUploading(true);
    const fd = new FormData();
    fd.append('excel_file', uploadFile);
    fd.append('academic_year_id', uAcademicYear);
    if (uTerm) fd.append('term_id', uTerm);
    fd.append('class_level_id', uClassLevel);
    fd.append('subject_id', uSubject);
    fd.append('school_level_id', uSchoolLevel || '');
    if (uSessionDate) fd.append('session_date', uSessionDate);

    try {
      const r = await apiClient.post('/academics-records/templates/attendance/upload/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (r.data.success) {
        toast.success(r.data.message || t('attendance.upload.uploadSuccess'));
        setShowUploadModal(false);
        setUploadFile(null);
        fetchAttendanceSessions();
      } else {
        toast.error(r.data.message || t('attendance.upload.uploadFailed'));
      }
    } catch (e) {
      console.error('Upload error:', e);
      toast.error(e.response?.data?.message || t('attendance.upload.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  // ── Download Template Handler ───────────────────────────────
  const handleDownloadTemplate = async () => {
    if (!dAcademicYear || !dClassLevel || !dSubject) {
      toast.error(t('attendance.download.missingFields'));
      return;
    }

    setDownloading(true);
    try {
      const params = {
        academic_year_id: dAcademicYear,
        term_id: dTerm || '',
        school_level_id: dSchoolLevel,
        class_level_id: dClassLevel,
        subject_id: dSubject,
        session_date: dSessionDate || new Date().toISOString().split('T')[0],
        lang: localStorage.getItem('user_language') || 'en',
      };

      const r = await apiClient.get('/academics-records/templates/attendance/', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_template_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('attendance.download.success'));
      setShowDownloadModal(false);
    } catch (e) {
      console.error('Download failed:', e);
      toast.error(t('attendance.download.failed'));
    } finally {
      setDownloading(false);
    }
  };

  // ── Edit Attendance Record ──────────────────────────────────
  const handleEditAttendance = async () => {
    if (!editingRecord) return;

    try {
      const r = await apiClient.patch(`/academics-records/attendance/record/${editingRecord.id}/`, {
        status: editStatus,
        remarks: editRemarks
      });

      if (r.data.success) {
        toast.success(t('attendance.edit.updateSuccess'));
        setShowEditModal(false);
        setEditingRecord(null);
        if (selectedSession) {
          fetchSessionAttendance(selectedSession.id);
        }
        fetchAttendanceSessions();
      } else {
        toast.error(r.data.message || t('attendance.edit.updateFailed'));
      }
    } catch (e) {
      console.error('Edit error:', e);
      toast.error(e.response?.data?.message || t('attendance.edit.updateError'));
    }
  };

  // ── Delete Attendance Session ───────────────────────────────
  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm(t('attendance.session.deleteConfirm'))) return;

    try {
      const r = await apiClient.delete(`/academics-records/attendance/session/${sessionId}/delete`);
      if (r.data.success) {
        toast.success(t('attendance.session.deleteSuccess'));
        fetchAttendanceSessions();
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
          setShowDetailModal(false);
        }
      } else {
        toast.error(r.data.message || t('attendance.session.deleteFailed'));
      }
    } catch (e) {
      console.error('Delete error:', e);
      toast.error(e.response?.data?.message || t('attendance.session.deleteError'));
    }
  };

  // ── Open Modals ─────────────────────────────────────────────
  const openTakeAttendanceModal = () => {
    if (!fClassroom && !fClassLevel) {
      toast.error(t('attendance.errors.selectClassFirst'));
      return;
    }
    if (!fSubject) {
      toast.error(t('attendance.errors.selectSubjectFirst'));
      return;
    }
    initializeManualAttendance();
    setSessionDate(new Date().toISOString().split('T')[0]);
    setShowTakeAttendanceModal(true);
  };

  const viewSessionDetails = (session) => {
    fetchSessionAttendance(session.id);
    setShowDetailModal(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setEditStatus(record.status);
    setEditRemarks(record.remarks || '');
    setShowEditModal(true);
  };

  // ── Filtered Sessions for Display ───────────────────────────
  const filteredSessions = useMemo(() => {
    let list = attendanceSessions;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s =>
        s.subject_name?.toLowerCase().includes(q) ||
        s.class_level_name?.toLowerCase().includes(q) ||
        s.teacher_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [attendanceSessions, searchTerm]);

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSessions.slice(start, start + itemsPerPage);
  }, [filteredSessions, currentPage, itemsPerPage]);

  // ── Effects ─────────────────────────────────────────────────
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
    fetchStudentsInClassroom();
  }, [fetchStudentsInClassroom]);

  useEffect(() => {
    fetchAttendanceSessions();
  }, [fetchAttendanceSessions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fSubject, fClassLevel]);

  // ── Stats Calculation ───────────────────────────────────────
  const stats = useMemo(() => {
    const total = attendanceSessions.length;
    const totalRecords = attendanceSessions.reduce((sum, s) => sum + (s.records_count || 0), 0);
    const presentCount = attendanceSessions.reduce((sum, s) => sum + (s.present_count || 0), 0);
    const absentCount = attendanceSessions.reduce((sum, s) => sum + (s.absent_count || 0), 0);
    const excusedCount = attendanceSessions.reduce((sum, s) => sum + (s.excused_count || 0), 0);
    const lateCount = attendanceSessions.reduce((sum, s) => sum + (s.late_count || 0), 0);
    const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    return { total, totalRecords, presentCount, absentCount, excusedCount, lateCount, attendanceRate };
  }, [attendanceSessions]);

  // ── Render Components ───────────────────────────────────────
  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {[
        { label: t('attendance.stats.totalSessions'), value: stats.total, color: 'from-gray-700 to-gray-900', icon: Calendar },
        { label: t('attendance.stats.totalRecords'), value: stats.totalRecords, color: 'from-blue-500 to-blue-700', icon: Users },
        { label: t('attendance.stats.present'), value: stats.presentCount, color: 'from-green-500 to-green-700', icon: CheckCircle },
        { label: t('attendance.stats.absent'), value: stats.absentCount, color: 'from-red-500 to-red-700', icon: XCircle },
        { label: t('attendance.stats.excused'), value: stats.excusedCount, color: 'from-yellow-500 to-yellow-700', icon: Clock },
        // { label: t('attendance.stats.attendanceRate'), value: `${stats.attendanceRate.toFixed(1)}%`, color: 'from-purple-500 to-purple-700', icon: TrendingUp },
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

  const StatusBadge = ({ status }) => (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || STATUS_COLORS.present}`}>
      {t(`attendance.status.${status}`)}
    </span>
  );

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
              <UserCheck className="w-6 h-6 text-green-700 dark:text-green-500" />
              {t('attendance.header.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {teacherProfile?.full_name} · {t('attendance.header.subtitle')}
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
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('attendance.filters.title')}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SelectField
              label={t('attendance.filters.academicYear')}
              value={fAcademicYear}
              onChange={(v) => setFAcademicYear(v)}
              options={academicYears.map(y => ({ value: y.id, label: y.name }))}
              placeholder={t('attendance.filters.academicYearPlaceholder')}
              t={t}
            />
            <SelectField
              label={t('attendance.filters.term')}
              value={fTerm}
              onChange={setFTerm}
              options={terms.map(tm => ({ value: tm.id, label: tm.name }))}
              placeholder={t('attendance.filters.termPlaceholder')}
              disabled={!fAcademicYear}
              t={t}
            />
            <SelectField
              label={t('attendance.filters.schoolLevel')}
              value={fSchoolLevel}
              onChange={(v) => { setFSchoolLevel(v); setFClassLevel(''); }}
              options={myAssignments.school_levels.map(sl => ({ value: sl.id, label: sl.name }))}
              placeholder={t('attendance.filters.schoolLevelPlaceholder')}
              t={t}
            />
            <SelectField
              label={t('attendance.filters.classLevel')}
              value={fClassLevel}
              onChange={(v) => { setFClassLevel(v); setFClassroom(''); }}
              options={filteredClassLevels.map(cl => ({ value: cl.id, label: cl.name }))}
              placeholder={t('attendance.filters.classLevelPlaceholder')}
              disabled={!fSchoolLevel}
              t={t}
            />
            <SelectField
              label={t('attendance.filters.subject')}
              value={fSubject}
              onChange={setFSubject}
              options={filteredSubjects.map(s => ({ value: s.id, label: s.name }))}
              placeholder={t('attendance.filters.subjectPlaceholder')}
              t={t}
            />
            <SelectField
              label={t('attendance.filters.classroom')}
              value={fClassroom}
              onChange={setFClassroom}
              options={filteredClassrooms.map(cr => ({ value: cr.id, label: cr.name }))}
              placeholder={t('attendance.filters.classroomPlaceholder')}
              disabled={!fClassLevel}
              t={t}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowDownloadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 rounded-xl text-sm font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
          >
            <Download className="w-4 h-4" />
            {t('attendance.buttons.downloadTemplate')}
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all"
          >
            <Upload className="w-4 h-4" />
            {t('attendance.buttons.uploadAttendance')}
          </button>
          <button
            onClick={openTakeAttendanceModal}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-green-200 dark:shadow-green-900/30"
          >
            <Plus className="w-4 h-4" />
            {t('attendance.buttons.takeAttendance')}
          </button>
        </div>

        {/* Sessions List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-700 dark:text-green-500" />
              <h2 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t('attendance.sessions.title')}</h2>
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                {filteredSessions.length}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={t('attendance.sessions.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
              />
            </div>
          </div>

          {loadingSessions ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <Spinner />
              <p className="text-sm text-gray-400 dark:text-gray-500">{t('attendance.common.loading')}</p>
            </div>
          ) : paginatedSessions.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">{t('attendance.sessions.noSessions')}</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{t('attendance.sessions.noSessionsHint')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Present</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Absent</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Excused</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Late</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rate</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paginatedSessions.map((session) => {
                      const total = (session.present_count || 0) + (session.absent_count || 0) + (session.late_count || 0) + (session.excused_count || 0);
                      const rate = total > 0 ? ((session.present_count || 0) / total) * 100 : 0;
                      return (
                        <tr key={session.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                            {session.session_date || session.date
                              ? new Date(session.session_date || session.date).toLocaleDateString()
                              : 'Invalid Date'}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.subject_name}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{session.class_level_name}</td>
                          <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-semibold">{session.present_count || 0}</td>
                          <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-semibold">{session.absent_count || 0}</td>
                          <td className="px-4 py-3 text-center text-purple-600 dark:text-purple-400 font-semibold">{session.excused_count || 0}</td>
                          <td className="px-4 py-3 text-center text-yellow-600 dark:text-yellow-400 font-semibold">{session.late_count || 0}</td>
                          
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {rate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => viewSessionDetails(session)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title={t('attendance.actions.viewDetails')}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title={t('attendance.actions.delete')}
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
                  <span>{t('attendance.pagination.show')}</span>
                  <select
                    value={itemsPerPage}
                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-700 dark:focus:ring-green-500 bg-white dark:bg-gray-800"
                  >
                    {[5, 10, 25, 50].map(n => <option key={n}>{n}</option>)}
                  </select>
                  <span>{t('attendance.pagination.perPage')} · {filteredSessions.length} {t('attendance.pagination.total')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                    className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {t('attendance.pagination.first')}
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
                    {t('attendance.pagination.last')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── TAKE ATTENDANCE MODAL ──────────────────────────────── */}
        {showTakeAttendanceModal && (
          <ModalWrapper
            title={t('attendance.modals.takeAttendance.title')}
            subtitle={`${fSubject ? myAssignments.subjects.find(s => s.id == fSubject)?.name : ''} - ${classroomStudents.length} students`}
            onClose={() => { setShowTakeAttendanceModal(false); setManualAttendance({}); }}
            maxW="max-4xl"
            icon={UserCheck}
            t={t}
          >
            <div className="space-y-4">
              {/* Session Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('attendance.modals.takeAttendance.sessionDate')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('attendance.modals.takeAttendance.startTime')}
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('attendance.modals.takeAttendance.endTime')}
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('attendance.modals.takeAttendance.classroom')}
                  </label>
                  <input
                    type="text"
                    value={myAssignments.classrooms.find(c => c.id == fClassroom)?.name || ''}
                    disabled
                    className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('attendance.modals.takeAttendance.notes')}
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  placeholder={t('attendance.modals.takeAttendance.notesPlaceholder')}
                />
              </div>

              {/* Students Table */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Roll No</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Student Name</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {classroomStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 font-mono text-xs font-bold text-green-700 dark:text-green-400">
                          {student.roll_number}
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                          {student.full_name}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {ATTENDANCE_STATUSES.map((status) => {
                              const Icon = status.icon;
                              const isSelected = manualAttendance[student.id]?.status === status.value;
                              return (
                                <button
                                  key={status.value}
                                  onClick={() => handleStatusChange(student.id, status.value)}
                                  className={`p-1.5 rounded-lg transition-all ${isSelected
                                    ? `bg-${status.color}-100 text-${status.color}-600 dark:bg-${status.color}-900/30 dark:text-${status.color}-400 ring-2 ring-${status.color}-500`
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200'
                                    }`}
                                  title={t(`attendance.status.${status.value}`)}
                                >
                                  <Icon className="w-4 h-4" />
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={manualAttendance[student.id]?.remarks || ''}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            placeholder="Optional..."
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-green-700"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => { setShowTakeAttendanceModal(false); setManualAttendance({}); }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  {t('attendance.common.cancel')}
                </button>
                <button
                  onClick={handleSubmitAttendance}
                  disabled={submittingAttendance}
                  className="px-6 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingAttendance ? <Spinner size={4} /> : <Send className="w-4 h-4" />}
                  {submittingAttendance ? t('attendance.common.saving') : t('attendance.modals.takeAttendance.submit')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* ── UPLOAD MODAL ──────────────────────────────────────── */}
        {showUploadModal && (
          <ModalWrapper
            title={t('attendance.modals.upload.title')}
            subtitle={t('attendance.modals.upload.subtitle')}
            onClose={() => { setShowUploadModal(false); setUploadFile(null); }}
            maxW="max-w-xl"
            icon={Upload}
            t={t}
          >
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-green-200 dark:border-green-700 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all"
              >
                <FileSpreadsheet className="w-10 h-10 text-green-300 mx-auto mb-2" />
                {uploadFile ? (
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">{uploadFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('attendance.modals.upload.selectFile')}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('attendance.modals.upload.fileTypes')}</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => setUploadFile(e.target.files[0])} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label={t('attendance.modals.upload.academicYear')}
                  value={uAcademicYear}
                  onChange={(v) => setUAcademicYear(v)}
                  options={academicYears.map(y => ({ value: y.id, label: y.name }))}
                  required placeholder={t('attendance.modals.upload.selectYear')}
                  t={t}
                />
                <SelectField
                  label={t('attendance.modals.upload.term')}
                  value={uTerm}
                  onChange={setUTerm}
                  options={terms.map(tm => ({ value: tm.id, label: tm.name }))}
                  disabled={!uAcademicYear}
                  placeholder={t('attendance.modals.upload.selectTerm')}
                  t={t}
                />
                <SelectField
                  label={t('attendance.modals.upload.schoolLevel')}
                  value={uSchoolLevel}
                  onChange={(v) => setUSchoolLevel(v)}
                  options={myAssignments.school_levels.map(sl => ({ value: sl.id, label: sl.name }))}
                  required placeholder={t('attendance.modals.upload.selectLevel')}
                  t={t}
                />
                <SelectField
                  label={t('attendance.modals.upload.classLevel')}
                  value={uClassLevel}
                  onChange={setUClassLevel}
                  options={myAssignments.class_levels.map(cl => ({ value: cl.id, label: cl.name }))}
                  disabled={!uSchoolLevel}
                  required placeholder={t('attendance.modals.upload.selectClass')}
                  t={t}
                />
                <SelectField
                  label={t('attendance.modals.upload.subject')}
                  value={uSubject}
                  onChange={setUSubject}
                  options={myAssignments.subjects.map(s => ({ value: s.id, label: s.name }))}
                  required placeholder={t('attendance.modals.upload.selectSubject')}
                  t={t}
                />
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('attendance.modals.upload.sessionDate')}
                  </label>
                  <input
                    type="date"
                    value={uSessionDate}
                    onChange={(e) => setUSessionDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleUploadAttendance}
                  disabled={uploading}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? <Spinner size={4} /> : <Upload className="w-4 h-4" />}
                  {uploading ? t('attendance.modals.upload.uploading') : t('attendance.modals.upload.submit')}
                </button>
                <button
                  onClick={() => { setShowUploadModal(false); setUploadFile(null); }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold"
                >
                  {t('attendance.common.cancel')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* ── DOWNLOAD MODAL ────────────────────────────────────── */}
        {showDownloadModal && (
          <ModalWrapper
            title={t('attendance.modals.download.title')}
            subtitle={t('attendance.modals.download.subtitle')}
            onClose={() => setShowDownloadModal(false)}
            maxW="max-w-xl"
            icon={Download}
            t={t}
          >
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {t('attendance.modals.download.info')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label={t('attendance.modals.download.academicYear')}
                  value={dAcademicYear}
                  onChange={(v) => setDAcademicYear(v)}
                  options={academicYears.map(y => ({ value: y.id, label: y.name }))}
                  required placeholder={t('attendance.modals.download.selectYear')}
                  t={t}
                />
                <SelectField
                  label={t('attendance.modals.download.term')}
                  value={dTerm}
                  onChange={setDTerm}
                  options={terms.map(tm => ({ value: tm.id, label: tm.name }))}
                  disabled={!dAcademicYear}
                  placeholder={t('attendance.modals.download.selectTerm')}
                  t={t}
                />
                <SelectField
                  label={t('attendance.modals.download.schoolLevel')}
                  value={dSchoolLevel}
                  onChange={(v) => setDSchoolLevel(v)}
                  options={myAssignments.school_levels.map(sl => ({ value: sl.id, label: sl.name }))}
                  required placeholder={t('attendance.modals.download.selectLevel')}
                  t={t}
                />
                <SelectField
                  label={t('attendance.modals.download.classLevel')}
                  value={dClassLevel}
                  onChange={setDClassLevel}
                  options={myAssignments.class_levels.map(cl => ({ value: cl.id, label: cl.name }))}
                  disabled={!dSchoolLevel}
                  required placeholder={t('attendance.modals.download.selectClass')}
                  t={t}
                />
                <SelectField
                  label={t('attendance.modals.download.subject')}
                  value={dSubject}
                  onChange={setDSubject}
                  options={myAssignments.subjects.map(s => ({ value: s.id, label: s.name }))}
                  required placeholder={t('attendance.modals.download.selectSubject')}
                  t={t}
                />
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('attendance.modals.download.sessionDate')}
                  </label>
                  <input
                    type="date"
                    value={dSessionDate}
                    onChange={(e) => setDSessionDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleDownloadTemplate}
                  disabled={downloading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  {downloading ? <Spinner size={4} /> : <Download className="w-4 h-4" />}
                  {downloading ? t('attendance.modals.download.generating') : t('attendance.modals.download.download')}
                </button>
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold"
                >
                  {t('attendance.common.cancel')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* ── DETAIL MODAL ──────────────────────────────────────── */}
        {showDetailModal && selectedSession && (
          <ModalWrapper
            title={t('attendance.modals.detail.title')}
            subtitle={`${selectedSession.subject_name} - ${selectedSession.session_date || selectedSession.date ? new Date(selectedSession.session_date || selectedSession.date).toLocaleDateString() : 'Date not set'}`}
            onClose={() => { setShowDetailModal(false); setSelectedSession(null); }}
            maxW="max-4xl"
            icon={FileText}
            t={t}
          >
            <div className="space-y-4">
              {/* Session Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <InfoRow label="Subject" value={selectedSession.subject_name} icon={BookOpen} />
                <InfoRow label="Class" value={selectedSession.class_level_name} icon={GraduationCap} />
                <InfoRow label="Date" value={
                  selectedSession.session_date || selectedSession.date
                    ? new Date(selectedSession.session_date || selectedSession.date).toLocaleDateString()
                    : '—'
                } icon={Calendar} />
                <InfoRow label="Teacher" value={selectedSession.teacher_name} icon={UserCheck} />
                {selectedSession.start_time && <InfoRow label="Start Time" value={selectedSession.start_time} icon={ClockIcon} />}
                {selectedSession.end_time && <InfoRow label="End Time" value={selectedSession.end_time} icon={ClockIcon} />}
                {selectedSession.notes && <InfoRow label="Notes" value={selectedSession.notes} icon={Info} />}
              </div>

              {/* Attendance Records */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Attendance Records ({sessionAttendance.length})
                </h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Roll No</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Student Name</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Remarks</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {sessionAttendance.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-3 py-2 font-mono text-xs font-bold text-green-700 dark:text-green-400">
                            {record.student_roll}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                            {record.student_name}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <StatusBadge status={record.status} />
                          </td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">
                            {record.remarks || '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => openEditModal(record)}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Edit Record"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* ── EDIT MODAL ────────────────────────────────────────── */}
        {showEditModal && editingRecord && (
          <ModalWrapper
            title={t('attendance.modals.edit.title')}
            subtitle={`${editingRecord.student_name} - ${editingRecord.session_date}`}
            onClose={() => { setShowEditModal(false); setEditingRecord(null); }}
            maxW="max-md"
            icon={Edit}
            t={t}
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('attendance.modals.edit.status')} <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2 mt-2">
                  {ATTENDANCE_STATUSES.map((status) => {
                    const Icon = status.icon;
                    const isSelected = editStatus === status.value;
                    return (
                      <button
                        key={status.value}
                        onClick={() => setEditStatus(status.value)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isSelected
                          ? `bg-${status.color}-600 text-white`
                          : `bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-${status.color}-50`
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        {t(`attendance.status.${status.value}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('attendance.modals.edit.remarks')}
                </label>
                <textarea
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  placeholder={t('attendance.modals.edit.remarksPlaceholder')}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleEditAttendance}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all"
                >
                  {t('attendance.modals.edit.save')}
                </button>
                <button
                  onClick={() => { setShowEditModal(false); setEditingRecord(null); }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-all"
                >
                  {t('attendance.common.cancel')}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

      </div>
    </div>
  );
};

export default TeacherAttendanceManagement;

