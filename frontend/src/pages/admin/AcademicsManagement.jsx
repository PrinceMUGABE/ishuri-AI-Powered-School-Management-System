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
  SlidersHorizontal, BarChart3, Layers, Hash
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
  console.log(`%c[API ▶ ${config.method?.toUpperCase()}] ${config.url}`, 'color:#6366f1;font-weight:bold');
  return config;
}, (error) => {
  console.error('[API Request Error]', error);
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response) => {
    console.log(
      `%c[API ✓ ${response.status}] ${response.config.method?.toUpperCase()} ${response.config.url}`,
      'color:#22c55e;font-weight:bold',
      '\nData:', response.data
    );
    return response;
  },
  (error) => {
    console.error('%c[API ✗ Error]', 'color:#ef4444;font-weight:bold', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ─── TAB → COLUMN DEFINITIONS (for structured console display) ────────────────
const TAB_COLUMN_DEFS = {
  'academic-years': ['id', 'name', 'start_date', 'end_date', 'is_current'],
  'school-levels':  ['id', 'name', 'description', 'is_active'],
  'class-levels':   ['id', 'name', 'code', 'school_level_name', 'description', 'is_active'],
  'classrooms':     ['id', 'name', 'code', 'class_level_name', 'room_type', 'capacity', 'status'],
  'subjects':       ['id', 'name', 'code', 'pass_mark', 'status'],
  'assignments':    ['id', 'class_level_name', 'subject_name', 'teaching_frequency', 'hours_per_week', 'is_compulsory'],
  'costs':          ['id', 'name', 'academic_year_name', 'class_level_name', 'amount', 'frequency', 'is_mandatory'],
};

// ─── Enhanced Debug Logger (mirrors table columns) ────────────────────────────
const debugLog = (tab, endpoint, data) => {
  const columns = TAB_COLUMN_DEFS[tab] || [];
  const label = `%c[DATA] Tab: ${tab} | Endpoint: ${endpoint} | Count: ${Array.isArray(data) ? data.length : 'N/A'}`;

  console.groupCollapsed(label, 'color:#f59e0b;font-weight:bold;font-size:12px');

  if (Array.isArray(data) && data.length > 0) {
    // Build a projected array with only the columns shown in the table
    const projected = data.map((item) => {
      const row = {};
      columns.forEach((col) => {
        let val = item[col];
        if (val === null || val === undefined) val = '—';
        if (typeof val === 'boolean') val = val ? '✓ Yes' : '✗ No';
        row[col] = val;
      });
      return row;
    });

    console.log('%cTable-column view (first 10 rows):', 'color:#94a3b8;font-style:italic');
    console.table(projected.slice(0, 10));

    console.log('%cFull raw data (first 5 rows):', 'color:#94a3b8;font-style:italic');
    console.table(data.slice(0, 5));
  } else if (!Array.isArray(data)) {
    console.log('Single object:', data);
  } else {
    console.log('No data returned.');
  }

  console.groupEnd();
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status, t }) => {
  const isActive = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${
      isActive
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
      {isActive ? t('status.active') : t('status.inactive')}
    </span>
  );
};

// ─── Action Buttons ───────────────────────────────────────────────────────────
const ActionBtn = ({ onClick, title, color, Icon }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-lg transition-all hover:scale-110 ${color}`}
  >
    <Icon className="w-3.5 h-3.5" />
  </button>
);

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
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [costs, setCosts] = useState([]);

  // Form states
  const [newItem, setNewItem] = useState({});
  const [editItem, setEditItem] = useState({});

  // Filters
  const [filters, setFilters] = useState({
    academic_year: '',
    school_level: '',
    class_level: '',
    status: '',
    room_type: '',
    frequency: '',
    is_compulsory: '',
    is_mandatory: '',
    is_current: '',
  });

  // Stats
  const [dashboardStats, setDashboardStats] = useState({
    total_school_levels: 0,
    total_class_levels: 0,
    total_classrooms: 0,
    total_subjects: 0,
    total_assignments: 0,
    total_fee_structures: 0,
    current_academic_year: null,
  });

  const tabs = [
    { id: 'academic-years',  labelKey: 'tabs.academicYears',  icon: Calendar,      color: 'blue'   },
    { id: 'school-levels',   labelKey: 'tabs.schoolLevels',   icon: Building2,     color: 'purple' },
    { id: 'class-levels',    labelKey: 'tabs.classLevels',    icon: GraduationCap, color: 'green'  },
    { id: 'classrooms',      labelKey: 'tabs.classrooms',     icon: LayoutGrid,    color: 'orange' },
    { id: 'subjects',        labelKey: 'tabs.subjects',       icon: BookOpen,      color: 'red'    },
    { id: 'assignments',     labelKey: 'tabs.assignments',    icon: ClipboardList, color: 'indigo' },
    { id: 'costs',           labelKey: 'tabs.feeStructures',  icon: Wallet,        color: 'teal'   },
  ];

  const currentTabInfo = tabs.find(tab => tab.id === activeTab);

  // ── Fetch dashboard stats ──────────────────────────────────────────────────
  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/dashboard/stats/');
      if (response.data.success) setDashboardStats(response.data.data);
    } catch (error) {
      console.error('[Dashboard Stats Error]', error);
    }
  }, []);

  // ── Fetch dropdown data ────────────────────────────────────────────────────
  const fetchDropdownData = useCallback(async () => {
    try {
      const [slRes, clRes, subRes, ayRes] = await Promise.all([
        apiClient.get('/school-levels/'),
        apiClient.get('/class-levels/'),
        apiClient.get('/subjects/'),
        apiClient.get('/academic-years/'),
      ]);
      const extract = (res) => {
        const d = res.data?.data;
        return d?.results ?? d ?? [];
      };
      if (slRes.data.success)  setSchoolLevels(extract(slRes));
      if (clRes.data.success)  setClassLevels(extract(clRes));
      if (subRes.data.success) setSubjects(extract(subRes));
      if (ayRes.data.success)  setAcademicYears(extract(ayRes));
    } catch (error) {
      console.error('[Dropdown Data Error]', error);
    }
  }, []);

  // ── Fetch tab data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    // Use a unique toast ID per tab so it updates in place (no duplicates)
    const toastId = `fetch-${activeTab}`;

    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const urlMap = {
        'academic-years': '/academic-years/',
        'school-levels':  '/school-levels/',
        'class-levels':   '/class-levels/',
        'classrooms':     '/class-rooms/',
        'subjects':       '/subjects/',
        'assignments':    '/class-level-subjects/',
        'costs':          '/class-level-costs/',
      };

      if (activeTab === 'class-levels') {
        if (filters.school_level) params.append('school_level', filters.school_level);
        if (filters.status)       params.append('status', filters.status);
      }
      if (activeTab === 'classrooms') {
        if (filters.class_level) params.append('class_level', filters.class_level);
        if (filters.status)      params.append('status', filters.status);
        if (filters.room_type)   params.append('room_type', filters.room_type);
      }
      if (activeTab === 'subjects') {
        if (filters.status) params.append('status', filters.status);
      }
      if (activeTab === 'assignments') {
        if (filters.class_level)              params.append('class_level', filters.class_level);
        if (filters.is_compulsory !== '') params.append('is_compulsory', filters.is_compulsory);
      }
      if (activeTab === 'costs') {
        if (filters.class_level)          params.append('class_level', filters.class_level);
        if (filters.academic_year)        params.append('academic_year', filters.academic_year);
        if (filters.frequency)            params.append('frequency', filters.frequency);
        if (filters.is_mandatory !== '')  params.append('is_mandatory', filters.is_mandatory);
      }

      const url = `${urlMap[activeTab]}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await apiClient.get(url);

      if (response.data.success) {
        const raw = response.data.data;
        const results = raw?.results ?? raw ?? [];

        // ── ENHANCED: Log data structured by table columns ──────────────
        debugLog(activeTab, url, results);

        const setters = {
          'academic-years': setAcademicYears,
          'school-levels':  setSchoolLevels,
          'class-levels':   setClassLevels,
          'classrooms':     setClassrooms,
          'subjects':       setSubjects,
          'assignments':    setAssignments,
          'costs':          setCosts,
        };
        setters[activeTab]?.(results);

        // ── FIX: Always show a meaningful success toast after GET ────────
        // Backend GET responses often don't include a `message` field,
        // so we build a descriptive fallback from the tab label + count.
        const tabLabel = t(currentTabInfo?.labelKey ?? 'tabs.academicYears');
        const backendMsg = response.data.message;
        const msg = backendMsg
          ? backendMsg
          : t('messages.dataLoaded', { tab: tabLabel, count: results.length });

        toast.success(msg, { id: toastId, duration: 2500 });
      } else {
        // Backend returned success: false with a message
        toast.error(response.data.message || t('messages.fetchError'), { id: toastId });
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        t('messages.fetchError');
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, filters, t, currentTabInfo]);

  useEffect(() => {
    fetchDropdownData();
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    fetchData();
    setCurrentPage(1);
  }, [activeTab, searchTerm, filters]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const dataMap = {
    'academic-years': academicYears,
    'school-levels':  schoolLevels,
    'class-levels':   classLevels,
    'classrooms':     classrooms,
    'subjects':       subjects,
    'assignments':    assignments,
    'costs':          costs,
  };
  const currentData = dataMap[activeTab] ?? [];
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const paginatedData = currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setLoading(true);
    try {
      const urlMap = {
        'academic-years': '/academic-years/',
        'school-levels':  '/school-levels/',
        'class-levels':   '/class-levels/',
        'classrooms':     '/class-rooms/',
        'subjects':       '/subjects/',
        'assignments':    '/class-level-subjects/',
        'costs':          '/class-level-costs/',
      };
      const payload = { ...newItem };
      if (activeTab === 'classrooms' && !payload.status) payload.status = 'active';
      if (activeTab === 'subjects'   && !payload.status) payload.status = 'active';

      const response = await apiClient.post(urlMap[activeTab], payload);
      if (response.data.success) {
        toast.success(response.data.message || t('messages.createSuccess', { name: t(currentTabInfo?.labelKey) }));
        setShowAddModal(false);
        setNewItem({});
        fetchData(); fetchDropdownData(); fetchDashboardStats();
      } else {
        const errors = response.data.errors || response.data.error || response.data.details || response.data.detail;
        const errMsg = Object.values(errors || {}).flat()[0] || response.data.message || t('messages.createError');
        toast.error(errMsg);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('messages.createError'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const urlMap = {
        'academic-years': `/academic-years/${editItem.id}/`,
        'school-levels':  `/school-levels/${editItem.id}/`,
        'class-levels':   `/class-levels/${editItem.id}/`,
        'classrooms':     `/class-rooms/${editItem.id}/`,
        'subjects':       `/subjects/${editItem.id}/`,
        'costs':          `/class-level-costs/${editItem.id}/`,
      };
      if (!urlMap[activeTab]) {
        toast.error(t('messages.updateNotSupported'));
        setLoading(false);
        return;
      }
      const payload = { ...editItem };
      delete payload.id;
      const response = await apiClient.put(urlMap[activeTab], payload);
      if (response.data.success) {
        toast.success(response.data.message || t('messages.updateSuccess'));
        setShowEditModal(false);
        setEditItem({});
        fetchData(); fetchDropdownData(); fetchDashboardStats();
      } else {
        const errors = response.data.errors || response.data.error || response.data.details || response.data.detail;
        const errMsg = Object.values(errors || {}).flat()[0] || response.data.message || t('messages.updateError');
        toast.error(errMsg);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('messages.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const urlMap = {
        'academic-years': `/academic-years/${selectedItem.id}/`,
        'school-levels':  `/school-levels/${selectedItem.id}/`,
        'class-levels':   `/class-levels/${selectedItem.id}/`,
        'classrooms':     `/class-rooms/${selectedItem.id}/`,
        'subjects':       `/subjects/${selectedItem.id}/`,
        'assignments':    `/class-level-subjects/${selectedItem.id}/`,
        'costs':          `/class-level-costs/${selectedItem.id}/`,
      };
      const response = await apiClient.delete(urlMap[activeTab]);
      if (response.data.success) {
        toast.success(response.data.message || t('messages.deleteSuccess'));
        setShowDeleteModal(false);
        setSelectedItem(null);
        fetchData(); fetchDropdownData(); fetchDashboardStats();
      } else {
        const errors = response.data.errors || response.data.error || response.data.details || response.data.detail;
        const errMsg = Object.values(errors || {}).flat()[0] || response.data.message || t('messages.deleteError');
        toast.error(errMsg);
      }
    } catch (error) {
      const errors = error.response?.data?.errors || error.response?.data?.error || error.response?.data?.details || error.response?.data?.detail;
      const errMsg = Object.values(errors || {}).flat()[0] || error.response?.data?.message || t('messages.deleteError');
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item) => {
    if (activeTab !== 'classrooms' && activeTab !== 'subjects') return;
    setLoading(true);
    try {
      const newStatus = item.status === 'active' ? 'inactive' : 'active';
      const url = activeTab === 'classrooms' ? `/class-rooms/${item.id}/` : `/subjects/${item.id}/`;
      const response = await apiClient.put(url, { ...item, status: newStatus });
      if (response.data.success) {
        toast.success(response.data.message || t('messages.statusUpdated', { status: t(`status.${newStatus}`) }));
        fetchData();
      } else {
        const errors = response.data.errors || response.data.error || response.data.details || response.data.detail;
        const errMsg = Object.values(errors || {}).flat()[0] || response.data.message || t('messages.statusError');
        toast.error(errMsg);
      }
    } catch (error) {
      const errors = error.response?.data?.errors || error.response?.data?.error || error.response?.data?.details || error.response?.data?.detail;
      const errMsg = Object.values(errors || {}).flat()[0] || t('messages.statusError');
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({ academic_year: '', school_level: '', class_level: '', status: '', room_type: '', frequency: '', is_compulsory: '', is_mandatory: '', is_current: '' });
    setSearchTerm('');
  };

  // ── Form fields ────────────────────────────────────────────────────────────
  const getFieldSets = () => ({
    'academic-years': [
      { name: 'name',       label: t('form.yearName'),     type: 'text',     required: true,  placeholder: t('placeholders.yearName') },
      { name: 'start_date', label: t('form.startDate'),    type: 'date',     required: true },
      { name: 'end_date',   label: t('form.endDate'),      type: 'date',     required: true },
      { name: 'is_current', label: t('form.setAsCurrent'), type: 'checkbox' },
    ],
    'school-levels': [
      { name: 'name',        label: t('form.levelName'),   type: 'text',     required: true,  placeholder: t('placeholders.levelName') },
      { name: 'description', label: t('form.description'), type: 'textarea', placeholder: t('placeholders.description') },
    ],
    'class-levels': [
      { name: 'name',         label: t('form.className'),   type: 'text',   required: true,  placeholder: t('placeholders.className') },
      { name: 'code',         label: t('form.classCode'),   type: 'text',   required: true,  placeholder: t('placeholders.classCode') },
      { name: 'school_level', label: t('form.schoolLevel'), type: 'select', required: true,
        options: schoolLevels.map(s => ({ value: s.id, label: s.name })) },
      { name: 'description',  label: t('form.description'), type: 'textarea', placeholder: t('placeholders.description') },
    ],
    'classrooms': [
      { name: 'name',        label: t('form.roomName'),   type: 'text',   required: true,  placeholder: t('placeholders.roomName') },
      { name: 'code',        label: t('form.roomCode'),   type: 'text',   required: true,  placeholder: t('placeholders.roomCode') },
      { name: 'class_level', label: t('form.classLevel'), type: 'select', required: true,
        options: classLevels.map(c => ({ value: c.id, label: c.name })) },
      { name: 'room_type',   label: t('form.roomType'),   type: 'select', required: true,
        options: [
          { value: 'standard',   label: t('roomTypes.standard')   },
          { value: 'laboratory', label: t('roomTypes.laboratory') },
          { value: 'workshop',   label: t('roomTypes.workshop')   },
          { value: 'auditorium', label: t('roomTypes.auditorium') },
        ]},
      { name: 'capacity', label: t('form.capacity'), type: 'number', required: true, placeholder: t('placeholders.capacity') },
      { name: 'status',   label: t('form.status'),   type: 'select', required: true,
        options: [{ value: 'active', label: t('status.active') }, { value: 'inactive', label: t('status.inactive') }] },
    ],
    'subjects': [
      { name: 'name',        label: t('form.subjectName'), type: 'text',   required: true,  placeholder: t('placeholders.subjectName') },
      { name: 'code',        label: t('form.subjectCode'), type: 'text',   required: true,  placeholder: t('placeholders.subjectCode') },
      { name: 'pass_mark',   label: t('form.passScore'),   type: 'number', required: true,  placeholder: t('placeholders.passScore') },
      { name: 'status',      label: t('form.status'),      type: 'select', required: true,
        options: [{ value: 'active', label: t('status.active') }, { value: 'inactive', label: t('status.inactive') }] },
      { name: 'description', label: t('form.description'), type: 'textarea', placeholder: t('placeholders.description') },
    ],
    'assignments': [
      { name: 'class_level', label: t('form.classLevel'), type: 'select', required: true,
        options: classLevels.map(c => ({ value: c.id, label: c.name })) },
      { name: 'subject',     label: t('form.subject'),    type: 'select', required: true,
        options: subjects.filter(s => s.status === 'active').map(s => ({ value: s.id, label: s.name })) },
      { name: 'teaching_frequency', label: t('form.teachingFrequency'), type: 'select', required: true,
        options: [{ value: 'daily', label: t('frequency.daily') }, { value: 'weekly', label: t('frequency.weekly') }] },
      { name: 'hours_per_week', label: t('form.hoursPerWeek'),  type: 'number', required: true, placeholder: t('placeholders.hoursPerWeek') },
      { name: 'is_compulsory',  label: t('form.compulsory'),    type: 'checkbox' },
    ],
    'costs': [
      { name: 'name',          label: t('form.feeName'),      type: 'text',   required: true, placeholder: t('placeholders.feeName') },
      { name: 'academic_year', label: t('form.academicYear'), type: 'select', required: true,
        options: academicYears.map(y => ({ value: y.id, label: y.name })) },
      { name: 'class_level',   label: t('form.classLevel'),   type: 'select', required: true,
        options: classLevels.map(c => ({ value: c.id, label: c.name })) },
      { name: 'amount',        label: t('form.amount'),       type: 'number', required: true, placeholder: t('placeholders.amount') },
      { name: 'frequency',     label: t('form.frequency'),    type: 'select', required: true,
        options: [
          { value: 'termly',  label: t('frequency.termly')  },
          { value: 'yearly',  label: t('frequency.yearly')  },
          { value: 'monthly', label: t('frequency.monthly') },
        ]},
      { name: 'is_mandatory', label: t('form.mandatory'), type: 'checkbox' },
    ],
  });

  // ── Render form fields ─────────────────────────────────────────────────────
  const renderFormFields = (item, setItem) => {
    const fieldSets = getFieldSets();
    const fields = fieldSets[activeTab] || [];
    return fields.map(field => (
      <div key={field.name} className="space-y-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {field.label} {field.required && <span className="text-rose-500">*</span>}
        </label>
        {field.type === 'select' ? (
          <select
            value={item[field.name] || ''}
            onChange={e => setItem({ ...item, [field.name]: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="">{t('form.selectOption', { label: field.label })}</option>
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : field.type === 'textarea' ? (
          <textarea
            value={item[field.name] || ''}
            onChange={e => setItem({ ...item, [field.name]: e.target.value })}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
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
              <div className={`w-11 h-6 rounded-full transition-colors ${item[field.name] ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${item[field.name] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900">{field.label}</span>
          </label>
        ) : (
          <input
            type={field.type}
            value={item[field.name] || ''}
            onChange={e => setItem({ ...item, [field.name]: e.target.value })}
            placeholder={field.placeholder}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        )}
      </div>
    ));
  };

  // ── Table headers ──────────────────────────────────────────────────────────
  const getHeaders = () => ({
    'academic-years': [t('table.yearName'), t('table.startDate'), t('table.endDate'), t('table.current'), t('table.actions')],
    'school-levels':  [t('table.levelName'), t('table.description'), t('table.active'), t('table.actions')],
    'class-levels':   [t('table.className'), t('table.classCode'), t('table.schoolLevel'), t('table.description'), t('table.active'), t('table.actions')],
    'classrooms':     [t('table.roomName'), t('table.roomCode'), t('table.classLevel'), t('table.roomType'), t('table.capacity'), t('table.status'), t('table.actions')],
    'subjects':       [t('table.subjectName'), t('table.subjectCode'), t('table.passScore'), t('table.status'), t('table.actions')],
    'assignments':    [t('table.classLevel'), t('table.subject'), t('table.frequency'), t('table.hoursPerWeek'), t('table.compulsory'), t('table.actions')],
    'costs':          [t('table.feeName'), t('table.academicYear'), t('table.classLevel'), t('table.amount'), t('table.frequency'), t('table.mandatory'), t('table.actions')],
  });

  // ── Table rows ─────────────────────────────────────────────────────────────
  const renderTableRow = (item) => {
    const actionGroup = (
      <div className="flex items-center gap-1">
        <ActionBtn onClick={() => { setSelectedItem(item); setShowViewModal(true); }}
          title={t('actions.view')} color="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" Icon={Eye} />
        {activeTab !== 'assignments' && (
          <ActionBtn onClick={() => { setEditItem(item); setShowEditModal(true); }}
            title={t('actions.edit')} color="hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500" Icon={Edit} />
        )}
        <ActionBtn onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }}
          title={t('actions.delete')} color="hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500" Icon={Trash2} />
      </div>
    );

    const tdClass = "px-4 py-3 text-sm text-slate-700 dark:text-slate-300";
    const tdBold  = "px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white";
    const rowClass = "hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-100 dark:border-slate-700";

    switch (activeTab) {
      case 'academic-years':
        return (
          <tr key={item.id} className={rowClass}>
            <td className={tdBold}>{item.name}</td>
            <td className={tdClass}>{item.start_date || '—'}</td>
            <td className={tdClass}>{item.end_date || '—'}</td>
            <td className="px-4 py-3">
              {item.is_current
                ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                    <CheckCircle className="w-3 h-3" />{t('status.current')}
                  </span>
                : <span className="text-xs text-slate-400">—</span>
              }
            </td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'school-levels':
        return (
          <tr key={item.id} className={rowClass}>
            <td className={tdBold}>{item.name}</td>
            <td className={tdClass}><span className="line-clamp-1">{item.description || '—'}</span></td>
            <td className="px-4 py-3">
              {item.is_active
                ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400">✓ {t('status.yes')}</span>
                : <span className="text-xs text-slate-400">{t('status.no')}</span>
              }
            </td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'class-levels':
        return (
          <tr key={item.id} className={rowClass}>
            <td className={tdBold}>{item.name}</td>
            <td className="px-4 py-3">
              <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md font-mono text-slate-700 dark:text-slate-300">{item.code}</code>
            </td>
            <td className={tdClass}>{item.school_level_name || item.school_level || '—'}</td>
            <td className={tdClass}><span className="line-clamp-1">{item.description || '—'}</span></td>
            <td className="px-4 py-3">
              {item.is_active
                ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400">✓ {t('status.yes')}</span>
                : <span className="text-xs text-slate-400">{t('status.no')}</span>
              }
            </td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'classrooms':
        return (
          <tr key={item.id} className={rowClass}>
            <td className={tdBold}>{item.name}</td>
            <td className="px-4 py-3">
              <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md font-mono text-slate-700 dark:text-slate-300">{item.code}</code>
            </td>
            <td className={tdClass}>{item.class_level_name || item.class_level || '—'}</td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                {item.room_type_display || t(`roomTypes.${item.room_type}`, item.room_type) || '—'}
              </span>
            </td>
            <td className={tdClass}>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" />{item.capacity}</span>
            </td>
            <td className="px-4 py-3">
              <button onClick={() => handleToggleStatus(item)} title={t('actions.toggleStatus')}>
                <StatusBadge status={item.status} t={t} />
              </button>
            </td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'subjects':
        return (
          <tr key={item.id} className={rowClass}>
            <td className={tdBold}>{item.name}</td>
            <td className="px-4 py-3">
              <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md font-mono text-slate-700 dark:text-slate-300">{item.code}</code>
            </td>
            <td className={tdClass}>
              <span className="flex items-center gap-1 font-medium">
                <Hash className="w-3.5 h-3.5 text-slate-400" />{item.pass_mark}%
              </span>
            </td>
            <td className="px-4 py-3">
              <button onClick={() => handleToggleStatus(item)} title={t('actions.toggleStatus')}>
                <StatusBadge status={item.status} t={t} />
              </button>
            </td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'assignments':
        return (
          <tr key={item.id} className={rowClass}>
            <td className={tdBold}>{item.class_level_name || item.class_level || '—'}</td>
            <td className={tdClass}>{item.subject_name || item.subject || '—'}</td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 capitalize">
                {item.teaching_frequency_display || t(`frequency.${item.teaching_frequency}`, item.teaching_frequency)}
              </span>
            </td>
            <td className={tdClass}>{item.hours_per_week}h</td>
            <td className="px-4 py-3">
              {item.is_compulsory
                ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/20 dark:text-violet-400">{t('labels.required')}</span>
                : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-400">{t('labels.optional')}</span>
              }
            </td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      case 'costs':
        return (
          <tr key={item.id} className={rowClass}>
            <td className={tdBold}>{item.name}</td>
            <td className={tdClass}>{item.academic_year_name || item.academic_year || '—'}</td>
            <td className={tdClass}>{item.class_level_name || item.class_level || '—'}</td>
            <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
              {new Intl.NumberFormat('en-RW').format(item.amount)} RWF
            </td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 capitalize">
                {item.frequency_display || t(`frequency.${item.frequency}`, item.frequency)}
              </span>
            </td>
            <td className="px-4 py-3">
              {item.is_mandatory
                ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400">{t('labels.mandatory')}</span>
                : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-400">{t('labels.optional')}</span>
              }
            </td>
            <td className="px-4 py-3">{actionGroup}</td>
          </tr>
        );

      default:
        return (
          <tr key={item.id}>
            <td colSpan="10" className="px-4 py-3 text-center text-slate-400 text-sm">—</td>
          </tr>
        );
    }
  };

  // ── Advanced filter panel ──────────────────────────────────────────────────
  const renderFilterPanel = () => {
    const filterClass = "px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

    const FilterRow = ({ label, children }) => (
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</label>
        {children}
      </div>
    );

    const statusFilter = (
      <FilterRow label={t('filters.status')}>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className={filterClass}>
          <option value="">{t('filters.allStatus')}</option>
          <option value="active">{t('status.active')}</option>
          <option value="inactive">{t('status.inactive')}</option>
        </select>
      </FilterRow>
    );

    const classLevelFilter = (
      <FilterRow label={t('filters.classLevel')}>
        <select value={filters.class_level} onChange={e => setFilters(p => ({ ...p, class_level: e.target.value }))} className={filterClass}>
          <option value="">{t('filters.allClassLevels')}</option>
          {classLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </FilterRow>
    );

    const renderFor = {
      'academic-years': (
        <FilterRow label={t('filters.yearType')}>
          <select value={filters.is_current} onChange={e => setFilters(p => ({ ...p, is_current: e.target.value }))} className={filterClass}>
            <option value="">{t('filters.all')}</option>
            <option value="true">{t('filters.currentOnly')}</option>
            <option value="false">{t('filters.pastOnly')}</option>
          </select>
        </FilterRow>
      ),
      'class-levels': (
        <>
          <FilterRow label={t('filters.schoolLevel')}>
            <select value={filters.school_level} onChange={e => setFilters(p => ({ ...p, school_level: e.target.value }))} className={filterClass}>
              <option value="">{t('filters.allSchoolLevels')}</option>
              {schoolLevels.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FilterRow>
          {statusFilter}
        </>
      ),
      'classrooms': (
        <>
          {classLevelFilter}
          {statusFilter}
          <FilterRow label={t('filters.roomType')}>
            <select value={filters.room_type} onChange={e => setFilters(p => ({ ...p, room_type: e.target.value }))} className={filterClass}>
              <option value="">{t('filters.allRoomTypes')}</option>
              <option value="standard">{t('roomTypes.standard')}</option>
              <option value="laboratory">{t('roomTypes.laboratory')}</option>
              <option value="workshop">{t('roomTypes.workshop')}</option>
              <option value="auditorium">{t('roomTypes.auditorium')}</option>
            </select>
          </FilterRow>
        </>
      ),
      'subjects': statusFilter,
      'assignments': (
        <>
          {classLevelFilter}
          <FilterRow label={t('filters.subjectType')}>
            <select value={filters.is_compulsory} onChange={e => setFilters(p => ({ ...p, is_compulsory: e.target.value }))} className={filterClass}>
              <option value="">{t('filters.all')}</option>
              <option value="true">{t('labels.required')}</option>
              <option value="false">{t('labels.optional')}</option>
            </select>
          </FilterRow>
        </>
      ),
      'costs': (
        <>
          {classLevelFilter}
          <FilterRow label={t('filters.academicYear')}>
            <select value={filters.academic_year} onChange={e => setFilters(p => ({ ...p, academic_year: e.target.value }))} className={filterClass}>
              <option value="">{t('filters.allYears')}</option>
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </FilterRow>
          <FilterRow label={t('filters.frequency')}>
            <select value={filters.frequency} onChange={e => setFilters(p => ({ ...p, frequency: e.target.value }))} className={filterClass}>
              <option value="">{t('filters.allFrequencies')}</option>
              <option value="termly">{t('frequency.termly')}</option>
              <option value="yearly">{t('frequency.yearly')}</option>
              <option value="monthly">{t('frequency.monthly')}</option>
            </select>
          </FilterRow>
          <FilterRow label={t('filters.mandatoryType')}>
            <select value={filters.is_mandatory} onChange={e => setFilters(p => ({ ...p, is_mandatory: e.target.value }))} className={filterClass}>
              <option value="">{t('filters.all')}</option>
              <option value="true">{t('labels.mandatory')}</option>
              <option value="false">{t('labels.optional')}</option>
            </select>
          </FilterRow>
        </>
      ),
    };

    const content = renderFor[activeTab];
    if (!content) return null;

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          {content}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-0">—</label>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-all font-medium border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
            >
              ✕ {t('actions.clearFilters')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── View Modal Content ─────────────────────────────────────────────────────
  const renderViewContent = () => {
    if (!selectedItem) return null;
    const timestamps = ['created_at', 'updated_at'];
    const entries = Object.entries(selectedItem).filter(([k]) => k !== 'id');
    const basic = entries.filter(([k, v]) => !timestamps.includes(k) && typeof v !== 'object');
    const time  = entries.filter(([k]) => timestamps.includes(k));

    const formatValue = (key, value) => {
      if (value === null || value === undefined || value === '') return '—';
      if (key === 'amount')    return `${new Intl.NumberFormat('en-RW').format(value)} RWF`;
      if (key === 'pass_mark') return `${value}%`;
      if (typeof value === 'boolean') return value ? t('status.yes') : t('status.no');
      if (timestamps.includes(key)) return new Date(value).toLocaleString();
      return String(value);
    };

    return (
      <>
        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <Info className="w-3.5 h-3.5" />{t('view.basicInfo')}
          </h3>
          <div className="space-y-2">
            {basic.map(([key, value]) => (
              <div key={key} className="flex justify-between items-start gap-4 py-1.5 border-b border-slate-200 dark:border-slate-600 last:border-0">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide min-w-[120px]">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="text-sm text-slate-800 dark:text-white text-right font-medium">{formatValue(key, value)}</span>
              </div>
            ))}
          </div>
        </div>
        {time.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />{t('view.timestamps')}
            </h3>
            {time.map(([key, value]) => (
              <div key={key} className="flex justify-between py-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {key === 'created_at' ? t('view.createdAt') : t('view.updatedAt')}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300">{new Date(value).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  // ── Stats cards ────────────────────────────────────────────────────────────
  const statCards = [
    { labelKey: 'stats.schoolLevels',  value: dashboardStats.total_school_levels,  icon: Building2,     gradient: 'from-blue-500 to-blue-600'    },
    { labelKey: 'stats.classLevels',   value: dashboardStats.total_class_levels,   icon: GraduationCap, gradient: 'from-emerald-500 to-emerald-600' },
    { labelKey: 'stats.classrooms',    value: dashboardStats.total_classrooms,     icon: LayoutGrid,    gradient: 'from-violet-500 to-violet-600' },
    { labelKey: 'stats.subjects',      value: dashboardStats.total_subjects,       icon: BookOpen,      gradient: 'from-amber-500 to-amber-600'   },
    { labelKey: 'stats.assignments',   value: dashboardStats.total_assignments,    icon: ClipboardList, gradient: 'from-rose-500 to-rose-600'     },
    { labelKey: 'stats.feeStructures', value: dashboardStats.total_fee_structures, icon: Wallet,        gradient: 'from-teal-500 to-teal-600'     },
  ];

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;
  const headers = getHeaders();

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-full mx-auto p-4 lg:p-6 space-y-5">

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {dashboardStats.current_academic_year
                  ? t('subtitleWithYear', { year: dashboardStats.current_academic_year.name })
                  : t('subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                title={t('actions.toggleDarkMode')}
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button> */}
              <button
                onClick={() => { setNewItem({}); setShowAddModal(true); }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                {t('actions.add', { name: t(currentTabInfo?.labelKey) })}
              </button>
            </div>
          </div>

          {/* ── Stats Grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {statCards.map(({ labelKey, value, icon: Icon, gradient }) => (
              <div key={labelKey} className={`bg-gradient-to-br ${gradient} rounded-2xl p-3.5 text-white shadow-sm hover:shadow-md transition-shadow cursor-default`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white/70 text-xs font-medium leading-tight">{t(labelKey)}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                  </div>
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2">
            <nav className="flex gap-1 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSearchTerm(''); resetFilters(); }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                    {t(tab.labelKey)}
                    {isActive && (
                      <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs rounded-md font-semibold">
                        {currentData.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ── Search & Filter Bar ──────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('actions.search', { name: t(currentTabInfo?.labelKey) })}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all shadow-sm ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {t('actions.filters')}
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-xs rounded-full font-bold">{activeFilterCount}</span>
                )}
              </button>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {t('actions.refresh')}
              </button>
            </div>
          </div>

          {/* ── Filter Panel ─────────────────────────────────────────────── */}
          {showFilters && renderFilterPanel()}

          {/* ── Data Table ───────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                {React.createElement(currentTabInfo?.icon || Layers, { className: "w-4 h-4 text-indigo-500" })}
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t(currentTabInfo?.labelKey)}</span>
                <span className="text-xs text-slate-400">({t('pagination.totalCount', { count: currentData.length })})</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    {(headers[activeTab] || []).map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-slate-500">{t('messages.loading')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
                            <Info className="w-7 h-7 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('messages.noData')}</p>
                          <button
                            onClick={() => { setNewItem({}); setShowAddModal(true); }}
                            className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold"
                          >
                            {t('actions.clickToAdd')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map(renderTableRow)
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ──────────────────────────────────────────────── */}
            {!loading && currentData.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50 dark:bg-slate-700/20">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>{t('pagination.show')}</span>
                  <select
                    value={itemsPerPage}
                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                  >
                    {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span>{t('pagination.ofTotal', { count: currentData.length })}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all text-slate-600 dark:text-slate-300">
                    {t('pagination.first')}
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all">
                    <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </button>
                  <span className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg">
                    {t('pagination.page', { current: currentPage, total: totalPages || 1 })}
                  </span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all">
                    <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all text-slate-600 dark:text-slate-300">
                    {t('pagination.last')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Add Modal ────────────────────────────────────────────────── */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {t('actions.add', { name: t(currentTabInfo?.labelKey) })}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">{t('modal.fillDetails')}</p>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {renderFormFields(newItem, setNewItem)}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
                  <button onClick={handleCreate} disabled={loading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('messages.creating')}</>
                      : `✓ ${t('actions.create')}`}
                  </button>
                  <button onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all">
                    {t('actions.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Edit Modal ───────────────────────────────────────────────── */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {t('actions.edit', { name: t(currentTabInfo?.labelKey) })}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">{t('modal.updateDetails')}</p>
                  </div>
                  <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {renderFormFields(editItem, setEditItem, true)}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
                  <button onClick={handleUpdate} disabled={loading}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('messages.updating')}</>
                      : `✓ ${t('actions.update')}`}
                  </button>
                  <button onClick={() => setShowEditModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all">
                    {t('actions.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── View Modal ───────────────────────────────────────────────── */}
          {showViewModal && selectedItem && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                      <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('actions.viewDetails')}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">{t('modal.idLabel', { id: selectedItem.id })}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {renderViewContent()}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
                  {['academic-years', 'classrooms', 'subjects', 'costs', 'school-levels', 'class-levels'].includes(activeTab) && (
                    <button
                      onClick={() => { setShowViewModal(false); setEditItem(selectedItem); setShowEditModal(true); }}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" /> {t('actions.edit')}
                    </button>
                  )}
                  <button onClick={() => setShowViewModal(false)}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all">
                    {t('actions.close')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Delete Modal ─────────────────────────────────────────────── */}
          {showDeleteModal && selectedItem && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('delete.title')}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('delete.confirmation')}</p>
                  {selectedItem.name && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 text-left">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        <strong>{t('delete.itemName')}:</strong> {selectedItem.name}
                        {selectedItem.code && ` (${selectedItem.code})`}
                      </p>
                    </div>
                  )}
                  {selectedItem.is_current && (
                    <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3 mb-4 text-left">
                      <p className="text-sm text-rose-700 dark:text-rose-400">⚠️ {t('delete.currentYearWarning')}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400">{t('delete.warning')}</p>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                  <button onClick={handleDelete} disabled={loading}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('messages.deleting')}</>
                      : <><Trash2 className="w-4 h-4" />{t('actions.delete')}</>}
                  </button>
                  <button onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all">
                    {t('actions.cancel')}
                  </button>
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