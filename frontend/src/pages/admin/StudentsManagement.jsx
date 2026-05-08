import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, UserPlus, Edit, Trash2, Search, Eye, X,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  AlertCircle, GraduationCap, BookOpen, Calendar,
  Sun, Moon, Plus, Info, Mail, Phone, MapPin,
  Download, Printer, FileText, BarChart3, Hash,
  User, UserCheck, Shield, Baby, Link2, Link,
  BookOpenCheck, Filter
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
  const token    = localStorage.getItem('access_token');
  const language = localStorage.getItem('user_language') || 'en';
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  config.headers['X-Language'] = language;
  console.log(`[API ▶] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
}, (error) => { console.error('[API Request Error]', error); return Promise.reject(error); });

apiClient.interceptors.response.use(
  (res) => {
    console.log(`[API ◀] ${res.config.method?.toUpperCase()} ${res.config.url} → ${res.status}`, res.data);
    return res;
  },
  (error) => {
    console.error('[API Error]', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  active:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const getStatusBadge = (s) => STATUS_COLORS[s] || STATUS_COLORS.inactive;

const Spinner = () => (
  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
);

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
const StudentManagement = () => {
  const { t } = useTranslation();

  // ── UI state ──────────────────────────────────────────────
  const [loading,   setLoading]   = useState(false);
  const [darkMode,  setDarkMode]  = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Modal state ───────────────────────────────────────────
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal,   setShowViewModal]   = useState(false);
  const [showLinkModal,   setShowLinkModal]   = useState(false); // link extra parent to student
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedItem,    setSelectedItem]    = useState(null);
  const [newItem,  setNewItem]  = useState({});
  const [editItem, setEditItem] = useState({});
  const [reportData, setReportData] = useState(null);

  // ── Pagination ────────────────────────────────────────────
  const [currentPage,  setCurrentPage]  = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [serverTotal,  setServerTotal]  = useState(0);

  // ── Data ──────────────────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [parents,  setParents]  = useState([]);

  // ── Dropdowns ─────────────────────────────────────────────
  const [academicYears,  setAcademicYears]  = useState([]);
  const [schoolLevels,   setSchoolLevels]   = useState([]);
  const [classLevels,    setClassLevels]    = useState([]);
  const [allClassLevels, setAllClassLevels] = useState([]);

  // ── Filters ───────────────────────────────────────────────
  const [filters, setFilters] = useState({
    status: '', class_level_id: '', school_level_id: '',
    academic_year_id: '', relationship_type: '',
  });

  // ── Stats ─────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total_students: 0, active_students: 0, inactive_students: 0,
    total_parents: 0,  active_parents: 0,
  });

  // ─────────────────────────────────────────────────────────
  // Tabs
  // ─────────────────────────────────────────────────────────
  const tabs = [
    { id: 'students', label: t('students.tabs.students'), icon: GraduationCap, color: 'indigo'  },
    { id: 'parents',  label: t('students.tabs.parents'),  icon: Shield,        color: 'teal'    },
    { id: 'reports',  label: t('students.tabs.reports'),  icon: BarChart3,     color: 'violet'  },
  ];

  const currentTabLabel = () => tabs.find(tab => tab.id === activeTab)?.label ?? '';

  // ─────────────────────────────────────────────────────────
  // Fetch dropdowns
  // ─────────────────────────────────────────────────────────
  const fetchDropdownData = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const h = { headers: { Authorization: `Bearer ${token}` } };
      const [yearsRes, schoolsRes, classesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/academics/academic-years/`, h),
        axios.get(`${API_BASE_URL}/academics/school-levels/`,  h),
        axios.get(`${API_BASE_URL}/academics/class-levels/`,   h),
      ]);
      if (yearsRes.data.success)   setAcademicYears(yearsRes.data.data?.results ?? yearsRes.data.data ?? []);
      if (schoolsRes.data.success) setSchoolLevels(schoolsRes.data.data?.results ?? schoolsRes.data.data ?? []);
      if (classesRes.data.success) {
        const all = classesRes.data.data?.results ?? classesRes.data.data ?? [];
        setAllClassLevels(all);
        setClassLevels(all);
      }
      console.log('[Dropdowns] Loaded academic years, school levels, class levels');
    } catch (err) {
      console.error('[Dropdowns] Error:', err);
    }
  }, []);

  // Filter class levels based on selected school level
  useEffect(() => {
    if (newItem.current_school_level_id || editItem.current_school_level_id) {
      const sid = newItem.current_school_level_id || editItem.current_school_level_id;
      setClassLevels(allClassLevels.filter(c => String(c.school_level?.id) === String(sid)));
    } else {
      setClassLevels(allClassLevels);
    }
  }, [newItem.current_school_level_id, editItem.current_school_level_id, allClassLevels]);

  // ─────────────────────────────────────────────────────────
  // Fetch main data
  // ─────────────────────────────────────────────────────────
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
        if (filters.status)           params.append('status',           filters.status);
        if (filters.class_level_id)   params.append('class_level_id',   filters.class_level_id);
        if (filters.school_level_id)  params.append('school_level_id',  filters.school_level_id);
        if (filters.academic_year_id) params.append('academic_year_id', filters.academic_year_id);
      } else if (activeTab === 'parents') {
        url = '/students/parents/';
        if (filters.status)            params.append('status',            filters.status);
        if (filters.relationship_type) params.append('relationship_type', filters.relationship_type);
      }

      const fullUrl = `${url}?${params.toString()}`;
      const res = await apiClient.get(fullUrl);
      console.log(`[fetchData] Tab="${activeTab}"`, res.data);

      if (res.data.success) {
        const d = res.data.data;
        const results = d?.results ?? (Array.isArray(d) ? d : []);
        setServerTotal(d?.count ?? results.length);

        if (activeTab === 'students') {
          setStudents(results);
          setStats(prev => ({
            ...prev,
            total_students:    d?.count ?? results.length,
            active_students:   results.filter(s => s.status === 'active').length,
            inactive_students: results.filter(s => s.status === 'inactive').length,
          }));
        } else {
          setParents(results);
          setStats(prev => ({
            ...prev,
            total_parents:  d?.count ?? results.length,
            active_parents: results.filter(p => p.status === 'active').length,
          }));
        }
        toast.success(`${results.length} ${t('students.messages.dataLoaded')}`);
      } else {
        toast.error(res.data.message || t('students.messages.fetchError'));
      }
    } catch (err) {
      console.error('[fetchData] Error:', err);
      toast.error(err.response?.data?.message || t('students.messages.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, filters, currentPage, itemsPerPage, t]);

  useEffect(() => { fetchDropdownData(); }, [fetchDropdownData]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // ─────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'students' ? '/students/create/' : '/students/parents/create/';
      const res = await apiClient.post(url, newItem);
      console.log('[handleCreate] Response:', res.data);
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.createSuccess'));
        setShowAddModal(false);
        setNewItem({});
        fetchData();
      } else {
        const firstError = Object.values(res.data.errors || {}).flat()[0] || res.data.message;
        toast.error(firstError || t('students.messages.createError'));
      }
    } catch (err) {
      console.error('[handleCreate] Error:', err);
      const msg = err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat()[0]
        || t('students.messages.createError');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'students'
        ? `/students/${editItem.id}/update/`
        : `/students/parents/${editItem.id}/update/`;
      const payload = { ...editItem };
      delete payload.id;
      const res = await apiClient.patch(url, payload);
      console.log('[handleUpdate] Response:', res.data);
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.updateSuccess'));
        setShowEditModal(false);
        setEditItem({});
        fetchData();
      } else {
        const firstError = Object.values(res.data.errors || {}).flat()[0] || res.data.message;
        toast.error(firstError || t('students.messages.updateError'));
      }
    } catch (err) {
      console.error('[handleUpdate] Error:', err);
      toast.error(err.response?.data?.message || t('students.messages.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'students'
        ? `/students/${selectedItem.id}/delete/`
        : `/students/parents/${selectedItem.id}/delete/`;
      const res = await apiClient.delete(url);
      console.log('[handleDelete] Response:', res.data);
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.deleteSuccess'));
        setShowDeleteModal(false);
        setSelectedItem(null);
        fetchData();
      } else {
        toast.error(res.data.message || t('students.messages.deleteError'));
      }
    } catch (err) {
      console.error('[handleDelete] Error:', err);
      toast.error(err.response?.data?.message || t('students.messages.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  // Link additional parent to a student (admin side — always works)
  const handleLinkParent = async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      // Create a new parent and immediately link to this student
      const payload = { ...newItem, student_ids: [selectedItem.id] };
      const res = await apiClient.post('/students/parents/create/', payload);
      console.log('[handleLinkParent] Response:', res.data);
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.parentLinked'));
        setShowLinkModal(false);
        setNewItem({});
        fetchData();
      } else {
        const firstError = Object.values(res.data.errors || {}).flat()[0] || res.data.message;
        toast.error(firstError || t('students.messages.createError'));
      }
    } catch (err) {
      console.error('[handleLinkParent] Error:', err);
      toast.error(err.response?.data?.message || t('students.messages.createError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const [studRes, parRes] = await Promise.all([
        apiClient.get('/students/?page_size=1000'),
        apiClient.get('/students/parents/?page_size=1000'),
      ]);
      console.log('[handleGenerateReport] Students:', studRes.data, 'Parents:', parRes.data);
      const studArr = studRes.data.data?.results ?? studRes.data.data ?? [];
      const parArr  = parRes.data.data?.results  ?? parRes.data.data  ?? [];
      const report = {
        generated_on: new Date().toLocaleString(),
        students: studArr,
        parents:  parArr,
        summary: {
          total_students:    studArr.length,
          active_students:   studArr.filter(s => s.status === 'active').length,
          inactive_students: studArr.filter(s => s.status === 'inactive').length,
          total_parents:     parArr.length,
          active_parents:    parArr.filter(p => p.status === 'active').length,
          students_with_parents: studArr.filter(s => s.parents_count > 0).length,
        },
      };
      setReportData(report);
      setShowReportModal(true);
      toast.success(t('students.messages.reportGenerated'));
    } catch (err) {
      console.error('[handleGenerateReport] Error:', err);
      toast.error(t('students.messages.reportError'));
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Form field definitions
  // ─────────────────────────────────────────────────────────
  const getStudentFields = () => [
    { name: 'full_name',              label: t('students.form.fullName'),       type: 'text',     required: true,  placeholder: t('students.placeholders.fullName') },
    { name: 'email',                  label: t('students.form.email'),          type: 'email',    required: false, placeholder: 'student@example.com' },
    { name: 'phone_number',           label: t('students.form.phone'),          type: 'tel',      required: false, placeholder: '+250XXXXXXXXX' },
    { name: 'birth_date',             label: t('students.form.birthDate'),      type: 'date',     required: false },
    { name: 'current_academic_year_id', label: t('students.form.academicYear'), type: 'select',   required: false, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
    { name: 'current_school_level_id',  label: t('students.form.schoolLevel'),  type: 'select',   required: false, options: schoolLevels.map(s => ({ value: s.id, label: s.name })) },
    { name: 'current_class_level_id',   label: t('students.form.classLevel'),   type: 'select',   required: false, options: classLevels.map(c => ({ value: c.id, label: c.name })) },
  ];

  const getStudentEditFields = () => [
    ...getStudentFields(),
    { name: 'status', label: t('students.form.status'), type: 'select', required: true,
      options: [
        { value: 'active',   label: t('students.status.active') },
        { value: 'inactive', label: t('students.status.inactive') },
      ],
    },
  ];

  const getParentFields = () => [
    { name: 'full_name',          label: t('students.form.fullName'),          type: 'text',     required: true,  placeholder: t('students.placeholders.fullName') },
    { name: 'phone_number',       label: t('students.form.phone'),             type: 'tel',      required: true,  placeholder: '+250XXXXXXXXX' },
    { name: 'email',              label: t('students.form.email'),             type: 'email',    required: true,  placeholder: 'parent@example.com' },
    { name: 'physical_address',   label: t('students.form.physicalAddress'),   type: 'textarea', required: false, placeholder: t('students.placeholders.address') },
    { name: 'relationship_type',  label: t('students.form.relationshipType'),  type: 'select',   required: true,
      options: [
        { value: 'father',   label: t('students.relationship.father') },
        { value: 'mother',   label: t('students.relationship.mother') },
        { value: 'guardian', label: t('students.relationship.guardian') },
        { value: 'other',    label: t('students.relationship.other') },
      ],
    },
    { name: 'student_ids', label: t('students.form.linkedStudents'), type: 'multi-student', required: true },
  ];

  const getParentEditFields = () => [
    { name: 'full_name',         label: t('students.form.fullName'),        type: 'text',     required: true  },
    { name: 'phone_number',      label: t('students.form.phone'),           type: 'tel',      required: true  },
    { name: 'email',             label: t('students.form.email'),           type: 'email',    required: true  },
    { name: 'physical_address',  label: t('students.form.physicalAddress'), type: 'textarea', required: false },
    { name: 'relationship_type', label: t('students.form.relationshipType'),type: 'select',   required: true,
      options: [
        { value: 'father',   label: t('students.relationship.father') },
        { value: 'mother',   label: t('students.relationship.mother') },
        { value: 'guardian', label: t('students.relationship.guardian') },
        { value: 'other',    label: t('students.relationship.other') },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────
  // Render form fields
  // ─────────────────────────────────────────────────────────
  const renderFormFields = (fields, item, setItem) => fields.map(field => (
    <div key={field.name}>
      <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300 uppercase tracking-wide">
        {field.label}{field.required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>

      {field.type === 'select' ? (
        <select
          value={item[field.name] ?? ''}
          onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
        >
          <option value="">{`— ${t('students.actions.select')} —`}</option>
          {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>

      ) : field.type === 'textarea' ? (
        <textarea
          value={item[field.name] ?? ''}
          onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
          rows={3}
          placeholder={field.placeholder}
        />

      ) : field.type === 'multi-student' ? (
        // Multi-select for student IDs when creating a parent
        <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
          {students.length === 0
            ? <p className="text-xs text-gray-400 italic">{t('students.messages.noStudentsForLink')}</p>
            : students.map(s => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-1">
                  <input
                    type="checkbox"
                    checked={(item.student_ids || []).includes(s.id)}
                    onChange={(e) => {
                      const current = item.student_ids || [];
                      setItem({
                        ...item,
                        student_ids: e.target.checked
                          ? [...current, s.id]
                          : current.filter(id => id !== s.id),
                      });
                    }}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {s.full_name} <span className="text-gray-400">({s.roll_number})</span>
                  </span>
                </label>
              ))
          }
        </div>

      ) : (
        <input
          type={field.type}
          value={item[field.name] ?? ''}
          onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
          placeholder={field.placeholder}
        />
      )}
    </div>
  ));

  // ─────────────────────────────────────────────────────────
  // Table headers
  // ─────────────────────────────────────────────────────────
  const renderTableHeaders = () => {
    const headers = {
      students: [
        t('students.table.rollNumber'), t('students.table.fullName'),
        t('students.table.email'), t('students.table.phone'),
        t('students.table.classLevel'), t('students.table.schoolLevel'),
        t('students.table.parents'), t('students.table.status'), t('students.table.actions'),
      ],
      parents: [
        t('students.table.fullName'), t('students.table.phone'),
        t('students.table.email'), t('students.table.relationship'),
        t('students.table.students'), t('students.table.status'), t('students.table.actions'),
      ],
    };
    return (headers[activeTab] || []).map(h => (
      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {h}
      </th>
    ));
  };

  // ─────────────────────────────────────────────────────────
  // Table rows
  // ─────────────────────────────────────────────────────────
  const renderTableRow = (item) => {
    if (activeTab === 'students') return (
      <tr key={item.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors">
        <td className="px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-semibold">
            <Hash className="w-3 h-3" />{item.roll_number}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{item.full_name}</td>
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.email || '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.phone_number || '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.current_class_level?.name || '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.current_school_level?.name || '—'}</td>
        <td className="px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-medium">
            <Shield className="w-3 h-3" />{item.parents_count ?? 0}
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
              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title={t('students.actions.view')}>
              <Eye className="w-3.5 h-3.5 text-blue-500" />
            </button>
            <button onClick={() => { setEditItem(item); setShowEditModal(true); }}
              className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title={t('students.actions.edit')}>
              <Edit className="w-3.5 h-3.5 text-amber-500" />
            </button>
            <button onClick={() => { setSelectedItem(item); setNewItem({}); setShowLinkModal(true); }}
              className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors" title={t('students.actions.addParent')}>
              <Link2 className="w-3.5 h-3.5 text-teal-500" />
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
      <tr key={item.id} className="hover:bg-teal-50/40 dark:hover:bg-teal-900/10 transition-colors">
        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{item.full_name}</td>
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.phone_number}</td>
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.email}</td>
        <td className="px-4 py-3 text-sm">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium capitalize">
            {t(`students.relationship.${item.relationship_type}`) || item.relationship_type}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
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
              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title={t('students.actions.view')}>
              <Eye className="w-3.5 h-3.5 text-blue-500" />
            </button>
            <button onClick={() => { setEditItem(item); setShowEditModal(true); }}
              className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title={t('students.actions.edit')}>
              <Edit className="w-3.5 h-3.5 text-amber-500" />
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

  // ─────────────────────────────────────────────────────────
  // View modal content
  // ─────────────────────────────────────────────────────────
  const renderViewContent = () => {
    if (!selectedItem) return null;
    if (activeTab === 'students') return (
      <div className="space-y-4">
        {/* Header card */}
        <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-lg font-bold">
            {selectedItem.full_name?.[0] ?? 'S'}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{selectedItem.full_name}</p>
            <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{selectedItem.roll_number}</p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadge(selectedItem.status)}`}>
            {t(`students.status.${selectedItem.status}`)}
          </span>
        </div>
        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            [t('students.table.email'),       selectedItem.email || '—'],
            [t('students.table.phone'),        selectedItem.phone_number || '—'],
            [t('students.form.birthDate'),     selectedItem.birth_date || '—'],
            [t('students.table.age'),          selectedItem.age ?? '—'],
            [t('students.table.schoolLevel'),  selectedItem.current_school_level?.name || '—'],
            [t('students.table.classLevel'),   selectedItem.current_class_level?.name || '—'],
            [t('students.form.academicYear'),  selectedItem.current_academic_year?.name || '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="font-medium text-gray-800 dark:text-white text-xs">{value}</p>
            </div>
          ))}
        </div>
        {/* Parents */}
        {selectedItem.parents?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('students.tabs.parents')}</p>
            <div className="space-y-2">
              {selectedItem.parents.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                    {p.full_name?.[0] ?? 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-400">{p.phone_number}</p>
                  </div>
                  <span className="text-xs px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded capitalize">
                    {t(`students.relationship.${p.relationship_type}`) || p.relationship_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    if (activeTab === 'parents') return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white text-lg font-bold">
            {selectedItem.full_name?.[0] ?? 'P'}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{selectedItem.full_name}</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 capitalize">
              {t(`students.relationship.${selectedItem.relationship_type}`)}
            </p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadge(selectedItem.status)}`}>
            {t(`students.status.${selectedItem.status}`)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            [t('students.table.phone'),           selectedItem.phone_number],
            [t('students.table.email'),            selectedItem.email],
            [t('students.form.physicalAddress'),   selectedItem.physical_address || '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="font-medium text-gray-800 dark:text-white text-xs break-all">{value}</p>
            </div>
          ))}
        </div>
        {selectedItem.students?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('students.tabs.students')}</p>
            <div className="space-y-2">
              {selectedItem.students.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {s.full_name?.[0] ?? 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{s.full_name}</p>
                    <p className="text-xs font-mono text-indigo-500">{s.roll_number}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${getStatusBadge(s.status)}`}>
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

  // ─────────────────────────────────────────────────────────
  // Report modal
  // ─────────────────────────────────────────────────────────
  const renderReportModal = () => {
    if (!reportData) return null;
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('students.reports.title')}</h2>
            </div>
            <button onClick={() => setShowReportModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-xs text-gray-400 mb-5">{t('students.reports.generatedOn')}: {reportData.generated_on}</p>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {[
              { label: t('students.stats.totalStudents'),       value: reportData.summary.total_students,       color: 'indigo' },
              { label: t('students.stats.activeStudents'),      value: reportData.summary.active_students,      color: 'emerald' },
              { label: t('students.stats.inactiveStudents'),    value: reportData.summary.inactive_students,    color: 'rose' },
              { label: t('students.stats.totalParents'),        value: reportData.summary.total_parents,        color: 'teal' },
              { label: t('students.stats.activeParents'),       value: reportData.summary.active_parents,       color: 'violet' },
              { label: t('students.stats.studentsWithParents'), value: reportData.summary.students_with_parents,color: 'amber' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-xl p-3`}>
                <p className={`text-xs text-${color}-600 dark:text-${color}-400`}>{label}</p>
                <p className={`text-2xl font-bold text-${color}-700 dark:text-${color}-300`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Students table preview */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> {t('students.reports.studentsList')}</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    {[t('students.table.rollNumber'), t('students.table.fullName'), t('students.table.classLevel'), t('students.table.status')].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {reportData.students.slice(0, 8).map(s => (
                    <tr key={s.id}>
                      <td className="px-3 py-2 font-mono text-indigo-600">{s.roll_number}</td>
                      <td className="px-3 py-2 font-medium">{s.full_name}</td>
                      <td className="px-3 py-2 text-gray-500">{s.current_class_level?.name || '—'}</td>
                      <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded-full text-xs ${getStatusBadge(s.status)}`}>{s.status}</span></td>
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
            }} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-sm">
              <Download className="w-4 h-4" /> {t('students.actions.downloadReport')}
            </button>
            <button onClick={() => window.print()} className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center justify-center gap-2 text-sm">
              <Printer className="w-4 h-4" /> {t('students.actions.printReport')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Pagination derived values
  // ─────────────────────────────────────────────────────────
  const currentData  = activeTab === 'students' ? students : parents;
  const totalPages   = Math.ceil(serverTotal / itemsPerPage);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">

        {/* ── Stats strip ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: t('students.stats.totalStudents'),    value: stats.total_students,    from: 'from-indigo-500',  to: 'to-indigo-600'  },
            { label: t('students.stats.activeStudents'),   value: stats.active_students,   from: 'from-emerald-500', to: 'to-emerald-600' },
            { label: t('students.stats.inactiveStudents'), value: stats.inactive_students, from: 'from-rose-500',    to: 'to-rose-600'    },
            { label: t('students.stats.totalParents'),     value: stats.total_parents,     from: 'from-teal-500',    to: 'to-teal-600'    },
            { label: t('students.stats.activeParents'),    value: stats.active_parents,    from: 'from-violet-500',  to: 'to-violet-600'  },
          ].map(({ label, value, from, to }) => (
            <div key={label} className={`bg-gradient-to-br ${from} ${to} rounded-2xl p-4 text-white shadow-lg`}>
              <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t('students.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{t('students.subtitle')}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {activeTab === 'reports' && (
              <button onClick={handleGenerateReport} disabled={loading}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-60">
                <BarChart3 className="w-4 h-4" /> {t('students.actions.generateReport')}
              </button>
            )}
            {activeTab !== 'reports' && (
              <button onClick={() => { setNewItem({}); setShowAddModal(true); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium shadow-sm">
                <Plus className="w-4 h-4" />
                {`${t('students.actions.addNew')} ${currentTabLabel()}`}
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 flex gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSearchTerm(''); setFilters({}); }}
                className={`px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 rounded-xl whitespace-nowrap flex-1 justify-center
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Filters & search ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder={t('students.actions.search')} value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Status filter (both tabs) */}
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('students.filters.allStatus')}</option>
                <option value="active">{t('students.status.active')}</option>
                <option value="inactive">{t('students.status.inactive')}</option>
              </select>

              {activeTab === 'students' && <>
                <select value={filters.school_level_id} onChange={(e) => setFilters({ ...filters, school_level_id: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                  <option value="">{t('students.filters.allSchoolLevels')}</option>
                  {schoolLevels.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={filters.class_level_id} onChange={(e) => setFilters({ ...filters, class_level_id: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                  <option value="">{t('students.filters.allClassLevels')}</option>
                  {allClassLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filters.academic_year_id} onChange={(e) => setFilters({ ...filters, academic_year_id: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                  <option value="">{t('students.filters.allAcademicYears')}</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </>}

              {activeTab === 'parents' && (
                <select value={filters.relationship_type} onChange={(e) => setFilters({ ...filters, relationship_type: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                  <option value="">{t('students.filters.allRelationships')}</option>
                  <option value="father">{t('students.relationship.father')}</option>
                  <option value="mother">{t('students.relationship.mother')}</option>
                  <option value="guardian">{t('students.relationship.guardian')}</option>
                  <option value="other">{t('students.relationship.other')}</option>
                </select>
              )}

              <button onClick={fetchData} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                <RefreshCw className="w-4 h-4" /> {t('students.actions.refresh')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────── */}
        {activeTab === 'reports' ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">{t('students.reports.clickToGenerate')}</h3>
            <p className="text-sm text-gray-400 mb-5">{t('students.reports.description')}</p>
            <button onClick={handleGenerateReport} disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl inline-flex items-center gap-2 text-sm font-medium disabled:opacity-60">
              {loading ? <Spinner /> : <><BarChart3 className="w-4 h-4" /> {t('students.actions.generateReport')}</>}
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>{renderTableHeaders()}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center">
                        <div className="flex justify-center items-center gap-3">
                          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-gray-500">{t('students.messages.loading')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : currentData.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Info className="w-12 h-12 text-gray-200 dark:text-gray-600" />
                          <p className="text-sm text-gray-400">{t('students.messages.noData')}</p>
                          <button onClick={() => setShowAddModal(true)} className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold">
                            {t('students.actions.clickToAdd')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : currentData.map(renderTableRow)}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && serverTotal > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{t('students.pagination.showing')}</span>
                  <select value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                    {[5, 10, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span>{t('students.pagination.perPage')}</span>
                  <span className="ml-2">
                    {`${t('students.pagination.total')}:`} <strong>{serverTotal}</strong> {t('students.pagination.records')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    {t('students.pagination.first')}
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm px-3 text-gray-600 dark:text-gray-400">
                    {`${t('students.pagination.page')} ${currentPage} ${t('students.pagination.of')} ${totalPages || 1}`}
                  </span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                    className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    {t('students.pagination.last')}
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
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-5 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {`${t('students.actions.add')} ${currentTabLabel()}`}
                </h2>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {renderFormFields(
                  activeTab === 'students' ? getStudentFields() : getParentFields(),
                  newItem, setNewItem
                )}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleCreate} disabled={loading}
                  className="flex-1 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-60 text-sm font-semibold">
                  {loading ? <Spinner /> : t('students.actions.create')}
                </button>
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('students.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit modal ───────────────────────────────────────────── */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-5 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {`${t('students.actions.edit')} ${currentTabLabel()}`}
                </h2>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {renderFormFields(
                  activeTab === 'students' ? getStudentEditFields() : getParentEditFields(),
                  editItem, setEditItem
                )}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleUpdate} disabled={loading}
                  className="flex-1 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl disabled:opacity-60 text-sm font-semibold">
                  {loading ? <Spinner /> : t('students.actions.update')}
                </button>
                <button onClick={() => setShowEditModal(false)}
                  className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('students.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── View modal ───────────────────────────────────────────── */}
        {showViewModal && selectedItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-5 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Eye className="w-4 h-4 text-blue-600" /></div>
                  <h2 className="text-base font-bold">{t('students.actions.viewDetails')}</h2>
                </div>
                <button onClick={() => setShowViewModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              {renderViewContent()}
              <button onClick={() => setShowViewModal(false)}
                className="w-full mt-4 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold">
                {t('students.actions.close')}
              </button>
            </div>
          </div>
        )}

        {/* ── Link Parent modal (add parent to existing student) ────── */}
        {showLinkModal && selectedItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-5 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg"><Link2 className="w-4 h-4 text-teal-600" /></div>
                  <h2 className="text-base font-bold">{t('students.actions.addParent')}</h2>
                </div>
                <button onClick={() => setShowLinkModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {`${t('students.modal.linkParentFor')}: `}
                <span className="font-semibold text-indigo-600">{selectedItem.full_name}</span>
                <span className="ml-1 font-mono text-gray-400">({selectedItem.roll_number})</span>
              </p>
              <div className="space-y-3">
                {renderFormFields(
                  // Same parent fields minus student_ids (injected automatically)
                  getParentFields().filter(f => f.name !== 'student_ids'),
                  newItem, setNewItem
                )}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleLinkParent} disabled={loading}
                  className="flex-1 px-3 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl disabled:opacity-60 text-sm font-semibold">
                  {loading ? <Spinner /> : t('students.actions.linkParent')}
                </button>
                <button onClick={() => setShowLinkModal(false)}
                  className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('students.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete modal ─────────────────────────────────────────── */}
        {showDeleteModal && selectedItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{t('students.delete.title')}</h2>
                <p className="text-gray-500 text-sm mb-3">{t('students.delete.confirmation')}</p>
                {(selectedItem.full_name || selectedItem.roll_number) && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-3">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                      {selectedItem.full_name}
                    </p>
                    {selectedItem.roll_number && (
                      <p className="text-xs font-mono text-red-400">{selectedItem.roll_number}</p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400">{t('students.delete.warning')}</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleDelete} disabled={loading}
                  className="flex-1 px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5 text-sm font-semibold">
                  {loading ? <Spinner /> : <><Trash2 className="w-4 h-4" /> {t('students.actions.delete')}</>}
                </button>
                <button onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300">
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