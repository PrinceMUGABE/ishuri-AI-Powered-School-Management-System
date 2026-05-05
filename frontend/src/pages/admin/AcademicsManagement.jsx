import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, School, BookOpen, Users, CreditCard, 
  Plus, Edit, Trash2, Search, Filter, Eye, X,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  AlertCircle, Clock, DollarSign, Building2, GraduationCap,
  LayoutGrid, List, ClipboardList, Wallet, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

// API Configuration
const API_BASE_URL = 'http://127.0.0.1:8000/api/academics';

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
  return config;
}, (error) => Promise.reject(error));

const AcademicsManagement = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('academic-years');
  const [searchTerm, setSearchTerm] = useState('');
  
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
    school_level: '',
    class_level: '',
    category: '',
    shift: ''
  });

  const tabs = [
    { id: 'academic-years', label: 'Academic Years', icon: Calendar, color: 'blue' },
    { id: 'school-levels', label: 'School Levels', icon: Building2, color: 'purple' },
    { id: 'class-levels', label: 'Class Levels', icon: GraduationCap, color: 'green' },
    { id: 'classrooms', label: 'Classrooms', icon: LayoutGrid, color: 'orange' },
    { id: 'subjects', label: 'Subjects', icon: BookOpen, color: 'red' },
    { id: 'assignments', label: 'Subject Assignments', icon: ClipboardList, color: 'indigo' },
    { id: 'costs', label: 'Fee Structures', icon: Wallet, color: 'teal' }
  ];

  // Fetch data based on active tab
  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '';
      let params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      
      switch(activeTab) {
        case 'academic-years':
          url = '/academic-years/';
          break;
        case 'school-levels':
          url = '/school-levels/';
          break;
        case 'class-levels':
          url = '/class-levels/';
          if (filters.school_level) params.append('school_level', filters.school_level);
          if (filters.category) params.append('category', filters.category);
          break;
        case 'classrooms':
          url = '/class-rooms/';
          if (filters.class_level) params.append('class_level', filters.class_level);
          if (filters.shift) params.append('shift', filters.shift);
          break;
        case 'subjects':
          url = '/subjects/';
          if (filters.category) params.append('category', filters.category);
          break;
        case 'assignments':
          url = '/class-level-subjects/';
          if (filters.class_level) params.append('class_level', filters.class_level);
          break;
        case 'costs':
          url = '/class-level-costs/';
          if (filters.class_level) params.append('class_level', filters.class_level);
          break;
        default:
          return;
      }
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await apiClient.get(url);
      
      if (response.data.success) {
        const data = response.data.data;
        const results = data.results || data;
        
        switch(activeTab) {
          case 'academic-years': setAcademicYears(results); break;
          case 'school-levels': setSchoolLevels(results); break;
          case 'class-levels': setClassLevels(results); break;
          case 'classrooms': setClassrooms(results); break;
          case 'subjects': setSubjects(results); break;
          case 'assignments': setAssignments(results); break;
          case 'costs': setCosts(results); break;
        }
      } else {
        toast.error(response.data.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, searchTerm, filters, currentPage, itemsPerPage]);

  // Get current data based on active tab
  const getCurrentData = () => {
    switch(activeTab) {
      case 'academic-years': return academicYears;
      case 'school-levels': return schoolLevels;
      case 'class-levels': return classLevels;
      case 'classrooms': return classrooms;
      case 'subjects': return subjects;
      case 'assignments': return assignments;
      case 'costs': return costs;
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
      let payload = newItem;
      
      switch(activeTab) {
        case 'academic-years':
          url = '/academic-years/';
          break;
        case 'school-levels':
          url = '/school-levels/create/';
          break;
        case 'class-levels':
          url = '/class-levels/create/';
          break;
        case 'classrooms':
          url = '/class-rooms/create/';
          break;
        case 'subjects':
          url = '/subjects/create/';
          break;
        case 'assignments':
          url = '/class-level-subjects/create/';
          break;
        case 'costs':
          url = '/class-level-costs/create/';
          break;
      }
      
      const response = await apiClient.post(url, payload);
      
      if (response.data.success) {
        toast.success(response.data.message || `${activeTab} created successfully`);
        setShowAddModal(false);
        setNewItem({});
        fetchData();
      } else {
        const errors = response.data.errors;
        const errorMessage = Object.values(errors || {}).flat()[0] || 'Failed to create';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating:', error);
      toast.error(error.response?.data?.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  // Update handler
  const handleUpdate = async () => {
    setLoading(true);
    try {
      let url = '';
      
      switch(activeTab) {
        case 'academic-years':
          url = `/academic-years/${editItem.id}/`;
          break;
        case 'classrooms':
          url = `/class-rooms/${editItem.id}/`;
          break;
        case 'subjects':
          url = `/subjects/${editItem.id}/`;
          break;
        case 'costs':
          url = `/class-level-costs/${editItem.id}/`;
          break;
        default:
          toast.error('Update not supported for this section');
          setLoading(false);
          return;
      }
      
      const response = await apiClient.put(url, editItem);
      
      if (response.data.success) {
        toast.success(response.data.message || 'Updated successfully');
        setShowEditModal(false);
        setEditItem({});
        fetchData();
      } else {
        toast.error(response.data.message || 'Failed to update');
      }
    } catch (error) {
      console.error('Error updating:', error);
      toast.error(error.response?.data?.message || 'Failed to update');
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
        case 'academic-years':
          url = `/academic-years/${selectedItem.id}/`;
          break;
        case 'school-levels':
          url = `/school-levels/${selectedItem.id}/`;
          break;
        case 'class-levels':
          url = `/class-levels/${selectedItem.id}/`;
          break;
        case 'classrooms':
          url = `/class-rooms/${selectedItem.id}/`;
          break;
        case 'subjects':
          url = `/subjects/${selectedItem.id}/`;
          break;
        case 'assignments':
          url = `/class-level-subjects/${selectedItem.id}/`;
          break;
        case 'costs':
          url = `/class-level-costs/${selectedItem.id}/`;
          break;
        default:
          return;
      }
      
      const response = await apiClient.delete(url);
      
      if (response.data.success) {
        toast.success(response.data.message || 'Deleted successfully');
        setShowDeleteModal(false);
        setSelectedItem(null);
        fetchData();
      } else {
        toast.error(response.data.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(error.response?.data?.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  // Render form fields based on active tab
  const renderFormFields = (item, setItem, isEdit = false) => {
    const commonFields = (fields) => fields.map(field => (
      <div key={field.name}>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {field.label} {field.required && '*'}
        </label>
        {field.type === 'select' ? (
          <select
            value={item[field.name] || ''}
            onChange={(e) => setItem({...item, [field.name]: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select {field.label}</option>
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : field.type === 'textarea' ? (
          <textarea
            value={item[field.name] || ''}
            onChange={(e) => setItem({...item, [field.name]: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
            placeholder={field.placeholder}
          />
        ) : (
          <input
            type={field.type}
            value={item[field.name] || ''}
            onChange={(e) => setItem({...item, [field.name]: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder={field.placeholder}
          />
        )}
      </div>
    ));

    const fieldSets = {
      'academic-years': [
        { name: 'name', label: 'Year Name', type: 'text', required: true, placeholder: 'e.g., 2024-2025' },
        { name: 'start_date', label: 'Start Date', type: 'date', required: true },
        { name: 'end_date', label: 'End Date', type: 'date', required: true },
        { name: 'is_current', label: 'Set as Current Year', type: 'checkbox' }
      ],
      'school-levels': [

        { name: 'name', label: 'Level Name', type: 'text', required: true, placeholder: 'e.g., Primary, Secondary' },
        { name: 'level_type', label: 'Level Type', type: 'select', required: true, options: [
            {value: 'nursery', label: 'Nursery' },
          { value: 'primary', label: 'Primary' },
          { value: 'secondary', label: 'Secondary' },
          { value: 'high_school', label: 'High School' }
          
        ]},
        { name: 'description', label: 'Description', type: 'textarea', required: false },
        { name: 'order', label: 'Display Order', type: 'number', required: false }
      ],
      'class-levels': [
        { name: 'name', label: 'Class Name', type: 'text', required: true, placeholder: 'e.g., Senior 1, Grade 1' },
        { name: 'code', label: 'Class Code', type: 'text', required: true, placeholder: 'e.g., S1, G1' },
        { name: 'category', label: 'Category', type: 'select', required: true, options: [
          { value: 'ordinary', label: 'Ordinary Level' },
          { value: 'advanced', label: 'Advanced Level' }
        ]},
        { name: 'school_level', label: 'School Level', type: 'select', required: true, options: schoolLevels.map(s => ({ value: s.id, label: s.name })) },
        { name: 'description', label: 'Description', type: 'textarea', required: false },
        { name: 'default_teaching_frequency', label: 'Teaching Frequency', type: 'select', options: [
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' }
        ]}
      ],
      'classrooms': [
        { name: 'name', label: 'Room Name', type: 'text', required: true, placeholder: 'e.g., Room A101' },
        { name: 'code', label: 'Room Code', type: 'text', required: true, placeholder: 'e.g., A101' },
        { name: 'class_level', label: 'Class Level', type: 'select', required: true, options: classLevels.map(c => ({ value: c.id, label: c.name })) },
        { name: 'room_type', label: 'Room Type', type: 'select', options: [
          { value: 'standard', label: 'Standard' },
          { value: 'laboratory', label: 'Laboratory' },
          { value: 'workshop', label: 'Workshop' }
        ]},
        { name: 'shift', label: 'Shift', type: 'select', options: [
          { value: 'morning', label: 'Morning' },
          { value: 'afternoon', label: 'Afternoon' },
          { value: 'evening', label: 'Evening' }
        ]},
        { name: 'capacity', label: 'Capacity', type: 'number', placeholder: 'Number of students' }
      ],
      'subjects': [
        { name: 'name', label: 'Subject Name', type: 'text', required: true, placeholder: 'e.g., Mathematics' },
        { name: 'code', label: 'Subject Code', type: 'text', required: true, placeholder: 'e.g., MATH101' },
        { name: 'category', label: 'Category', type: 'select', options: [
          { value: 'core', label: 'Core' },
          { value: 'elective', label: 'Elective' },
          { value: 'vocational', label: 'Vocational' }
        ]},
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'grading_system', label: 'Grading System', type: 'select', options: [
          { value: 'numeric', label: 'Numeric (0-100)' },
          { value: 'letter', label: 'Letter Grade (A-F)' }
        ]},
        { name: 'pass_mark', label: 'Pass Mark', type: 'number' }
      ],
      'assignments': [
        { name: 'class_level', label: 'Class Level', type: 'select', required: true, options: classLevels.map(c => ({ value: c.id, label: c.name })) },
        { name: 'subject', label: 'Subject', type: 'select', required: true, options: subjects.map(s => ({ value: s.id, label: s.name })) },
        { name: 'teaching_frequency', label: 'Teaching Frequency', type: 'select', options: [
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' }
        ]},
        { name: 'hours_per_week', label: 'Hours per Week', type: 'number' },
        { name: 'is_compulsory', label: 'Compulsory', type: 'checkbox' }
      ],
      'costs': [
        { name: 'name', label: 'Fee Name', type: 'text', required: true, placeholder: 'e.g., Tuition Fee' },
        { name: 'class_level', label: 'Class Level', type: 'select', required: true, options: classLevels.map(c => ({ value: c.id, label: c.name })) },
        { name: 'academic_year', label: 'Academic Year', type: 'select', required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
        { name: 'payment_type', label: 'Payment Type', type: 'select', required: true, options: [
          { value: 'tuition', label: 'Tuition' },
          { value: 'registration', label: 'Registration' },
          { value: 'exam', label: 'Exam Fee' },
          { value: 'activity', label: 'Activity Fee' }
        ]},
        { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: '0.00' },
        { name: 'frequency', label: 'Frequency', type: 'select', options: [
          { value: 'termly', label: 'Termly' },
          { value: 'yearly', label: 'Yearly' },
          { value: 'monthly', label: 'Monthly' }
        ]},
        { name: 'is_mandatory', label: 'Mandatory', type: 'checkbox' }
      ]
    };

    return commonFields(fieldSets[activeTab] || []);
  };

  // Render table rows based on active tab
  const renderTableRow = (item) => {
    const getStatusBadge = (status, isActive = true) => {
      const active = status === 'active' || isActive;
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 
          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
        }`}>
          {active ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {active ? 'Active' : 'Inactive'}
        </span>
      );
    };

    switch(activeTab) {
      case 'academic-years':
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.start_date || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.end_date || '-'}</td>
            <td className="px-4 py-3">{getStatusBadge('active', item.is_current)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                {renderActionButtons(item)}
              </div>
            </td>
          </tr>
        );
      
      case 'school-levels':
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.level_type_display || item.level_type}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.description || '-'}</td>
            <td className="px-4 py-3">{getStatusBadge(item.is_active)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">{renderActionButtons(item)}</div>
            </td>
          </tr>
        );
      
      case 'class-levels':
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.code}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.category_display || item.category}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.school_level_name || '-'}</td>
            <td className="px-4 py-3">{getStatusBadge(item.is_active)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">{renderActionButtons(item)}</div>
            </td>
          </tr>
        );
      
      case 'classrooms':
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.code}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.class_level_name || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.shift || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.capacity || '-'}</td>
            <td className="px-4 py-3">{getStatusBadge(item.is_active)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">{renderActionButtons(item)}</div>
            </td>
          </tr>
        );
      
      case 'subjects':
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.code}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.category_display || item.category}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.pass_mark || '-'}</td>
            <td className="px-4 py-3">{getStatusBadge(item.is_active)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">{renderActionButtons(item)}</div>
            </td>
          </tr>
        );
      
      case 'assignments':
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.class_level_name || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.subject_name || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.teaching_frequency || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.hours_per_week || '-'}</td>
            <td className="px-4 py-3">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                item.is_compulsory ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {item.is_compulsory ? 'Compulsory' : 'Optional'}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">{renderActionButtons(item)}</div>
            </td>
          </tr>
        );
      
      case 'costs':
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.class_level_name || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.payment_type_display || item.payment_type}</td>
            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
              {new Intl.NumberFormat().format(item.amount)} RWF
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.frequency || '-'}</td>
            <td className="px-4 py-3">{getStatusBadge(item.is_active)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">{renderActionButtons(item)}</div>
            </td>
          </tr>
        );
      
      default:
        return null;
    }
  };

  const renderActionButtons = (item) => (
    <>
      <button
        onClick={() => { setSelectedItem(item); setShowViewModal(true); }}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        title="View"
      >
        <Eye className="w-4 h-4 text-blue-500" />
      </button>
      {activeTab !== 'assignments' && activeTab !== 'class-levels' && activeTab !== 'school-levels' && (
        <button
          onClick={() => { setEditItem(item); setShowEditModal(true); }}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Edit"
        >
          <Edit className="w-4 h-4 text-yellow-500" />
        </button>
      )}
      <button
        onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        title="Delete"
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>
    </>
  );

  const renderTableHeaders = () => {
    const headers = {
      'academic-years': ['Year Name', 'Start Date', 'End Date', 'Current', 'Actions'],
      'school-levels': ['Level Name', 'Type', 'Description', 'Status', 'Actions'],
      'class-levels': ['Class Name', 'Code', 'Category', 'School Level', 'Status', 'Actions'],
      'classrooms': ['Room Name', 'Code', 'Class Level', 'Shift', 'Capacity', 'Status', 'Actions'],
      'subjects': ['Subject Name', 'Code', 'Category', 'Pass Mark', 'Status', 'Actions'],
      'assignments': ['Class Level', 'Subject', 'Frequency', 'Hours/Week', 'Type', 'Actions'],
      'costs': ['Fee Name', 'Class Level', 'Payment Type', 'Amount', 'Frequency', 'Status', 'Actions']
    };
    
    return headers[activeTab]?.map(header => (
      <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {header}
      </th>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Academics Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage academic years, levels, classrooms, subjects, and fees
          </p>
        </div>
        <button
          onClick={() => { setNewItem({}); setShowAddModal(true); }}
          className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add {tabs.find(t => t.id === activeTab)?.label}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSearchTerm(''); }}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                  activeTab === tab.id 
                    ? `border-${tab.color}-600 text-${tab.color}-600 dark:text-${tab.color}-400`
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
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
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex gap-2">
            {(activeTab === 'class-levels' || activeTab === 'subjects') && (
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">All Categories</option>
                <option value="ordinary">Ordinary Level</option>
                <option value="advanced">Advanced Level</option>
                <option value="core">Core</option>
                <option value="elective">Elective</option>
              </select>
            )}
            
            {(activeTab === 'class-levels' || activeTab === 'classrooms' || activeTab === 'assignments' || activeTab === 'costs') && (
              <select
                value={filters.class_level}
                onChange={(e) => setFilters({...filters, class_level: e.target.value})}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">All Class Levels</option>
                {classLevels.map(level => (
                  <option key={level.id} value={level.id}>{level.name}</option>
                ))}
              </select>
            )}
            
            {activeTab === 'class-levels' && (
              <select
                value={filters.school_level}
                onChange={(e) => setFilters({...filters, school_level: e.target.value})}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">All School Levels</option>
                {schoolLevels.map(level => (
                  <option key={level.id} value={level.id}>{level.name}</option>
                ))}
              </select>
            )}
            
            {activeTab === 'classrooms' && (
              <select
                value={filters.shift}
                onChange={(e) => setFilters({...filters, shift: e.target.value})}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">All Shifts</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            )}
            
            <button onClick={fetchData} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>{renderTableHeaders()}</tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No data found
                  </td>
                </tr>
              ) : (
                paginatedData.map(renderTableRow)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && currentData.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Showing</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">
                First
              </button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}
                className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}
                className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add {tabs.find(t => t.id === activeTab)?.label}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {renderFormFields(newItem, setNewItem)}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg">
                Create
              </button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit {tabs.find(t => t.id === activeTab)?.label}</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {renderFormFields(editItem, setEditItem, true)}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleUpdate} className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg">
                Update
              </button>
              <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">View Details</h2>
              <button onClick={() => setShowViewModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(selectedItem).map(([key, value]) => (
                typeof value !== 'object' && key !== 'id' && (
                  <div key={key} className="flex justify-between py-2 border-b border-gray-200">
                    <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="text-gray-600">{String(value || '-')}</span>
                  </div>
                )
              ))}
            </div>
            <div className="mt-6">
              <button onClick={() => setShowViewModal(false)} className="w-full px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Delete Item</h2>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this item? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
                Delete
              </button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicsManagement;