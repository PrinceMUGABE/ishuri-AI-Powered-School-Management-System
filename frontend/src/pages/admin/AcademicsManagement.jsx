import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Calendar, School, BookOpen, Users, CreditCard,
  Plus, Edit, Trash2, Search, Eye, X,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  AlertCircle, Clock, Building2, GraduationCap,
  LayoutGrid, ClipboardList, Wallet, TrendingUp,
  DollarSign, Info, Filter, Download, Printer,
  Sun, Moon, ChevronDown, Bell, User, Settings, LogOut,
  SlidersHorizontal, BarChart3, Layers, Hash,
  Tag, Repeat, SunMedium, CalendarDays, Timer, Coffee,
  Utensils, Gift, Calendar as CalendarIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── API Configuration ────────────────────────────────────────────────────────
const API_BASE_URL = 'http://127.0.0.1:8000/api/academics';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  const language = localStorage.getItem('user_language') || 'en';
  config.headers['X-Language'] = language;
  return config;
});

// ─── Helper Components ─────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const statusMap = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    current: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };
  const iconMap = {
    active: <CheckCircle className="w-3 h-3" />,
    inactive: <AlertCircle className="w-3 h-3" />,
    current: <CheckCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusMap[status] || statusMap.inactive}`}>
      {iconMap[status]}
      {status}
    </span>
  );
};

const ActionBtn = ({ onClick, title, color, Icon }) => (
  <button onClick={onClick} title={title} className={`p-1.5 rounded-lg transition-all ${color}`}>
    <Icon className="w-3.5 h-3.5" />
  </button>
);

// ─── School Level Hours Badge ─────────────────────────────────────────────────
const HoursBadge = ({ startTime, endTime }) => {
  if (!startTime && !endTime) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
      <Clock className="w-3 h-3" />
      {startTime || '?'} – {endTime || '?'}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AcademicsManagement = () => {
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('academic-years');
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Data states
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [daySettings, setDaySettings] = useState([]);
  const [classroomAssignments, setClassroomAssignments] = useState([]);
  const [schoolBreaks, setSchoolBreaks] = useState([]);
  const [holidays, setHolidays] = useState([]);

  // Additional data for cascading dropdowns
  const [filteredClassLevels, setFilteredClassLevels] = useState([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState([]);
  const [classroomAssignmentDetails, setClassroomAssignmentDetails] = useState({});

  // Form states
  const [newItem, setNewItem] = useState({});
  const [editItem, setEditItem] = useState({});

  // Stats
  const [dashboardStats, setDashboardStats] = useState({
    total_school_levels: 0,
    total_class_levels: 0,
    total_classrooms: 0,
    total_subjects: 0,
    total_assignments: 0,
    total_fee_structures: 0,
    total_terms: 0,
    total_day_settings: 0,
    total_breaks: 0,
    current_academic_year: null,
    current_term: null,
  });

  // Tab configuration
  const tabs = [
    { id: 'academic-years', labelKey: 'academics.tabs.academicYears', icon: Calendar },
    { id: 'terms', labelKey: 'academics.tabs.terms', icon: Timer },
    { id: 'school-levels', labelKey: 'academics.tabs.schoolLevels', icon: Building2 },
    { id: 'class-levels', labelKey: 'academics.tabs.classLevels', icon: GraduationCap },
    { id: 'classrooms', labelKey: 'academics.tabs.classrooms', icon: LayoutGrid },
    { id: 'subjects', labelKey: 'academics.tabs.subjects', icon: BookOpen },
    { id: 'assignments', labelKey: 'academics.tabs.assignments', icon: ClipboardList },
    { id: 'payment-types', labelKey: 'academics.tabs.paymentTypes', icon: Tag },
    { id: 'costs', labelKey: 'academics.tabs.feeStructures', icon: Wallet },
    { id: 'day-settings', labelKey: 'academics.tabs.daySettings', icon: SunMedium },
    { id: 'classroom-assignments', labelKey: 'academics.tabs.classroomAssignments', icon: CalendarDays },
    { id: 'school-breaks', labelKey: 'academics.tabs.schoolBreaks', icon: Coffee },
    { id: 'holidays', labelKey: 'academics.tabs.holidays', icon: Gift },  // Add this line
  ];

  const currentTabInfo = tabs.find(tab => tab.id === activeTab);

  // ─── Helper: get selected school level's hours (for breaks form hint) ───────
  const getSelectedSchoolLevelHours = (schoolLevelId) => {
    if (!schoolLevelId) return null;
    const sl = schoolLevels.find(s => s.id === parseInt(schoolLevelId));
    if (!sl || (!sl.start_time && !sl.end_time)) return null;
    return { start_time: sl.start_time, end_time: sl.end_time, name: sl.name };
  };

  // ── Fetch dashboard stats ──────────────────────────────────────────────────
  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/dashboard/stats/');
      if (response.data.success) {
        const stats = response.data.data;
        setDashboardStats({ ...stats, total_breaks: schoolBreaks.length });
      }
    } catch (error) {
      console.error('[Dashboard Stats Error]', error);
    }
  }, [schoolBreaks.length]);

  // ── Fetch dropdown data ────────────────────────────────────────────────────
  const fetchDropdownData = useCallback(async () => {
    try {
      const [slRes, clRes, subRes, ayRes, ptRes, termRes, crRes] = await Promise.all([
        apiClient.get('/school-levels/'),
        apiClient.get('/class-levels/'),
        apiClient.get('/subjects/'),
        apiClient.get('/academic-years/'),
        apiClient.get('/payment-types/'),
        apiClient.get('/terms/'),
        apiClient.get('/class-rooms/'),
      ]);

      const extract = (res) => {
        const d = res.data?.data;
        return d?.results ?? d ?? [];
      };

      if (slRes.data.success) setSchoolLevels(extract(slRes));
      if (clRes.data.success) setClassLevels(extract(clRes));
      if (subRes.data.success) setSubjects(extract(subRes));
      if (ayRes.data.success) setAcademicYears(extract(ayRes));
      if (ptRes.data.success) setPaymentTypes(extract(ptRes));
      if (termRes.data.success) setTerms(extract(termRes));
      if (crRes.data.success) setClassrooms(extract(crRes));
    } catch (error) {
      console.error('[Dropdown Data Error]', error);
    }
  }, []);

  // ── Fetch classroom assignment details ────────────────────────────────────
  const fetchClassroomAssignmentDetails = useCallback(async () => {
    try {
      const response = await apiClient.get('/classroom-assignments/');
      if (response.data.success) {
        const asgns = response.data.data;
        const details = {};
        asgns.forEach(a => {
          details[a.classroom] = {
            class_level_name: a.class_level_name,
            class_level_id: a.class_level,
            term_name: a.term_name,
            term_id: a.term,
            academic_year_name: a.academic_year_name,
            is_primary: a.is_primary,
          };
        });
        setClassroomAssignmentDetails(details);
      }
    } catch (error) {
      console.error('[Classroom Assignment Details Error]', error);
    }
  }, []);

  // ── Fetch tab data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const toastId = `fetch-${activeTab}`;
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const urlMap = {
        'academic-years': '/academic-years/',
        'terms': '/terms/',
        'school-levels': '/school-levels/',
        'class-levels': '/class-levels/',
        'classrooms': '/class-rooms/',
        'subjects': '/subjects/',
        'assignments': '/class-level-subjects/',
        'payment-types': '/payment-types/',
        'costs': '/class-level-costs/',
        'day-settings': '/day-settings/',
        'classroom-assignments': '/classroom-assignments/',
        'school-breaks': '/school-breaks/',
        'holidays': '/holidays/',  // Add this line
      };

      const url = `${urlMap[activeTab]}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await apiClient.get(url);

      if (response.data.success) {
        const raw = response.data.data;
        const results = raw?.results ?? raw ?? [];

        const setters = {
          'academic-years': setAcademicYears,
          'terms': setTerms,
          'school-levels': setSchoolLevels,
          'class-levels': setClassLevels,
          'classrooms': setClassrooms,
          'subjects': setSubjects,
          'assignments': setAssignments,
          'payment-types': setPaymentTypes,
          'costs': setCosts,
          'day-settings': setDaySettings,
          'classroom-assignments': setClassroomAssignments,
          'school-breaks': setSchoolBreaks,
          'holidays': setHolidays,  // Add this line
        };
        setters[activeTab]?.(results);

        toast.success(
          response.data.message || t('academics.messages.dataLoaded', { count: results.length }),
          { id: toastId, duration: 2000 }
        );
      } else {
        toast.error(response.data.message || t('academics.messages.fetchError'), { id: toastId });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('academics.messages.fetchError'), { id: toastId });
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, t]);

  // ── Cascading dropdown handlers ───────────────────────────────────────────
  const handleSchoolLevelChange = (schoolLevelId) => {
    const filtered = classLevels.filter(cl => cl.school_level === parseInt(schoolLevelId));
    setFilteredClassLevels(filtered);
    setNewItem({ ...newItem, school_level: schoolLevelId, class_level: '', classroom: '' });
    if (newItem.term) {
      const available = classrooms.filter(c =>
        !classroomAssignments.some(a => a.classroom === c.id && a.term === parseInt(newItem.term))
      );
      setFilteredClassrooms(available);
    } else {
      setFilteredClassrooms([]);
    }
  };

  const handleClassLevelChange = (classLevelId) => {
    const available = classrooms.filter(c =>
      !classroomAssignments.some(a => a.classroom === c.id && a.term === parseInt(newItem.term))
    );
    setFilteredClassrooms(available);
    setNewItem({ ...newItem, class_level: classLevelId, classroom: '' });
  };

  const handleTermChange = (termId) => {
    const available = classrooms.filter(c =>
      !classroomAssignments.some(a => a.classroom === c.id && a.term === parseInt(termId))
    );
    setFilteredClassrooms(available);
    setNewItem({ ...newItem, term: termId });
  };

  const handleAcademicYearChange = (academicYearId) => {
    setNewItem({ ...newItem, academic_year: academicYearId, term: '', class_level: '', classroom: '' });
    setFilteredClassLevels(classLevels);
    setFilteredClassrooms([]);
  };

  useEffect(() => {
    fetchDropdownData();
    fetchDashboardStats();
    fetchClassroomAssignmentDetails();
  }, []);

  useEffect(() => {
    fetchData();
    setCurrentPage(1);
  }, [activeTab]);

  // ── Client-side filtering & pagination ────────────────────────────────────
  const filterData = (data) => {
    if (!searchTerm) return data;
    const sl = searchTerm.toLowerCase();
    return data.filter(item =>
      Object.values(item).some(v => v && String(v).toLowerCase().includes(sl))
    );
  };

  const dataMap = {
    'academic-years': academicYears, 'terms': terms, 'school-levels': schoolLevels,
    'class-levels': classLevels, 'classrooms': classrooms, 'subjects': subjects,
    'assignments': assignments, 'payment-types': paymentTypes, 'costs': costs,
    'day-settings': daySettings, 'classroom-assignments': classroomAssignments,
    'school-breaks': schoolBreaks, 'holidays': holidays,  // Add this line
  };

  const rawData = dataMap[activeTab] ?? [];
  const filteredData = filterData(rawData);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setLoading(true);
    try {
      const urlMap = {
        'academic-years': '/academic-years/', 'terms': '/terms/',
        'school-levels': '/school-levels/', 'class-levels': '/class-levels/',
        'classrooms': '/class-rooms/', 'subjects': '/subjects/',
        'assignments': '/class-level-subjects/', 'payment-types': '/payment-types/',
        'costs': '/class-level-costs/', 'day-settings': '/day-settings/',
        'classroom-assignments': '/classroom-assignments/', 'school-breaks': '/school-breaks/',
        'holidays': '/holidays/',  // Add this line
      };

      const payload = { ...newItem };
      if (activeTab === 'classrooms' && !payload.status) payload.status = 'active';
      if (activeTab === 'subjects' && !payload.status) payload.status = 'active';
      if (activeTab === 'payment-types') payload.is_active = true;
      if (activeTab === 'day-settings') payload.is_active = true;
      if (activeTab === 'school-breaks') payload.is_active = true;

      const response = await apiClient.post(urlMap[activeTab], payload);
      if (response.data.success) {
        toast.success(response.data.message || t('academics.messages.createSuccess'));
        setShowAddModal(false);
        setNewItem({});
        fetchData();
        fetchDropdownData();
        fetchDashboardStats();
        if (activeTab === 'classroom-assignments') fetchClassroomAssignmentDetails();
      } else {
        const errors = response.data.errors || response.data.error;
        const errMsg = Object.values(errors || {}).flat()[0] || response.data.message || t('academics.messages.createError');
        toast.error(errMsg);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('academics.messages.createError'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const urlMap = {
        'academic-years': `/academic-years/${editItem.id}/`,
        'terms': `/terms/${editItem.id}/`,
        'school-levels': `/school-levels/${editItem.id}/`,
        'class-levels': `/class-levels/${editItem.id}/`,
        'classrooms': `/class-rooms/${editItem.id}/`,
        'subjects': `/subjects/${editItem.id}/`,
        'payment-types': `/payment-types/${editItem.id}/`,
        'costs': `/class-level-costs/${editItem.id}/`,
        'day-settings': `/day-settings/${editItem.id}/`,
        'school-breaks': `/school-breaks/${editItem.id}/`,
        'holidays': `/holidays/${editItem.id}/`,  // Add this line
      };

      if (!urlMap[activeTab]) {
        toast.error(t('academics.messages.updateNotSupported'));
        setLoading(false);
        return;
      }

      const payload = { ...editItem };
      delete payload.id;
      const response = await apiClient.put(urlMap[activeTab], payload);

      if (response.data.success) {
        toast.success(response.data.message || t('academics.messages.updateSuccess'));
        setShowEditModal(false);
        setEditItem({});
        fetchData();
        fetchDropdownData();
        fetchDashboardStats();
      } else {
        const errors = response.data.errors || response.data.error;
        const errMsg = Object.values(errors || {}).flat()[0] || response.data.message || t('academics.messages.updateError');
        toast.error(errMsg);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('academics.messages.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const urlMap = {
        'academic-years': `/academic-years/${selectedItem.id}/`,
        'terms': `/terms/${selectedItem.id}/`,
        'school-levels': `/school-levels/${selectedItem.id}/`,
        'class-levels': `/class-levels/${selectedItem.id}/`,
        'classrooms': `/class-rooms/${selectedItem.id}/`,
        'subjects': `/subjects/${selectedItem.id}/`,
        'assignments': `/class-level-subjects/${selectedItem.id}/`,
        'payment-types': `/payment-types/${selectedItem.id}/`,
        'costs': `/class-level-costs/${selectedItem.id}/`,
        'day-settings': `/day-settings/${selectedItem.id}/`,
        'classroom-assignments': `/classroom-assignments/${selectedItem.id}/`,
        'school-breaks': `/school-breaks/${selectedItem.id}/`,
        'holidays': `/holidays/${selectedItem.id}/`,  // Add this line
      };

      const response = await apiClient.delete(urlMap[activeTab]);
      if (response.data.success) {
        toast.success(response.data.message || t('academics.messages.deleteSuccess'));
        setShowDeleteModal(false);
        setSelectedItem(null);
        fetchData();
        fetchDropdownData();
        fetchDashboardStats();
        if (activeTab === 'classroom-assignments') fetchClassroomAssignmentDetails();
      } else {
        toast.error(response.data.message || t('academics.messages.deleteError'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('academics.messages.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item) => {
    if (!['classrooms', 'subjects', 'payment-types', 'school-breaks'].includes(activeTab)) return;
    setLoading(true);
    try {
      const newStatus = item.status === 'active' ? 'inactive' : 'active';
      const urlMap = {
        'classrooms': `/class-rooms/${item.id}/`,
        'subjects': `/subjects/${item.id}/`,
        'payment-types': `/payment-types/${item.id}/`,
        'school-breaks': `/school-breaks/${item.id}/`,
      };
      const response = await apiClient.put(urlMap[activeTab], { ...item, status: newStatus });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchData();
      } else {
        toast.error(response.data.message || t('academics.messages.statusError'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('academics.messages.statusError'));
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => setSearchTerm('');

  // ── Form fields configuration ──────────────────────────────────────────────
  const getFieldSets = () => ({
    'academic-years': [
      { name: 'name', label: t('academics.form.yearName'), type: 'text', required: true, placeholder: '2024-2025' },
      { name: 'start_date', label: t('academics.form.startDate'), type: 'date', required: true },
      { name: 'end_date', label: t('academics.form.endDate'), type: 'date', required: true },
      { name: 'is_current', label: t('academics.form.setAsCurrent'), type: 'checkbox' },
    ],
    'terms': [
      { name: 'academic_year', label: t('academics.form.academicYear'), type: 'select', required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
      { name: 'term_number', label: t('academics.form.termNumber'), type: 'select', required: true, options: [{ value: 1, label: t('academics.terms.first') }, { value: 2, label: t('academics.terms.second') }, { value: 3, label: t('academics.terms.third') }] },
      { name: 'name', label: t('academics.form.termName'), type: 'text', required: true, placeholder: 'Term 1' },
      { name: 'start_date', label: t('academics.form.startDate'), type: 'date', required: true },
      { name: 'end_date', label: t('academics.form.endDate'), type: 'date', required: true },
      { name: 'is_current', label: t('academics.form.setAsCurrent'), type: 'checkbox' },
    ],
    // ── School Levels: now includes start_time & end_time ──────────────────
    'school-levels': [
      { name: 'name', label: t('academics.form.levelName'), type: 'text', required: true, placeholder: 'Primary School' },
      { name: 'description', label: t('academics.form.description'), type: 'textarea', placeholder: 'Description...' },
      { name: 'start_time', label: t('academics.form.dailyStartTime'), type: 'time', hint: t('academics.form.dailyStartTimeHint') },
      { name: 'end_time', label: t('academics.form.dailyEndTime'), type: 'time', hint: t('academics.form.dailyEndTimeHint') },
    ],
    'class-levels': [
      { name: 'name', label: t('academics.form.className'), type: 'text', required: true, placeholder: 'Primary 1' },
      { name: 'code', label: t('academics.form.classCode'), type: 'text', required: true, placeholder: 'P1' },
      { name: 'school_level', label: t('academics.form.schoolLevel'), type: 'select', required: true, options: schoolLevels.map(s => ({ value: s.id, label: s.name })) },
      { name: 'description', label: t('academics.form.description'), type: 'textarea', placeholder: 'Description...' },
    ],
    'classrooms': [
      { name: 'name', label: t('academics.form.roomName'), type: 'text', required: true, placeholder: 'Room A101' },
      { name: 'code', label: t('academics.form.roomCode'), type: 'text', required: true, placeholder: 'A101' },
      { name: 'room_type', label: t('academics.form.roomType'), type: 'select', required: true, options: [{ value: 'standard', label: t('academics.roomTypes.standard') }, { value: 'laboratory', label: t('academics.roomTypes.laboratory') }, { value: 'workshop', label: t('academics.roomTypes.workshop') }, { value: 'auditorium', label: t('academics.roomTypes.auditorium') }] },
      { name: 'capacity', label: t('academics.form.capacity'), type: 'number', required: true, placeholder: '30' },
      { name: 'status', label: t('academics.form.status'), type: 'select', required: true, options: [{ value: 'active', label: t('academics.status.active') }, { value: 'inactive', label: t('academics.status.inactive') }] },
    ],
    'subjects': [
      { name: 'name', label: t('academics.form.subjectName'), type: 'text', required: true, placeholder: 'Mathematics' },
      { name: 'code', label: t('academics.form.subjectCode'), type: 'text', required: true, placeholder: 'MATH101' },
      { name: 'pass_mark', label: t('academics.form.passScore'), type: 'number', required: true, placeholder: '50' },
      { name: 'status', label: t('academics.form.status'), type: 'select', required: true, options: [{ value: 'active', label: t('academics.status.active') }, { value: 'inactive', label: t('academics.status.inactive') }] },
      { name: 'description', label: t('academics.form.description'), type: 'textarea', placeholder: 'Description...' },
    ],
    'assignments': [
      { name: 'class_level', label: t('academics.form.classLevel'), type: 'select', required: true, options: classLevels.filter(c => c.is_active !== false).map(c => ({ value: c.id, label: c.name })) },
      { name: 'subject', label: t('academics.form.subject'), type: 'select', required: true, options: subjects.filter(s => s.status === 'active').map(s => ({ value: s.id, label: s.name })) },
      { name: 'teaching_frequency', label: t('academics.form.teachingFrequency'), type: 'select', required: true, options: [{ value: 'daily', label: t('academics.frequency.daily') }, { value: 'weekly', label: t('academics.frequency.weekly') }] },
      { name: 'hours_per_week', label: t('academics.form.hoursPerWeek'), type: 'number', required: true, placeholder: '4' },
      { name: 'is_compulsory', label: t('academics.form.compulsory'), type: 'checkbox' },
    ],
    'payment-types': [
      { name: 'name', label: t('academics.form.paymentTypeName'), type: 'text', required: true, placeholder: 'Termly Payment' },
      { name: 'code', label: t('academics.form.paymentTypeCode'), type: 'text', required: true, placeholder: 'TERMLY' },
      { name: 'description', label: t('academics.form.description'), type: 'textarea', placeholder: 'Description...' },
    ],
    'costs': [
      { name: 'name', label: t('academics.form.feeName'), type: 'text', required: true, placeholder: 'Tuition Fee' },
      { name: 'academic_year', label: t('academics.form.academicYear'), type: 'select', required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
      { name: 'class_level', label: t('academics.form.classLevel'), type: 'select', required: true, options: classLevels.map(c => ({ value: c.id, label: c.name })) },
      { name: 'payment_type', label: t('academics.form.paymentType'), type: 'select', required: true, options: paymentTypes.map(p => ({ value: p.id, label: p.name })) },
      { name: 'amount', label: t('academics.form.amount'), type: 'number', required: true, placeholder: '50000' },
      { name: 'is_mandatory', label: t('academics.form.mandatory'), type: 'checkbox' },
      { name: 'description', label: t('academics.form.description'), type: 'textarea', placeholder: 'Description...' },
    ],
    'day-settings': [
      { name: 'academic_year', label: t('academics.form.academicYear'), type: 'select', required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
      { name: 'day_type', label: t('academics.form.dayType'), type: 'select', required: true, options: [{ value: 'learning', label: t('academics.dayTypes.learning') }, { value: 'day_off', label: t('academics.dayTypes.dayOff') }, { value: 'special', label: t('academics.dayTypes.special') }] },
      { name: 'weekday', label: t('academics.form.weekday'), type: 'select', options: [{ value: 0, label: t('academics.weekdays.monday') }, { value: 1, label: t('academics.weekdays.tuesday') }, { value: 2, label: t('academics.weekdays.wednesday') }, { value: 3, label: t('academics.weekdays.thursday') }, { value: 4, label: t('academics.weekdays.friday') }, { value: 5, label: t('academics.weekdays.saturday') }, { value: 6, label: t('academics.weekdays.sunday') }] },
      { name: 'specific_date', label: t('academics.form.specificDate'), type: 'date' },
      { name: 'description', label: t('academics.form.description'), type: 'textarea', placeholder: 'Description...' },
    ],
    'classroom-assignments': [
      { name: 'academic_year', label: t('academics.form.academicYear'), type: 'select', required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
      { name: 'term', label: t('academics.form.term'), type: 'select', required: true, options: terms.filter(term => !newItem.academic_year || term.academic_year === parseInt(newItem.academic_year)).map(t => ({ value: t.id, label: t.name })) },
      { name: 'school_level', label: t('academics.form.schoolLevel'), type: 'select', required: true, options: schoolLevels.map(s => ({ value: s.id, label: s.name })) },
      { name: 'class_level', label: t('academics.form.classLevel'), type: 'select', required: true, options: filteredClassLevels.map(c => ({ value: c.id, label: c.name })) },
      { name: 'classroom', label: t('academics.form.classroom'), type: 'select', required: true, options: filteredClassrooms.map(c => ({ value: c.id, label: `${c.name} (${c.code}) — Capacity: ${c.capacity}` })) },
      { name: 'is_primary', label: t('academics.form.isPrimaryClassroom'), type: 'checkbox' },
    ],
    // ── School Breaks: shows school level hours as a contextual hint panel ──
    'school-breaks': [
      { name: 'name', label: t('academics.form.breakName'), type: 'text', required: true, placeholder: 'Morning Break' },
      { name: 'break_type', label: t('academics.form.breakType'), type: 'select', required: true, options: [{ value: 'short_break', label: t('academics.breakTypes.shortBreak') }, { value: 'lunch', label: t('academics.breakTypes.lunch') }, { value: 'recess', label: t('academics.breakTypes.recess') }, { value: 'other', label: t('academics.breakTypes.other') }] },
      { name: 'school_level', label: t('academics.form.schoolLevel'), type: 'select', required: true, options: schoolLevels.map(s => ({ value: s.id, label: s.name })), showHoursHint: true },
      { name: 'start_time', label: t('academics.form.startTime'), type: 'time', required: true },
      { name: 'end_time', label: t('academics.form.endTime'), type: 'time', required: true },
      { name: 'description', label: t('academics.form.description'), type: 'textarea', placeholder: 'Break description...' },
    ],
    // ── Holidays: includes recurring option and school level association ───────
    'holidays': [
      { name: 'name', label: t('academics.form.holidayName'), type: 'text', required: true, placeholder: 'Christmas Holiday' },
      { name: 'date', label: t('academics.form.holidayDate'), type: 'date', required: true },
      { name: 'academic_year', label: t('academics.form.academicYear'), type: 'select', required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
      { name: 'school_level', label: t('academics.form.schoolLevelOptional'), type: 'select', options: [{ value: '', label: t('academics.form.allSchoolLevels') }, ...schoolLevels.map(s => ({ value: s.id, label: s.name }))] },
      { name: 'is_recurring', label: t('academics.form.recurringYearly'), type: 'checkbox' },
      { name: 'description', label: t('academics.form.description'), type: 'textarea', placeholder: 'Holiday description...' },
    ],
  });

  // ── Render form fields ─────────────────────────────────────────────────────
  const renderFormFields = (item, setItem) => {
    const fieldSets = getFieldSets();
    const fields = fieldSets[activeTab] || [];

    return fields.map(field => {
      let customOnChange = field.onChange;
      if (activeTab === 'classroom-assignments') {
        if (field.name === 'school_level') customOnChange = (e) => handleSchoolLevelChange(e.target.value);
        else if (field.name === 'class_level') customOnChange = (e) => handleClassLevelChange(e.target.value);
        else if (field.name === 'term') customOnChange = (e) => handleTermChange(e.target.value);
        else if (field.name === 'academic_year') customOnChange = (e) => handleAcademicYearChange(e.target.value);
      }

      // School Level Hours hint panel (rendered after the school_level select in breaks form)
      const hoursHintPanel = field.showHoursHint && item[field.name]
        ? (() => {
          const slHours = getSelectedSchoolLevelHours(item[field.name]);
          if (!slHours) return null;
          return (
            <div className="mt-2 p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <span className="font-semibold">{slHours.name}</span>{' '}
                {t('academics.form.schoolLevelHoursHint', {
                  start: slHours.start_time || '?',
                  end: slHours.end_time || '?',
                })}
                <div className="mt-1 font-medium">
                  {t('academics.form.breakConstraintHint')}
                </div>
              </div>
            </div>
          );
        })()
        : null;

      return (
        <div key={field.name} className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>

          {field.type === 'select' ? (
            <>
              <select
                value={item[field.name] || ''}
                onChange={customOnChange || (e => setItem({ ...item, [field.name]: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
              >
                <option value="">{t('academics.form.selectOption', { label: field.label })}</option>
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {hoursHintPanel}
            </>
          ) : field.type === 'textarea' ? (
            <textarea
              value={item[field.name] || ''}
              onChange={e => setItem({ ...item, [field.name]: e.target.value })}
              placeholder={field.placeholder}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all resize-none"
            />
          ) : field.type === 'checkbox' ? (
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={item[field.name] || false}
                  onChange={e => setItem({ ...item, [field.name]: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${item[field.name] ? 'bg-green-700' : 'bg-gray-200 dark:bg-gray-600'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${item[field.name] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">{field.label}</span>
            </label>
          ) : field.type === 'time' ? (
            <>
              <input
                type="time"
                value={item[field.name] || ''}
                onChange={e => setItem({ ...item, [field.name]: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
              />
              {field.hint && (
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
                  <Info className="w-3 h-3" /> {field.hint}
                </p>
              )}
            </>
          ) : (
            <input
              type={field.type}
              value={item[field.name] || ''}
              onChange={e => setItem({ ...item, [field.name]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
            />
          )}
        </div>
      );
    });
  };

  // ── Table headers ─────────────────────────────────────────────────────────
  const getHeaders = () => ({
    'academic-years': [t('academics.table.yearName'), t('academics.table.startDate'), t('academics.table.endDate'), t('academics.table.current'), t('academics.table.actions')],
    'terms': [t('academics.table.academicYear'), t('academics.table.termName'), t('academics.table.startDate'), t('academics.table.endDate'), t('academics.table.current'), t('academics.table.actions')],
    // ── School Levels: added daily hours column ──────────────────────────────
    'school-levels': [t('academics.table.levelName'), t('academics.table.dailyHours'), t('academics.table.description'), t('academics.table.active'), t('academics.table.actions')],
    'class-levels': [t('academics.table.className'), t('academics.table.classCode'), t('academics.table.schoolLevel'), t('academics.table.description'), t('academics.table.active'), t('academics.table.actions')],
    'classrooms': [t('academics.table.roomName'), t('academics.table.roomCode'), t('academics.table.assignedClassLevel'), t('academics.table.roomType'), t('academics.table.capacity'), t('academics.table.status'), t('academics.table.actions')],
    'subjects': [t('academics.table.subjectName'), t('academics.table.subjectCode'), t('academics.table.passScore'), t('academics.table.status'), t('academics.table.actions')],
    'assignments': [t('academics.table.classLevel'), t('academics.table.subject'), t('academics.table.frequency'), t('academics.table.hoursPerWeek'), t('academics.table.compulsory'), t('academics.table.actions')],
    'payment-types': [t('academics.table.paymentTypeName'), t('academics.table.paymentTypeCode'), t('academics.table.description'), t('academics.table.status'), t('academics.table.actions')],
    'costs': [t('academics.table.feeName'), t('academics.table.academicYear'), t('academics.table.classLevel'), t('academics.table.paymentType'), t('academics.table.amount'), t('academics.table.mandatory'), t('academics.table.actions')],
    'day-settings': [t('academics.table.academicYear'), t('academics.table.dayType'), t('academics.table.weekdayOrDate'), t('academics.table.description'), t('academics.table.actions')],
    'classroom-assignments': [t('academics.table.academicYear'), t('academics.table.term'), t('academics.table.classLevel'), t('academics.table.classroom'), t('academics.table.primary'), t('academics.table.actions')],
    'school-breaks': [t('academics.table.breakName'), t('academics.table.breakType'), t('academics.table.schoolLevel'), t('academics.table.startTime'), t('academics.table.endTime'), t('academics.table.duration'), t('academics.table.actions')],
    'holidays': [t('academics.table.holidayName'), t('academics.table.date'), t('academics.table.academicYear'), t('academics.table.schoolLevel'), t('academics.table.recurring'), t('academics.table.actions')],
  });

  // ── Table row renderer ─────────────────────────────────────────────────────
  const renderTableRow = (item) => {
    const actionGroup = (
      <div className="flex items-center gap-1">
        <ActionBtn onClick={() => { setSelectedItem(item); setShowViewModal(true); }}
          title={t('academics.actions.view')} color="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600" Icon={Eye} />
        {activeTab !== 'assignments' && activeTab !== 'classroom-assignments' && (
          <ActionBtn onClick={() => { setEditItem(item); setShowEditModal(true); }}
            title={t('academics.actions.edit')} color="hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600" Icon={Edit} />
        )}
        <ActionBtn onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }}
          title={t('academics.actions.delete')} color="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600" Icon={Trash2} />
      </div>
    );

    const tdClass = "px-4 py-3 text-sm text-gray-700 dark:text-gray-300";
    const tdBold = "px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white";

    switch (activeTab) {
      case 'academic-years':
        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdBold}>{item.name}</td>
            <td className={tdClass}>{item.start_date || '—'}</td>
            <td className={tdClass}>{item.end_date || '—'}</td>
            <td className="px-4 py-3">{item.is_current && <StatusBadge status="current" />}</td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'terms':
        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdClass}>{item.academic_year_name || item.academic_year}</td>
            <td className={tdBold}>{item.name}</td>
            <td className={tdClass}>{item.start_date || '—'}</td>
            <td className={tdClass}>{item.end_date || '—'}</td>
            <td className="px-4 py-3">{item.is_current && <StatusBadge status="current" />}</td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      // ── School Levels: show daily hours column ─────────────────────────────
      case 'school-levels':
        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdBold}>{item.name}</td>
            <td className="px-4 py-3">
              <HoursBadge startTime={item.start_time} endTime={item.end_time} />
            </td>
            <td className={tdClass}>{item.description || '—'}</td>
            <td className="px-4 py-3">
              {item.is_active ? <StatusBadge status="active" /> : <StatusBadge status="inactive" />}
            </td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'class-levels':
        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdBold}>{item.name}</td>
            <td className="px-4 py-3"><code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">{item.code}</code></td>
            <td className={tdClass}>{item.school_level_name || item.school_level}</td>
            <td className={tdClass}>{item.description || '—'}</td>
            <td className="px-4 py-3">
              {item.is_active ? <StatusBadge status="active" /> : <StatusBadge status="inactive" />}
            </td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'classrooms': {
        const assignmentDetail = classroomAssignmentDetails[item.id];
        const assignedClassLevel = assignmentDetail ? (
          <div className="space-y-1">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              {assignmentDetail.class_level_name}
            </span>
            {assignmentDetail.is_primary && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ml-1">
                {t('academics.labels.primary')}
              </span>
            )}
            <div className="text-xs text-gray-500">{assignmentDetail.term_name} ({assignmentDetail.academic_year_name})</div>
          </div>
        ) : <span className="text-xs text-gray-400">—</span>;

        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdBold}>{item.name}</td>
            <td className="px-4 py-3"><code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">{item.code}</code></td>
            <td className="px-4 py-3">{assignedClassLevel}</td>
            <td className="px-4 py-3 capitalize">{item.room_type_display || item.room_type}</td>
            <td className={tdClass}><Users className="w-3.5 h-3.5 inline mr-1" />{item.capacity}</td>
            <td className="px-4 py-3"><button onClick={() => handleToggleStatus(item)}><StatusBadge status={item.status} /></button></td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );
      }

      case 'subjects':
        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdBold}>{item.name}</td>
            <td className="px-4 py-3"><code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">{item.code}</code></td>
            <td className={tdClass}>{item.pass_mark}%</td>
            <td className="px-4 py-3"><button onClick={() => handleToggleStatus(item)}><StatusBadge status={item.status} /></button></td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'assignments':
        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdBold}>{item.class_level_name || item.class_level}</td>
            <td className={tdClass}>{item.subject_name || item.subject}</td>
            <td className="px-4 py-3 capitalize">{item.teaching_frequency_display || item.teaching_frequency}</td>
            <td className={tdClass}>{item.hours_per_week}h</td>
            <td className="px-4 py-3">{item.is_compulsory ? <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">{t('academics.labels.required')}</span> : <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">{t('academics.labels.optional')}</span>}</td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'payment-types':
        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdBold}>{item.name}</td>
            <td className="px-4 py-3"><code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">{item.code}</code></td>
            <td className={tdClass}>{item.description || '—'}</td>
            <td className="px-4 py-3"><button onClick={() => handleToggleStatus(item)}><StatusBadge status={item.is_active ? 'active' : 'inactive'} /></button></td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'costs':
        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdBold}>{item.name}</td>
            <td className={tdClass}>{item.academic_year_name || item.academic_year}</td>
            <td className={tdClass}>{item.class_level_name || item.class_level}</td>
            <td className={tdClass}>{item.payment_type_name || item.payment_type}</td>
            <td className="px-4 py-3 font-semibold text-green-700 dark:text-green-400">{new Intl.NumberFormat('en-RW').format(item.amount)} RWF</td>
            <td className="px-4 py-3">{item.is_mandatory ? <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">{t('academics.labels.mandatory')}</span> : <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">{t('academics.labels.optional')}</span>}</td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'day-settings':
        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdClass}>{item.academic_year_name || item.academic_year}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.day_type === 'learning' ? 'bg-green-100 text-green-700' : item.day_type === 'day_off' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {t(`academics.dayTypes.${item.day_type}`)}
              </span>
            </td>
            <td className={tdClass}>{item.weekday_display || item.specific_date || '—'}</td>
            <td className={tdClass}>{item.description || '—'}</td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'classroom-assignments':
        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdClass}>{item.academic_year_name || item.academic_year}</td>
            <td className={tdClass}>{item.term_name || item.term}</td>
            <td className={tdBold}>{item.class_level_name || item.class_level}</td>
            <td className={tdClass}>{item.classroom_name || item.classroom} ({item.classroom_code})</td>
            <td className="px-4 py-3">{item.is_primary && <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">{t('academics.labels.primary')}</span>}</td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      // ── School Breaks: shows school level name with its hours ──────────────
      case 'school-breaks': {
        const slForBreak = schoolLevels.find(s => s.id === item.school_level);
        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdBold}>{item.name}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.break_type === 'lunch' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {t(`academics.breakTypes.${item.break_type}`)}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.school_level_name || item.school_level}</span>
                {slForBreak && (slForBreak.start_time || slForBreak.end_time) && (
                  <HoursBadge startTime={slForBreak.start_time} endTime={slForBreak.end_time} />
                )}
              </div>
            </td>
            <td className={tdClass}>{item.start_time}</td>
            <td className={tdClass}>{item.end_time}</td>
            <td className={tdClass}><Clock className="w-3.5 h-3.5 inline mr-1" />{item.duration_minutes} min</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <ActionBtn onClick={() => { setSelectedItem(item); setShowViewModal(true); }}
                  title={t('academics.actions.view')} color="hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600" Icon={Eye} />
                <ActionBtn onClick={() => { setEditItem(item); setShowEditModal(true); }}
                  title={t('academics.actions.edit')} color="hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600" Icon={Edit} />
                <ActionBtn onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }}
                  title={t('academics.actions.delete')} color="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600" Icon={Trash2} />
              </div>
            </td>
          </tr>
        );
      }

      case 'holidays':
        return (
          <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
            <td className={tdBold}>{item.name}</td>
            <td className={tdClass}>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 text-xs font-medium">
                <CalendarIcon className="w-3 h-3" />
                {item.date}
              </span>
            </td>
            <td className={tdClass}>{item.academic_year_name || item.academic_year}</td>
            <td className={tdClass}>{item.school_level_name || (item.school_level ? item.school_level : t('academics.labels.allLevels'))}</td>
            <td className="px-4 py-3">
              {item.is_recurring ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Repeat className="w-3 h-3" /> {t('academics.labels.yearly')}
                </span>
              ) : (
                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">{t('academics.labels.once')}</span>
              )}
            </td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      default:
        return null;
    }
  };

  // ── View Modal Content ─────────────────────────────────────────────────────
  const renderViewContent = () => {
    if (!selectedItem) return null;
    const timestamps = ['created_at', 'updated_at'];
    const entries = Object.entries(selectedItem).filter(([k]) => k !== 'id');
    const basic = entries.filter(([k, v]) => !timestamps.includes(k) && typeof v !== 'object');

    const formatValue = (key, value) => {
      if (value === null || value === undefined || value === '') return '—';
      if (key === 'amount') return `${new Intl.NumberFormat('en-RW').format(value)} RWF`;
      if (key === 'pass_mark') return `${value}%`;
      if (key === 'duration_minutes') return `${value} minutes`;
      if (key === 'start_time' || key === 'end_time') return value;
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (timestamps.includes(key)) return new Date(value).toLocaleString();
      return String(value);
    };

    return (
      <div className="space-y-3">
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{t('academics.view.basicInfo')}</h3>
          <div className="space-y-2">
            {basic.map(([key, value]) => (
              <div key={key} className="flex justify-between py-1.5 border-b border-gray-200 dark:border-gray-600 last:border-0">
                <span className="text-xs font-semibold text-gray-500 uppercase">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm text-gray-800 dark:text-white font-medium">{formatValue(key, value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Stats cards ────────────────────────────────────────────────────────────
  const statCards = [
    { labelKey: 'academics.stats.academicYears', value: academicYears.length, icon: Calendar },
    { labelKey: 'academics.stats.terms', value: dashboardStats.total_terms || terms.length, icon: Timer },
    { labelKey: 'academics.stats.schoolLevels', value: dashboardStats.total_school_levels, icon: Building2 },
    { labelKey: 'academics.stats.classLevels', value: dashboardStats.total_class_levels, icon: GraduationCap },
    { labelKey: 'academics.stats.classrooms', value: dashboardStats.total_classrooms, icon: LayoutGrid },
    { labelKey: 'academics.stats.subjects', value: dashboardStats.total_subjects, icon: BookOpen },
    { labelKey: 'academics.stats.feeStructures', value: dashboardStats.total_fee_structures, icon: Wallet },
    { labelKey: 'academics.stats.schoolBreaks', value: schoolBreaks.length, icon: Coffee },
    { labelKey: 'academics.stats.holidays', value: holidays.length, icon: Gift },  // Add this line
  ];

  const activeFilterCount = searchTerm ? 1 : 0;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-full mx-auto p-4 lg:p-6 space-y-5">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('academics.title')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {dashboardStats.current_academic_year
                  ? t('academics.subtitleWithYear', { year: dashboardStats.current_academic_year.name })
                  : t('academics.subtitle')}
                {dashboardStats.current_term && ` • ${dashboardStats.current_term.name}`}
              </p>
            </div>
            <button
              onClick={() => { setNewItem({}); setShowAddModal(true); }}
              className="px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('academics.actions.add', { name: t(currentTabInfo?.labelKey) })}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            {statCards.map(({ labelKey, value, icon: Icon }) => (
              <div key={labelKey} className="bg-gradient-to-br from-green-700 to-green-900 rounded-2xl p-3.5 text-white shadow-sm cursor-default">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white/70 text-xs font-medium leading-tight">{t(labelKey)}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                  </div>
                  <Icon className="w-4 h-4 text-white/80" />
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-2 overflow-x-auto">
            <nav className="flex gap-1 min-w-max">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSearchTerm(''); resetFilters(); }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${isActive
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-green-700 dark:text-green-400' : ''}`} />
                    {t(tab.labelKey)}
                    {isActive && (
                      <span className="ml-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 text-xs rounded-md font-semibold">
                        {filteredData.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('academics.actions.search', { name: t(currentTabInfo?.labelKey) })}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all ${showFilters || activeFilterCount > 0
                  ? 'bg-green-50 dark:bg-green-900/30 border-green-200 text-green-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Filter className="w-4 h-4" />
                {t('academics.actions.filters')}
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-green-700 text-white text-xs rounded-full font-bold">{activeFilterCount}</span>
                )}
              </button>
              <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {t('academics.actions.refresh')}
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1 min-w-[120px]">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('academics.filters.searchInfo')}</label>
                  <div className="text-sm text-gray-500">
                    {t('academics.filters.clientSideSearch', { count: rawData.length, filtered: filteredData.length })}
                  </div>
                </div>
                <div className="flex flex-col gap-1 min-w-[120px]">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 opacity-0">—</label>
                  <button onClick={resetFilters} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-xl transition-all">
                    ✕ {t('academics.actions.clearFilters')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/30">
                  <tr>
                    {(getHeaders()[activeTab] || []).map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loading ? (
                    <tr><td colSpan="10" className="py-16 text-center">
                      <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
                      <span className="text-sm text-gray-500 mt-2 block">{t('academics.messages.loading')}</span>
                    </td></tr>
                  ) : paginatedData.length === 0 ? (
                    <tr><td colSpan="10" className="py-16 text-center">
                      <p className="text-sm text-gray-500">{t('academics.messages.noData')}</p>
                    </td></tr>
                  ) : (
                    paginatedData.map(renderTableRow)
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filteredData.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{t('academics.pagination.show')}</span>
                  <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-2 py-1 border rounded-lg bg-white dark:bg-gray-700 text-sm">
                    {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span>{t('academics.pagination.ofTotal', { count: filteredData.length })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2.5 py-1.5 text-xs font-medium rounded-lg border bg-white disabled:opacity-40">«</button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border bg-white disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="px-3 py-1.5 text-sm font-medium bg-white border rounded-lg">{t('academics.pagination.page', { current: currentPage, total: totalPages || 1 })}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1.5 rounded-lg border bg-white disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} className="px-2.5 py-1.5 text-xs font-medium rounded-lg border bg-white disabled:opacity-40">»</button>
                </div>
              </div>
            )}
          </div>

          {/* Add Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('academics.actions.add', { name: t(currentTabInfo?.labelKey) })}</h2>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {renderFormFields(newItem, setNewItem)}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <button onClick={handleCreate} disabled={loading} className="flex-1 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl disabled:opacity-50 transition-colors">✓ {t('academics.actions.create')}</button>
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">{t('academics.actions.cancel')}</button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('academics.actions.edit', { name: t(currentTabInfo?.labelKey) })}</h2>
                  <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {renderFormFields(editItem, setEditItem)}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <button onClick={handleUpdate} disabled={loading} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl disabled:opacity-50 transition-colors">✓ {t('academics.actions.update')}</button>
                  <button onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">{t('academics.actions.cancel')}</button>
                </div>
              </div>
            </div>
          )}

          {/* View Modal */}
          {showViewModal && selectedItem && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('academics.actions.viewDetails')}</h2>
                  <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {renderViewContent()}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <button onClick={() => setShowViewModal(false)} className="flex-1 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl transition-colors">{t('academics.actions.close')}</button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Modal */}
          {showDeleteModal && selectedItem && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{t('academics.delete.title')}</h2>
                  <p className="text-sm text-gray-500 mb-4">{t('academics.delete.confirmation')}</p>
                  {selectedItem.name && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-3 mb-4">
                      <p className="text-sm text-amber-800 dark:text-amber-300"><strong>{t('academics.delete.itemName')}:</strong> {selectedItem.name}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 px-6 pb-6">
                  <button onClick={handleDelete} disabled={loading} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50 transition-colors">{t('academics.actions.delete')}</button>
                  <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">{t('academics.actions.cancel')}</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AcademicsManagement;