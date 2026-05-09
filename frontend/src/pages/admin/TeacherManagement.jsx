import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, UserPlus, Edit, Trash2, Search, Eye, X,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  AlertCircle, Clock, Building2, GraduationCap,
  BookOpen, Calendar, Settings, Sun, Moon,
  Calendar as CalendarIcon, Clock as ClockIcon,
  Plus, Info, Filter, Mail, Phone, MapPin, Award,
  Download, Printer, FileText, BarChart3, PieChart
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────
const API_BASE_URL = 'http://127.0.0.1:8000/api/teachers';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token    = localStorage.getItem('access_token');
  const language = localStorage.getItem('user_language') || 'en';
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  config.headers['X-Language'] = language;
  console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
  return config;
}, (error) => {
  console.error('[API Request Error]', error);
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  (error) => {
    console.error('[API Response Error]', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
);

const getStatusBadge = (status) => {
  const colors = {
    active:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    inactive:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    suspended: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    on_leave:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };
  return colors[status] || colors.inactive;
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
const TeacherManagement = () => {
  const { t } = useTranslation();

  // ── UI state ──────────────────────────────────────────────
  const [loading,         setLoading]         = useState(false);
  const [activeTab,       setActiveTab]       = useState('teachers');
  const [searchTerm,      setSearchTerm]      = useState('');
  const [darkMode,        setDarkMode]        = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData,      setReportData]      = useState(null);

  // ── Modal state ───────────────────────────────────────────
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal,   setShowViewModal]   = useState(false);
  const [selectedItem,    setSelectedItem]    = useState(null);

  // ── Pagination ────────────────────────────────────────────
  const [currentPage,  setCurrentPage]  = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ── Data ──────────────────────────────────────────────────
  const [teachers,      setTeachers]      = useState([]);
  const [assignments,   setAssignments]   = useState([]);
  const [timetableData, setTimetableData] = useState(null);
  const [daySettings,   setDaySettings]   = useState([]);
  const [holidays,      setHolidays]      = useState([]);

  // ── Forms ─────────────────────────────────────────────────
  const [newItem,  setNewItem]  = useState({});
  const [editItem, setEditItem] = useState({});

  // ── Filters ───────────────────────────────────────────────
  const [filters, setFilters] = useState({
    status: '', teacher: '', school_level: '', class_level: '',
    academic_year: '', week: '', day: ''
  });

  // ── Dropdowns ─────────────────────────────────────────────
  const [schoolLevels,  setSchoolLevels]  = useState([]);
  const [classLevels,   setClassLevels]   = useState([]);
  const [subjects,      setSubjects]      = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // ── Stats ─────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total_teachers: 0, active_teachers: 0, inactive_teachers: 0, on_leave_teachers: 0,
    total_assignments: 0, active_assignments: 0, total_timetable_entries: 0, total_holidays: 0
  });

  // ─────────────────────────────────────────────────────────
  // Tabs
  // ─────────────────────────────────────────────────────────
  const tabs = [
    { id: 'teachers',     label: t('teachers.tabs.teachers'),    icon: Users        },
    { id: 'assignments',  label: t('teachers.tabs.assignments'), icon: BookOpen     },
    { id: 'timetable',    label: t('teachers.tabs.timetable'),   icon: Calendar     },
    { id: 'day-settings', label: t('teachers.tabs.daySettings'), icon: Settings     },
    { id: 'holidays',     label: t('teachers.tabs.holidays'),    icon: CalendarIcon },
    { id: 'reports',      label: t('teachers.tabs.reports'),     icon: BarChart3    },
  ];

  const currentTabLabel = () => tabs.find(tab => tab.id === activeTab)?.label ?? '';

  // ─────────────────────────────────────────────────────────
  // Fetch dropdowns
  // ─────────────────────────────────────────────────────────
  const fetchDropdownData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const [schoolsRes, classesRes, subjectsRes, yearsRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/academics/school-levels/',  { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://127.0.0.1:8000/api/academics/class-levels/',   { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://127.0.0.1:8000/api/academics/subjects/',       { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://127.0.0.1:8000/api/academics/academic-years/', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (schoolsRes.data.success)  setSchoolLevels(schoolsRes.data.data);
      if (classesRes.data.success)  setClassLevels(classesRes.data.data);
      if (subjectsRes.data.success) setSubjects(subjectsRes.data.data);
      if (yearsRes.data.success)    setAcademicYears(yearsRes.data.data);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Fetch main data
  // ─────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '';
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      switch (activeTab) {
        case 'teachers':
          url = '/teachers/';
          if (filters.status) params.append('status', filters.status);
          break;
        case 'assignments':
          url = '/assignments/';
          if (filters.teacher) params.append('teacher', filters.teacher);
          if (filters.status)  params.append('status',  filters.status);
          break;
        case 'timetable':
          url = `/timetable/${filters.teacher || ''}`;
          if (filters.academic_year) params.append('academic_year', filters.academic_year);
          if (filters.week)          params.append('week_number',   filters.week);
          if (filters.day)           params.append('day',           filters.day);
          break;
        case 'day-settings':
          url = '/day-settings/';
          if (filters.school_level)  params.append('school_level',  filters.school_level);
          if (filters.academic_year) params.append('academic_year', filters.academic_year);
          break;
        case 'holidays':
          url = '/holidays/';
          if (filters.academic_year) params.append('academic_year', filters.academic_year);
          break;
        default: return;
      }

      if (params.toString()) url += (url.includes('?') ? '&' : '?') + params.toString();

      const response = await apiClient.get(url);

      if (response.data.success) {
        const data = response.data.data;
        switch (activeTab) {
          case 'teachers': {
            const arr = Array.isArray(data) ? data : (data.results ?? data ?? []);
            setTeachers(arr);
            setStats(prev => ({
              ...prev,
              total_teachers:    arr.length,
              active_teachers:   arr.filter(t => t.status === 'active').length,
              inactive_teachers: arr.filter(t => t.status === 'inactive').length,
              on_leave_teachers: arr.filter(t => t.status === 'on_leave').length,
            }));
            break;
          }
          case 'assignments': {
            const arr = Array.isArray(data) ? data : (data.results ?? data ?? []);
            setAssignments(arr);
            setStats(prev => ({
              ...prev,
              total_assignments:  arr.length,
              active_assignments: arr.filter(a => a.status === 'active').length,
            }));
            break;
          }
          case 'timetable':
            setTimetableData(data);
            if (data?.summary) setStats(prev => ({ ...prev, total_timetable_entries: data.summary.total_timetable_entries || 0 }));
            break;
          case 'day-settings': {
            const arr = Array.isArray(data) ? data : (data.results ?? data ?? []);
            setDaySettings(arr);
            break;
          }
          case 'holidays': {
            const arr = Array.isArray(data) ? data : (data.results ?? data ?? []);
            setHolidays(arr);
            setStats(prev => ({ ...prev, total_holidays: arr.length }));
            break;
          }
          default: break;
        }
        const count = Array.isArray(data) ? data.length : (data?.timetables?.length ?? data?.length ?? 0);
        toast.success(`${count} ${t('teachers.messages.dataLoaded', { count })}`);
      } else {
        toast.error(response.data.message || t('teachers.messages.fetchError'));
      }
    } catch (error) {
      console.error('Fetch data error:', error);
      toast.error(error.response?.data?.message || t('teachers.messages.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdownData();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchTerm, filters, currentPage, itemsPerPage]);

  // ─────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setLoading(true);
    try {
      const urlMap = { teachers: '/teachers/', assignments: '/assignments/', 'day-settings': '/day-settings/', holidays: '/holidays/' };
      const url = urlMap[activeTab];
      if (!url) { toast.error(t('teachers.messages.createError')); setLoading(false); return; }
      const response = await apiClient.post(url, { ...newItem });
      if (response.data.success) {
        toast.success(response.data.message || t('teachers.messages.createSuccess'));
        setShowAddModal(false); setNewItem({}); fetchData();
      } else {
        toast.error(Object.values(response.data.errors || {}).flat()[0] || response.data.message || t('teachers.messages.createError'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.messages.createError'));
    } finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const urlMap = { teachers: `/teachers/${editItem.id}/`, 'day-settings': `/day-settings/${editItem.id}/` };
      const url = urlMap[activeTab];
      if (!url) { toast.error(t('teachers.messages.updateNotSupported')); setLoading(false); return; }
      const payload = { ...editItem }; delete payload.id;
      const response = await apiClient.put(url, payload);
      if (response.data.success) {
        toast.success(response.data.message || t('teachers.messages.updateSuccess'));
        setShowEditModal(false); setEditItem({}); fetchData();
      } else {
        toast.error(Object.values(response.data.errors || {}).flat()[0] || response.data.message || t('teachers.messages.updateError'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.messages.updateError'));
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const urlMap = {
        teachers: `/teachers/${selectedItem.id}/`, assignments: `/assignments/${selectedItem.id}/`,
        'day-settings': `/day-settings/${selectedItem.id}/`, holidays: `/holidays/${selectedItem.id}/`,
      };
      const url = urlMap[activeTab];
      if (!url) { setLoading(false); return; }
      const response = await apiClient.delete(url);
      if (response.data.success) {
        toast.success(response.data.message || t('teachers.messages.deleteSuccess'));
        setShowDeleteModal(false); setSelectedItem(null); fetchData();
      } else {
        toast.error(response.data.message || t('teachers.messages.deleteError'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.messages.deleteError'));
    } finally { setLoading(false); }
  };

  const handleGenerateTimetable = async () => {
    setLoading(true);
    try {
      const academicYearId = filters.academic_year || (academicYears.find(y => y.is_current)?.id);
      const weekNumber     = filters.week || 1;
      const teacherId      = filters.teacher || null;
      const payload        = { academic_year: academicYearId, week_number: parseInt(weekNumber) };
      if (teacherId) payload.teacher_id = parseInt(teacherId);
      const response = await apiClient.post('/timetable/generate/', payload);
      if (response.data.success) {
        const result = response.data.data;
        toast.success(`${t('teachers.messages.timetableGenerated')} - ${result.entries_created} ${t('teachers.messages.entriesCreated')}`);
        if (result.conflicts_count > 0) toast.warning(`${result.conflicts_count} ${t('teachers.messages.conflictsDetected')}`);
        fetchData();
      } else {
        toast.error(response.data.message || t('teachers.messages.timetableGenerateError'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.messages.timetableGenerateError'));
    } finally { setLoading(false); }
  };

  const handleExportTimetable = async () => {
    setLoading(true);
    try {
      const teacherId = filters.teacher;
      let url = teacherId ? `/timetable/export/${teacherId}/` : '/timetable/export/';
      const params = new URLSearchParams();
      if (filters.academic_year) params.append('academic_year', filters.academic_year);
      if (filters.week)          params.append('week_number',   filters.week);
      if (params.toString())     url += `?${params.toString()}`;
      const response = await apiClient.get(url);
      if (response.data.success) {
        const exportData = response.data.data;
        const link = document.createElement('a');
        link.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2)));
        link.setAttribute('download', `timetable_${exportData.teacher?.full_name || 'all'}_week_${exportData.week_number}.json`);
        link.click();
        toast.success(t('teachers.messages.exportSuccess'));
      } else {
        toast.error(response.data.message || t('teachers.messages.exportError'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('teachers.messages.exportError'));
    } finally { setLoading(false); }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const [teachersRes, assignmentsRes, timetableRes, holidaysRes] = await Promise.all([
        apiClient.get('/teachers/'), apiClient.get('/assignments/'),
        apiClient.get('/timetable/'), apiClient.get('/holidays/'),
      ]);
      setReportData({
        generated_on: new Date().toLocaleString(),
        teachers:    teachersRes.data.data,
        assignments: assignmentsRes.data.data,
        timetable:   timetableRes.data.data,
        holidays:    holidaysRes.data.data,
        summary: {
          total_teachers:          teachersRes.data.data.length,
          active_teachers:         teachersRes.data.data.filter(t => t.status === 'active').length,
          total_assignments:       assignmentsRes.data.data.length,
          total_timetable_entries: timetableRes.data.data?.summary?.total_timetable_entries || 0,
          total_holidays:          holidaysRes.data.data.length,
        },
      });
      setShowReportModal(true);
      toast.success(t('teachers.messages.reportGenerated'));
    } catch (error) {
      toast.error(t('teachers.messages.reportError'));
    } finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────
  // Shared input classes
  // ─────────────────────────────────────────────────────────
  const inputCls  = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent text-sm outline-none";
  const selectCls = `${inputCls}`;

  // ─────────────────────────────────────────────────────────
  // Form fields
  // ─────────────────────────────────────────────────────────
  const renderFormFields = (item, setItem) => {
    const getFieldSets = () => {
      switch (activeTab) {
        case 'teachers':
          return [
            { name: 'full_name',        label: t('teachers.form.fullName'),       type: 'text',     required: true,  placeholder: t('teachers.placeholders.fullName') },
            { name: 'email',            label: t('teachers.form.email'),           type: 'email',    required: true,  placeholder: 'teacher@example.com' },
            { name: 'phone_number',     label: t('teachers.form.phone'),           type: 'tel',      required: true,  placeholder: '+250XXXXXXXXX' },
            { name: 'address',          label: t('teachers.form.address'),         type: 'textarea', required: false, placeholder: t('teachers.placeholders.address') },
            { name: 'gender',           label: t('teachers.form.gender'),          type: 'select',   required: true,
              options: [{ value: 'male', label: t('teachers.gender.male') }, { value: 'female', label: t('teachers.gender.female') }, { value: 'other', label: t('teachers.gender.other') }]
            },
            { name: 'education_level',  label: t('teachers.form.educationLevel'), type: 'select',   required: true,
              options: [
                { value: 'diploma',     label: t('teachers.education.diploma') },
                { value: 'bachelor',    label: t('teachers.education.bachelor') },
                { value: 'master',      label: t('teachers.education.master') },
                { value: 'doctorate',   label: t('teachers.education.doctorate') },
                { value: 'certificate', label: t('teachers.education.certificate') },
              ]
            },
            { name: 'qualification',    label: t('teachers.form.qualification'),  type: 'textarea', required: false, placeholder: t('teachers.placeholders.qualification') },
            { name: 'specialization',   label: t('teachers.form.specialization'), type: 'text',     required: false, placeholder: t('teachers.placeholders.specialization') },
            { name: 'experience_years', label: t('teachers.form.experience'),     type: 'number',   required: false, placeholder: '0' },
            { name: 'birth_date',       label: t('teachers.form.birthDate'),      type: 'date',     required: false },
            { name: 'hire_date',        label: t('teachers.form.hireDate'),       type: 'date',     required: false },
            { name: 'status',           label: t('teachers.form.status'),         type: 'select',   required: true,
              options: [
                { value: 'active',    label: t('teachers.status.active') },
                { value: 'inactive',  label: t('teachers.status.inactive') },
                { value: 'on_leave',  label: t('teachers.status.onLeave') },
                { value: 'suspended', label: t('teachers.status.suspended') },
              ]
            },
            { name: 'bio', label: t('teachers.form.bio'), type: 'textarea', required: false, placeholder: t('teachers.placeholders.bio') },
          ];

        case 'assignments':
          return [
            { name: 'teacher',        label: t('teachers.form.teacher'),      type: 'select', required: true, options: teachers.map(t => ({ value: t.id, label: t.full_name })) },
            { name: 'school_level',   label: t('teachers.form.schoolLevel'),  type: 'select', required: true, options: schoolLevels.map(s => ({ value: s.id, label: s.name })) },
            { name: 'class_level',    label: t('teachers.form.classLevel'),   type: 'select', required: true, options: classLevels.map(c => ({ value: c.id, label: c.name })) },
            { name: 'subject',        label: t('teachers.form.subject'),      type: 'select', required: true, options: subjects.map(s => ({ value: s.id, label: s.name })) },
            { name: 'academic_year',  label: t('teachers.form.academicYear'), type: 'select', required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
            { name: 'hours_per_week', label: t('teachers.form.hoursPerWeek'),type: 'number',  required: true, placeholder: '4' },
            { name: 'status',         label: t('teachers.form.status'),       type: 'select', required: true,
              options: [
                { value: 'active',    label: t('teachers.status.active') },
                { value: 'inactive',  label: t('teachers.status.inactive') },
                { value: 'completed', label: t('teachers.status.completed') },
              ]
            },
            { name: 'notes', label: t('teachers.form.notes'), type: 'textarea', required: false, placeholder: t('teachers.placeholders.notes') },
          ];

        case 'day-settings':
          return [
            { name: 'school_level',  label: t('teachers.form.schoolLevel'),  type: 'select', required: true, options: schoolLevels.map(s => ({ value: s.id, label: s.name })) },
            { name: 'academic_year', label: t('teachers.form.academicYear'), type: 'select', required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
            { name: 'day_of_week',   label: t('teachers.form.dayOfWeek'),    type: 'select', required: true,
              options: [
                { value: 0, label: t('teachers.days.monday') }, { value: 1, label: t('teachers.days.tuesday') },
                { value: 2, label: t('teachers.days.wednesday') }, { value: 3, label: t('teachers.days.thursday') },
                { value: 4, label: t('teachers.days.friday') }, { value: 5, label: t('teachers.days.saturday') },
                { value: 6, label: t('teachers.days.sunday') },
              ]
            },
            { name: 'is_school_day',      label: t('teachers.form.isSchoolDay'),      type: 'checkbox' },
            { name: 'start_time',          label: t('teachers.form.startTime'),         type: 'time', required: false },
            { name: 'end_time',            label: t('teachers.form.endTime'),           type: 'time', required: false },
            { name: 'morning_break_start', label: t('teachers.form.morningBreakStart'), type: 'time', required: false },
            { name: 'morning_break_end',   label: t('teachers.form.morningBreakEnd'),   type: 'time', required: false },
            { name: 'lunch_break_start',   label: t('teachers.form.lunchBreakStart'),   type: 'time', required: false },
            { name: 'lunch_break_end',     label: t('teachers.form.lunchBreakEnd'),     type: 'time', required: false },
          ];

        case 'holidays':
          return [
            { name: 'name',          label: t('teachers.form.holidayName'),  type: 'text',     required: true, placeholder: t('teachers.placeholders.holidayName') },
            { name: 'date',          label: t('teachers.form.date'),         type: 'date',     required: true },
            { name: 'academic_year', label: t('teachers.form.academicYear'), type: 'select',   required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
            { name: 'school_level',  label: t('teachers.form.schoolLevel'),  type: 'select',   required: false,
              options: [{ value: '', label: t('teachers.form.allLevels') }, ...schoolLevels.map(s => ({ value: s.id, label: s.name }))]
            },
            { name: 'is_recurring',  label: t('teachers.form.isRecurring'),  type: 'checkbox' },
            { name: 'description',   label: t('teachers.form.description'),  type: 'textarea', required: false, placeholder: t('teachers.placeholders.description') },
          ];

        default: return [];
      }
    };

    return getFieldSets().map(field => (
      <div key={field.name}>
        <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>

        {field.type === 'select' ? (
          <select value={item[field.name] ?? ''} onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
            className={selectCls}>
            <option value="">{`— ${t('teachers.actions.select') || 'Select'} ${field.label} —`}</option>
            {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>

        ) : field.type === 'textarea' ? (
          <textarea value={item[field.name] ?? ''} onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
            className={inputCls} rows={3} placeholder={field.placeholder} />

        ) : field.type === 'checkbox' ? (
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input type="checkbox" checked={item[field.name] ?? false}
              onChange={(e) => setItem({ ...item, [field.name]: e.target.checked })}
              className="w-4 h-4 rounded accent-green-700" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{field.label}</span>
          </label>

        ) : (
          <input type={field.type} value={item[field.name] ?? ''}
            onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
            className={inputCls} placeholder={field.placeholder} />
        )}
      </div>
    ));
  };

  // ─────────────────────────────────────────────────────────
  // Table headers
  // ─────────────────────────────────────────────────────────
  const renderTableHeaders = () => {
    const headers = {
      teachers:       [t('teachers.table.fullName'), t('teachers.table.username'), t('teachers.table.email'), t('teachers.table.phone'), t('teachers.table.specialization'), t('teachers.table.status'), t('teachers.table.actions')],
      assignments:    [t('teachers.table.teacher'), t('teachers.table.subject'), t('teachers.table.classLevel'), t('teachers.table.hoursPerWeek'), t('teachers.table.status'), t('teachers.table.actions')],
      'day-settings': [t('teachers.table.schoolLevel'), t('teachers.table.day'), t('teachers.table.schedule'), t('teachers.table.actions')],
      holidays:       [t('teachers.table.holidayName'), t('teachers.table.date'), t('teachers.table.academicYear'), t('teachers.table.schoolLevel'), t('teachers.table.recurring'), t('teachers.table.actions')],
    };
    return headers[activeTab]?.map(header => (
      <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {header}
      </th>
    ));
  };

  // ─────────────────────────────────────────────────────────
  // Table rows
  // ─────────────────────────────────────────────────────────
  const renderTableRow = (item) => {
    switch (activeTab) {
      case 'teachers':
        return (
          <tr key={item.id} className="hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-colors">
            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{item.full_name}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.username}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.email}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.phone_number}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.specialization || '—'}</td>
            <td className="px-4 py-3">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(item.status)}`}>
                {item.status === 'active'    && <CheckCircle className="w-3 h-3" />}
                {item.status === 'inactive'  && <AlertCircle className="w-3 h-3" />}
                {item.status === 'on_leave'  && <Clock className="w-3 h-3" />}
                {item.status === 'suspended' && <AlertCircle className="w-3 h-3" />}
                {t(`teachers.status.${item.status}`)}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5">
                <button onClick={() => { setSelectedItem(item); setShowViewModal(true); }}
                  className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors" title={t('teachers.actions.view')}>
                  <Eye className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
                </button>
                <button onClick={() => { setEditItem(item); setShowEditModal(true); }}
                  className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title={t('teachers.actions.edit')}>
                  <Edit className="w-3.5 h-3.5 text-amber-600" />
                </button>
                <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={t('teachers.actions.delete')}>
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </td>
          </tr>
        );

      case 'assignments':
        return (
          <tr key={item.id} className="hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-colors">
            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{item.teacher_name}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.subject_name}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.class_level_name}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              {item.hours_per_week || '—'} {t('teachers.table.hoursPerWeekSuffix')}
            </td>
            <td className="px-4 py-3">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(item.status)}`}>
                {t(`teachers.status.${item.status}`)}
              </span>
            </td>
            <td className="px-4 py-3">
              <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={t('teachers.actions.delete')}>
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            </td>
          </tr>
        );

      case 'day-settings': {
        const dayNames = [
          t('teachers.days.monday'), t('teachers.days.tuesday'), t('teachers.days.wednesday'),
          t('teachers.days.thursday'), t('teachers.days.friday'), t('teachers.days.saturday'), t('teachers.days.sunday')
        ];
        return (
          <tr key={item.id} className="hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-colors">
            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{item.school_level_name}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{dayNames[item.day_of_week]}</td>
            <td className="px-4 py-3 text-sm">
              {item.is_school_day
                ? <span className="text-green-700 dark:text-green-400 font-medium">{item.start_time} — {item.end_time}</span>
                : <span className="text-red-500">{t('teachers.status.notSchoolDay')}</span>
              }
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5">
                <button onClick={() => { setEditItem(item); setShowEditModal(true); }}
                  className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title={t('teachers.actions.edit')}>
                  <Edit className="w-3.5 h-3.5 text-amber-600" />
                </button>
                <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={t('teachers.actions.delete')}>
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </td>
          </tr>
        );
      }

      case 'holidays':
        return (
          <tr key={item.id} className="hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-colors">
            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{item.name}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.date}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.academic_year_name || '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.school_level_name || t('teachers.form.allLevels')}</td>
            <td className="px-4 py-3">
              {item.is_recurring && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  {t('teachers.status.recurring')}
                </span>
              )}
            </td>
            <td className="px-4 py-3">
              <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={t('teachers.actions.delete')}>
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            </td>
          </tr>
        );

      default: return null;
    }
  };

  // ─────────────────────────────────────────────────────────
  // Timetable view — updated to green/amber palette
  // ─────────────────────────────────────────────────────────
  const renderTimetableView = () => {
    if (!timetableData) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-green-300 dark:text-green-700" />
          </div>
          <p className="text-gray-500 mb-4">{t('teachers.timetable.noData')}</p>
          <button onClick={handleGenerateTimetable}
            className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-medium transition-colors">
            {t('teachers.actions.generateTimetable')}
          </button>
        </div>
      );
    }

    const dayNames = [
      t('teachers.days.monday'), t('teachers.days.tuesday'), t('teachers.days.wednesday'),
      t('teachers.days.thursday'), t('teachers.days.friday'), t('teachers.days.saturday'), t('teachers.days.sunday')
    ];
    const dayKeys    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const timetables = timetableData.timetables || [];

    if (timetables.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-green-300 dark:text-green-700" />
          </div>
          <p className="text-gray-500">{t('teachers.timetable.noEntries')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {timetableData.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { label: t('teachers.timetable.totalTeachers'),   value: timetableData.summary.total_teachers,              bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-600 dark:text-green-400',  num: 'text-green-700 dark:text-green-300' },
              { label: t('teachers.timetable.withTimetable'),   value: timetableData.summary.teachers_with_timetable,     bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300',  num: 'text-green-800 dark:text-green-200' },
              { label: t('teachers.timetable.totalEntries'),    value: timetableData.summary.total_timetable_entries,     bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-600 dark:text-amber-400',  num: 'text-amber-700 dark:text-amber-300' },
              { label: t('teachers.timetable.avgPerTeacher'),   value: timetableData.summary.average_entries_per_teacher, bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300',  num: 'text-amber-800 dark:text-amber-200' },
            ].map(({ label, value, bg, text, num }) => (
              <div key={label} className={`${bg} rounded-xl p-3 border border-green-100/50 dark:border-white/5`}>
                <p className={`text-xs ${text} mb-1`}>{label}</p>
                <p className={`text-xl font-bold ${num}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {timetables.map((tt, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-green-700 to-green-900 px-4 py-3">
              <h3 className="text-white font-semibold">{tt.teacher.full_name}</h3>
              <p className="text-green-200 text-xs">
                {tt.total_weekly_hours} {t('teachers.timetable.hoursPerWeek')} • {tt.total_entries} {t('teachers.timetable.entries')}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-50 dark:bg-green-900/20">
                  <tr>
                    {[t('teachers.timetable.day'), t('teachers.timetable.startTime'), t('teachers.timetable.endTime'),
                      t('teachers.timetable.subject'), t('teachers.timetable.classLevel'), t('teachers.timetable.classroom')
                    ].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-green-700 dark:text-green-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {dayNames.map((day, di) => {
                    const entries = tt.timetable[dayKeys[di]] || [];
                    if (entries.length === 0) return (
                      <tr key={day} className="bg-gray-50/30 dark:bg-gray-700/20">
                        <td className="px-3 py-2 text-sm font-medium text-gray-500">{day}</td>
                        <td colSpan="5" className="px-3 py-2 text-sm text-gray-400 italic">{t('teachers.timetable.noClasses')}</td>
                      </tr>
                    );
                    return entries.map((entry, ei) => (
                      <tr key={`${day}-${ei}`} className="hover:bg-green-50/30 dark:hover:bg-green-900/10 transition-colors">
                        {ei === 0 && <td className="px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300" rowSpan={entries.length}>{day}</td>}
                        <td className="px-3 py-2 text-sm text-gray-500">{entry.start_time}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{entry.end_time}</td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-800 dark:text-white">{entry.subject_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{entry.class_level_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{entry.classroom_name}</td>
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
  // Holiday timeline
  // ─────────────────────────────────────────────────────────
  const renderHolidayTimeline = () => {
    if (holidays.length === 0) return null;
    const sorted = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date));
    return (
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800 dark:text-white">
          <CalendarIcon className="w-4 h-4 text-amber-600" /> {t('teachers.holidays.upcoming')}
        </h3>
        <div className="space-y-2">
          {sorted.slice(0, 5).map(holiday => (
            <div key={holiday.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div>
                <p className="font-medium text-sm text-gray-800 dark:text-white">{holiday.name}</p>
                <p className="text-xs text-gray-400">{holiday.date}</p>
              </div>
              {holiday.school_level_name && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  {holiday.school_level_name}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Report modal
  // ─────────────────────────────────────────────────────────
  const renderReportModal = () => {
    if (!reportData) return null;
    const summaryCards = [
      { label: t('teachers.stats.totalTeachers'),    value: reportData.summary.total_teachers,          bg: 'bg-green-50 dark:bg-green-900/20',   text: 'text-green-700 dark:text-green-400',  num: 'text-green-800 dark:text-green-300' },
      { label: t('teachers.stats.activeTeachers'),   value: reportData.summary.active_teachers,         bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-300',  num: 'text-green-800 dark:text-green-200' },
      { label: t('teachers.stats.totalAssignments'), value: reportData.summary.total_assignments,       bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-600 dark:text-amber-400',  num: 'text-amber-700 dark:text-amber-300' },
      { label: t('teachers.stats.timetableEntries'),value: reportData.summary.total_timetable_entries,  bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-300',  num: 'text-amber-800 dark:text-amber-200' },
    ];
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto border border-green-100 dark:border-green-900/30">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-green-700 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('teachers.reports.title')}</h2>
            </div>
            <button onClick={() => setShowReportModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-5">{t('teachers.reports.generatedOn')}: {reportData.generated_on}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {summaryCards.map(({ label, value, bg, text, num }) => (
              <div key={label} className={`${bg} rounded-xl p-3 border border-green-100/50 dark:border-white/5`}>
                <p className={`text-xs ${text} mb-1`}>{label}</p>
                <p className={`text-2xl font-bold ${num}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mb-5">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-800 dark:text-white">
              <Users className="w-4 h-4 text-green-700" /> {t('teachers.reports.teachersList')}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-green-50 dark:bg-green-900/20">
                  <tr>
                    {[t('teachers.table.fullName'), t('teachers.table.email'), t('teachers.table.phone'), t('teachers.table.status')].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-green-800 dark:text-green-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {reportData.teachers.slice(0, 10).map(teacher => (
                    <tr key={teacher.id}>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-white">{teacher.full_name}</td>
                      <td className="px-3 py-2 text-gray-500">{teacher.email}</td>
                      <td className="px-3 py-2 text-gray-500">{teacher.phone_number}</td>
                      <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded-full text-xs ${getStatusBadge(teacher.status)}`}>{teacher.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.teachers.length > 10 && (
                <p className="text-xs text-gray-400 p-2">
                  {t('teachers.reports.showingFirst')} 10 {t('teachers.reports.of')} {reportData.teachers.length}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => {
              const link = document.createElement('a');
              link.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2)));
              link.setAttribute('download', `teacher_report_${new Date().toISOString().split('T')[0]}.json`);
              link.click();
              toast.success(t('teachers.messages.exportSuccess'));
            }} className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> {t('teachers.actions.downloadReport')}
            </button>
            <button onClick={() => window.print()}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors">
              <Printer className="w-4 h-4" /> {t('teachers.actions.printReport')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Pagination
  // ─────────────────────────────────────────────────────────
  const getCurrentData = () => {
    switch (activeTab) {
      case 'teachers':     return teachers;
      case 'assignments':  return assignments;
      case 'day-settings': return daySettings;
      case 'holidays':     return holidays;
      default:             return [];
    }
  };

  const currentData    = getCurrentData();
  const totalPages     = Math.ceil(currentData.length / itemsPerPage);
  const paginatedData  = currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Shared filter select class
  const filterSelectCls = "px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent outline-none";

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">

        {/* ── Stats strip ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: t('teachers.stats.totalTeachers'),    value: stats.total_teachers,          from: 'from-green-700',  to: 'to-green-900'  },
            { label: t('teachers.stats.activeTeachers'),   value: stats.active_teachers,         from: 'from-green-500',  to: 'to-green-700'  },
            { label: t('teachers.stats.inactiveTeachers'), value: stats.inactive_teachers,       from: 'from-red-500',    to: 'to-red-700'    },
            { label: t('teachers.stats.totalAssignments'), value: stats.total_assignments,       from: 'from-amber-500',  to: 'to-amber-700'  },
            { label: t('teachers.stats.timetableEntries'),value: stats.total_timetable_entries,  from: 'from-amber-600',  to: 'to-green-700'  },
            { label: t('teachers.stats.totalHolidays'),    value: stats.total_holidays,          from: 'from-red-600',    to: 'to-red-800'    },
          ].map(({ label, value, from, to }) => (
            <div key={label} className={`bg-gradient-to-br ${from} ${to} rounded-2xl p-4 text-white shadow-lg`}>
              <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t('teachers.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{t('teachers.subtitle')}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-green-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
            </button>

            {activeTab === 'timetable' && <>
              <button onClick={handleGenerateTimetable} disabled={loading}
                className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-60">
                <Calendar className="w-4 h-4" /> {t('teachers.actions.generateTimetable')}
              </button>
              <button onClick={handleExportTimetable} disabled={loading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-60">
                <Download className="w-4 h-4" /> {t('teachers.actions.export')}
              </button>
            </>}

            {activeTab === 'reports' && (
              <button onClick={handleGenerateReport} disabled={loading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-60">
                <BarChart3 className="w-4 h-4" /> {t('teachers.actions.generateReport')}
              </button>
            )}

            {activeTab !== 'reports' && activeTab !== 'timetable' && (
              <button onClick={() => { setNewItem({}); setShowAddModal(true); }}
                className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium shadow-sm">
                <Plus className="w-4 h-4" />
                {`${t('teachers.actions.addNew') || '+'} ${currentTabLabel()}`}
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 flex gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon     = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSearchTerm(''); setFilters({}); }}
                className={`px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 rounded-xl whitespace-nowrap flex-1 justify-center
                  ${isActive
                    ? 'bg-green-700 text-white shadow-md'
                    : 'text-gray-500 hover:text-green-700 dark:text-gray-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10'
                  }`}
              >
                <Icon className="w-4 h-4" /> <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Filters & search ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder={t('teachers.actions.search')} value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {activeTab === 'teachers' && (
                <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className={filterSelectCls}>
                  <option value="">{t('teachers.filters.allStatus')}</option>
                  <option value="active">{t('teachers.status.active')}</option>
                  <option value="inactive">{t('teachers.status.inactive')}</option>
                  <option value="on_leave">{t('teachers.status.onLeave')}</option>
                </select>
              )}

              {activeTab === 'assignments' && <>
                <select value={filters.teacher} onChange={(e) => setFilters({...filters, teacher: e.target.value})} className={filterSelectCls}>
                  <option value="">{t('teachers.filters.allTeachers')}</option>
                  {teachers.map(tc => <option key={tc.id} value={tc.id}>{tc.full_name}</option>)}
                </select>
                <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className={filterSelectCls}>
                  <option value="">{t('teachers.filters.allStatus')}</option>
                  <option value="active">{t('teachers.status.active')}</option>
                  <option value="inactive">{t('teachers.status.inactive')}</option>
                  <option value="completed">{t('teachers.status.completed')}</option>
                </select>
              </>}

              {activeTab === 'timetable' && <>
                <select value={filters.teacher} onChange={(e) => setFilters({...filters, teacher: e.target.value})} className={filterSelectCls}>
                  <option value="">{t('teachers.filters.allTeachers')}</option>
                  {teachers.map(tc => <option key={tc.id} value={tc.id}>{tc.full_name}</option>)}
                </select>
                <select value={filters.academic_year} onChange={(e) => setFilters({...filters, academic_year: e.target.value})} className={filterSelectCls}>
                  <option value="">{t('teachers.filters.allAcademicYears')}</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
                <select value={filters.week} onChange={(e) => setFilters({...filters, week: e.target.value})} className={filterSelectCls}>
                  <option value="">{t('teachers.filters.allWeeks')}</option>
                  {[...Array(36)].map((_, i) => <option key={i + 1} value={i + 1}>{`${t('teachers.filters.weekPrefix') || 'Week'} ${i + 1}`}</option>)}
                </select>
                <select value={filters.day} onChange={(e) => setFilters({...filters, day: e.target.value})} className={filterSelectCls}>
                  <option value="">{t('teachers.filters.allDays')}</option>
                  {[['0',t('teachers.days.monday')],['1',t('teachers.days.tuesday')],['2',t('teachers.days.wednesday')],
                    ['3',t('teachers.days.thursday')],['4',t('teachers.days.friday')],['5',t('teachers.days.saturday')],['6',t('teachers.days.sunday')]
                  ].map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </>}

              {(activeTab === 'day-settings' || activeTab === 'holidays') && <>
                <select value={filters.school_level} onChange={(e) => setFilters({...filters, school_level: e.target.value})} className={filterSelectCls}>
                  <option value="">{t('teachers.filters.allSchoolLevels')}</option>
                  {schoolLevels.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={filters.academic_year} onChange={(e) => setFilters({...filters, academic_year: e.target.value})} className={filterSelectCls}>
                  <option value="">{t('teachers.filters.allAcademicYears')}</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </>}

              <button onClick={fetchData}
                className="px-3 py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-900/40 rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400">
                <RefreshCw className="w-4 h-4" /> {t('teachers.actions.refresh')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────── */}
        {activeTab === 'timetable' ? (
          renderTimetableView()
        ) : activeTab === 'reports' ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-green-700 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">{t('teachers.reports.clickToGenerate')}</h3>
            <p className="text-sm text-gray-400 mb-5">{t('teachers.reports.description')}</p>
            <button onClick={handleGenerateReport} disabled={loading}
              className="px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl inline-flex items-center gap-2 text-sm font-medium disabled:opacity-60 transition-colors">
              {loading ? <Spinner /> : <><BarChart3 className="w-4 h-4" /> {t('teachers.actions.generateReport')}</>}
            </button>
            {renderHolidayTimeline()}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/30">
                  <tr>{renderTableHeaders()}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center">
                        <div className="flex justify-center items-center gap-3">
                          <div className="w-6 h-6 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-gray-500">{t('teachers.messages.loading')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center">
                            <Info className="w-6 h-6 text-green-300 dark:text-green-700" />
                          </div>
                          <p className="text-sm text-gray-400">{t('teachers.messages.noData')}</p>
                          <button onClick={() => setShowAddModal(true)} className="text-green-700 hover:text-green-800 dark:text-green-400 text-sm font-semibold">
                            {t('teachers.actions.clickToAdd')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.map(renderTableRow)}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && currentData.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{t('teachers.pagination.showing')}</span>
                  <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-700 outline-none">
                    {[5, 10, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span>{t('teachers.pagination.perPage')}</span>
                  <span className="ml-2">
                    {`${t('teachers.pagination.total') || 'Total'}:`} <strong className="text-green-700 dark:text-green-400">{currentData.length}</strong> {t('teachers.pagination.records') || 'records'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 disabled:opacity-40 transition-colors">
                    {t('teachers.pagination.first')}
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 disabled:opacity-40 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm px-3 text-gray-600 dark:text-gray-400">
                    {`${t('teachers.pagination.page') || 'Page'} `}
                    <strong className="text-green-700 dark:text-green-400">{currentPage}</strong>
                    {` ${t('teachers.pagination.of') || 'of'} ${totalPages}`}
                  </span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                    className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 disabled:opacity-40 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 disabled:opacity-40 transition-colors">
                    {t('teachers.pagination.last')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Report modal ─────────────────────────────────────────── */}
        {showReportModal && renderReportModal()}

        {/* ── Add modal ────────────────────────────────────────────── */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-5 max-h-[90vh] overflow-y-auto border border-green-100 dark:border-green-900/30">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Plus className="w-4 h-4 text-green-700 dark:text-green-400" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {`${t('teachers.actions.add') || 'Add'} ${currentTabLabel()}`}
                  </h2>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-3">{renderFormFields(newItem, setNewItem)}</div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleCreate} disabled={loading}
                  className="flex-1 px-3 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl disabled:opacity-60 text-sm font-semibold transition-colors">
                  {loading ? <Spinner /> : t('teachers.actions.create')}
                </button>
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                  {t('teachers.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit modal ───────────────────────────────────────────── */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-5 max-h-[90vh] overflow-y-auto border border-amber-100 dark:border-amber-900/20">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Edit className="w-4 h-4 text-amber-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {`${t('teachers.actions.edit') || 'Edit'} ${currentTabLabel()}`}
                  </h2>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-3">{renderFormFields(editItem, setEditItem, true)}</div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleUpdate} disabled={loading}
                  className="flex-1 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl disabled:opacity-60 text-sm font-semibold transition-colors">
                  {loading ? <Spinner /> : t('teachers.actions.update')}
                </button>
                <button onClick={() => setShowEditModal(false)}
                  className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                  {t('teachers.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── View modal ───────────────────────────────────────────── */}
        {showViewModal && selectedItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-5 border border-green-100 dark:border-green-900/30">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Eye className="w-4 h-4 text-green-700 dark:text-green-400" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('teachers.actions.viewDetails')}</h2>
                </div>
                <button onClick={() => setShowViewModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {Object.entries(selectedItem).map(([key, value]) => {
                  if (['id','created_at','updated_at','user'].includes(key) || typeof value === 'object') return null;
                  const label   = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  let   display = value ?? '—';
                  if (typeof value === 'boolean') display = value ? t('teachers.status.yes') : t('teachers.status.no');
                  if (key === 'amount' && typeof value === 'number') display = `${new Intl.NumberFormat().format(value)} RWF`;
                  if (key === 'pass_mark' && value) display = `${value}%`;
                  return (
                    <div key={key} className="flex justify-between py-2 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="font-medium text-gray-500 dark:text-gray-400">{label}:</span>
                      <span className="text-gray-900 dark:text-white text-right ml-3">{String(display)}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setShowViewModal(false)}
                className="w-full mt-4 px-3 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-colors">
                {t('teachers.actions.close')}
              </button>
            </div>
          </div>
        )}

        {/* ── Delete modal ─────────────────────────────────────────── */}
        {showDeleteModal && selectedItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 border border-red-100 dark:border-red-900/30">
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{t('teachers.delete.title')}</h2>
                <p className="text-gray-500 text-sm mb-3">{t('teachers.delete.confirmation')}</p>
                {(selectedItem.full_name || selectedItem.name) && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-3 border border-red-100 dark:border-red-900/30">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                      {selectedItem.full_name || selectedItem.name}
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-400">{t('teachers.delete.warning')}</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleDelete} disabled={loading}
                  className="flex-1 px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors">
                  {loading ? <Spinner /> : <><Trash2 className="w-4 h-4" /> {t('teachers.actions.delete')}</>}
                </button>
                <button onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
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