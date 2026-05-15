import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, UserPlus, Edit, Trash2, Search, Eye, X,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  AlertCircle, Clock, Building2, GraduationCap,
  BookOpen, Calendar, Settings, Sun, Moon,
  Calendar as CalendarIcon, Clock as ClockIcon,
  Plus, Info, Filter, Mail, Phone, MapPin, Award,
  Download, Printer, FileText, BarChart3, PieChart,
  User, Briefcase, FolderOpen, List, Grid, Upload,
  Image as ImageIcon, File, ChevronDown, ChevronUp,
  ExternalLink, UserCheck, UserX, DollarSign, Star,
  TrendingUp, TrendingDown, Activity, Shield, Home,
  PhoneCall, MailOpen, Map, Cake, CalendarCheck as BirthDayIcon,
  BookMarked, School, ClipboardList, Target, Award as AwardIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// API Configuration
// ─────────────────────────────────────────────────────────────
const API_BASE_URL = 'http://127.0.0.1:8000/api/teachers';

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
});

// ─────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────
const Spinner = ({ size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <div className={`${sizeClass} border-2 border-current border-t-transparent rounded-full animate-spin`} />
  );
};

const getStatusBadge = (status) => {
  const colors = {
    active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    inactive:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    on_leave:  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  };
  return colors[status] || colors.inactive;
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString();
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const TeacherManagement = () => {
  const { t } = useTranslation();

  // ── UI State ──────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('teachers');
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    schoolLevel: '',
    academicYear: '',
    term: '',
    day: ''
  });

  // ── Modal State ───────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [activeTeacherTab, setActiveTeacherTab] = useState('profile');

  // ── Pagination ────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ── Data State ────────────────────────────────────────────
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [timetableData, setTimetableData] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [teacherDocuments, setTeacherDocuments] = useState([]);
  const [reportData, setReportData] = useState(null);

  // ── Form State ────────────────────────────────────────────
  const [newTeacher, setNewTeacher] = useState({
    first_name: '', last_name: '', middle_name: '', email: '', phone_number: '',
    address: '', gender: 'male', salary: '', work_hours_per_week: 40,
    education_level: 'bachelor', qualifications: '', birth_date: '', hire_date: new Date().toISOString().split('T')[0],
    status: 'active', bio: '', specialization_ids: []
  });
  const [editTeacher, setEditTeacher] = useState({});
  const [newAssignment, setNewAssignment] = useState({
    teacher: '', academic_year: '', term: '', school_level: '', class_level: '', subject: '', status: 'active', notes: ''
  });
  const [editAssignment, setEditAssignment] = useState({});

  // ── Dropdown Data ─────────────────────────────────────────
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [filteredClassLevels, setFilteredClassLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [filteredTerms, setFilteredTerms] = useState([]);
  const [terms, setTerms] = useState([]);

  // ── Stats ─────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total_teachers: 0, active_teachers: 0, inactive_teachers: 0, on_leave_teachers: 0,
    total_assignments: 0, active_assignments: 0, total_timetable_entries: 0
  });

  // ─────────────────────────────────────────────────────────
  // View Configuration
  // ─────────────────────────────────────────────────────────
  const views = [
    { id: 'teachers', label: t('teachers.tabs.teachers'), icon: Users, color: 'emerald' },
    { id: 'assignments', label: t('teachers.tabs.assignments'), icon: BookOpen, color: 'amber' },
    { id: 'timetable', label: t('teachers.tabs.timetable'), icon: Calendar, color: 'blue' },
    { id: 'reports', label: t('teachers.tabs.reports'), icon: BarChart3, color: 'purple' },
  ];

  // ─────────────────────────────────────────────────────────
  // Fetch Dropdown Data
  // ─────────────────────────────────────────────────────────
  const fetchDropdownData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const [schoolsRes, classesRes, subjectsRes, yearsRes, termsRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/academics/school-levels/', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://127.0.0.1:8000/api/academics/class-levels/', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://127.0.0.1:8000/api/academics/subjects/', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://127.0.0.1:8000/api/academics/academic-years/', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://127.0.0.1:8000/api/academics/terms/', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (schoolsRes.data.success) setSchoolLevels(schoolsRes.data.data);
      if (classesRes.data.success) setClassLevels(classesRes.data.data);
      if (subjectsRes.data.success) setSubjects(subjectsRes.data.data);
      if (yearsRes.data.success) setAcademicYears(yearsRes.data.data);
      if (termsRes.data.success) setTerms(termsRes.data.data);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      toast.error(t('teachers.errors.fetchDropdownFailed'));
    }
  };

  // ─────────────────────────────────────────────────────────
  // Fetch Main Data
  // ─────────────────────────────────────────────────────────
  const fetchTeachers = async () => {
    try {
      const response = await apiClient.get('/teachers/');
      if (response.data.success) {
        const teacherList = response.data.data;
        setTeachers(teacherList);
        setStats(prev => ({
          ...prev,
          total_teachers: teacherList.length,
          active_teachers: teacherList.filter(t => t.status === 'active').length,
          inactive_teachers: teacherList.filter(t => t.status === 'inactive').length,
          on_leave_teachers: teacherList.filter(t => t.status === 'on_leave').length,
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.errors.fetchTeachersFailed'));
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await apiClient.get('/assignments/');
      if (response.data.success) {
        setAssignments(response.data.data);
        setStats(prev => ({
          ...prev,
          total_assignments: response.data.data.length,
          active_assignments: response.data.data.filter(a => a.status === 'active').length,
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.errors.fetchAssignmentsFailed'));
    }
  };

  const fetchTimetable = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.academicYear) params.append('academic_year', filters.academicYear);
      if (filters.term) params.append('term', filters.term);
      const url = `/timetable/${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      if (response.data.success) {
        setTimetableData(response.data.data);
        if (response.data.data?.summary) {
          setStats(prev => ({
            ...prev,
            total_timetable_entries: response.data.data.summary.total_timetable_entries || 0
          }));
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.errors.fetchTimetableFailed'));
    }
  };

  const fetchHolidays = async () => {
    try {
      const response = await apiClient.get('/holidays/');
      if (response.data.success) setHolidays(response.data.data);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const fetchTeacherDocuments = async (teacherId) => {
    try {
      const response = await apiClient.get(`/teachers/${teacherId}/documents/`);
      if (response.data.success) setTeacherDocuments(response.data.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTeachers(),
      fetchAssignments(),
      fetchTimetable(),
      fetchHolidays()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchDropdownData();
    fetchAllData();
  }, []);

  // ─────────────────────────────────────────────────────────
  // Cascading Dropdown Handlers
  // ─────────────────────────────────────────────────────────
  const handleSchoolLevelChange = (schoolLevelId) => {
    const filtered = classLevels.filter(cl => cl.school_level === parseInt(schoolLevelId) && cl.is_active);
    setFilteredClassLevels(filtered);
    setNewAssignment(prev => ({ ...prev, school_level: schoolLevelId, class_level: '' }));
  };

  const handleAcademicYearChange = (academicYearId) => {
    const filtered = terms.filter(term => term.academic_year === parseInt(academicYearId));
    setFilteredTerms(filtered);
    setNewAssignment(prev => ({ ...prev, academic_year: academicYearId, term: '' }));
  };

  // ─────────────────────────────────────────────────────────
  // Filtered Data
  // ─────────────────────────────────────────────────────────
  const getFilteredTeachers = () => {
    let filtered = [...teachers];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.full_name?.toLowerCase().includes(term) ||
        t.email?.toLowerCase().includes(term) ||
        t.phone_number?.includes(term)
      );
    }
    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    return filtered;
  };

  const getFilteredAssignments = () => {
    let filtered = [...assignments];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.teacher_name?.toLowerCase().includes(term) ||
        a.subject_name?.toLowerCase().includes(term) ||
        a.class_level_name?.toLowerCase().includes(term)
      );
    }
    if (filters.status) {
      filtered = filtered.filter(a => a.status === filters.status);
    }
    if (filters.schoolLevel) {
      filtered = filtered.filter(a => a.school_level === parseInt(filters.schoolLevel));
    }
    return filtered;
  };

  const getTeacherAssignments = (teacherId) => {
    return assignments.filter(a => a.teacher === teacherId);
  };

  const getTeacherTimetable = (teacherId) => {
    if (!timetableData?.timetables) return {};
    const teacherTimetable = timetableData.timetables.find(tt => tt.teacher?.id === teacherId);
    return teacherTimetable?.timetable || {};
  };

  // ─────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────
  const handleCreateTeacher = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/teachers/', newTeacher);
      if (response.data.success) {
        toast.success(response.data.message || t('teachers.messages.createSuccess'));
        setShowAddModal(false);
        setNewTeacher({
          first_name: '', last_name: '', middle_name: '', email: '', phone_number: '',
          address: '', gender: 'male', salary: '', work_hours_per_week: 40,
          education_level: 'bachelor', qualifications: '', birth_date: '', hire_date: new Date().toISOString().split('T')[0],
          status: 'active', bio: '', specialization_ids: []
        });
        fetchTeachers();
      } else {
        toast.error(response.data.message || t('teachers.errors.createFailed'));
      }
    } catch (error) {
      const message = error.response?.data?.message || t('teachers.errors.createFailed');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeacher = async () => {
    setLoading(true);
    try {
      const response = await apiClient.put(`/teachers/${editTeacher.id}/`, editTeacher);
      if (response.data.success) {
        toast.success(response.data.message || t('teachers.messages.updateSuccess'));
        setShowEditModal(false);
        setEditTeacher({});
        fetchTeachers();
        if (selectedTeacher?.id === editTeacher.id) {
          setSelectedTeacher(response.data.data);
        }
      } else {
        toast.error(response.data.message || t('teachers.errors.updateFailed'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.errors.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async () => {
    setLoading(true);
    try {
      const response = await apiClient.delete(`/teachers/${selectedTeacher.id}/`);
      if (response.data.success) {
        toast.success(response.data.message || t('teachers.messages.deleteSuccess'));
        setShowDeleteModal(false);
        setSelectedTeacher(null);
        fetchTeachers();
        fetchAssignments();
      } else {
        toast.error(response.data.message || t('teachers.errors.deleteFailed'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    setLoading(true);
    try {
      const payload = {
        teacher: newAssignment.teacher,
        academic_year: newAssignment.academic_year,
        term: newAssignment.term,
        school_level: newAssignment.school_level,
        class_level: newAssignment.class_level,
        subject: newAssignment.subject,
        status: newAssignment.status || 'active',
        notes: newAssignment.notes || ''
      };
      const response = await apiClient.post('/assignments/', payload);
      if (response.data.success) {
        toast.success(response.data.message || t('teachers.messages.assignmentCreateSuccess'));
        setShowAddModal(false);
        setNewAssignment({
          teacher: '', academic_year: '', term: '', school_level: '', class_level: '', subject: '', status: 'active', notes: ''
        });
        setFilteredClassLevels([]);
        setFilteredTerms([]);
        fetchAssignments();
      } else {
        toast.error(response.data.message || t('teachers.errors.assignmentCreateFailed'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.errors.assignmentCreateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async () => {
    setLoading(true);
    try {
      const response = await apiClient.delete(`/assignments/${selectedAssignment.id}/`);
      if (response.data.success) {
        toast.success(response.data.message || t('teachers.messages.assignmentDeleteSuccess'));
        setShowDeleteModal(false);
        setSelectedAssignment(null);
        fetchAssignments();
      } else {
        toast.error(response.data.message || t('teachers.errors.assignmentDeleteFailed'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.errors.assignmentDeleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTimetable = async () => {
    setLoading(true);
    try {
      const payload = {
        academic_year: filters.academicYear || academicYears.find(y => y.is_current)?.id,
        term: filters.term || terms.find(t => t.is_current)?.id
      };
      if (!payload.academic_year || !payload.term) {
        toast.error(t('teachers.errors.selectYearAndTerm'));
        setLoading(false);
        return;
      }
      const response = await apiClient.post('/timetable/generate/', payload);
      if (response.data.success) {
        toast.success(response.data.message || t('teachers.messages.timetableGenerated'));
        fetchTimetable();
      } else {
        toast.error(response.data.message || t('teachers.errors.timetableGenerateFailed'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.errors.timetableGenerateFailed'));
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Pagination
  // ─────────────────────────────────────────────────────────
  const getCurrentData = () => {
    switch (activeView) {
      case 'teachers': return getFilteredTeachers();
      case 'assignments': return getFilteredAssignments();
      default: return [];
    }
  };

  const currentData = getCurrentData();
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const paginatedData = currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ─────────────────────────────────────────────────────────
  // Teacher Detail Modal
  // ─────────────────────────────────────────────────────────
  const TeacherDetailModal = () => {
    if (!selectedTeacher) return null;
    
    const teacherAssignments = getTeacherAssignments(selectedTeacher.id);
    const teacherTimetable = getTeacherTimetable(selectedTeacher.id);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const tabs = [
      { id: 'profile', label: t('teachers.detail.profile'), icon: User },
      { id: 'documents', label: t('teachers.detail.documents'), icon: FileText },
      { id: 'assignments', label: t('teachers.detail.assignments'), icon: BookOpen },
      { id: 'timetable', label: t('teachers.detail.timetable'), icon: Calendar },
    ];

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-emerald-700 to-teal-800 p-6 text-white">
            <button 
              onClick={() => setShowViewModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                {selectedTeacher.profile_picture_url ? (
                  <img src={selectedTeacher.profile_picture_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-white/70" />
                )}
              </div>
              
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{selectedTeacher.full_name}</h2>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-sm text-white/80">
                    <Mail className="w-3.5 h-3.5" /> {selectedTeacher.email}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-white/80">
                    <Phone className="w-3.5 h-3.5" /> {selectedTeacher.phone_number}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedTeacher.status)}`}>
                    {t(`teachers.status.${selectedTeacher.status}`)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 overflow-x-auto">
            {tabs.map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTeacherTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTeacherTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                    isActive 
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Profile Tab */}
            {activeTeacherTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    {t('teachers.detail.personalInfo')}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('teachers.form.firstName')}:</span>
                      <span className="font-medium">{selectedTeacher.first_name || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('teachers.form.lastName')}:</span>
                      <span className="font-medium">{selectedTeacher.last_name || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('teachers.form.gender')}:</span>
                      <span className="font-medium capitalize">{selectedTeacher.gender || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('teachers.form.birthDate')}:</span>
                      <span className="font-medium">{formatDate(selectedTeacher.birth_date)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('teachers.form.age')}:</span>
                      <span className="font-medium">{selectedTeacher.age || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('teachers.form.address')}:</span>
                      <span className="font-medium text-right">{selectedTeacher.address || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    {t('teachers.detail.professionalInfo')}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('teachers.form.educationLevel')}:</span>
                      <span className="font-medium capitalize">{selectedTeacher.education_level || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('teachers.form.salary')}:</span>
                      <span className="font-medium">{selectedTeacher.salary?.toLocaleString() || '—'} RWF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('teachers.form.workHoursPerWeek')}:</span>
                      <span className="font-medium">{selectedTeacher.work_hours_per_week || '—'} hrs</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('teachers.form.hireDate')}:</span>
                      <span className="font-medium">{formatDate(selectedTeacher.hire_date)}</span>
                    </div>
                  </div>
                </div>

                {selectedTeacher.specializations_detail?.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 col-span-full">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-600" />
                      {t('teachers.detail.specializations')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeacher.specializations_detail.map(spec => (
                        <span key={spec.id} className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs">
                          {spec.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTeacher.qualifications && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 col-span-full">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                      <AwardIcon className="w-4 h-4 text-emerald-600" />
                      {t('teachers.detail.qualifications')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTeacher.qualifications}</p>
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTeacherTab === 'documents' && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-emerald-600" />
                      {t('teachers.detail.documents')}
                    </h3>
                  </div>
                  
                  {teacherDocuments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>{t('teachers.detail.noDocuments')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {teacherDocuments.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                              <File className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{doc.title}</p>
                              <p className="text-xs text-gray-400">{doc.document_type}</p>
                            </div>
                          </div>
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                              <ExternalLink className="w-4 h-4 text-emerald-600" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assignments Tab */}
            {activeTeacherTab === 'assignments' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-800 dark:text-white">{t('teachers.detail.currentAssignments')}</h3>
                  <span className="text-sm text-gray-500">{teacherAssignments.length} {t('teachers.detail.assignments')}</span>
                </div>
                
                {teacherAssignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t('teachers.detail.noAssignments')}</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {teacherAssignments.map(assignment => (
                      <div key={assignment.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{assignment.subject_name}</p>
                            <p className="text-sm text-gray-500">{assignment.class_level_name}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(assignment.status)}`}>
                            {t(`teachers.status.${assignment.status}`)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <span className="text-gray-500">{t('teachers.form.schoolLevel')}:</span>
                            <span className="ml-2 font-medium">{assignment.school_level_name}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">{t('teachers.form.term')}:</span>
                            <span className="ml-2 font-medium">{assignment.term_name}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">{t('teachers.form.hoursPerWeek')}:</span>
                            <span className="ml-2 font-medium">{assignment.required_hours_per_week} hrs</span>
                          </div>
                          <div>
                            <span className="text-gray-500">{t('teachers.form.academicYear')}:</span>
                            <span className="ml-2 font-medium">{assignment.academic_year_name}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Timetable Tab */}
            {activeTeacherTab === 'timetable' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 dark:text-white">{t('teachers.detail.weeklyTimetable')}</h3>
                
                {Object.keys(teacherTimetable).length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t('teachers.detail.noTimetable')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 dark:bg-gray-800 rounded-xl">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{t('teachers.timetable.day')}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{t('teachers.timetable.startTime')}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{t('teachers.timetable.endTime')}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{t('teachers.timetable.subject')}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{t('teachers.timetable.classroom')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {days.map(day => {
                          const entries = teacherTimetable[day] || [];
                          if (entries.length === 0) return null;
                          return entries.map((entry, idx) => (
                            <tr key={`${day}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              {idx === 0 && (
                                <td className="px-3 py-2 text-sm font-medium" rowSpan={entries.length}>{day}</td>
                              )}
                              <td className="px-3 py-2 text-sm text-gray-600">{entry.start_time}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{entry.end_time}</td>
                              <td className="px-3 py-2 text-sm font-medium">{entry.subject_name}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{entry.classroom_name}</td>
                            </tr>
                          ));
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setEditTeacher(selectedTeacher);
                setShowEditModal(true);
                setShowViewModal(false);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              {t('teachers.actions.edit')}
            </button>
            <button
              onClick={() => setShowViewModal(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
            >
              {t('teachers.actions.close')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Render Table Rows
  // ─────────────────────────────────────────────────────────
  const renderTeacherRow = (teacher) => (
    <tr key={teacher.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
            {teacher.first_name?.[0]}{teacher.last_name?.[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{teacher.full_name}</p>
            <p className="text-xs text-gray-400">{teacher.user_info?.username}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{teacher.email}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{teacher.phone_number}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(teacher.status)}`}>
          {teacher.status === 'active' && <CheckCircle className="w-3 h-3" />}
          {teacher.status === 'inactive' && <AlertCircle className="w-3 h-3" />}
          {teacher.status === 'on_leave' && <Clock className="w-3 h-3" />}
          {t(`teachers.status.${teacher.status}`)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              setSelectedTeacher(teacher);
              setActiveTeacherTab('profile');
              fetchTeacherDocuments(teacher.id);
              setShowViewModal(true);
            }}
            className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors"
            title={t('teachers.actions.viewDetails')}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          </button>
          <button
            onClick={() => {
              setEditTeacher(teacher);
              setShowEditModal(true);
            }}
            className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
            title={t('teachers.actions.edit')}
          >
            <Edit className="w-3.5 h-3.5 text-amber-600" />
          </button>
          <button
            onClick={() => {
              setSelectedTeacher(teacher);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
            title={t('teachers.actions.delete')}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </td>
    </tr>
  );

  const renderAssignmentRow = (assignment) => (
    <tr key={assignment.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors group">
      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{assignment.teacher_name}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{assignment.subject_name}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{assignment.class_level_name}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{assignment.school_level_name}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{assignment.required_hours_per_week} hrs</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(assignment.status)}`}>
          {t(`teachers.status.${assignment.status}`)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              setSelectedAssignment(assignment);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </td>
    </tr>
  );

  // ─────────────────────────────────────────────────────────
  // Render Timetable View
  // ─────────────────────────────────────────────────────────
  const renderTimetableView = () => {
    if (!timetableData) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
          <Calendar className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">{t('teachers.timetable.noData')}</p>
          <button
            onClick={handleGenerateTimetable}
            disabled={loading}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? <Spinner /> : t('teachers.actions.generateTimetable')}
          </button>
        </div>
      );
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timetables = timetableData.timetables || [];

    if (timetables.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
          <Calendar className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
          <p className="text-gray-500">{t('teachers.timetable.noEntries')}</p>
          <button
            onClick={handleGenerateTimetable}
            className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-medium"
          >
            {t('teachers.actions.generateTimetable')}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {timetableData.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { label: t('teachers.timetable.totalTeachers'), value: timetableData.summary.total_teachers, color: 'emerald' },
              { label: t('teachers.timetable.withTimetable'), value: timetableData.summary.teachers_with_timetable, color: 'teal' },
              { label: t('teachers.timetable.totalEntries'), value: timetableData.summary.total_timetable_entries, color: 'amber' },
              { label: t('teachers.timetable.avgPerTeacher'), value: timetableData.summary.average_entries_per_teacher, color: 'orange' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-xl p-3 border border-${color}-100 dark:border-${color}-900/30`}>
                <p className={`text-xs text-${color}-600 dark:text-${color}-400 mb-1`}>{label}</p>
                <p className={`text-xl font-bold text-${color}-700 dark:text-${color}-300`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {timetables.map((tt, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 px-4 py-3 flex justify-between items-center">
              <div>
                <h3 className="text-white font-semibold">{tt.teacher.full_name}</h3>
                <p className="text-emerald-200 text-xs">
                  {tt.total_weekly_hours} {t('teachers.timetable.hoursPerWeek')} • {tt.total_entries} {t('teachers.timetable.entries')}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedTeacher(tt.teacher);
                  setActiveTeacherTab('timetable');
                  setShowViewModal(true);
                }}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-colors"
              >
                {t('teachers.actions.viewFull')}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {[t('teachers.timetable.day'), t('teachers.timetable.startTime'), t('teachers.timetable.endTime'),
                      t('teachers.timetable.subject'), t('teachers.timetable.classLevel'), t('teachers.timetable.classroom')].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {days.map(day => {
                    const entries = tt.timetable[day] || [];
                    if (entries.length === 0) return null;
                    return entries.map((entry, ei) => (
                      <tr key={`${day}-${ei}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        {ei === 0 && (
                          <td className="px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300" rowSpan={entries.length}>
                            {day}
                          </td>
                        )}
                        <td className="px-3 py-2 text-sm text-gray-600">{entry.start_time}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{entry.end_time}</td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-800 dark:text-white">{entry.subject_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{entry.class_level_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{entry.classroom_name}</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Render Reports View
  // ─────────────────────────────────────────────────────────
  const renderReportsView = () => {
    const generateReport = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/reports/');
        if (response.data.success) {
          setReportData(response.data.data);
          toast.success(t('teachers.messages.reportGenerated'));
        } else {
          toast.error(response.data.message || t('teachers.errors.reportFailed'));
        }
      } catch (error) {
        toast.error(t('teachers.errors.reportFailed'));
      } finally {
        setLoading(false);
      }
    };

    if (!reportData) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
          <BarChart3 className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{t('teachers.reports.title')}</h3>
          <p className="text-gray-500 mb-6">{t('teachers.reports.description')}</p>
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 inline-flex items-center gap-2"
          >
            {loading ? <Spinner /> : <><BarChart3 className="w-4 h-4" /> {t('teachers.actions.generateReport')}</>}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('teachers.stats.totalTeachers'), value: reportData.summary?.total_teachers || 0, color: 'emerald' },
            { label: t('teachers.stats.activeTeachers'), value: reportData.summary?.active_teachers || 0, color: 'teal' },
            { label: t('teachers.stats.totalAssignments'), value: reportData.summary?.total_assignments || 0, color: 'amber' },
            { label: t('teachers.stats.activeAssignments'), value: reportData.summary?.active_assignments || 0, color: 'orange' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-xl p-4`}>
              <p className={`text-xs text-${color}-600 dark:text-${color}-400 mb-1`}>{label}</p>
              <p className={`text-2xl font-bold text-${color}-700 dark:text-${color}-300`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-white">{t('teachers.reports.teachersList')}</h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">{t('teachers.table.fullName')}</th>
                  <th className="px-4 py-2 text-left">{t('teachers.table.email')}</th>
                  <th className="px-4 py-2 text-left">{t('teachers.table.phone')}</th>
                  <th className="px-4 py-2 text-left">{t('teachers.table.status')}</th>
                  <th className="px-4 py-2 text-left">{t('teachers.table.assignments')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {reportData.teachers?.map(teacher => {
                  const teacherAssignments = assignments.filter(a => a.teacher === teacher.id);
                  return (
                    <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-2 font-medium">{teacher.full_name}</td>
                      <td className="px-4 py-2 text-gray-500">{teacher.email}</td>
                      <td className="px-4 py-2 text-gray-500">{teacher.phone_number}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(teacher.status)}`}>
                          {t(`teachers.status.${teacher.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{teacherAssignments.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2)));
              link.setAttribute('download', `teacher_report_${new Date().toISOString().split('T')[0]}.json`);
              link.click();
              toast.success(t('teachers.messages.exportSuccess'));
            }}
            className="flex-1 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> {t('teachers.actions.downloadReport')}
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Printer className="w-4 h-4" /> {t('teachers.actions.printReport')}
          </button>
          <button
            onClick={() => setReportData(null)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium"
          >
            {t('teachers.actions.clear')}
          </button>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t('teachers.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('teachers.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-gray-500" />}
            </button>
            <button
              onClick={fetchAllData}
              className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: t('teachers.stats.totalTeachers'), value: stats.total_teachers, icon: Users, color: 'emerald' },
            { label: t('teachers.stats.activeTeachers'), value: stats.active_teachers, icon: UserCheck, color: 'green' },
            { label: t('teachers.stats.inactiveTeachers'), value: stats.inactive_teachers, icon: UserX, color: 'red' },
            { label: t('teachers.stats.onLeaveTeachers'), value: stats.on_leave_teachers, icon: Clock, color: 'amber' },
            { label: t('teachers.stats.totalAssignments'), value: stats.total_assignments, icon: BookOpen, color: 'blue' },
            { label: t('teachers.stats.timetableEntries'), value: stats.total_timetable_entries, icon: Calendar, color: 'purple' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`bg-gradient-to-br from-${color}-700 to-${color}-900 rounded-2xl p-4 text-white shadow-lg`}>
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5 opacity-80" />
                <p className="text-2xl font-bold">{value}</p>
              </div>
              <p className="text-xs font-medium opacity-80 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 flex gap-1 mb-6 overflow-x-auto">
          {views.map(view => {
            const Icon = view.icon;
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => {
                  setActiveView(view.id);
                  setCurrentPage(1);
                  setSearchTerm('');
                }}
                className={`px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 rounded-xl whitespace-nowrap flex-1 justify-center
                  ${isActive
                    ? `bg-${view.color}-700 text-white shadow-md`
                    : `text-gray-500 hover:text-${view.color}-700 dark:text-gray-400 dark:hover:text-${view.color}-400 hover:bg-${view.color}-50 dark:hover:bg-${view.color}-900/10`
                  }`}
              >
                <Icon className="w-4 h-4" /> <span>{view.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search and Filters */}
        {activeView !== 'timetable' && activeView !== 'reports' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('teachers.actions.search')}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-700 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {activeView === 'teachers' && (
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-700 focus:border-transparent outline-none"
                  >
                    <option value="">{t('teachers.filters.allStatus')}</option>
                    <option value="active">{t('teachers.status.active')}</option>
                    <option value="inactive">{t('teachers.status.inactive')}</option>
                    <option value="on_leave">{t('teachers.status.onLeave')}</option>
                    <option value="suspended">{t('teachers.status.suspended')}</option>
                  </select>
                )}
                {activeView === 'assignments' && (
                  <>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-700 outline-none"
                    >
                      <option value="">{t('teachers.filters.allStatus')}</option>
                      <option value="active">{t('teachers.status.active')}</option>
                      <option value="inactive">{t('teachers.status.inactive')}</option>
                      <option value="completed">{t('teachers.status.completed')}</option>
                    </select>
                    <select
                      value={filters.schoolLevel}
                      onChange={(e) => setFilters({ ...filters, schoolLevel: e.target.value })}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-700 outline-none"
                    >
                      <option value="">{t('teachers.filters.allSchoolLevels')}</option>
                      {schoolLevels.map(level => (
                        <option key={level.id} value={level.id}>{level.name}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timetable Filters */}
        {activeView === 'timetable' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.academicYear}
                onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-700 outline-none"
              >
                <option value="">{t('teachers.filters.allAcademicYears')}</option>
                {academicYears.map(year => (
                  <option key={year.id} value={year.id}>
                    {year.name} {year.is_current ? `(${t('teachers.filters.current')})` : ''}
                  </option>
                ))}
              </select>
              <select
                value={filters.term}
                onChange={(e) => setFilters({ ...filters, term: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-700 outline-none"
              >
                <option value="">{t('teachers.filters.allTerms')}</option>
                {terms
                  .filter(term => !filters.academicYear || term.academic_year === parseInt(filters.academicYear))
                  .map(term => (
                    <option key={term.id} value={term.id}>
                      {term.name} {term.is_current ? `(${t('teachers.filters.current')})` : ''}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleGenerateTimetable}
                disabled={loading}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {loading ? <Spinner /> : <><Calendar className="w-4 h-4" /> {t('teachers.actions.generateTimetable')}</>}
              </button>
            </div>
          </div>
        )}

        {/* Add Button */}
        {activeView !== 'timetable' && activeView !== 'reports' && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                if (activeView === 'teachers') {
                  setNewTeacher({
                    first_name: '', last_name: '', middle_name: '', email: '', phone_number: '',
                    address: '', gender: 'male', salary: '', work_hours_per_week: 40,
                    education_level: 'bachelor', qualifications: '', birth_date: '', hire_date: new Date().toISOString().split('T')[0],
                    status: 'active', bio: '', specialization_ids: []
                  });
                } else {
                  setNewAssignment({
                    teacher: '', academic_year: '', term: '', school_level: '', class_level: '', subject: '', status: 'active', notes: ''
                  });
                  setFilteredClassLevels([]);
                  setFilteredTerms([]);
                }
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              {activeView === 'teachers' ? t('teachers.actions.addTeacher') : t('teachers.actions.addAssignment')}
            </button>
          </div>
        )}

        {/* Main Content */}
        {loading && activeView !== 'timetable' && (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {activeView === 'teachers' && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('teachers.table.fullName')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('teachers.table.email')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('teachers.table.phone')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('teachers.table.status')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('teachers.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginatedData.map(renderTeacherRow)}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-12 text-center text-gray-400">
                        {t('teachers.messages.noTeachersFound')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {t('teachers.pagination.showing')} {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, currentData.length)} {t('teachers.pagination.of')} {currentData.length}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1.5 text-sm">{currentPage} / {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'assignments' && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('teachers.table.teacher')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('teachers.table.subject')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('teachers.table.classLevel')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('teachers.table.schoolLevel')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('teachers.table.hoursPerWeek')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('teachers.table.status')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('teachers.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginatedData.map(renderAssignmentRow)}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-12 text-center text-gray-400">
                        {t('teachers.messages.noAssignmentsFound')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {t('teachers.pagination.showing')} {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, currentData.length)} {t('teachers.pagination.of')} {currentData.length}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1.5 text-sm">{currentPage} / {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'timetable' && renderTimetableView()}
        {activeView === 'reports' && renderReportsView()}

        {/* Add Teacher Modal */}
        {showAddModal && activeView === 'teachers' && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-900 px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('teachers.actions.addTeacher')}</h2>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder={t('teachers.form.firstName')} value={newTeacher.first_name} onChange={e => setNewTeacher({...newTeacher, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                  <input type="text" placeholder={t('teachers.form.lastName')} value={newTeacher.last_name} onChange={e => setNewTeacher({...newTeacher, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <input type="text" placeholder={t('teachers.form.middleName')} value={newTeacher.middle_name} onChange={e => setNewTeacher({...newTeacher, middle_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                <input type="email" placeholder={t('teachers.form.email')} value={newTeacher.email} onChange={e => setNewTeacher({...newTeacher, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                <input type="tel" placeholder={t('teachers.form.phone')} value={newTeacher.phone_number} onChange={e => setNewTeacher({...newTeacher, phone_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                <textarea placeholder={t('teachers.form.address')} value={newTeacher.address} onChange={e => setNewTeacher({...newTeacher, address: e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                
                <select value={newTeacher.gender} onChange={e => setNewTeacher({...newTeacher, gender: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="male">{t('teachers.gender.male')}</option>
                  <option value="female">{t('teachers.gender.female')}</option>
                  <option value="other">{t('teachers.gender.other')}</option>
                </select>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('teachers.form.birthDate')}</label>
                    <input type="date" value={newTeacher.birth_date} onChange={e => setNewTeacher({...newTeacher, birth_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('teachers.form.hireDate')}</label>
                    <input type="date" value={newTeacher.hire_date} onChange={e => setNewTeacher({...newTeacher, hire_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder={t('teachers.form.salary')} value={newTeacher.salary} onChange={e => setNewTeacher({...newTeacher, salary: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                  <input type="number" placeholder={t('teachers.form.workHoursPerWeek')} value={newTeacher.work_hours_per_week} onChange={e => setNewTeacher({...newTeacher, work_hours_per_week: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                </div>
                
                <select value={newTeacher.education_level} onChange={e => setNewTeacher({...newTeacher, education_level: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="a2">{t('teachers.education.a2')}</option>
                  <option value="a1">{t('teachers.education.a1')}</option>
                  <option value="bachelor">{t('teachers.education.bachelor')}</option>
                  <option value="master">{t('teachers.education.master')}</option>
                  <option value="doctorate">{t('teachers.education.doctorate')}</option>
                  <option value="certificate">{t('teachers.education.certificate')}</option>
                </select>
                
                <textarea placeholder={t('teachers.form.qualifications')} value={newTeacher.qualifications} onChange={e => setNewTeacher({...newTeacher, qualifications: e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                
                <select value={newTeacher.status} onChange={e => setNewTeacher({...newTeacher, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="active">{t('teachers.status.active')}</option>
                  <option value="inactive">{t('teachers.status.inactive')}</option>
                  <option value="on_leave">{t('teachers.status.onLeave')}</option>
                  <option value="suspended">{t('teachers.status.suspended')}</option>
                </select>
                
                <textarea placeholder={t('teachers.form.bio')} value={newTeacher.bio} onChange={e => setNewTeacher({...newTeacher, bio: e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="sticky bottom-0 bg-white dark:bg-gray-900 px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button onClick={handleCreateTeacher} disabled={loading} className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl disabled:opacity-60 text-sm font-semibold transition-colors">
                  {loading ? <Spinner /> : t('teachers.actions.create')}
                </button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                  {t('teachers.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Assignment Modal with Cascading Dropdowns */}
        {showAddModal && activeView === 'assignments' && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="sticky top-0 bg-white dark:bg-gray-900 px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('teachers.actions.addAssignment')}</h2>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <select value={newAssignment.teacher} onChange={e => setNewAssignment({...newAssignment, teacher: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="">{t('teachers.form.selectTeacher')}</option>
                  {teachers.filter(t => t.status === 'active').map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
                
                <select value={newAssignment.academic_year} onChange={e => handleAcademicYearChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="">{t('teachers.form.selectAcademicYear')}</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.id}>
                      {year.name} {year.is_current ? `(${t('teachers.filters.current')})` : ''}
                    </option>
                  ))}
                </select>
                
                <select value={newAssignment.term} onChange={e => setNewAssignment({...newAssignment, term: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" disabled={!newAssignment.academic_year}>
                  <option value="">{newAssignment.academic_year ? t('teachers.form.selectTerm') : t('teachers.form.selectAcademicYearFirst')}</option>
                  {filteredTerms.map(term => (
                    <option key={term.id} value={term.id}>
                      {term.name} {term.is_current ? `(${t('teachers.filters.current')})` : ''}
                    </option>
                  ))}
                </select>
                
                <select value={newAssignment.school_level} onChange={e => handleSchoolLevelChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="">{t('teachers.form.selectSchoolLevel')}</option>
                  {schoolLevels.map(level => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </select>
                
                <select value={newAssignment.class_level} onChange={e => setNewAssignment({...newAssignment, class_level: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" disabled={!newAssignment.school_level}>
                  <option value="">{newAssignment.school_level ? t('teachers.form.selectClassLevel') : t('teachers.form.selectSchoolLevelFirst')}</option>
                  {filteredClassLevels.map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.name} ({cl.code})</option>
                  ))}
                </select>
                
                <select value={newAssignment.subject} onChange={e => setNewAssignment({...newAssignment, subject: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="">{t('teachers.form.selectSubject')}</option>
                  {subjects.filter(s => s.status === 'active').map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                
                <select value={newAssignment.status} onChange={e => setNewAssignment({...newAssignment, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="active">{t('teachers.status.active')}</option>
                  <option value="inactive">{t('teachers.status.inactive')}</option>
                  <option value="completed">{t('teachers.status.completed')}</option>
                </select>
                
                <textarea placeholder={t('teachers.form.notes')} value={newAssignment.notes} onChange={e => setNewAssignment({...newAssignment, notes: e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="sticky bottom-0 bg-white dark:bg-gray-900 px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button onClick={handleCreateAssignment} disabled={loading} className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl disabled:opacity-60 text-sm font-semibold transition-colors">
                  {loading ? <Spinner /> : t('teachers.actions.create')}
                </button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                  {t('teachers.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Teacher Modal */}
        {showEditModal && editTeacher && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-900 px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('teachers.actions.editTeacher')}</h2>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder={t('teachers.form.firstName')} value={editTeacher.first_name || ''} onChange={e => setEditTeacher({...editTeacher, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                  <input type="text" placeholder={t('teachers.form.lastName')} value={editTeacher.last_name || ''} onChange={e => setEditTeacher({...editTeacher, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <input type="text" placeholder={t('teachers.form.middleName')} value={editTeacher.middle_name || ''} onChange={e => setEditTeacher({...editTeacher, middle_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                <input type="email" placeholder={t('teachers.form.email')} value={editTeacher.email || ''} onChange={e => setEditTeacher({...editTeacher, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                <input type="tel" placeholder={t('teachers.form.phone')} value={editTeacher.phone_number || ''} onChange={e => setEditTeacher({...editTeacher, phone_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                <textarea placeholder={t('teachers.form.address')} value={editTeacher.address || ''} onChange={e => setEditTeacher({...editTeacher, address: e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                
                <select value={editTeacher.gender || 'male'} onChange={e => setEditTeacher({...editTeacher, gender: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="male">{t('teachers.gender.male')}</option>
                  <option value="female">{t('teachers.gender.female')}</option>
                  <option value="other">{t('teachers.gender.other')}</option>
                </select>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('teachers.form.birthDate')}</label>
                    <input type="date" value={editTeacher.birth_date || ''} onChange={e => setEditTeacher({...editTeacher, birth_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('teachers.form.hireDate')}</label>
                    <input type="date" value={editTeacher.hire_date || ''} onChange={e => setEditTeacher({...editTeacher, hire_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder={t('teachers.form.salary')} value={editTeacher.salary || ''} onChange={e => setEditTeacher({...editTeacher, salary: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                  <input type="number" placeholder={t('teachers.form.workHoursPerWeek')} value={editTeacher.work_hours_per_week || 40} onChange={e => setEditTeacher({...editTeacher, work_hours_per_week: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                </div>
                
                <select value={editTeacher.education_level || 'bachelor'} onChange={e => setEditTeacher({...editTeacher, education_level: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="a2">{t('teachers.education.a2')}</option>
                  <option value="a1">{t('teachers.education.a1')}</option>
                  <option value="bachelor">{t('teachers.education.bachelor')}</option>
                  <option value="master">{t('teachers.education.master')}</option>
                  <option value="doctorate">{t('teachers.education.doctorate')}</option>
                  <option value="certificate">{t('teachers.education.certificate')}</option>
                </select>
                
                <textarea placeholder={t('teachers.form.qualifications')} value={editTeacher.qualifications || ''} onChange={e => setEditTeacher({...editTeacher, qualifications: e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
                
                <select value={editTeacher.status || 'active'} onChange={e => setEditTeacher({...editTeacher, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="active">{t('teachers.status.active')}</option>
                  <option value="inactive">{t('teachers.status.inactive')}</option>
                  <option value="on_leave">{t('teachers.status.onLeave')}</option>
                  <option value="suspended">{t('teachers.status.suspended')}</option>
                </select>
                
                <textarea placeholder={t('teachers.form.bio')} value={editTeacher.bio || ''} onChange={e => setEditTeacher({...editTeacher, bio: e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="sticky bottom-0 bg-white dark:bg-gray-900 px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button onClick={handleUpdateTeacher} disabled={loading} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl disabled:opacity-60 text-sm font-semibold transition-colors">
                  {loading ? <Spinner /> : t('teachers.actions.update')}
                </button>
                <button onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                  {t('teachers.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (selectedTeacher || selectedAssignment) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{t('teachers.delete.title')}</h2>
                <p className="text-gray-500 text-sm mb-3">{t('teachers.delete.confirmation')}</p>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-3">
                  {selectedTeacher?.full_name || selectedAssignment?.teacher_name}
                </p>
                <p className="text-xs text-gray-400">{t('teachers.delete.warning')}</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={selectedTeacher ? handleDeleteTeacher : handleDeleteAssignment} disabled={loading} className="flex-1 px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors">
                  {loading ? <Spinner /> : <><Trash2 className="w-4 h-4" /> {t('teachers.actions.delete')}</>}
                </button>
                <button onClick={() => { setShowDeleteModal(false); setSelectedTeacher(null); setSelectedAssignment(null); }} className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                  {t('teachers.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherManagement;