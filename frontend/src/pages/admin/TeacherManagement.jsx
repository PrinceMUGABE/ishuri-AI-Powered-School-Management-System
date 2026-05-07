import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, UserPlus, Edit, Trash2, Search, Eye, X,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  AlertCircle, Clock, Building2, GraduationCap,
  BookOpen, Calendar, Settings, Sun, Moon,
  Calendar as CalendarIcon, Clock as ClockIcon,
  Plus, Info, Filter, Mail, Phone, MapPin, Award
} from 'lucide-react';
import toast from 'react-hot-toast';

// API Configuration
const API_BASE_URL = 'http://127.0.0.1:8000/api/teachers';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  const language = localStorage.getItem('user_language') || 'en';
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

const TeacherManagement = () => {
  const { t } = useTranslation('teachers');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('teachers');
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  
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
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [daySettings, setDaySettings] = useState([]);
  const [holidays, setHolidays] = useState([]);
  
  // Form states
  const [newItem, setNewItem] = useState({});
  const [editItem, setEditItem] = useState({});
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    school_level: '',
    class_level: '',
    academic_year: ''
  });
  
  // Dropdown data
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  
  // Stats
  const [stats, setStats] = useState({
    total_teachers: 0,
    active_teachers: 0,
    total_assignments: 0,
    total_timetable_entries: 0
  });

  const tabs = [
    { id: 'teachers', label: t('tabs.teachers'), icon: Users, color: 'blue' },
    { id: 'assignments', label: t('tabs.assignments'), icon: BookOpen, color: 'green' },
    { id: 'timetable', label: t('tabs.timetable'), icon: Calendar, color: 'purple' },
    { id: 'day-settings', label: t('tabs.daySettings'), icon: Settings, color: 'orange' },
    { id: 'holidays', label: t('tabs.holidays'), icon: CalendarIcon, color: 'red' }
  ];

  // Fetch dropdown data
  const fetchDropdownData = async () => {
    try {
      const [schoolsRes, classesRes, subjectsRes, yearsRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/academics/school-levels/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }),
        axios.get('http://127.0.0.1:8000/api/academics/class-levels/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }),
        axios.get('http://127.0.0.1:8000/api/academics/subjects/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }),
        axios.get('http://127.0.0.1:8000/api/academics/academic-years/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        })
      ]);
      
      if (schoolsRes.data.success) setSchoolLevels(schoolsRes.data.data);
      if (classesRes.data.success) setClassLevels(classesRes.data.data);
      if (subjectsRes.data.success) setSubjects(subjectsRes.data.data);
      if (yearsRes.data.success) setAcademicYears(yearsRes.data.data);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  // Fetch data based on active tab
  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '';
      let params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (filters.status) params.append('status', filters.status);
      if (filters.academic_year) params.append('academic_year', filters.academic_year);
      
      switch(activeTab) {
        case 'teachers':
          url = '/teachers/';
          break;
        case 'assignments':
          url = '/assignments/';
          if (filters.teacher) params.append('teacher', filters.teacher);
          break;
        case 'timetable':
          url = '/timetable/';
          if (filters.teacher) params.append('teacher', filters.teacher);
          if (filters.week) params.append('week_number', filters.week);
          if (filters.academic_year) params.append('academic_year', filters.academic_year);
          break;
        case 'day-settings':
          url = '/day-settings/';
          if (filters.school_level) params.append('school_level', filters.school_level);
          if (filters.academic_year) params.append('academic_year', filters.academic_year);
          break;
        case 'holidays':
          url = '/holidays/';
          if (filters.academic_year) params.append('academic_year', filters.academic_year);
          break;
        default:
          return;
      }
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await apiClient.get(url);
      
      if (response.data.success) {
        const data = response.data.data;
        const results = Array.isArray(data) ? data : (data.results || data);
        
        switch(activeTab) {
          case 'teachers':
            setTeachers(results);
            setStats(prev => ({ ...prev, total_teachers: results.length, active_teachers: results.filter(t => t.status === 'active').length }));
            break;
          case 'assignments':
            setAssignments(results);
            setStats(prev => ({ ...prev, total_assignments: results.length }));
            break;
          case 'timetable':
            setTimetables(results?.timetable || []);
            break;
          case 'day-settings':
            setDaySettings(results);
            break;
          case 'holidays':
            setHolidays(results);
            break;
          default:
            break;
        }
      } else {
        toast.error(response.data.message || t('messages.fetchError'));
      }
    } catch (error) {
      console.error('Fetch data error:', error);
      toast.error(error.response?.data?.message || t('messages.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdownData();
    fetchData();
  }, [activeTab, searchTerm, filters, currentPage, itemsPerPage]);

  // Get current data based on active tab
  const getCurrentData = () => {
    switch(activeTab) {
      case 'teachers': return teachers;
      case 'assignments': return assignments;
      case 'day-settings': return daySettings;
      case 'holidays': return holidays;
      default: return [];
    }
  };

  const currentData = getCurrentData();
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const paginatedData = currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Create handler
  const handleCreate = async () => {
    setLoading(true);
    try {
      let url = '';
      let payload = { ...newItem };
      
      switch(activeTab) {
        case 'teachers':
          url = '/teachers/';
          break;
        case 'assignments':
          url = '/assignments/';
          break;
        case 'day-settings':
          url = '/day-settings/';
          break;
        case 'holidays':
          url = '/holidays/';
          break;
        default:
          toast.error(t('messages.createError'));
          setLoading(false);
          return;
      }
      
      const response = await apiClient.post(url, payload);
      
      if (response.data.success) {
        toast.success(response.data.message || t('messages.createSuccess'));
        setShowAddModal(false);
        setNewItem({});
        fetchData();
      } else {
        const errors = response.data.errors;
        const errorMessage = Object.values(errors || {}).flat()[0] || response.data.message || t('messages.createError');
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error(error.response?.data?.message || t('messages.createError'));
    } finally {
      setLoading(false);
    }
  };

  // Update handler
  const handleUpdate = async () => {
    setLoading(true);
    try {
      let url = '';
      let payload = { ...editItem };
      delete payload.id;
      
      switch(activeTab) {
        case 'teachers':
          url = `/teachers/${editItem.id}/`;
          break;
        case 'day-settings':
          url = `/day-settings/${editItem.id}/`;
          break;
        default:
          toast.error(t('messages.updateNotSupported'));
          setLoading(false);
          return;
      }
      
      const response = await apiClient.put(url, payload);
      
      if (response.data.success) {
        toast.success(response.data.message || t('messages.updateSuccess'));
        setShowEditModal(false);
        setEditItem({});
        fetchData();
      } else {
        const errors = response.data.errors;
        const errorMessage = Object.values(errors || {}).flat()[0] || response.data.message || t('messages.updateError');
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || t('messages.updateError'));
    } finally {
      setLoading(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    setLoading(true);
    try {
      let url = '';
      
      switch(activeTab) {
        case 'teachers':
          url = `/teachers/${selectedItem.id}/`;
          break;
        case 'assignments':
          url = `/assignments/${selectedItem.id}/`;
          break;
        case 'day-settings':
          url = `/day-settings/${selectedItem.id}/`;
          break;
        case 'holidays':
          url = `/holidays/${selectedItem.id}/`;
          break;
        default:
          return;
      }
      
      const response = await apiClient.delete(url);
      
      if (response.data.success) {
        toast.success(response.data.message || t('messages.deleteSuccess'));
        setShowDeleteModal(false);
        setSelectedItem(null);
        fetchData();
      } else {
        toast.error(response.data.message || t('messages.deleteError'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || t('messages.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  // Generate timetable
  const handleGenerateTimetable = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/timetable/generate/', {
        academic_year: filters.academic_year || (academicYears.find(y => y.is_current)?.id),
        week_number: filters.week || 1
      });
      
      if (response.data.success) {
        toast.success(response.data.message || t('messages.timetableGenerated'));
        fetchData();
      } else {
        toast.error(response.data.message || t('messages.timetableGenerateError'));
      }
    } catch (error) {
      console.error('Generate timetable error:', error);
      toast.error(error.response?.data?.message || t('messages.timetableGenerateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setEditItem(item);
    setShowEditModal(true);
  };

  // Render form fields based on active tab
  const renderFormFields = (item, setItem, isEdit = false) => {
    const getFieldSets = () => {
      switch(activeTab) {
        case 'teachers':
          return [
            { name: 'full_name', label: t('form.fullName'), type: 'text', required: true, placeholder: t('placeholders.fullName') },
            { name: 'email', label: t('form.email'), type: 'email', required: true, placeholder: 'teacher@example.com' },
            { name: 'phone_number', label: t('form.phone'), type: 'tel', required: true, placeholder: '+250XXXXXXXXX' },
            { name: 'address', label: t('form.address'), type: 'textarea', required: false, placeholder: t('placeholders.address') },
            { name: 'gender', label: t('form.gender'), type: 'select', required: true, options: [
              { value: 'male', label: t('gender.male') },
              { value: 'female', label: t('gender.female') },
              { value: 'other', label: t('gender.other') }
            ]},
            { name: 'education_level', label: t('form.educationLevel'), type: 'select', required: true, options: [
              { value: 'diploma', label: t('education.diploma') },
              { value: 'bachelor', label: t('education.bachelor') },
              { value: 'master', label: t('education.master') },
              { value: 'doctorate', label: t('education.doctorate') },
              { value: 'certificate', label: t('education.certificate') }
            ]},
            { name: 'qualification', label: t('form.qualification'), type: 'textarea', required: false, placeholder: t('placeholders.qualification') },
            { name: 'specialization', label: t('form.specialization'), type: 'text', required: false, placeholder: t('placeholders.specialization') },
            { name: 'experience_years', label: t('form.experience'), type: 'number', required: false, placeholder: '0' },
            { name: 'birth_date', label: t('form.birthDate'), type: 'date', required: false },
            { name: 'hire_date', label: t('form.hireDate'), type: 'date', required: false },
            { name: 'status', label: t('form.status'), type: 'select', required: true, options: [
              { value: 'active', label: t('status.active') },
              { value: 'inactive', label: t('status.inactive') },
              { value: 'on_leave', label: t('status.onLeave') },
              { value: 'suspended', label: t('status.suspended') }
            ]},
            { name: 'bio', label: t('form.bio'), type: 'textarea', required: false, placeholder: t('placeholders.bio') }
          ];
        
        case 'assignments':
          return [
            { name: 'teacher', label: t('form.teacher'), type: 'select', required: true, options: teachers.map(t => ({ value: t.id, label: t.full_name })) },
            { name: 'school_level', label: t('form.schoolLevel'), type: 'select', required: true, options: schoolLevels.map(s => ({ value: s.id, label: s.name })) },
            { name: 'class_level', label: t('form.classLevel'), type: 'select', required: true, options: classLevels.map(c => ({ value: c.id, label: c.name })) },
            { name: 'subject', label: t('form.subject'), type: 'select', required: true, options: subjects.map(s => ({ value: s.id, label: s.name })) },
            { name: 'academic_year', label: t('form.academicYear'), type: 'select', required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
            { name: 'hours_per_week', label: t('form.hoursPerWeek'), type: 'number', required: true, placeholder: '4' },
            { name: 'status', label: t('form.status'), type: 'select', required: true, options: [
              { value: 'active', label: t('status.active') },
              { value: 'inactive', label: t('status.inactive') },
              { value: 'completed', label: t('status.completed') }
            ]},
            { name: 'notes', label: t('form.notes'), type: 'textarea', required: false, placeholder: t('placeholders.notes') }
          ];
        
        case 'day-settings':
          return [
            { name: 'school_level', label: t('form.schoolLevel'), type: 'select', required: true, options: schoolLevels.map(s => ({ value: s.id, label: s.name })) },
            { name: 'academic_year', label: t('form.academicYear'), type: 'select', required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
            { name: 'day_of_week', label: t('form.dayOfWeek'), type: 'select', required: true, options: [
              { value: 0, label: t('days.monday') },
              { value: 1, label: t('days.tuesday') },
              { value: 2, label: t('days.wednesday') },
              { value: 3, label: t('days.thursday') },
              { value: 4, label: t('days.friday') },
              { value: 5, label: t('days.saturday') },
              { value: 6, label: t('days.sunday') }
            ]},
            { name: 'is_school_day', label: t('form.isSchoolDay'), type: 'checkbox' },
            { name: 'start_time', label: t('form.startTime'), type: 'time', required: false },
            { name: 'end_time', label: t('form.endTime'), type: 'time', required: false },
            { name: 'morning_break_start', label: t('form.morningBreakStart'), type: 'time', required: false },
            { name: 'morning_break_end', label: t('form.morningBreakEnd'), type: 'time', required: false },
            { name: 'lunch_break_start', label: t('form.lunchBreakStart'), type: 'time', required: false },
            { name: 'lunch_break_end', label: t('form.lunchBreakEnd'), type: 'time', required: false }
          ];
        
        case 'holidays':
          return [
            { name: 'name', label: t('form.holidayName'), type: 'text', required: true, placeholder: t('placeholders.holidayName') },
            { name: 'date', label: t('form.date'), type: 'date', required: true },
            { name: 'academic_year', label: t('form.academicYear'), type: 'select', required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
            { name: 'school_level', label: t('form.schoolLevel'), type: 'select', required: false, options: [
              { value: '', label: t('form.allLevels') },
              ...schoolLevels.map(s => ({ value: s.id, label: s.name }))
            ]},
            { name: 'is_recurring', label: t('form.isRecurring'), type: 'checkbox' },
            { name: 'description', label: t('form.description'), type: 'textarea', required: false, placeholder: t('placeholders.description') }
          ];
        
        default:
          return [];
      }
    };
    
    const fields = getFieldSets();
    
    return fields.map(field => (
      <div key={field.name}>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {field.label} {field.required && '*'}
        </label>
        {field.type === 'select' ? (
          <select
            value={item[field.name] || ''}
            onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
          >
            <option value="">{t('form.selectOption', { label: field.label })}</option>
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : field.type === 'textarea' ? (
          <textarea
            value={item[field.name] || ''}
            onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
            rows={3}
            placeholder={field.placeholder}
          />
        ) : field.type === 'checkbox' ? (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={item[field.name] || false}
              onChange={(e) => setItem({ ...item, [field.name]: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{field.label}</span>
          </label>
        ) : (
          <input
            type={field.type}
            value={item[field.name] || ''}
            onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
            placeholder={field.placeholder}
          />
        )}
      </div>
    ));
  };

  // Render table rows
  const renderTableRow = (item) => {
    const getStatusBadge = (status) => {
      const colors = {
        active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        suspended: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        on_leave: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      };
      return colors[status] || colors.inactive;
    };
    
    switch(activeTab) {
      case 'teachers':
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.full_name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.email}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.phone_number}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.specialization || '-'}</td>
            <td className="px-4 py-3">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                {item.status === 'active' && <CheckCircle className="w-3 h-3" />}
                {item.status === 'inactive' && <AlertCircle className="w-3 h-3" />}
                {item.status === 'on_leave' && <Clock className="w-3 h-3" />}
                {item.status === 'suspended' && <AlertCircle className="w-3 h-3" />}
                {t(`status.${item.status}`)}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button onClick={() => { setSelectedItem(item); setShowViewModal(true); }} className="p-1 hover:bg-gray-100 rounded" title={t('actions.view')}>
                  <Eye className="w-4 h-4 text-blue-500" />
                </button>
                <button onClick={() => handleEditClick(item)} className="p-1 hover:bg-gray-100 rounded" title={t('actions.edit')}>
                  <Edit className="w-4 h-4 text-yellow-500" />
                </button>
                <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }} className="p-1 hover:bg-gray-100 rounded" title={t('actions.delete')}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </td>
          </tr>
        );
      
      case 'assignments':
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.teacher_name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.subject_name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.class_level_name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.hours_per_week || '-'} h/week</td>
            <td className="px-4 py-3">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                {t(`status.${item.status}`)}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }} className="p-1 hover:bg-gray-100 rounded" title={t('actions.delete')}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </td>
          </tr>
        );
      
      case 'day-settings':
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.school_level_name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{days[item.day_of_week]}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
              {item.is_school_day ? (
                <span className="text-green-600">{item.start_time} - {item.end_time}</span>
              ) : (
                <span className="text-red-500">{t('status.notSchoolDay')}</span>
              )}
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button onClick={() => handleEditClick(item)} className="p-1 hover:bg-gray-100 rounded" title={t('actions.edit')}>
                  <Edit className="w-4 h-4 text-yellow-500" />
                </button>
                <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }} className="p-1 hover:bg-gray-100 rounded" title={t('actions.delete')}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </td>
          </tr>
        );
      
      case 'holidays':
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.date}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.academic_year_name || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.school_level_name || t('form.allLevels')}</td>
            <td className="px-4 py-3">
              {item.is_recurring && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{t('status.recurring')}</span>}
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }} className="p-1 hover:bg-gray-100 rounded" title={t('actions.delete')}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </td>
          </tr>
        );
      
      default:
        return null;
    }
  };
  
  const renderTableHeaders = () => {
    const headers = {
      'teachers': [t('table.fullName'), t('table.email'), t('table.phone'), t('table.specialization'), t('table.status'), t('table.actions')],
      'assignments': [t('table.teacher'), t('table.subject'), t('table.classLevel'), t('table.hoursPerWeek'), t('table.status'), t('table.actions')],
      'day-settings': [t('table.schoolLevel'), t('table.day'), t('table.schedule'), t('table.actions')],
      'holidays': [t('table.holidayName'), t('table.date'), t('table.academicYear'), t('table.schoolLevel'), t('table.recurring'), t('table.actions')]
    };
    return headers[activeTab]?.map(header => (
      <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{header}</th>
    ));
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900">
        {/* Header with Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div><p className="text-blue-100 text-sm">{t('stats.totalTeachers')}</p><p className="text-3xl font-bold">{stats.total_teachers}</p></div>
              <Users className="w-10 h-10 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div><p className="text-green-100 text-sm">{t('stats.activeTeachers')}</p><p className="text-3xl font-bold">{stats.active_teachers}</p></div>
              <UserPlus className="w-10 h-10 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div><p className="text-purple-100 text-sm">{t('stats.totalAssignments')}</p><p className="text-3xl font-bold">{stats.total_assignments}</p></div>
              <BookOpen className="w-10 h-10 text-purple-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div><p className="text-orange-100 text-sm">{t('stats.timetableEntries')}</p><p className="text-3xl font-bold">{stats.total_timetable_entries}</p></div>
              <Calendar className="w-10 h-10 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="flex justify-between items-center">
          <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1><p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p></div>
          <div className="flex gap-3">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {activeTab === 'timetable' && (
              <button onClick={handleGenerateTimetable} disabled={loading} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {t('actions.generateTimetable')}
              </button>
            )}
            <button onClick={() => { setNewItem({}); setShowAddModal(true); }} className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('actions.add', { name: tabs.find(t => t.id === activeTab)?.label })}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-lg shadow-sm">
          <nav className="flex gap-1 overflow-x-auto p-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSearchTerm(''); setFilters({}); }}
                  className={`px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 rounded-lg ${isActive ? `bg-${tab.color}-50 text-${tab.color}-600 dark:bg-${tab.color}-900/20 dark:text-${tab.color}-400 shadow-sm` : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  <Icon className="w-4 h-4" /> <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder={t('actions.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {activeTab === 'teachers' && (
                <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                  <option value="">{t('filters.allStatus')}</option>
                  <option value="active">{t('status.active')}</option>
                  <option value="inactive">{t('status.inactive')}</option>
                  <option value="on_leave">{t('status.onLeave')}</option>
                </select>
              )}
              {activeTab === 'timetable' && (
                <>
                  <select value={filters.week} onChange={(e) => setFilters({...filters, week: e.target.value})}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    <option value="">{t('filters.allWeeks')}</option>
                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36].map(w => (
                      <option key={w} value={w}>{t('filters.week', { week: w })}</option>
                    ))}
                  </select>
                  <select value={filters.academic_year} onChange={(e) => setFilters({...filters, academic_year: e.target.value})}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    <option value="">{t('filters.allAcademicYears')}</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </>
              )}
              {(activeTab === 'day-settings' || activeTab === 'holidays') && (
                <select value={filters.academic_year} onChange={(e) => setFilters({...filters, academic_year: e.target.value})}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                  <option value="">{t('filters.allAcademicYears')}</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              )}
              <button onClick={fetchData} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> {t('actions.refresh')}
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50"><tr>{renderTableHeaders()}</tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan="10" className="px-4 py-8 text-center"><div className="flex justify-center items-center gap-3"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div><span>{t('messages.loading')}</span></div></td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr><td colSpan="10" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"><div className="flex flex-col items-center gap-2"><Info className="w-12 h-12 text-gray-300" /><p>{t('messages.noData')}</p><button onClick={() => setShowAddModal(true)} className="text-green-600 hover:text-green-700 font-medium">{t('actions.clickToAdd')}</button></div></td></tr>
                ) : (paginatedData.map(renderTableRow))}
              </tbody>
            </table>
          </div>
          {!loading && currentData.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2"><span className="text-sm text-gray-600 dark:text-gray-400">{t('pagination.showing')}</span>
                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm">
                  <option value={5}>5</option><option value={10}>10</option><option value={30}>30</option><option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('pagination.perPage')}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-4">{t('pagination.total', { count: currentData.length })}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">{t('pagination.first')}</button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm px-3">{t('pagination.page', { current: currentPage, total: totalPages })}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">{t('pagination.last')}</button>
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit/View/Delete Modals - Similar to Academics component */}
        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{t('actions.add', { name: tabs.find(t => t.id === activeTab)?.label })}</h2>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">{renderFormFields(newItem, setNewItem)}</div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleCreate} disabled={loading} className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50">{loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div> : t('actions.create')}</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 rounded-lg">{t('actions.cancel')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{t('actions.edit', { name: tabs.find(t => t.id === activeTab)?.label })}</h2>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">{renderFormFields(editItem, setEditItem, true)}</div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleUpdate} disabled={loading} className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50">{loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div> : t('actions.update')}</button>
                <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 rounded-lg">{t('actions.cancel')}</button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{t('actions.viewDetails')}</h2>
                <button onClick={() => setShowViewModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {Object.entries(selectedItem).map(([key, value]) => {
                  if (key === 'id' || key === 'created_at' || key === 'updated_at' || key === 'user' || typeof value === 'object') return null;
                  const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  let displayValue = value || '-';
                  if (key === 'amount' && typeof value === 'number') displayValue = `${new Intl.NumberFormat().format(value)} RWF`;
                  if (key === 'pass_mark' && value) displayValue = `${value}%`;
                  if (typeof value === 'boolean') displayValue = value ? t('status.yes') : t('status.no');
                  return (<div key={key} className="flex justify-between py-2 border-b border-gray-200"><span className="font-medium text-gray-600 text-sm">{formattedKey}:</span><span className="text-gray-900 text-sm">{displayValue}</span></div>);
                })}
              </div>
              <div className="mt-6"><button onClick={() => setShowViewModal(false)} className="w-full px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg">{t('actions.close')}</button></div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
              <div className="text-center"><div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-8 h-8 text-red-600" /></div>
                <h2 className="text-xl font-bold mb-2">{t('delete.title')}</h2><p className="text-gray-600 mb-4">{t('delete.confirmation')}</p>
                {selectedItem.full_name && <p className="text-sm text-gray-500 mb-4"><strong>{t('delete.itemName')}:</strong> {selectedItem.full_name}</p>}
                {selectedItem.name && <p className="text-sm text-gray-500 mb-4"><strong>{t('delete.itemName')}:</strong> {selectedItem.name}</p>}
                <p className="text-xs text-gray-500">{t('delete.warning')}</p>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleDelete} disabled={loading} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Trash2 className="w-4 h-4" /> {t('actions.delete')}</>}
                </button>
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 rounded-lg">{t('actions.cancel')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherManagement;