import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, School, BookOpen, Users, CreditCard, 
  Plus, Edit, Trash2, Search, Eye, X,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  AlertCircle, Clock, Building2, GraduationCap,
  LayoutGrid, ClipboardList, Wallet
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
    academic_year: '',
    school_level: '',
    class_level: '',
    status: ''
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

  // Fetch all dropdown data
  const fetchDropdownData = async () => {
    try {
      // Fetch school levels for class levels dropdown
      const schoolLevelsRes = await apiClient.get('/school-levels/');
      if (schoolLevelsRes.data.success) {
        const data = schoolLevelsRes.data.data;
        setSchoolLevels(data.results || data);
      }
      
      // Fetch class levels for classrooms, assignments, costs dropdowns
      const classLevelsRes = await apiClient.get('/class-levels/');
      if (classLevelsRes.data.success) {
        const data = classLevelsRes.data.data;
        setClassLevels(data.results || data);
      }
      
      // Fetch subjects for assignments dropdown
      const subjectsRes = await apiClient.get('/subjects/');
      if (subjectsRes.data.success) {
        const data = subjectsRes.data.data;
        setSubjects(data.results || data);
      }
      
      // Fetch academic years for costs dropdown
      const academicYearsRes = await apiClient.get('/academic-years/');
      if (academicYearsRes.data.success) {
        const data = academicYearsRes.data.data;
        setAcademicYears(data.results || data);
      }
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
          if (filters.status) params.append('status', filters.status);
          break;
        case 'classrooms':
          url = '/class-rooms/';
          if (filters.class_level) params.append('class_level', filters.class_level);
          if (filters.status) params.append('status', filters.status);
          break;
        case 'subjects':
          url = '/subjects/';
          if (filters.status) params.append('status', filters.status);
          break;
        case 'assignments':
          url = '/class-level-subjects/';
          if (filters.class_level) params.append('class_level', filters.class_level);
          break;
        case 'costs':
          url = '/class-level-costs/';
          if (filters.class_level) params.append('class_level', filters.class_level);
          if (filters.academic_year) params.append('academic_year', filters.academic_year);
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
    fetchDropdownData();
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
      let payload = { ...newItem };
      
      // Set default status for active fields
      if (activeTab === 'classrooms' && !payload.status) payload.status = 'active';
      if (activeTab === 'subjects' && !payload.status) payload.status = 'active';
      
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
        fetchDropdownData(); // Refresh dropdown data
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
      let payload = { ...editItem };
      
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
      
      const response = await apiClient.put(url, payload);
      
      if (response.data.success) {
        toast.success(response.data.message || 'Updated successfully');
        setShowEditModal(false);
        setEditItem({});
        fetchData();
        fetchDropdownData();
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
        fetchDropdownData();
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

  // Toggle status for classrooms and subjects
  const handleToggleStatus = async (item) => {
    setLoading(true);
    try {
      const newStatus = item.status === 'active' ? 'inactive' : 'active';
      let url = '';
      
      if (activeTab === 'classrooms') {
        url = `/class-rooms/${item.id}/`;
      } else if (activeTab === 'subjects') {
        url = `/subjects/${item.id}/`;
      } else {
        setLoading(false);
        return;
      }
      
      const response = await apiClient.put(url, { ...item, status: newStatus });
      
      if (response.data.success) {
        toast.success(`Status updated to ${newStatus}`);
        fetchData();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
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
        ) : field.type === 'checkbox' ? (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={item[field.name] || false}
              onChange={(e) => setItem({...item, [field.name]: e.target.checked})}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{field.label}</span>
          </label>
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
        { name: 'name', label: 'Level Name', type: 'text', required: true, placeholder: 'e.g., Nursery, Primary, Secondary' },
        { name: 'description', label: 'Description', type: 'textarea', required: false }
      ],
      'class-levels': [
        { name: 'name', label: 'Class Name', type: 'text', required: true, placeholder: 'e.g., Primary One, Senior 1' },
        { name: 'code', label: 'Class Code', type: 'text', required: true, placeholder: 'e.g., P1, S1' },
        { name: 'school_level', label: 'School Level', type: 'select', required: true, options: schoolLevels.map(s => ({ value: s.id, label: s.name })) },
        { name: 'description', label: 'Description', type: 'textarea', required: false }
      ],
      'classrooms': [
        { name: 'name', label: 'Room Name', type: 'text', required: true, placeholder: 'e.g., Room A101' },
        { name: 'code', label: 'Room Code', type: 'text', required: true, placeholder: 'e.g., A101' },
        { name: 'class_level', label: 'Class Level', type: 'select', required: true, options: classLevels.map(c => ({ value: c.id, label: c.name })) },
        { name: 'room_type', label: 'Room Type', type: 'select', required: true, options: [
          { value: 'standard', label: 'Standard' },
          { value: 'laboratory', label: 'Laboratory' },
          { value: 'workshop', label: 'Workshop' },
          { value: 'auditorium', label: 'Auditorium' }
        ]},
        { name: 'capacity', label: 'Capacity', type: 'number', required: true, placeholder: 'Number of students' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ]}
      ],
      'subjects': [
        { name: 'name', label: 'Subject Name', type: 'text', required: true, placeholder: 'e.g., Mathematics' },
        { name: 'code', label: 'Subject Code', type: 'text', required: true, placeholder: 'e.g., MATH101' },
        { name: 'pass_mark', label: 'Pass Score', type: 'number', required: true, placeholder: 'e.g., 50' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ]},
        { name: 'description', label: 'Description', type: 'textarea', required: false }
      ],
      'assignments': [
        { name: 'class_level', label: 'Class Level', type: 'select', required: true, options: classLevels.map(c => ({ value: c.id, label: c.name })) },
        { name: 'subject', label: 'Subject', type: 'select', required: true, options: subjects.filter(s => s.status === 'active').map(s => ({ value: s.id, label: s.name })) },
        { name: 'teaching_frequency', label: 'Teaching Frequency', type: 'select', required: true, options: [
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' }
        ]},
        { name: 'hours_per_week', label: 'Hours per Week', type: 'number', required: true, placeholder: 'e.g., 4' },
        { name: 'is_compulsory', label: 'Compulsory Subject', type: 'checkbox' }
      ],
      'costs': [
        { name: 'name', label: 'Fee Name', type: 'text', required: true, placeholder: 'e.g., Tuition Fee' },
        { name: 'academic_year', label: 'Academic Year', type: 'select', required: true, options: academicYears.map(y => ({ value: y.id, label: y.name })) },
        { name: 'class_level', label: 'Class Level', type: 'select', required: true, options: classLevels.map(c => ({ value: c.id, label: c.name })) },
        { name: 'amount', label: 'Amount (RWF)', type: 'number', required: true, placeholder: '0' },
        { name: 'frequency', label: 'Frequency', type: 'select', required: true, options: [
          { value: 'termly', label: 'Termly' },
          { value: 'yearly', label: 'Yearly' },
          { value: 'monthly', label: 'Monthly' }
        ]},
        { name: 'is_mandatory', label: 'Mandatory Fee', type: 'checkbox' }
      ]
    };

    return commonFields(fieldSets[activeTab] || []);
  };

  // Render table rows based on active tab
  const renderTableRow = (item) => {
    const getStatusBadge = (status) => {
      const isActive = status === 'active';
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 
          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>
          {isActive ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {isActive ? 'Active' : 'Inactive'}
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
            <td className="px-4 py-3">
              {item.is_current && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <CheckCircle className="w-3 h-3" />
                  Current
                </span>
              )}
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">{renderActionButtons(item)}</div>
            </td>
          </tr>
        );
      
      case 'school-levels':
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.description || '-'}</td>
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
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.school_level_name || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.description || '-'}</td>
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
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.room_type || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.capacity || '-'}</td>
            <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button onClick={() => { setSelectedItem(item); setShowViewModal(true); }} className="p-1 hover:bg-gray-100 rounded" title="View">
                  <Eye className="w-4 h-4 text-blue-500" />
                </button>
                <button onClick={() => { setEditItem(item); setShowEditModal(true); }} className="p-1 hover:bg-gray-100 rounded" title="Edit">
                  <Edit className="w-4 h-4 text-yellow-500" />
                </button>
                <button onClick={() => handleToggleStatus(item)} className="p-1 hover:bg-gray-100 rounded" title="Toggle Status">
                  {item.status === 'active' ? <Clock className="w-4 h-4 text-orange-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                </button>
                <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }} className="p-1 hover:bg-gray-100 rounded" title="Delete">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </td>
          </tr>
        );
      
      case 'subjects':
        return (
          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.code}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.pass_mark || '-'}</td>
            <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button onClick={() => { setSelectedItem(item); setShowViewModal(true); }} className="p-1 hover:bg-gray-100 rounded" title="View">
                  <Eye className="w-4 h-4 text-blue-500" />
                </button>
                <button onClick={() => { setEditItem(item); setShowEditModal(true); }} className="p-1 hover:bg-gray-100 rounded" title="Edit">
                  <Edit className="w-4 h-4 text-yellow-500" />
                </button>
                <button onClick={() => handleToggleStatus(item)} className="p-1 hover:bg-gray-100 rounded" title="Toggle Status">
                  {item.status === 'active' ? <Clock className="w-4 h-4 text-orange-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                </button>
                <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }} className="p-1 hover:bg-gray-100 rounded" title="Delete">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
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
                item.is_compulsory ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-700'
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
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.academic_year_name || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.class_level_name || '-'}</td>
            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
              {new Intl.NumberFormat().format(item.amount)} RWF
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.frequency || '-'}</td>
            <td className="px-4 py-3">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                item.is_mandatory ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {item.is_mandatory ? 'Mandatory' : 'Optional'}
              </span>
            </td>
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
      {(activeTab === 'academic-years' || activeTab === 'classrooms' || activeTab === 'subjects' || activeTab === 'costs') && (
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
      'school-levels': ['Level Name', 'Description', 'Actions'],
      'class-levels': ['Class Name', 'Code', 'School Level', 'Description', 'Actions'],
      'classrooms': ['Room Name', 'Code', 'Room Type', 'Capacity', 'Status', 'Actions'],
      'subjects': ['Subject Name', 'Code', 'Pass Score', 'Status', 'Actions'],
      'assignments': ['Class Level', 'Subject', 'Frequency', 'Hours/Week', 'Type', 'Actions'],
      'costs': ['Fee Name', 'Academic Year', 'Class Level', 'Amount', 'Frequency', 'Mandatory', 'Actions']
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
            Manage academic years, school levels, classes, classrooms, subjects, and fees
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
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSearchTerm(''); setFilters({ academic_year: '', school_level: '', class_level: '', status: '' }); }}
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
            {activeTab === 'costs' && (
              <select
                value={filters.academic_year}
                onChange={(e) => setFilters({...filters, academic_year: e.target.value})}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">All Academic Years</option>
                {academicYears.map(year => (
                  <option key={year.id} value={year.id}>{year.name}</option>
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
            
            {(activeTab === 'classrooms' || activeTab === 'assignments' || activeTab === 'costs') && (
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
            
            {(activeTab === 'classrooms' || activeTab === 'subjects') && (
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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