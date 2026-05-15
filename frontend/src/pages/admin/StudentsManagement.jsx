import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, UserPlus, Edit, Trash2, Search, Eye, X,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  AlertCircle, GraduationCap, BookOpen, Calendar,
  Sun, Moon, Plus, Info, Mail, Phone, MapPin,
  Download, Printer, FileText, BarChart3, Hash,
  User, UserCheck, Shield, Baby, Link2, Link,
  BookOpenCheck, Filter, TrendingUp, Clock,
  Award, Activity, Star, Heart
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// API
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
  return config;
}, (error) => Promise.reject(error));

apiClient.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  transferred: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  graduated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const getStatusBadge = (s) => STATUS_COLORS[s] || STATUS_COLORS.inactive;

const Spinner = () => (
  <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
);

// Grade letter color mapping
const getGradeColor = (grade) => {
  if (!grade) return 'text-gray-400';
  if (grade === 'A+' || grade === 'A') return 'text-green-700 dark:text-green-400';
  if (grade === 'B+' || grade === 'B') return 'text-blue-700 dark:text-blue-400';
  if (grade === 'C+' || grade === 'C') return 'text-amber-700 dark:text-amber-400';
  if (grade === 'D') return 'text-orange-700 dark:text-orange-400';
  return 'text-red-700 dark:text-red-400';
};

// Discipline zone color mapping
const getDisciplineColor = (zone) => {
  if (zone === 'high') return 'text-green-700 dark:text-green-400';
  if (zone === 'medium') return 'text-amber-700 dark:text-amber-400';
  return 'text-gray-600 dark:text-gray-400';
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
const StudentManagement = () => {
  const { t } = useTranslation();

  // ── UI state ──────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Modal state ───────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedStudentForPerformance, setSelectedStudentForPerformance] = useState(null);
  const [newItem, setNewItem] = useState({});
  const [editItem, setEditItem] = useState({});
  const [reportData, setReportData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  // ── Pagination ────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [serverTotal, setServerTotal] = useState(0);

  // ── Data ──────────────────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);

  // ── Dropdowns ─────────────────────────────────────────────
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [allClassLevels, setAllClassLevels] = useState([]);

  // ── Per-context class level lists ─────────────────────────
  const [addClassLevels, setAddClassLevels] = useState([]);
  const [editClassLevels, setEditClassLevels] = useState([]);
  const [filterClassLevels, setFilterClassLevels] = useState([]);

  const [addClassLoading, setAddClassLoading] = useState(false);
  const [editClassLoading, setEditClassLoading] = useState(false);
  const [filterClassLoading, setFilterClassLoading] = useState(false);

  // ── Filters ───────────────────────────────────────────────
  const [filters, setFilters] = useState({
    status: '', class_level_id: '', school_level_id: '',
    academic_year_id: '', relationship_type: '', term_id: '',
  });

  // ── Stats ─────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total_students: 0, active_students: 0, inactive_students: 0,
    total_parents: 0, active_parents: 0,
  });

  // ─────────────────────────────────────────────────────────
  // Tabs — using green/amber palette (no red)
  // ─────────────────────────────────────────────────────────
  const tabs = [
    { id: 'students', label: t('students.tabs.students'), icon: GraduationCap },
    { id: 'parents', label: t('students.tabs.parents'), icon: Shield },
    { id: 'reports', label: t('students.tabs.reports'), icon: BarChart3 },
  ];

  const currentTabLabel = () => tabs.find(tab => tab.id === activeTab)?.label ?? '';

  // ── Fetch terms based on selected academic year ───────────────────
  const fetchTermsByAcademicYear = useCallback(async (academicYearId) => {
    if (!academicYearId) {
      setTerms([]);
      return [];
    }
    try {
      const res = await apiClient.get(`/academics/terms/?academic_year=${academicYearId}`);
      if (res.data.success) {
        const termsData = res.data.data?.results ?? res.data.data ?? [];
        setTerms(termsData);
        return termsData;
      }
      return [];
    } catch (err) {
      console.error('Error fetching terms:', err);
      return [];
    }
  }, []);

  // ── Fetch class levels for a given school level ID
  const fetchClassLevelsBySchoolLevel = useCallback(async (schoolLevelId) => {
    if (!schoolLevelId) return [];
    try {
      const res = await apiClient.get(`/academics/school-levels/${schoolLevelId}/class-levels/`);
      if (res.data.success) return res.data.data?.results ?? res.data.data ?? [];
      return [];
    } catch (err) {
      return [];
    }
  }, []);

  // ── Fetch student performance data
  const fetchStudentPerformance = useCallback(async (studentId, academicYearId, termId) => {
    setLoadingPerformance(true);
    try {
      let url = `/academics-records/performance/student/${studentId}/`;
      const params = new URLSearchParams();
      if (academicYearId) params.append('academic_year_id', academicYearId);
      if (termId) params.append('term_id', termId);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await apiClient.get(url);
      if (res.data.success) {
        setPerformanceData(res.data.data);
        return res.data.data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching performance:', err);
      toast.error(t('students.messages.performanceError'));
      return null;
    } finally {
      setLoadingPerformance(false);
    }
  }, [t]);

  // ── Fetch base dropdowns
  const fetchDropdownData = useCallback(async () => {
    try {
      const [yearsRes, schoolsRes, classesRes] = await Promise.all([
        apiClient.get('/academics/academic-years/'),
        apiClient.get('/academics/school-levels/'),
        apiClient.get('/academics/class-levels/'),
      ]);
      if (yearsRes.data.success) setAcademicYears(yearsRes.data.data?.results ?? yearsRes.data.data ?? []);
      if (schoolsRes.data.success) setSchoolLevels(schoolsRes.data.data?.results ?? schoolsRes.data.data ?? []);
      if (classesRes.data.success) {
        const all = classesRes.data.data?.results ?? classesRes.data.data ?? [];
        setAllClassLevels(all);
        setAddClassLevels(all);
        setEditClassLevels(all);
        setFilterClassLevels(all);
      }
    } catch (err) { }
  }, []);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Update terms when academic year filter changes
  useEffect(() => {
    if (filters.academic_year_id) {
      fetchTermsByAcademicYear(filters.academic_year_id);
    } else {
      setTerms([]);
      setFilters(prev => ({ ...prev, term_id: '' }));
    }
  }, [filters.academic_year_id, fetchTermsByAcademicYear]);

  // Update class levels for add modal
  useEffect(() => {
    const sid = newItem.current_school_level_id;
    if (!sid) { setAddClassLevels(allClassLevels); setNewItem(prev => ({ ...prev, current_class_level_id: '' })); return; }
    setAddClassLoading(true);
    fetchClassLevelsBySchoolLevel(sid).then((levels) => {
      setAddClassLevels(levels);
      setNewItem(prev => {
        const ok = levels.some(l => String(l.id) === String(prev.current_class_level_id));
        return ok ? prev : { ...prev, current_class_level_id: '' };
      });
    }).finally(() => setAddClassLoading(false));
  }, [newItem.current_school_level_id, allClassLevels, fetchClassLevelsBySchoolLevel]);

  // Update class levels for edit modal
  useEffect(() => {
    const sid = editItem.current_school_level_id;
    if (!sid) { setEditClassLevels(allClassLevels); return; }
    setEditClassLoading(true);
    fetchClassLevelsBySchoolLevel(sid).then((levels) => {
      setEditClassLevels(levels);
      setEditItem(prev => {
        const ok = levels.some(l => String(l.id) === String(prev.current_class_level_id));
        return ok ? prev : { ...prev, current_class_level_id: '' };
      });
    }).finally(() => setEditClassLoading(false));
  }, [editItem.current_school_level_id, allClassLevels, fetchClassLevelsBySchoolLevel]);

  // Update class levels for filter
  useEffect(() => {
    const sid = filters.school_level_id;
    if (!sid) { setFilterClassLevels(allClassLevels); setFilters(prev => ({ ...prev, class_level_id: '' })); return; }
    setFilterClassLoading(true);
    fetchClassLevelsBySchoolLevel(sid).then((levels) => {
      setFilterClassLevels(levels);
      setFilters(prev => {
        const ok = levels.some(l => String(l.id) === String(prev.class_level_id));
        return ok ? prev : { ...prev, class_level_id: '' };
      });
    }).finally(() => setFilterClassLoading(false));
  }, [filters.school_level_id, allClassLevels, fetchClassLevelsBySchoolLevel]);

  const openEditModal = useCallback((item) => {
    const normalised = {
      ...item,
      current_school_level_id: item.current_school_level_id ?? item.current_school_level?.id ?? '',
      current_class_level_id: item.current_class_level_id ?? item.current_class_level?.id ?? '',
      current_academic_year_id: item.current_academic_year_id ?? item.current_academic_year?.id ?? '',
    };
    setEditItem(normalised);
    setShowEditModal(true);
  }, []);

  const openPerformanceModal = useCallback(async (student) => {
    setSelectedStudentForPerformance(student);
    setShowPerformanceModal(true);
    const academicYearId = filters.academic_year_id || (academicYears.find(y => y.is_current)?.id);
    const termId = filters.term_id;
    await fetchStudentPerformance(student.id, academicYearId, termId);
  }, [filters.academic_year_id, filters.term_id, academicYears, fetchStudentPerformance]);

  // ── Fetch main data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (activeTab === 'reports') return;
    setLoading(true);
    try {
      let url = '';
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', currentPage);
      params.append('page_size', itemsPerPage);

      if (activeTab === 'students') {
        url = '/students/';
        if (filters.status) params.append('status', filters.status);
        if (filters.class_level_id) params.append('class_level_id', filters.class_level_id);
        if (filters.school_level_id) params.append('school_level_id', filters.school_level_id);
        if (filters.academic_year_id) params.append('academic_year_id', filters.academic_year_id);
        if (filters.term_id) params.append('term_id', filters.term_id);
      } else if (activeTab === 'parents') {
        url = '/students/parents/';
        if (filters.status) params.append('status', filters.status);
        if (filters.relationship_type) params.append('relationship_type', filters.relationship_type);
      }

      const res = await apiClient.get(`${url}?${params.toString()}`);
      if (res.data.success) {
        const d = res.data.data;
        const results = d?.results ?? (Array.isArray(d) ? d : []);
        setServerTotal(d?.count ?? results.length);
        if (activeTab === 'students') {
          setStudents(results);
          setStats(prev => ({
            ...prev,
            total_students: d?.count ?? results.length,
            active_students: results.filter(s => s.status === 'active').length,
            inactive_students: results.filter(s => s.status === 'inactive').length,
          }));
        } else {
          setParents(results);
          setStats(prev => ({
            ...prev,
            total_parents: d?.count ?? results.length,
            active_parents: results.filter(p => p.status === 'active').length,
          }));
        }
      } else {
        toast.error(res.data.message || t('students.messages.fetchError'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, filters, currentPage, itemsPerPage, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'students' ? '/students/create/' : '/students/parents/create/';
      const res = await apiClient.post(url, newItem);
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.createSuccess'));
        setShowAddModal(false); setNewItem({}); fetchData();
      } else {
        toast.error(Object.values(res.data.errors || {}).flat()[0] || res.data.message || t('students.messages.createError'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || Object.values(err.response?.data?.errors || {}).flat()[0] || t('students.messages.createError'));
    } finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'students' ? `/students/${editItem.id}/update/` : `/students/parents/${editItem.id}/update/`;
      const payload = { ...editItem }; delete payload.id;
      const res = await apiClient.patch(url, payload);
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.updateSuccess'));
        setShowEditModal(false); setEditItem({}); fetchData();
      } else {
        toast.error(Object.values(res.data.errors || {}).flat()[0] || res.data.message || t('students.messages.updateError'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.updateError'));
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'students' ? `/students/${selectedItem.id}/delete/` : `/students/parents/${selectedItem.id}/delete/`;
      const res = await apiClient.delete(url);
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.deleteSuccess'));
        setShowDeleteModal(false); setSelectedItem(null); fetchData();
      } else {
        toast.error(res.data.message || t('students.messages.deleteError'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.deleteError'));
    } finally { setLoading(false); }
  };

  const handleLinkParent = async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/students/parents/create/', { ...newItem, student_ids: [selectedItem.id] });
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.parentLinked'));
        setShowLinkModal(false); setNewItem({}); fetchData();
      } else {
        toast.error(Object.values(res.data.errors || {}).flat()[0] || res.data.message || t('students.messages.createError'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.createError'));
    } finally { setLoading(false); }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const [studRes, parRes] = await Promise.all([
        apiClient.get('/students/?page_size=1000'),
        apiClient.get('/students/parents/?page_size=1000'),
      ]);
      const studArr = studRes.data.data?.results ?? studRes.data.data ?? [];
      const parArr = parRes.data.data?.results ?? parRes.data.data ?? [];
      setReportData({
        generated_on: new Date().toLocaleString(),
        students: studArr, parents: parArr,
        summary: {
          total_students: studArr.length,
          active_students: studArr.filter(s => s.status === 'active').length,
          inactive_students: studArr.filter(s => s.status === 'inactive').length,
          total_parents: parArr.length,
          active_parents: parArr.filter(p => p.status === 'active').length,
          students_with_parents: studArr.filter(s => s.parents_count > 0).length,
        },
      });
      setShowReportModal(true);
      toast.success(t('students.messages.reportGenerated'));
    } catch (err) {
      toast.error(t('students.messages.reportError'));
    } finally { setLoading(false); }
  };

  // ── Form fields ─────────────────────────────────────────────────────────────
  const getStudentFields = (classLevels, classLevelsLoading) => [
    { name: 'full_name', label: t('students.form.fullName'), type: 'text', required: true, placeholder: t('students.placeholders.fullName') },
    { name: 'email', label: t('students.form.email'), type: 'email', required: false, placeholder: 'student@example.com' },
    { name: 'phone_number', label: t('students.form.phone'), type: 'tel', required: false, placeholder: '+250XXXXXXXXX' },
    { name: 'birth_date', label: t('students.form.birthDate'), type: 'date', required: false },
    { name: 'current_academic_year_id', label: t('students.form.academicYear'), type: 'select', required: false, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
    { name: 'current_school_level_id', label: t('students.form.schoolLevel'), type: 'select', required: false, options: schoolLevels.map(s => ({ value: s.id, label: s.name })) },
    {
      name: 'current_class_level_id',
      label: t('students.form.classLevel'),
      type: 'select', required: false,
      loading: classLevelsLoading,
      options: classLevels.map(c => ({ value: c.id, label: c.name })),
      hint: classLevels.length === 0 && !classLevelsLoading ? (t('students.hints.selectSchoolLevelFirst') || 'Select a school level first') : null,
    },
  ];

  const getStudentEditFields = (classLevels, classLevelsLoading) => [
    ...getStudentFields(classLevels, classLevelsLoading),
    {
      name: 'status', label: t('students.form.status'), type: 'select', required: true,
      options: [
        { value: 'active', label: t('students.status.active') },
        { value: 'inactive', label: t('students.status.inactive') },
        { value: 'transferred', label: t('students.status.transferred') },
        { value: 'graduated', label: t('students.status.graduated') }
      ],
    },
  ];

  const getParentFields = () => [
    { name: 'full_name', label: t('students.form.fullName'), type: 'text', required: true, placeholder: t('students.placeholders.fullName') },
    { name: 'phone_number', label: t('students.form.phone'), type: 'tel', required: true, placeholder: '+250XXXXXXXXX' },
    { name: 'email', label: t('students.form.email'), type: 'email', required: true, placeholder: 'parent@example.com' },
    { name: 'physical_address', label: t('students.form.physicalAddress'), type: 'textarea', required: false, placeholder: t('students.placeholders.address') },
    {
      name: 'relationship_type', label: t('students.form.relationshipType'), type: 'select', required: true,
      options: [
        { value: 'father', label: t('students.relationship.father') },
        { value: 'mother', label: t('students.relationship.mother') },
        { value: 'guardian', label: t('students.relationship.guardian') },
        { value: 'other', label: t('students.relationship.other') },
      ],
    },
    { name: 'student_ids', label: t('students.form.linkedStudents'), type: 'multi-student', required: true },
  ];

  const getParentEditFields = () => [
    { name: 'full_name', label: t('students.form.fullName'), type: 'text', required: true },
    { name: 'phone_number', label: t('students.form.phone'), type: 'tel', required: true },
    { name: 'email', label: t('students.form.email'), type: 'email', required: true },
    { name: 'physical_address', label: t('students.form.physicalAddress'), type: 'textarea', required: false },
    {
      name: 'relationship_type', label: t('students.form.relationshipType'), type: 'select', required: true,
      options: [
        { value: 'father', label: t('students.relationship.father') },
        { value: 'mother', label: t('students.relationship.mother') },
        { value: 'guardian', label: t('students.relationship.guardian') },
        { value: 'other', label: t('students.relationship.other') },
      ],
    },
    {
      name: 'status', label: t('students.form.status'), type: 'select', required: true,
      options: [
        { value: 'active', label: t('students.status.active') },
        { value: 'inactive', label: t('students.status.inactive') }
      ],
    },
  ];

  // ── Shared input classes (green focus ring) ────────────────────────────────
  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent text-sm outline-none";
  const selectCls = `${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`;

  const renderFormFields = (fields, item, setItem) => fields.map(field => (
    <div key={field.name}>
      <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300 uppercase tracking-wide">
        {field.label}{field.required && <span className="text-green-600 ml-0.5">*</span>}
      </label>

      {field.type === 'select' ? (
        <div className="relative">
          <select value={item[field.name] ?? ''} onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
            disabled={field.loading} className={selectCls}>
            <option value="">{field.loading ? (t('students.actions.loading') || 'Loading…') : `— ${t('students.actions.select')} —`}</option>
            {!field.loading && field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          {field.loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {field.hint && !field.loading && <p className="text-xs text-gray-400 mt-1 italic">{field.hint}</p>}
        </div>
      ) : field.type === 'textarea' ? (
        <textarea value={item[field.name] ?? ''} onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
          className={inputCls} rows={3} placeholder={field.placeholder} />
      ) : field.type === 'multi-student' ? (
        <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
          {students.length === 0
            ? <p className="text-xs text-gray-400 italic">{t('students.messages.noStudentsForLink')}</p>
            : students.map(s => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-green-50 dark:hover:bg-green-900/10 rounded px-1">
                <input type="checkbox" checked={(item.student_ids || []).includes(s.id)}
                  onChange={(e) => {
                    const cur = item.student_ids || [];
                    setItem({ ...item, student_ids: e.target.checked ? [...cur, s.id] : cur.filter(id => id !== s.id) });
                  }}
                  className="w-3.5 h-3.5 text-green-700 rounded focus:ring-green-700"
                />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {s.full_name} <span className="text-gray-400">({s.roll_number})</span>
                </span>
              </label>
            ))
          }
        </div>
      ) : (
        <input type={field.type} value={item[field.name] ?? ''} onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
          className={inputCls} placeholder={field.placeholder} />
      )}
    </div>
  ));

  // ── Table headers ───────────────────────────────────────────────────────────
  const renderTableHeaders = () => {
    const headers = {
      students: [t('students.table.rollNumber'), t('students.table.fullName'), t('students.table.username'), t('students.table.email'), t('students.table.phone'), t('students.table.classLevel'), t('students.table.schoolLevel'), t('students.table.parents'), t('students.table.status'), t('students.table.actions')],
      parents: [t('students.table.fullName'), t('students.table.username'), t('students.table.phone'), t('students.table.email'), t('students.table.relationship'), t('students.table.students'), t('students.table.status'), t('students.table.actions')],
    };
    return (headers[activeTab] || []).map(h => (
      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {h}
      </th>
    ));
  };

  // ── Table rows ──────────────────────────────────────────────────────────────
  const renderTableRow = (item) => {
    if (activeTab === 'students') return (
      <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
        <td className="px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-mono text-xs font-semibold">
            <Hash className="w-3 h-3" />{item.roll_number}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{item.full_name}</td>
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-mono text-xs">
            <User className="w-3 h-3" />{item.user?.username || '—'}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.email || '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.phone_number || '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.current_class_level?.name || '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.current_school_level?.name || '—'}</td>
        <td className="px-4 py-3 text-sm">
          <button
            onClick={() => openPerformanceModal(item)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-200 transition-colors"
            title={t('students.actions.viewPerformance')}
          >
            <TrendingUp className="w-3 h-3" />{item.parents_count ?? 0}
          </button>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(item.status)}`}>
            {item.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {t(`students.status.${item.status}`)}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1.5">
            <button onClick={() => { setSelectedItem(item); setShowViewModal(true); }}
              className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors" title={t('students.actions.view')}>
              <Eye className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
            </button>
            <button onClick={() => openEditModal(item)}
              className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title={t('students.actions.edit')}>
              <Edit className="w-3.5 h-3.5 text-amber-600" />
            </button>
            <button onClick={() => { setSelectedItem(item); setNewItem({}); setShowLinkModal(true); }}
              className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title={t('students.actions.addParent')}>
              <Link2 className="w-3.5 h-3.5 text-green-600" />
            </button>
            <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={t('students.actions.delete')}>
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        </td>
      </tr>
    );

    if (activeTab === 'parents') return (
      <tr key={item.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{item.full_name}</td>
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-mono text-xs">
            <User className="w-3 h-3" />{item.user?.username || '—'}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.phone_number}</td>
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.email}</td>
        <td className="px-4 py-3 text-sm">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium capitalize">
            {t(`students.relationship.${item.relationship_type}`) || item.relationship_type}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
            <GraduationCap className="w-3 h-3" />{item.students_count ?? 0}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(item.status)}`}>
            {item.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {t(`students.status.${item.status}`)}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1.5">
            <button onClick={() => { setSelectedItem(item); setShowViewModal(true); }}
              className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors" title={t('students.actions.view')}>
              <Eye className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
            </button>
            <button onClick={() => openEditModal(item)}
              className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title={t('students.actions.edit')}>
              <Edit className="w-3.5 h-3.5 text-amber-600" />
            </button>
            <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={t('students.actions.delete')}>
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        </td>
      </tr>
    );

    return null;
  };

  // ── Performance Modal Content ───────────────────────────────────────────────
  const renderPerformanceContent = () => {
    if (!performanceData) return null;

    const { academic_performance, discipline } = performanceData;
    const academic = academic_performance || {};
    const disc = discipline || {};

    return (
      <div className="space-y-5">
        {/* Student Info Header */}
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-xl border border-green-100 dark:border-green-900/30">
          <div className="w-14 h-14 rounded-full bg-green-700 flex items-center justify-center text-white text-xl font-bold ring-2 ring-green-700/30">
            {selectedStudentForPerformance?.full_name?.[0] ?? 'S'}
          </div>
          <div>
            <p className="font-bold text-lg text-gray-900 dark:text-white">{selectedStudentForPerformance?.full_name}</p>
            <p className="text-xs font-mono text-green-700 dark:text-green-400">{selectedStudentForPerformance?.roll_number}</p>
            <p className="text-xs text-gray-500 mt-1">
              {selectedStudentForPerformance?.current_class_level?.name} • {selectedStudentForPerformance?.current_school_level?.name}
            </p>
          </div>
        </div>

        {/* Performance Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-green-700 dark:text-green-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase">{t('students.performance.overallAverage')}</p>
            </div>
            <p className={`text-2xl font-bold ${getGradeColor(academic?.grade_letter)}`}>
              {academic?.overall_average ? `${academic.overall_average.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">{academic?.grade_letter || 'No grades yet'}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase">{t('students.performance.disciplineScore')}</p>
            </div>
            <p className={`text-2xl font-bold ${getDisciplineColor(disc?.discipline_zone)}`}>
              {disc?.discipline_score ? `${disc.discipline_score.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1 capitalize">{disc?.discipline_zone || 'No data'}</p>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase">{t('students.performance.attendanceSummary')}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">{disc?.present || 0}</p>
              <p className="text-xs text-gray-400">{t('students.performance.present')}</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{disc?.absent || 0}</p>
              <p className="text-xs text-gray-400">{t('students.performance.absent')}</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{disc?.late || 0}</p>
              <p className="text-xs text-gray-400">{t('students.performance.late')}</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{disc?.total_sessions || 0}</p>
              <p className="text-xs text-gray-400">{t('students.performance.total')}</p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('students.performance.attendanceRate')}</span>
              <span className={`font-semibold ${disc?.attendance_rate >= 80 ? 'text-green-700' : disc?.attendance_rate >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                {disc?.attendance_rate?.toFixed(1) || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Subject Performance */}
        {academic?.subject_results?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-green-700 dark:text-green-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase">{t('students.performance.subjectPerformance')}</p>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {academic.subject_results.map((subject, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{subject.subject_name}</p>
                    <p className="text-xs text-gray-400">{subject.subject_code}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${getGradeColor(subject.grade_letter)}`}>
                      {subject.final_percentage?.toFixed(1) || 0}%
                    </p>
                    <p className="text-xs text-gray-400">{subject.grade_letter || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subject Discipline */}
        {performanceData?.subject_discipline && Object.keys(performanceData.subject_discipline).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase">{t('students.performance.subjectDiscipline')}</p>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Object.entries(performanceData.subject_discipline).slice(0, 5).map(([subject, data]) => (
                <div key={subject} className="flex justify-between items-center py-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{subject}</span>
                  <span className={`text-xs font-semibold ${getDisciplineColor(data.discipline_zone)}`}>
                    {data.discipline_score?.toFixed(1) || 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">{t('students.performance.subjectsPassed')}</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{academic?.subjects_passed || 0}</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">{t('students.performance.subjectsFailed')}</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{academic?.subjects_failed || 0}</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-2">
          {t('students.performance.calculatedRealTime')}
        </p>
      </div>
    );
  };

  // ── View modal content (with parent details) ────────────────────────────────
  const renderViewContent = () => {
    if (!selectedItem) return null;
    if (activeTab === 'students') return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-xl border border-green-100 dark:border-green-900/30">
          <div className="w-14 h-14 rounded-full bg-green-700 flex items-center justify-center text-white text-lg font-bold ring-2 ring-green-700/30">
            {selectedItem.full_name?.[0] ?? 'S'}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{selectedItem.full_name}</p>
            <p className="text-xs font-mono text-green-700 dark:text-green-400">{selectedItem.roll_number}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              <User className="w-3 h-3 inline mr-1" />
              {selectedItem.user?.username || t('students.labels.noUserAccount')}
            </p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadge(selectedItem.status)}`}>
            {t(`students.status.${selectedItem.status}`)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            [t('students.table.email'), selectedItem.email || '—'],
            [t('students.table.phone'), selectedItem.phone_number || '—'],
            [t('students.form.birthDate'), selectedItem.birth_date || '—'],
            [t('students.table.age'), selectedItem.age ?? '—'],
            [t('students.table.schoolLevel'), selectedItem.current_school_level?.name || '—'],
            [t('students.table.classLevel'), selectedItem.current_class_level?.name || '—'],
            [t('students.form.academicYear'), selectedItem.current_academic_year?.name || '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="font-medium text-gray-800 dark:text-white text-xs">{value}</p>
            </div>
          ))}
        </div>

        {/* Parents Section */}
        {selectedItem.parents?.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> {t('students.tabs.parents')}
            </p>
            <div className="space-y-2">
              {selectedItem.parents.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
                  <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs font-bold">
                    {p.full_name?.[0] ?? 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-400">{p.phone_number}</p>
                    <p className="text-xs text-gray-400 truncate">{p.email}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full capitalize">
                    {t(`students.relationship.${p.relationship_type}`) || p.relationship_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <p className="text-xs text-gray-400">{t('students.messages.noParentsLinked')}</p>
            <button
              onClick={() => { setShowViewModal(false); setSelectedItem(selectedItem); setShowLinkModal(true); }}
              className="mt-2 text-xs text-green-700 hover:text-green-800 font-medium"
            >
              + {t('students.actions.addParent')}
            </button>
          </div>
        )}

        {/* Performance Summary Preview */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> {t('students.performance.quickSummary')}
          </p>
          <button
            onClick={() => { setShowViewModal(false); openPerformanceModal(selectedItem); }}
            className="w-full py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            {t('students.actions.viewFullPerformance')}
          </button>
        </div>
      </div>
    );

    if (activeTab === 'parents') return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-green-50 dark:from-amber-900/20 dark:to-green-900/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
          <div className="w-14 h-14 rounded-full bg-amber-600 flex items-center justify-center text-white text-lg font-bold">
            {selectedItem.full_name?.[0] ?? 'P'}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{selectedItem.full_name}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 capitalize">
              {t(`students.relationship.${selectedItem.relationship_type}`)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              <User className="w-3 h-3 inline mr-1" />
              {selectedItem.user?.username || t('students.labels.noUserAccount')}
            </p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadge(selectedItem.status)}`}>
            {t(`students.status.${selectedItem.status}`)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            [t('students.table.phone'), selectedItem.phone_number],
            [t('students.table.email'), selectedItem.email],
            [t('students.form.physicalAddress'), selectedItem.physical_address || '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="font-medium text-gray-800 dark:text-white text-xs break-all">{value}</p>
            </div>
          ))}
        </div>

        {selectedItem.students?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5" /> {t('students.tabs.students')}
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedItem.students.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20">
                  <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-bold">
                    {s.full_name?.[0] ?? 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{s.full_name}</p>
                    <p className="text-xs font-mono text-green-700 dark:text-green-400">{s.roll_number}</p>
                    <p className="text-xs text-gray-400">{s.current_class_level?.name || '—'}</p>
                  </div>
                  <button
                    onClick={() => { setShowViewModal(false); openPerformanceModal(s); }}
                    className="p-1.5 rounded-lg hover:bg-green-100 transition-colors"
                    title={t('students.actions.viewPerformance')}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-green-600" />
                  </button>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(s.status)}`}>
                    {t(`students.status.${s.status}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Report modal ────────────────────────────────────────────────────────────
  const renderReportModal = () => {
    if (!reportData) return null;
    const summaryCards = [
      { label: t('students.stats.totalStudents'), value: reportData.summary.total_students, bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-300', num: 'text-green-700 dark:text-green-400' },
      { label: t('students.stats.activeStudents'), value: reportData.summary.active_students, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', num: 'text-green-800 dark:text-green-300' },
      { label: t('students.stats.inactiveStudents'), value: reportData.summary.inactive_students, bg: 'bg-gray-100 dark:bg-gray-700/50', text: 'text-gray-600 dark:text-gray-400', num: 'text-gray-700 dark:text-gray-300' },
      { label: t('students.stats.totalParents'), value: reportData.summary.total_parents, bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', num: 'text-amber-800 dark:text-amber-300' },
      { label: t('students.stats.activeParents'), value: reportData.summary.active_parents, bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', num: 'text-amber-800 dark:text-amber-300' },
      { label: t('students.stats.studentsWithParents'), value: reportData.summary.students_with_parents, bg: 'bg-gray-50 dark:bg-gray-700/50', text: 'text-gray-500 dark:text-gray-400', num: 'text-gray-700 dark:text-gray-300' },
    ];
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto border border-green-100 dark:border-green-900/30">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-green-700 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('students.reports.title')}</h2>
            </div>
            <button onClick={() => setShowReportModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-5">{t('students.reports.generatedOn')}: {reportData.generated_on}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {summaryCards.map(({ label, value, bg, text, num }) => (
              <div key={label} className={`${bg} rounded-xl p-3 border border-green-100/50 dark:border-white/5`}>
                <p className={`text-xs ${text} mb-1`}>{label}</p>
                <p className={`text-2xl font-bold ${num}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mb-5">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-800 dark:text-white">
              <GraduationCap className="w-4 h-4 text-green-700" /> {t('students.reports.studentsList')}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-green-50 dark:bg-green-900/20">
                  <tr>
                    {[t('students.table.rollNumber'), t('students.table.fullName'), t('students.table.username'), t('students.table.classLevel'), t('students.table.status')].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-green-800 dark:text-green-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {reportData.students.slice(0, 8).map(s => (
                    <tr key={s.id}>
                      <td className="px-3 py-2 font-mono text-green-700 dark:text-green-400">{s.roll_number}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-white">{s.full_name}</td>
                      <td className="px-3 py-2 text-gray-500">{s.user?.username || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{s.current_class_level?.name || '—'}</td>
                      <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded-full text-xs ${getStatusBadge(s.status)}`}>{t(`students.status.${s.status}`)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.students.length > 8 && (
                <p className="text-xs text-gray-400 p-2">{t('students.reports.showingFirst')} 8 {t('students.reports.of')} {reportData.students.length}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => {
              const dataStr = JSON.stringify(reportData, null, 2);
              const link = document.createElement('a');
              link.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr));
              link.setAttribute('download', `student_report_${new Date().toISOString().split('T')[0]}.json`);
              link.click();
              toast.success(t('students.messages.exportSuccess'));
            }} className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> {t('students.actions.downloadReport')}
            </button>
            <button onClick={() => window.print()}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors">
              <Printer className="w-4 h-4" /> {t('students.actions.printReport')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Performance Modal ────────────────────────────────────────────────────────
  const renderPerformanceModal = () => {
    if (!showPerformanceModal) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-green-100 dark:border-green-900/30">
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-5 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <BarChart3 className="w-5 h-5 text-green-700 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('students.performance.title')}</h2>
            </div>
            <button onClick={() => { setShowPerformanceModal(false); setPerformanceData(null); setSelectedStudentForPerformance(null); }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-5">
            {loadingPerformance ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">{t('students.messages.loadingPerformance')}</p>
              </div>
            ) : (
              renderPerformanceContent()
            )}
          </div>

          <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-5 py-3">
            <button onClick={() => { setShowPerformanceModal(false); setPerformanceData(null); }}
              className="w-full py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-colors">
              {t('students.actions.close')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Pagination ──────────────────────────────────────────────────────────────
  const currentData = activeTab === 'students' ? students : parents;
  const totalPages = Math.ceil(serverTotal / itemsPerPage);

  // ── Shared modal wrapper ────────────────────────────────────────────────────
  const ModalWrapper = ({ children, maxW = 'max-w-md' }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ${maxW} w-full mx-4 p-5 max-h-[90vh] overflow-y-auto border border-green-100 dark:border-green-900/30`}>
        {children}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: t('students.stats.totalStudents'), value: stats.total_students, from: 'from-green-700', to: 'to-green-900' },
            { label: t('students.stats.activeStudents'), value: stats.active_students, from: 'from-green-500', to: 'to-green-700' },
            { label: t('students.stats.inactiveStudents'), value: stats.inactive_students, from: 'from-gray-500', to: 'to-gray-700' },
            { label: t('students.stats.totalParents'), value: stats.total_parents, from: 'from-amber-500', to: 'to-amber-700' },
            { label: t('students.stats.activeParents'), value: stats.active_parents, from: 'from-amber-600', to: 'to-green-700' },
          ].map(({ label, value, from, to }) => (
            <div key={label} className={`bg-gradient-to-br ${from} ${to} rounded-2xl p-4 text-white shadow-lg`}>
              <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Page header */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t('students.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{t('students.subtitle')}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-green-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
            </button>
            {activeTab === 'reports' && (
              <button onClick={handleGenerateReport} disabled={loading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-60">
                <BarChart3 className="w-4 h-4" /> {t('students.actions.generateReport')}
              </button>
            )}
            {activeTab !== 'reports' && (
              <button onClick={() => { setNewItem({}); setShowAddModal(true); }}
                className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium shadow-sm">
                <Plus className="w-4 h-4" />
                {`${t('students.actions.addNew')} ${currentTabLabel()}`}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 flex gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
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
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters & search */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder={t('students.actions.search')} value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Status */}
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none">
                <option value="">{t('students.filters.allStatus')}</option>
                <option value="active">{t('students.status.active')}</option>
                <option value="inactive">{t('students.status.inactive')}</option>
                <option value="transferred">{t('students.status.transferred')}</option>
                <option value="graduated">{t('students.status.graduated')}</option>
              </select>

              {activeTab === 'students' && (
                <>
                  <select value={filters.academic_year_id}
                    onChange={(e) => { setFilters(prev => ({ ...prev, academic_year_id: e.target.value, term_id: '' })); setCurrentPage(1); }}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none">
                    <option value="">{t('students.filters.allAcademicYears')}</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>

                  {/* Term filter - depends on selected academic year */}
                  <select value={filters.term_id}
                    onChange={(e) => { setFilters(prev => ({ ...prev, term_id: e.target.value })); setCurrentPage(1); }}
                    disabled={!filters.academic_year_id || terms.length === 0}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="">{t('students.filters.allTerms')}</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>

                  <select value={filters.school_level_id}
                    onChange={(e) => { setFilters(prev => ({ ...prev, school_level_id: e.target.value })); setCurrentPage(1); }}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none">
                    <option value="">{t('students.filters.allSchoolLevels')}</option>
                    {schoolLevels.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  <div className="relative">
                    <select value={filters.class_level_id}
                      onChange={(e) => { setFilters(prev => ({ ...prev, class_level_id: e.target.value })); setCurrentPage(1); }}
                      disabled={filterClassLoading}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 disabled:opacity-60 disabled:cursor-not-allowed pr-8 outline-none">
                      <option value="">{filterClassLoading ? (t('students.actions.loading') || 'Loading…') : t('students.filters.allClassLevels')}</option>
                      {!filterClassLoading && filterClassLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {filterClassLoading && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'parents' && (
                <select value={filters.relationship_type} onChange={(e) => setFilters({ ...filters, relationship_type: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none">
                  <option value="">{t('students.filters.allRelationships')}</option>
                  <option value="father">{t('students.relationship.father')}</option>
                  <option value="mother">{t('students.relationship.mother')}</option>
                  <option value="guardian">{t('students.relationship.guardian')}</option>
                  <option value="other">{t('students.relationship.other')}</option>
                </select>
              )}

              <button onClick={() => { setFilters({}); setSearchTerm(''); setCurrentPage(1); }}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300">
                <RefreshCw className="w-4 h-4" /> {t('students.actions.reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        {activeTab === 'reports' ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-green-700 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">{t('students.reports.clickToGenerate')}</h3>
            <p className="text-sm text-gray-400 mb-5">{t('students.reports.description')}</p>
            <button onClick={handleGenerateReport} disabled={loading}
              className="px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl inline-flex items-center gap-2 text-sm font-medium disabled:opacity-60 transition-colors">
              {loading ? <Spinner /> : <><BarChart3 className="w-4 h-4" /> {t('students.actions.generateReport')}</>}
            </button>
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
                          <span className="text-sm text-gray-500">{t('students.messages.loading')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : currentData.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center">
                            <Info className="w-6 h-6 text-green-300 dark:text-green-700" />
                          </div>
                          <p className="text-sm text-gray-400">{t('students.messages.noData')}</p>
                          <button onClick={() => setShowAddModal(true)} className="text-green-700 hover:text-green-800 dark:text-green-400 text-sm font-semibold">
                            {t('students.actions.clickToAdd')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentData.map(renderTableRow)
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && serverTotal > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{t('students.pagination.showing')}</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-700 outline-none"
                  >
                    {[5, 10, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span>{t('students.pagination.perPage')}</span>
                  <span className="ml-2">
                    {`${t('students.pagination.total')}: `}<strong className="text-green-700 dark:text-green-400">{serverTotal}</strong> {t('students.pagination.records')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 disabled:opacity-40 transition-colors"
                  >
                    {t('students.pagination.first')}
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm px-3 text-gray-600 dark:text-gray-400">
                    {`${t('students.pagination.page')} `}<strong className="text-green-700 dark:text-green-400">{currentPage}</strong>{` ${t('students.pagination.of')} ${totalPages || 1}`}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 disabled:opacity-40 transition-colors"
                  >
                    {t('students.pagination.last')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Report modal */}
        {showReportModal && renderReportModal()}

        {/* Performance Modal */}
        {renderPerformanceModal()}

        {/* Add Modal */}
        {showAddModal && (
          <ModalWrapper>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Plus className="w-4 h-4 text-green-700 dark:text-green-400" />
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {`${t('students.actions.add')} ${currentTabLabel()}`}
                </h2>
              </div>
              <button onClick={() => { setShowAddModal(false); setNewItem({}); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              {renderFormFields(
                activeTab === 'students' ? getStudentFields(addClassLevels, addClassLoading) : getParentFields(),
                newItem, setNewItem
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleCreate} disabled={loading}
                className="flex-1 px-3 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl disabled:opacity-60 text-sm font-semibold transition-colors">
                {loading ? <Spinner /> : t('students.actions.create')}
              </button>
              <button onClick={() => { setShowAddModal(false); setNewItem({}); }}
                className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                {t('students.actions.cancel')}
              </button>
            </div>
          </ModalWrapper>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <ModalWrapper>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Edit className="w-4 h-4 text-amber-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {`${t('students.actions.edit')} ${currentTabLabel()}`}
                </h2>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditItem({}); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {editClassLoading && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30">
                <div className="w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                {t('students.messages.loadingClassLevels') || 'Loading class levels…'}
              </div>
            )}
            <div className="space-y-3">
              {renderFormFields(
                activeTab === 'students' ? getStudentEditFields(editClassLevels, editClassLoading) : getParentEditFields(),
                editItem, setEditItem
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleUpdate} disabled={loading || editClassLoading}
                className="flex-1 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl disabled:opacity-60 text-sm font-semibold transition-colors">
                {loading ? <Spinner /> : t('students.actions.update')}
              </button>
              <button onClick={() => { setShowEditModal(false); setEditItem({}); }}
                className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                {t('students.actions.cancel')}
              </button>
            </div>
          </ModalWrapper>
        )}

        {/* View Modal */}
        {showViewModal && selectedItem && (
          <ModalWrapper maxW="max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Eye className="w-4 h-4 text-green-700 dark:text-green-400" />
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('students.actions.viewDetails')}</h2>
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {renderViewContent()}
            <button onClick={() => setShowViewModal(false)}
              className="w-full mt-4 px-3 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-colors">
              {t('students.actions.close')}
            </button>
          </ModalWrapper>
        )}

        {/* Link Parent Modal */}
        {showLinkModal && selectedItem && (
          <ModalWrapper>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Link2 className="w-4 h-4 text-green-700 dark:text-green-400" />
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('students.actions.addParent')}</h2>
              </div>
              <button onClick={() => setShowLinkModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {`${t('students.modal.linkParentFor')}: `}
              <span className="font-semibold text-green-700 dark:text-green-400">{selectedItem.full_name}</span>
              <span className="ml-1 font-mono text-gray-400">({selectedItem.roll_number})</span>
            </p>
            <div className="space-y-3">
              {renderFormFields(getParentFields().filter(f => f.name !== 'student_ids'), newItem, setNewItem)}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleLinkParent} disabled={loading}
                className="flex-1 px-3 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl disabled:opacity-60 text-sm font-semibold transition-colors">
                {loading ? <Spinner /> : t('students.actions.linkParent')}
              </button>
              <button onClick={() => setShowLinkModal(false)}
                className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                {t('students.actions.cancel')}
              </button>
            </div>
          </ModalWrapper>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 border border-gray-100 dark:border-gray-800">
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{t('students.delete.title')}</h2>
                <p className="text-gray-500 text-sm mb-3">{t('students.delete.confirmation')}</p>
                {(selectedItem.full_name || selectedItem.roll_number) && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-3 border border-red-100 dark:border-red-900/30">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">{selectedItem.full_name}</p>
                    {selectedItem.roll_number && <p className="text-xs font-mono text-red-400">{selectedItem.roll_number}</p>}
                  </div>
                )}
                <p className="text-xs text-gray-400">{t('students.delete.warning')}</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleDelete} disabled={loading}
                  className="flex-1 px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors">
                  {loading ? <Spinner /> : <><Trash2 className="w-4 h-4" /> {t('students.actions.delete')}</>}
                </button>
                <button onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                  {t('students.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StudentManagement;