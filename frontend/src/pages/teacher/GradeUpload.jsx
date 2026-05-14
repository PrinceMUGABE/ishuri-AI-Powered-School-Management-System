import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  FileSpreadsheet, ClipboardList, BookMarked, Upload, CheckCircle2,
  XCircle, Clock, Eye, Trash2, Edit, X, Search, RefreshCw,
  ChevronLeft, ChevronRight, Sun, Moon, Plus, AlertCircle,
  Download, Hash, Info, FileText, GraduationCap, AlertTriangle,
  CheckCheck, Check, Users, Calendar, BookOpen, Send,
  FilePlus2, Filter, BarChart2, Layers, UserCheck, UploadCloud
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// API CLIENT
// ─────────────────────────────────────────────────────────────
const API_BASE_URL = 'http://127.0.0.1:8000/api';

const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token    = localStorage.getItem('access_token');
  const language = localStorage.getItem('user_language') || 'en';
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  config.headers['X-Language'] = language;
  return config;
});

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const Spinner = ({ size = 'sm', color = 'white' }) => (
  <div className={`${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} border-2 ${color === 'white' ? 'border-white' : 'border-green-700'} border-t-transparent rounded-full animate-spin`} />
);

const PageSpinner = () => (
  <div className="flex justify-center items-center py-16">
    <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
  </div>
);

const STATUS_CONFIG = {
  pending:  { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',  Icon: Clock        },
  approved: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',  Icon: CheckCircle2 },
  rejected: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',           Icon: XCircle      },
  active:   { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',  Icon: CheckCircle2 },
  inactive: { cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',          Icon: XCircle      },
  expired:  { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',           Icon: AlertCircle  },
  present:  { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',  Icon: CheckCircle2 },
  absent:   { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',           Icon: XCircle      },
  late:     { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',  Icon: Clock        },
  excused:  { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',       Icon: Check        },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{status}
    </span>
  );
};

const handleApiError = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.response?.data?.detail || fallback;
  console.error('[TeacherAR] API Error:', err?.response?.data || err.message);
  toast.error(msg);
};

// ─────────────────────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────────────────────
const Modal = ({ children, maxW = 'max-w-lg' }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ${maxW} w-full max-h-[92vh] overflow-y-auto border border-green-100 dark:border-green-900/30`}>
      {children}
    </div>
  </div>
);

const ModalHeader = ({ icon: Icon, title, onClose, iconBg = 'bg-green-100 dark:bg-green-900/30', iconColor = 'text-green-700 dark:text-green-400' }) => (
  <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700/50 sticky top-0 bg-white dark:bg-gray-900 z-10">
    <div className="flex items-center gap-3">
      <div className={`p-2 ${iconBg} rounded-xl`}><Icon className={`w-4 h-4 ${iconColor}`} /></div>
      <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
    </div>
    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
      <X className="w-4 h-4 text-gray-500" />
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────
const StatCard = ({ label, value, from, to, icon: Icon }) => (
  <div className={`bg-gradient-to-br ${from} ${to} rounded-2xl p-4 text-white shadow-lg`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
        <p className="text-3xl font-bold">{value ?? 0}</p>
      </div>
      {Icon && <div className="p-2 bg-white/15 rounded-xl"><Icon className="w-5 h-5 text-white/90" /></div>}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// FILE DROP ZONE
// ─────────────────────────────────────────────────────────────
const FileDropZone = ({ accept, file, onChange, label, hint }) => {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
        ${dragging ? 'border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.01]' : 'border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10'}
        ${file ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => onChange(e.target.files[0])} />
      {file ? (
        <div className="flex items-center justify-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <FileText className="w-5 h-5 text-green-700" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400 truncate max-w-xs">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={e => { e.stopPropagation(); onChange(null); }}
            className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      ) : (
        <>
          <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${dragging ? 'text-green-600' : 'text-gray-400'}`} />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</p>
          {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
const StudentsGrades = () => {
  const { t } = useTranslation();
  const tk = (key) => t(`teacherAr.${key}`);

  // ── UI ────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('grades');
  const [loading, setLoading] = useState(false);

  // ── Dropdowns ─────────────────────────────────────────────
  const [academicYears,  setAcademicYears]  = useState([]);
  const [classLevels,    setClassLevels]    = useState([]);
  const [subjects,       setSubjects]       = useState([]);
  const [classrooms,     setClassrooms]     = useState([]);
  const [students,       setStudents]       = useState([]);

  // ── Grade state ───────────────────────────────────────────
  const [gradeUploads,   setGradeUploads]   = useState([]);
  const [gradeTotal,     setGradeTotal]     = useState(0);
  const [gradePage,      setGradePage]      = useState(1);
  const [gradeFilters,   setGradeFilters]   = useState({ class_level_id: '', status: '' });
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeForm,      setGradeForm]      = useState({ class_level_id: '', subject_id: '', academic_year_id: '', term: '' });
  const [gradeFile,      setGradeFile]      = useState(null);
  const [viewGrade,      setViewGrade]      = useState(null);

  // ── Attendance state ──────────────────────────────────────
  const [sessions,         setSessions]         = useState([]);
  const [attTotal,         setAttTotal]         = useState(0);
  const [attPage,          setAttPage]          = useState(1);
  const [attFilters,       setAttFilters]       = useState({ subject_id: '', date_from: '', date_to: '' });
  const [showAttModal,     setShowAttModal]     = useState(false);
  const [attForm,          setAttForm]          = useState({ class_level_id: '', subject_id: '', academic_year_id: '', classroom: '', date: '', start_time: '', end_time: '', notes: '' });
  const [attendanceRows,   setAttendanceRows]   = useState([]); // [{student_id, status, remarks}]
  const [loadingStudents,  setLoadingStudents]  = useState(false);
  const [viewSession,      setViewSession]      = useState(null);

  // ── Assignment state ──────────────────────────────────────
  const [assignments,      setAssignments]      = useState([]);
  const [assignTotal,      setAssignTotal]      = useState(0);
  const [assignPage,       setAssignPage]       = useState(1);
  const [assignFilters,    setAssignFilters]    = useState({ subject_id: '', status: '' });
  const [showAssignModal,  setShowAssignModal]  = useState(false);
  const [assignForm,       setAssignForm]       = useState({ class_level_id: '', subject_id: '', academic_year_id: '', title: '', description: '', instructions: '', due_date: '', total_marks: '' });
  const [pdfFile,          setPdfFile]          = useState(null);
  const [viewAssignment,   setViewAssignment]   = useState(null);
  const [deleteModal,      setDeleteModal]      = useState(null);

  const PAGE_SIZE = 10;

  const tabs = [
    { id: 'grades',      label: tk('tabs.grades'),      icon: FileSpreadsheet },
    { id: 'attendance',  label: tk('tabs.attendance'),  icon: ClipboardList   },
    { id: 'assignments', label: tk('tabs.assignments'), icon: BookMarked      },
  ];

  const inputCls  = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent text-sm outline-none transition-colors";
  const selectCls = `${inputCls} cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`;
  const labelCls  = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1";

  // ─────────────────────────────────────────────────────────
  // FETCH DROPDOWNS
  // ─────────────────────────────────────────────────────────
  const fetchDropdowns = useCallback(async () => {
    try {
      const [yrs, cls, subs, rooms] = await Promise.all([
        apiClient.get('/academics/academic-years/'),
        apiClient.get('/academics/class-levels/'),
        apiClient.get('/academics/subjects/'),
        apiClient.get('/academics/classrooms/'),
      ]);
      if (yrs.data.success)   setAcademicYears(yrs.data.data?.results   ?? yrs.data.data   ?? []);
      if (cls.data.success)   setClassLevels(cls.data.data?.results     ?? cls.data.data   ?? []);
      if (subs.data.success)  setSubjects(subs.data.data?.results       ?? subs.data.data  ?? []);
      if (rooms.data.success) setClassrooms(rooms.data.data?.results    ?? rooms.data.data ?? []);
    } catch (err) {
      console.error('[fetchDropdowns]', err);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // FETCH STUDENTS BY CLASS LEVEL
  // ─────────────────────────────────────────────────────────
  const fetchStudentsForClass = useCallback(async (classLevelId) => {
    if (!classLevelId) { setStudents([]); setAttendanceRows([]); return; }
    setLoadingStudents(true);
    try {
      const res = await apiClient.get(`/students/?class_level_id=${classLevelId}&status=active&page_size=200`);
      console.log('[fetchStudentsForClass] Response:', res.data);
      if (res.data.success) {
        const list = res.data.data?.results ?? res.data.data ?? [];
        setStudents(list);
        setAttendanceRows(list.map(s => ({ student_id: s.id, student_name: s.full_name, roll_number: s.roll_number, status: 'present', remarks: '' })));
      } else {
        toast.error(res.data.message || tk('messages.fetchError'));
      }
    } catch (err) {
      handleApiError(err, tk('messages.fetchError'));
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // FETCH GRADE UPLOADS (teacher's own)
  // ─────────────────────────────────────────────────────────
  const fetchGrades = useCallback(async () => {
    setLoading(true);
    try {
      // If filtered by class level, use specific endpoint
      let url = gradeFilters.class_level_id
        ? `/academics-records/grades/teacher/class/${gradeFilters.class_level_id}/`
        : `/academics-records/grades/teacher/`;

      const params = new URLSearchParams({ page: gradePage, page_size: PAGE_SIZE });
      if (gradeFilters.status) params.append('status', gradeFilters.status);

      const res = await apiClient.get(`${url}?${params}`);
      console.log('[fetchGrades] Response:', res.data);
      if (res.data.success) {
        const d = res.data.data;
        const results = d?.results ?? (Array.isArray(d) ? d : []);
        setGradeUploads(results);
        setGradeTotal(d?.count ?? results.length);
        toast.success(res.data.message || tk('messages.loaded'));
      } else {
        toast.error(res.data.message || tk('messages.fetchError'));
      }
    } catch (err) {
      handleApiError(err, tk('messages.fetchError'));
    } finally { setLoading(false); }
  }, [gradePage, gradeFilters]);

  // ─────────────────────────────────────────────────────────
  // UPLOAD GRADES
  // ─────────────────────────────────────────────────────────
  const handleUploadGrades = async () => {
    if (!gradeFile) { toast.error(tk('grades.noFile')); return; }
    if (!gradeForm.class_level_id || !gradeForm.subject_id || !gradeForm.academic_year_id) {
      toast.error(tk('messages.fillRequired')); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('excel_file',       gradeFile);
      fd.append('class_level_id',   gradeForm.class_level_id);
      fd.append('subject_id',       gradeForm.subject_id);
      fd.append('academic_year_id', gradeForm.academic_year_id);
      if (gradeForm.term) fd.append('term', gradeForm.term);

      const res = await apiClient.post('/academics-records/grades/upload/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('[handleUploadGrades] Response:', res.data);
      if (res.data.success) {
        toast.success(res.data.message || tk('grades.uploadSuccess'));
        setShowGradeModal(false);
        setGradeForm({ class_level_id: '', subject_id: '', academic_year_id: '', term: '' });
        setGradeFile(null);
        fetchGrades();
      } else {
        toast.error(res.data.message || tk('messages.createError'));
      }
    } catch (err) {
      handleApiError(err, tk('messages.createError'));
    } finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────
  // FETCH ATTENDANCE SESSIONS (teacher's own)
  // ─────────────────────────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      let url = attFilters.subject_id
        ? `/academics-records/attendance/teacher/subject/${attFilters.subject_id}/`
        : `/academics-records/attendance/teacher/`;

      const params = new URLSearchParams({ page: attPage, page_size: PAGE_SIZE });
      if (attFilters.date_from) params.append('date_from', attFilters.date_from);
      if (attFilters.date_to)   params.append('date_to',   attFilters.date_to);

      const res = await apiClient.get(`${url}?${params}`);
      console.log('[fetchAttendance] Response:', res.data);
      if (res.data.success) {
        const d = res.data.data;
        const results = d?.results ?? (Array.isArray(d) ? d : []);
        setSessions(results);
        setAttTotal(d?.count ?? results.length);
        toast.success(res.data.message || tk('messages.loaded'));
      } else {
        toast.error(res.data.message || tk('messages.fetchError'));
      }
    } catch (err) {
      handleApiError(err, tk('messages.fetchError'));
    } finally { setLoading(false); }
  }, [attPage, attFilters]);

  // ─────────────────────────────────────────────────────────
  // CREATE ATTENDANCE SESSION + RECORDS
  // ─────────────────────────────────────────────────────────
  const handleCreateAttendance = async () => {
    if (!attForm.class_level_id || !attForm.subject_id || !attForm.academic_year_id || !attForm.date) {
      toast.error(tk('messages.fillRequired')); return;
    }
    if (attendanceRows.length === 0) { toast.error(tk('attendance.noStudents')); return; }
    setLoading(true);
    try {
      const payload = {
        ...attForm,
        class_level:   Number(attForm.class_level_id),
        subject:       Number(attForm.subject_id),
        academic_year: Number(attForm.academic_year_id),
        classroom:     attForm.classroom ? Number(attForm.classroom) : null,
        records: attendanceRows.map(r => ({
          student:  r.student_id,
          status:   r.status,
          remarks:  r.remarks,
        })),
      };

      const res = await apiClient.post('/academics-records/attendance/create/', payload);
      console.log('[handleCreateAttendance] Response:', res.data);
      if (res.data.success) {
        toast.success(res.data.message || tk('attendance.createSuccess'));
        setShowAttModal(false);
        setAttForm({ class_level_id: '', subject_id: '', academic_year_id: '', classroom: '', date: '', start_time: '', end_time: '', notes: '' });
        setAttendanceRows([]);
        fetchAttendance();
      } else {
        toast.error(res.data.message || tk('messages.createError'));
      }
    } catch (err) {
      handleApiError(err, tk('messages.createError'));
    } finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────
  // SUBMIT ATTENDANCE SESSION
  // ─────────────────────────────────────────────────────────
  const handleSubmitSession = async (sessionId) => {
    setLoading(true);
    try {
      const res = await apiClient.post(`/academics-records/attendance/${sessionId}/submit/`);
      console.log('[handleSubmitSession] Response:', res.data);
      if (res.data.success) {
        toast.success(res.data.message || tk('attendance.submitSuccess'));
        fetchAttendance();
      } else {
        toast.error(res.data.message || tk('messages.updateError'));
      }
    } catch (err) {
      handleApiError(err, tk('messages.updateError'));
    } finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────
  // FETCH ASSIGNMENTS (teacher's own)
  // ─────────────────────────────────────────────────────────
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      let url = assignFilters.subject_id
        ? `/academics-records/assignments/teacher/subject/${assignFilters.subject_id}/`
        : `/academics-records/assignments/teacher/`;

      const params = new URLSearchParams({ page: assignPage, page_size: PAGE_SIZE });
      if (assignFilters.status) params.append('status', assignFilters.status);

      const res = await apiClient.get(`${url}?${params}`);
      console.log('[fetchAssignments] Response:', res.data);
      if (res.data.success) {
        const d = res.data.data;
        const results = d?.results ?? (Array.isArray(d) ? d : []);
        setAssignments(results);
        setAssignTotal(d?.count ?? results.length);
        toast.success(res.data.message || tk('messages.loaded'));
      } else {
        toast.error(res.data.message || tk('messages.fetchError'));
      }
    } catch (err) {
      handleApiError(err, tk('messages.fetchError'));
    } finally { setLoading(false); }
  }, [assignPage, assignFilters]);

  // ─────────────────────────────────────────────────────────
  // UPLOAD ASSIGNMENT
  // ─────────────────────────────────────────────────────────
  const handleUploadAssignment = async () => {
    if (!pdfFile) { toast.error(tk('assignments.noFile')); return; }
    if (!assignForm.class_level_id || !assignForm.subject_id || !assignForm.academic_year_id || !assignForm.title.trim()) {
      toast.error(tk('messages.fillRequired')); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('pdf_file',         pdfFile);
      fd.append('class_level_id',   assignForm.class_level_id);
      fd.append('subject_id',       assignForm.subject_id);
      fd.append('academic_year_id', assignForm.academic_year_id);
      fd.append('title',            assignForm.title);
      if (assignForm.description)  fd.append('description',  assignForm.description);
      if (assignForm.instructions) fd.append('instructions', assignForm.instructions);
      if (assignForm.due_date)     fd.append('due_date',     assignForm.due_date);
      if (assignForm.total_marks)  fd.append('total_marks',  assignForm.total_marks);

      const res = await apiClient.post('/academics-records/assignments/upload/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('[handleUploadAssignment] Response:', res.data);
      if (res.data.success) {
        toast.success(res.data.message || tk('assignments.uploadSuccess'));
        setShowAssignModal(false);
        setAssignForm({ class_level_id: '', subject_id: '', academic_year_id: '', title: '', description: '', instructions: '', due_date: '', total_marks: '' });
        setPdfFile(null);
        fetchAssignments();
      } else {
        toast.error(res.data.message || tk('messages.createError'));
      }
    } catch (err) {
      handleApiError(err, tk('messages.createError'));
    } finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteModal) return;
    setLoading(true);
    try {
      const url = deleteModal.type === 'assignment'
        ? `/academics-records/assignments/${deleteModal.id}/delete/`
        : `/academics-records/attendance/${deleteModal.id}/delete/`;
      const res = await apiClient.delete(url);
      console.log('[handleDelete] Response:', res.data);
      if (res.data.success) {
        toast.success(res.data.message || tk('messages.deleteSuccess'));
        setDeleteModal(null);
        if (deleteModal.type === 'assignment') fetchAssignments();
        else fetchAttendance();
      } else {
        toast.error(res.data.message || tk('messages.deleteError'));
      }
    } catch (err) {
      handleApiError(err, tk('messages.deleteError'));
    } finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────
  useEffect(() => { fetchDropdowns(); }, [fetchDropdowns]);
  useEffect(() => { if (activeTab === 'grades')      fetchGrades();      }, [activeTab, gradePage, gradeFilters]);
  useEffect(() => { if (activeTab === 'attendance')  fetchAttendance();  }, [activeTab, attPage,   attFilters]);
  useEffect(() => { if (activeTab === 'assignments') fetchAssignments(); }, [activeTab, assignPage, assignFilters]);

  // When class level changes in attendance form, load students
  useEffect(() => {
    if (showAttModal && attForm.class_level_id) {
      fetchStudentsForClass(attForm.class_level_id);
    }
  }, [attForm.class_level_id, showAttModal]);

  // ─────────────────────────────────────────────────────────
  // STATS (computed)
  // ─────────────────────────────────────────────────────────
  const stats = {
    grades: {
      total:    gradeTotal,
      pending:  gradeUploads.filter(g => g.status === 'pending').length,
      approved: gradeUploads.filter(g => g.status === 'approved').length,
      rejected: gradeUploads.filter(g => g.status === 'rejected').length,
    },
    attendance: {
      total:     attTotal,
      submitted: sessions.filter(s => s.is_submitted).length,
      pending:   sessions.filter(s => !s.is_submitted).length,
    },
    assignments: {
      total:   assignTotal,
      active:  assignments.filter(a => a.status === 'active').length,
      overdue: assignments.filter(a => a.is_overdue).length,
    },
  };

  // ─────────────────────────────────────────────────────────
  // PAGINATION
  // ─────────────────────────────────────────────────────────
  const total      = activeTab === 'grades' ? gradeTotal : activeTab === 'attendance' ? attTotal : assignTotal;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const curPage    = activeTab === 'grades' ? gradePage : activeTab === 'attendance' ? attPage : assignPage;
  const setCurPage = activeTab === 'grades' ? setGradePage : activeTab === 'attendance' ? setAttPage : setAssignPage;

  const Pagination = () => (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50 dark:bg-gray-800/50">
      <span className="text-sm text-gray-500">{tk('pagination.total')}: <strong className="text-green-700 dark:text-green-400">{total}</strong></span>
      <div className="flex items-center gap-1">
        <button onClick={() => setCurPage(1)} disabled={curPage === 1}
          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 disabled:opacity-40 transition-colors">{tk('pagination.first')}</button>
        <button onClick={() => setCurPage(p => Math.max(1, p-1))} disabled={curPage === 1}
          className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm px-3 text-gray-600 dark:text-gray-400">
          <strong className="text-green-700 dark:text-green-400">{curPage}</strong> / {totalPages}
        </span>
        <button onClick={() => setCurPage(p => Math.min(totalPages, p+1))} disabled={curPage >= totalPages}
          className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={() => setCurPage(totalPages)} disabled={curPage >= totalPages}
          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 disabled:opacity-40 transition-colors">{tk('pagination.last')}</button>
      </div>
    </div>
  );

  // ═════════════════════════════════════════════════════════
  //  GRADES TAB
  // ═════════════════════════════════════════════════════════
  const GradesTab = () => (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-2">
          <select value={gradeFilters.class_level_id} onChange={e => { setGradeFilters(p => ({ ...p, class_level_id: e.target.value })); setGradePage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none">
            <option value="">{tk('filters.allClasses')}</option>
            {classLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={gradeFilters.status} onChange={e => { setGradeFilters(p => ({ ...p, status: e.target.value })); setGradePage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none">
            <option value="">{tk('filters.allStatus')}</option>
            <option value="pending">{tk('status.pending')}</option>
            <option value="approved">{tk('status.approved')}</option>
            <option value="rejected">{tk('status.rejected')}</option>
          </select>
        </div>
        <button onClick={() => setShowGradeModal(true)}
          className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors">
          <UploadCloud className="w-4 h-4" />{tk('grades.upload')}
        </button>
      </div>

      {/* Stats mini-strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: tk('stats.total'),    val: stats.grades.total,    cls: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300',  border: 'border-gray-200 dark:border-gray-700' },
          { label: tk('stats.pending'),  val: stats.grades.pending,  cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/30' },
          { label: tk('stats.approved'), val: stats.grades.approved, cls: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-900/30' },
          { label: tk('stats.rejected'), val: stats.grades.rejected, cls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',       border: 'border-red-200 dark:border-red-900/30'   },
        ].map(({ label, val, cls, border }) => (
          <div key={label} className={`${cls} border ${border} rounded-xl p-3 text-center`}>
            <p className="text-xl font-bold">{val}</p>
            <p className="text-xs opacity-70 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/30">
              <tr>
                {[tk('grades.subject'), tk('grades.classLevel'), tk('grades.term'), tk('grades.year'), tk('grades.gradesCount'), tk('grades.status'), tk('grades.uploadedAt'), tk('table.actions')].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? <tr><td colSpan="8"><PageSpinner /></td></tr>
              : gradeUploads.length === 0 ? (
                <tr><td colSpan="8" className="py-12 text-center">
                  <FileSpreadsheet className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">{tk('messages.noData')}</p>
                  <button onClick={() => setShowGradeModal(true)} className="mt-2 text-green-700 dark:text-green-400 text-sm font-semibold hover:underline">{tk('actions.clickToUpload')}</button>
                </td></tr>
              ) : gradeUploads.map(g => (
                <tr key={g.id} className="hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white">{g.subject_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{g.class_level_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{g.term || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{g.academic_year_name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                      <Hash className="w-3 h-3" />{g.grade_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={g.status} />
                    {g.status === 'rejected' && g.rejection_reason && (
                      <p className="text-xs text-red-500 mt-1 max-w-32 truncate" title={g.rejection_reason}>
                        ↳ {g.rejection_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{g.created_at ? new Date(g.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setViewGrade(g)}
                      className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors" title={tk('actions.view')}>
                      <Eye className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination />
      </div>
    </div>
  );

  // ═════════════════════════════════════════════════════════
  //  ATTENDANCE TAB
  // ═════════════════════════════════════════════════════════
  const AttendanceTab = () => (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-2">
          <select value={attFilters.subject_id} onChange={e => { setAttFilters(p => ({ ...p, subject_id: e.target.value })); setAttPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none">
            <option value="">{tk('filters.allSubjects')}</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" value={attFilters.date_from}
            onChange={e => setAttFilters(p => ({ ...p, date_from: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none" />
          <input type="date" value={attFilters.date_to}
            onChange={e => setAttFilters(p => ({ ...p, date_to: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none" />
        </div>
        <button onClick={() => { setAttForm({ class_level_id: '', subject_id: '', academic_year_id: '', classroom: '', date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', notes: '' }); setAttendanceRows([]); setShowAttModal(true); }}
          className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors">
          <Plus className="w-4 h-4" />{tk('attendance.record')}
        </button>
      </div>

      {/* Stats mini-strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: tk('stats.total'),     val: stats.attendance.total,     cls: 'bg-gray-50 dark:bg-gray-800 text-gray-700', border: 'border-gray-200 dark:border-gray-700' },
          { label: tk('stats.submitted'), val: stats.attendance.submitted, cls: 'bg-green-50 dark:bg-green-900/20 text-green-700', border: 'border-green-200 dark:border-green-900/30' },
          { label: tk('stats.pending'),   val: stats.attendance.pending,   cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700', border: 'border-amber-200 dark:border-amber-900/30' },
        ].map(({ label, val, cls, border }) => (
          <div key={label} className={`${cls} border ${border} rounded-xl p-3 text-center`}>
            <p className="text-xl font-bold">{val}</p>
            <p className="text-xs opacity-70 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/30">
              <tr>
                {[tk('attendance.subject'), tk('attendance.classLevel'), tk('attendance.date'), tk('attendance.present'), tk('attendance.absent'), tk('attendance.late'), tk('attendance.submitted'), tk('table.actions')].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? <tr><td colSpan="8"><PageSpinner /></td></tr>
              : sessions.length === 0 ? (
                <tr><td colSpan="8" className="py-12 text-center">
                  <ClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">{tk('messages.noData')}</p>
                  <button onClick={() => setShowAttModal(true)} className="mt-2 text-green-700 dark:text-green-400 text-sm font-semibold hover:underline">{tk('actions.clickToAdd')}</button>
                </td></tr>
              ) : sessions.map(s => (
                <tr key={s.id} className="hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white">{s.subject_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{s.class_level_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{s.date}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 text-xs font-medium"><CheckCircle2 className="w-3 h-3" />{s.present_count ?? 0}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 text-xs font-medium"><XCircle className="w-3 h-3" />{s.absent_count ?? 0}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 text-xs font-medium"><Clock className="w-3 h-3" />{s.late_count ?? 0}</span></td>
                  <td className="px-4 py-3">
                    {s.is_submitted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 text-xs font-medium"><CheckCheck className="w-3 h-3" />{tk('attendance.yes')}</span>
                    ) : (
                      <button onClick={() => handleSubmitSession(s.id)} disabled={loading}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 text-xs font-medium transition-colors disabled:opacity-60">
                        <Send className="w-3 h-3" />{tk('attendance.submit')}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => setViewSession(s)}
                        className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors">
                        <Eye className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
                      </button>
                      {!s.is_submitted && (
                        <button onClick={() => setDeleteModal({ type: 'session', id: s.id })}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination />
      </div>
    </div>
  );

  // ═════════════════════════════════════════════════════════
  //  ASSIGNMENTS TAB
  // ═════════════════════════════════════════════════════════
  const AssignmentsTab = () => (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-2">
          <select value={assignFilters.subject_id} onChange={e => { setAssignFilters(p => ({ ...p, subject_id: e.target.value })); setAssignPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none">
            <option value="">{tk('filters.allSubjects')}</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={assignFilters.status} onChange={e => { setAssignFilters(p => ({ ...p, status: e.target.value })); setAssignPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none">
            <option value="">{tk('filters.allStatus')}</option>
            <option value="active">{tk('status.active')}</option>
            <option value="inactive">{tk('status.inactive')}</option>
            <option value="expired">{tk('status.expired')}</option>
          </select>
        </div>
        <button onClick={() => { setAssignForm({ class_level_id: '', subject_id: '', academic_year_id: '', title: '', description: '', instructions: '', due_date: '', total_marks: '' }); setPdfFile(null); setShowAssignModal(true); }}
          className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors">
          <FilePlus2 className="w-4 h-4" />{tk('assignments.upload')}
        </button>
      </div>

      {/* Stats mini-strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: tk('stats.total'),   val: stats.assignments.total,   cls: 'bg-gray-50 dark:bg-gray-800 text-gray-700',   border: 'border-gray-200 dark:border-gray-700' },
          { label: tk('stats.active'),  val: stats.assignments.active,  cls: 'bg-green-50 dark:bg-green-900/20 text-green-700', border: 'border-green-200 dark:border-green-900/30' },
          { label: tk('stats.overdue'), val: stats.assignments.overdue, cls: 'bg-red-50 dark:bg-red-900/20 text-red-600',    border: 'border-red-200 dark:border-red-900/30' },
        ].map(({ label, val, cls, border }) => (
          <div key={label} className={`${cls} border ${border} rounded-xl p-3 text-center`}>
            <p className="text-xl font-bold">{val}</p>
            <p className="text-xs opacity-70 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/30">
              <tr>
                {[tk('assignments.title'), tk('assignments.subject'), tk('assignments.classLevel'), tk('assignments.dueDate'), tk('assignments.totalMarks'), tk('assignments.status'), tk('table.actions')].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? <tr><td colSpan="7"><PageSpinner /></td></tr>
              : assignments.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center">
                  <BookMarked className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">{tk('messages.noData')}</p>
                  <button onClick={() => setShowAssignModal(true)} className="mt-2 text-green-700 dark:text-green-400 text-sm font-semibold hover:underline">{tk('actions.clickToUpload')}</button>
                </td></tr>
              ) : assignments.map(a => (
                <tr key={a.id} className={`hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-colors ${a.is_overdue ? 'bg-red-50/20 dark:bg-red-900/5' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{a.title}</p>
                    {a.is_overdue && <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium"><AlertTriangle className="w-3 h-3" />{tk('assignments.overdue')}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{a.subject_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{a.class_level_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{a.due_date || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{a.total_marks ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => setViewAssignment(a)}
                        className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors">
                        <Eye className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
                      </button>
                      {a.pdf_file && (
                        <a href={a.pdf_file} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </a>
                      )}
                      <button onClick={() => setDeleteModal({ type: 'assignment', id: a.id })}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination />
      </div>
    </div>
  );

  // ═════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{tk('title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{tk('subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
              if (activeTab === 'grades')      fetchGrades();
              if (activeTab === 'attendance')  fetchAttendance();
              if (activeTab === 'assignments') fetchAssignments();
            }} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-green-50 transition-colors shadow-sm">
              <RefreshCw className="w-4 h-4 text-green-700 dark:text-green-400" />
            </button>
            <button onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-green-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        </div>

        {/* ── Stats strip ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: tk('stats.gradeUploads'), value: gradeTotal,               from: 'from-green-700', to: 'to-green-900',   icon: FileSpreadsheet },
            { label: tk('stats.pending'),      value: stats.grades.pending,     from: 'from-amber-500', to: 'to-amber-700',   icon: Clock },
            { label: tk('stats.approved'),     value: stats.grades.approved,    from: 'from-green-500', to: 'to-green-700',   icon: CheckCircle2 },
            { label: tk('stats.sessions'),     value: attTotal,                 from: 'from-blue-600',  to: 'to-blue-800',    icon: ClipboardList },
            { label: tk('stats.submitted'),    value: stats.attendance.submitted,from:'from-teal-500',  to: 'to-teal-700',    icon: CheckCheck },
            { label: tk('stats.assignments'),  value: assignTotal,              from: 'from-purple-600',to: 'to-purple-800',  icon: BookMarked },
          ].map(({ label, value, from, to, icon }) => (
            <StatCard key={label} label={label} value={value} from={from} to={to} icon={icon} />
          ))}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 rounded-xl flex-1 justify-center
                  ${isActive ? 'bg-green-700 text-white shadow-md' : 'text-gray-500 hover:text-green-700 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/10'}`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ──────────────────────────────────────────── */}
        {activeTab === 'grades'      && <GradesTab />}
        {activeTab === 'attendance'  && <AttendanceTab />}
        {activeTab === 'assignments' && <AssignmentsTab />}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MODALS                                                     */}
        {/* ══════════════════════════════════════════════════════════ */}

        {/* ── Upload Grade Modal ───────────────────────────────────── */}
        {showGradeModal && (
          <Modal>
            <ModalHeader icon={UploadCloud} title={tk('grades.uploadTitle')} onClose={() => { setShowGradeModal(false); setGradeFile(null); }} />
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{tk('form.classLevel')} <span className="text-red-500">*</span></label>
                  <select value={gradeForm.class_level_id} onChange={e => setGradeForm(p => ({ ...p, class_level_id: e.target.value }))} className={selectCls}>
                    <option value="">— {tk('form.select')} —</option>
                    {classLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{tk('form.subject')} <span className="text-red-500">*</span></label>
                  <select value={gradeForm.subject_id} onChange={e => setGradeForm(p => ({ ...p, subject_id: e.target.value }))} className={selectCls}>
                    <option value="">— {tk('form.select')} —</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{tk('form.academicYear')} <span className="text-red-500">*</span></label>
                  <select value={gradeForm.academic_year_id} onChange={e => setGradeForm(p => ({ ...p, academic_year_id: e.target.value }))} className={selectCls}>
                    <option value="">— {tk('form.select')} —</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{tk('form.term')}</label>
                  <input type="text" value={gradeForm.term} onChange={e => setGradeForm(p => ({ ...p, term: e.target.value }))}
                    className={inputCls} placeholder={tk('placeholders.term')} />
                </div>
              </div>

              {/* Template hint */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">{tk('grades.templateNote')}</p>
                  <p>{tk('grades.requiredCols')}: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">roll_number</code>, <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">score</code></p>
                  <p className="mt-0.5">{tk('grades.optionalCols')}: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">max_score</code>, <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">grade_letter</code>, <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">remarks</code></p>
                </div>
              </div>

              <div>
                <label className={labelCls}>{tk('grades.excelFile')} <span className="text-red-500">*</span></label>
                <FileDropZone
                  accept=".xlsx,.xls"
                  file={gradeFile}
                  onChange={setGradeFile}
                  label={tk('grades.dropLabel')}
                  hint={tk('grades.dropHint')}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={handleUploadGrades} disabled={loading || !gradeFile}
                  className="flex-1 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
                  {loading ? <Spinner /> : <><UploadCloud className="w-4 h-4" />{tk('grades.uploadBtn')}</>}
                </button>
                <button onClick={() => { setShowGradeModal(false); setGradeFile(null); }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                  {tk('actions.cancel')}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── Record Attendance Modal ──────────────────────────────── */}
        {showAttModal && (
          <Modal maxW="max-w-2xl">
            <ModalHeader icon={ClipboardList} title={tk('attendance.recordTitle')} onClose={() => setShowAttModal(false)} />
            <div className="px-6 py-4 space-y-4">
              {/* Session details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{tk('form.classLevel')} <span className="text-red-500">*</span></label>
                  <select value={attForm.class_level_id} onChange={e => setAttForm(p => ({ ...p, class_level_id: e.target.value }))} className={selectCls}>
                    <option value="">— {tk('form.select')} —</option>
                    {classLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{tk('form.subject')} <span className="text-red-500">*</span></label>
                  <select value={attForm.subject_id} onChange={e => setAttForm(p => ({ ...p, subject_id: e.target.value }))} className={selectCls}>
                    <option value="">— {tk('form.select')} —</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{tk('form.academicYear')} <span className="text-red-500">*</span></label>
                  <select value={attForm.academic_year_id} onChange={e => setAttForm(p => ({ ...p, academic_year_id: e.target.value }))} className={selectCls}>
                    <option value="">— {tk('form.select')} —</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{tk('form.classroom')}</label>
                  <select value={attForm.classroom} onChange={e => setAttForm(p => ({ ...p, classroom: e.target.value }))} className={selectCls}>
                    <option value="">— {tk('form.optional')} —</option>
                    {classrooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{tk('form.date')} <span className="text-red-500">*</span></label>
                  <input type="date" value={attForm.date} onChange={e => setAttForm(p => ({ ...p, date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{tk('form.startTime')}</label>
                  <input type="time" value={attForm.start_time} onChange={e => setAttForm(p => ({ ...p, start_time: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{tk('form.endTime')}</label>
                  <input type="time" value={attForm.end_time} onChange={e => setAttForm(p => ({ ...p, end_time: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{tk('form.notes')}</label>
                  <input type="text" value={attForm.notes} onChange={e => setAttForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} placeholder={tk('placeholders.notes')} />
                </div>
              </div>

              {/* Student records */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls}>{tk('attendance.studentRecords')}</label>
                  {attendanceRows.length > 0 && (
                    <div className="flex gap-2">
                      <button onClick={() => setAttendanceRows(r => r.map(row => ({ ...row, status: 'present' })))}
                        className="text-xs px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors font-medium">
                        {tk('attendance.markAllPresent')}
                      </button>
                      <button onClick={() => setAttendanceRows(r => r.map(row => ({ ...row, status: 'absent' })))}
                        className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-medium">
                        {tk('attendance.markAllAbsent')}
                      </button>
                    </div>
                  )}
                </div>

                {loadingStudents ? (
                  <div className="flex justify-center py-6"><Spinner size="md" color="green" /></div>
                ) : !attForm.class_level_id ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm text-gray-400 border border-dashed border-gray-300 dark:border-gray-600">
                    <Info className="w-4 h-4 flex-shrink-0" />{tk('attendance.selectClassFirst')}
                  </div>
                ) : attendanceRows.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    {tk('attendance.noStudentsInClass')}
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{tk('attendance.student')}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{tk('attendance.status')}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{tk('attendance.remarks')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {attendanceRows.map((row, idx) => (
                          <tr key={row.student_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                            <td className="px-3 py-2">
                              <p className="text-xs font-semibold text-gray-800 dark:text-white">{row.student_name}</p>
                              <p className="text-xs text-gray-400 font-mono">{row.roll_number}</p>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                {['present', 'absent', 'late', 'excused'].map(s => (
                                  <button key={s} onClick={() => setAttendanceRows(rows => rows.map((r, i) => i === idx ? { ...r, status: s } : r))}
                                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors capitalize
                                      ${row.status === s
                                        ? s === 'present' ? 'bg-green-600 text-white'
                                          : s === 'absent' ? 'bg-red-600 text-white'
                                          : s === 'late' ? 'bg-amber-500 text-white'
                                          : 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                    {s[0].toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" value={row.remarks}
                                onChange={e => setAttendanceRows(rows => rows.map((r, i) => i === idx ? { ...r, remarks: e.target.value } : r))}
                                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-green-500"
                                placeholder={tk('placeholders.optional')} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={handleCreateAttendance} disabled={loading || attendanceRows.length === 0}
                  className="flex-1 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
                  {loading ? <Spinner /> : <><ClipboardList className="w-4 h-4" />{tk('attendance.saveBtn')}</>}
                </button>
                <button onClick={() => setShowAttModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                  {tk('actions.cancel')}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── Upload Assignment Modal ──────────────────────────────── */}
        {showAssignModal && (
          <Modal>
            <ModalHeader icon={FilePlus2} title={tk('assignments.uploadTitle')} onClose={() => { setShowAssignModal(false); setPdfFile(null); }} />
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{tk('form.classLevel')} <span className="text-red-500">*</span></label>
                  <select value={assignForm.class_level_id} onChange={e => setAssignForm(p => ({ ...p, class_level_id: e.target.value }))} className={selectCls}>
                    <option value="">— {tk('form.select')} —</option>
                    {classLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{tk('form.subject')} <span className="text-red-500">*</span></label>
                  <select value={assignForm.subject_id} onChange={e => setAssignForm(p => ({ ...p, subject_id: e.target.value }))} className={selectCls}>
                    <option value="">— {tk('form.select')} —</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{tk('form.academicYear')} <span className="text-red-500">*</span></label>
                  <select value={assignForm.academic_year_id} onChange={e => setAssignForm(p => ({ ...p, academic_year_id: e.target.value }))} className={selectCls}>
                    <option value="">— {tk('form.select')} —</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{tk('form.dueDate')}</label>
                  <input type="date" value={assignForm.due_date} onChange={e => setAssignForm(p => ({ ...p, due_date: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{tk('form.title')} <span className="text-red-500">*</span></label>
                <input type="text" value={assignForm.title} onChange={e => setAssignForm(p => ({ ...p, title: e.target.value }))}
                  className={inputCls} placeholder={tk('placeholders.title')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{tk('form.totalMarks')}</label>
                  <input type="number" value={assignForm.total_marks} onChange={e => setAssignForm(p => ({ ...p, total_marks: e.target.value }))}
                    className={inputCls} placeholder="e.g. 100" min="0" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{tk('form.description')}</label>
                <textarea value={assignForm.description} onChange={e => setAssignForm(p => ({ ...p, description: e.target.value }))}
                  className={inputCls} rows={2} placeholder={tk('placeholders.description')} />
              </div>
              <div>
                <label className={labelCls}>{tk('form.instructions')}</label>
                <textarea value={assignForm.instructions} onChange={e => setAssignForm(p => ({ ...p, instructions: e.target.value }))}
                  className={inputCls} rows={2} placeholder={tk('placeholders.instructions')} />
              </div>
              <div>
                <label className={labelCls}>{tk('assignments.pdfFile')} <span className="text-red-500">*</span></label>
                <FileDropZone
                  accept=".pdf"
                  file={pdfFile}
                  onChange={setPdfFile}
                  label={tk('assignments.dropLabel')}
                  hint={tk('assignments.dropHint')}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={handleUploadAssignment} disabled={loading || !pdfFile}
                  className="flex-1 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
                  {loading ? <Spinner /> : <><FilePlus2 className="w-4 h-4" />{tk('assignments.uploadBtn')}</>}
                </button>
                <button onClick={() => { setShowAssignModal(false); setPdfFile(null); }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                  {tk('actions.cancel')}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── View Grade Modal ─────────────────────────────────────── */}
        {viewGrade && (
          <Modal>
            <ModalHeader icon={FileSpreadsheet} title={tk('grades.viewTitle')} onClose={() => setViewGrade(null)} />
            <div className="px-6 pb-6 pt-4 space-y-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${viewGrade.status === 'approved' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30' : viewGrade.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'}`}>
                <StatusBadge status={viewGrade.status} />
                <span className="text-xs text-gray-500">{viewGrade.reviewed_by_name ? `${tk('grades.reviewedBy')}: ${viewGrade.reviewed_by_name}` : tk('grades.awaitingReview')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[[tk('grades.subject'), viewGrade.subject_name],[tk('grades.classLevel'), viewGrade.class_level_name],[tk('form.academicYear'), viewGrade.academic_year_name],[tk('form.term'), viewGrade.term||'—'],[tk('grades.gradesCount'), viewGrade.grade_count],[tk('grades.uploadedAt'), viewGrade.created_at ? new Date(viewGrade.created_at).toLocaleString() : '—']].map(([l,v]) => (
                  <div key={l} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">{l}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{v}</p>
                  </div>
                ))}
              </div>
              {viewGrade.rejection_reason && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-100 dark:border-red-900/30">
                  <p className="text-xs font-semibold text-red-600 mb-1">{tk('grades.rejectionReason')}</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{viewGrade.rejection_reason}</p>
                </div>
              )}
              {viewGrade.admin_notes && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-900/30">
                  <p className="text-xs font-semibold text-blue-600 mb-1">{tk('grades.adminNotes')}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">{viewGrade.admin_notes}</p>
                </div>
              )}
              <button onClick={() => setViewGrade(null)} className="w-full py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-colors">
                {tk('actions.close')}
              </button>
            </div>
          </Modal>
        )}

        {/* ── View Session Modal ───────────────────────────────────── */}
        {viewSession && (
          <Modal maxW="max-w-xl">
            <ModalHeader icon={ClipboardList} title={tk('attendance.viewTitle')} onClose={() => setViewSession(null)} />
            <div className="px-6 pb-6 pt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-900/30">
                  <p className="text-xl font-bold text-green-700">{viewSession.present_count ?? 0}</p>
                  <p className="text-xs text-gray-500">{tk('attendance.present')}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-100 dark:border-red-900/30">
                  <p className="text-xl font-bold text-red-600">{viewSession.absent_count ?? 0}</p>
                  <p className="text-xs text-gray-500">{tk('attendance.absent')}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-xl font-bold text-amber-600">{viewSession.late_count ?? 0}</p>
                  <p className="text-xs text-gray-500">{tk('attendance.late')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[[tk('attendance.subject'), viewSession.subject_name],[tk('attendance.classLevel'), viewSession.class_level_name],[tk('form.date'), viewSession.date],[tk('attendance.classroom'), viewSession.classroom_name||'—']].map(([l,v]) => (
                  <div key={l} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">{l}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{v}</p>
                  </div>
                ))}
              </div>
              {viewSession.records?.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {viewSession.records.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {r.student_name?.[0] ?? 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{r.student_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.student_roll}</p>
                      </div>
                      <StatusBadge status={r.status} />
                      {r.discipline_zone && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.discipline_zone === 'high' ? 'bg-green-100 text-green-700' : r.discipline_zone === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {r.discipline_zone}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setViewSession(null)} className="w-full py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-colors">
                {tk('actions.close')}
              </button>
            </div>
          </Modal>
        )}

        {/* ── View Assignment Modal ────────────────────────────────── */}
        {viewAssignment && (
          <Modal>
            <ModalHeader icon={BookMarked} title={tk('assignments.viewTitle')} onClose={() => setViewAssignment(null)} />
            <div className="px-6 pb-6 pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[[tk('assignments.subject'), viewAssignment.subject_name],[tk('assignments.classLevel'), viewAssignment.class_level_name],[tk('assignments.dueDate'), viewAssignment.due_date||'—'],[tk('assignments.totalMarks'), viewAssignment.total_marks??'—']].map(([l,v]) => (
                  <div key={l} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">{l}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{v}</p>
                  </div>
                ))}
              </div>
              {viewAssignment.description && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-600 mb-1">{tk('form.description')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{viewAssignment.description}</p>
                </div>
              )}
              {viewAssignment.instructions && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-600 mb-1">{tk('form.instructions')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{viewAssignment.instructions}</p>
                </div>
              )}
              {viewAssignment.pdf_file && (
                <a href={viewAssignment.pdf_file} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-medium transition-colors w-full justify-center">
                  <Download className="w-4 h-4" />{tk('assignments.downloadPdf')}
                </a>
              )}
              <button onClick={() => setViewAssignment(null)} className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-colors">
                {tk('actions.close')}
              </button>
            </div>
          </Modal>
        )}

        {/* ── Delete Modal ─────────────────────────────────────────── */}
        {deleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 border border-red-100 dark:border-red-900/30">
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{tk('delete.title')}</h2>
                <p className="text-sm text-gray-500 mb-1">{tk('delete.confirmation')}</p>
                <p className="text-xs text-gray-400 mb-5">{tk('delete.warning')}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleDelete} disabled={loading}
                  className="flex-1 px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-60 flex items-center justify-center gap-2 text-sm font-semibold transition-colors">
                  {loading ? <Spinner /> : <><Trash2 className="w-4 h-4" />{tk('actions.delete')}</>}
                </button>
                <button onClick={() => setDeleteModal(null)}
                  className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                  {tk('actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StudentsGrades;