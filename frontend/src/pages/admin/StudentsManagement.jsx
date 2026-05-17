import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, UserPlus, Edit, Trash2, Search, Eye, X,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  AlertCircle, GraduationCap, BookOpen, Calendar,
  Sun, Moon, Plus, Info, Mail, Phone, MapPin,
  Download, Printer, FileText, BarChart3, Hash,
  User, UserCheck, Shield, Baby, Link2,
  BookOpenCheck, Filter, TrendingUp, Clock,
  Award, Activity, Star, Heart, MoveRight, Home,
  DoorOpen, Building2, Repeat, AlertTriangle, School,
  Users as UsersIcon, UserCircle, Check, Loader2
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

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const StudentManagement = () => {
  const { t } = useTranslation();

  // ── UI state ──────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  
  // ── Data states ────────────────────────────────────────────
  const [allStudents, setAllStudents] = useState([]);
  const [allParents, setAllParents] = useState([]);
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  
  // ── Filtered data (frontend pagination) ────────────────────
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [filteredParents, setFilteredParents] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  
  // ── Search and Filters ─────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    school_level_id: '',
    class_level_id: '',
    academic_year_id: '',
    relationship_type: '',
    classroom_id: '',
  });
  
  // ── Dynamic dropdown data ──────────────────────────────────
  const [filteredClassLevels, setFilteredClassLevels] = useState([]);
  const [filteredTerms, setFilteredTerms] = useState([]);
  
  // ── Pagination states (frontend) ──────────────────────────
  const [studentsPage, setStudentsPage] = useState(1);
  const [parentsPage, setParentsPage] = useState(1);
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // ── Modal states ──────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedStudentForPerformance, setSelectedStudentForPerformance] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [newItem, setNewItem] = useState({});
  const [editItem, setEditItem] = useState({});
  const [assignData, setAssignData] = useState({});
  const [reportData, setReportData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  
  // ── Additional data for modals ─────────────────────────────
  const [studentParents, setStudentParents] = useState([]);
  const [studentTeachers, setStudentTeachers] = useState(null);
  const [parentStudents, setParentStudents] = useState([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // ── Dropdown data ──────────────────────────────────────────
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  
  // ── Stats ─────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total_students: 0, active_students: 0, inactive_students: 0,
    total_parents: 0, active_parents: 0,
    total_assignments: 0,
  });

  // ─────────────────────────────────────────────────────────
  // Helper: Fetch dynamic data based on selections
  // ─────────────────────────────────────────────────────────
  
  const fetchClassLevelsBySchool = async (schoolLevelId) => {
    if (!schoolLevelId) {
      setFilteredClassLevels(classLevels);
      return;
    }
    try {
      const response = await apiClient.get(`/academics/school-levels/${schoolLevelId}/class-levels/`);
      const levels = response.data.data || [];
      setFilteredClassLevels(levels);
    } catch (error) {
      console.error("Error fetching class levels:", error);
      setFilteredClassLevels([]);
    }
  };

  const fetchTermsByAcademicYear = async (academicYearId) => {
    if (!academicYearId) {
      setFilteredTerms(terms);
      return;
    }
    try {
      const response = await apiClient.get(`/academics/terms/?academic_year=${academicYearId}`);
      const termsList = response.data.data?.results || response.data.data || [];
      setFilteredTerms(termsList);
    } catch (error) {
      console.error("Error fetching terms:", error);
      setFilteredTerms([]);
    }
  };

  // ─────────────────────────────────────────────────────────
  // API: Fetch parents for a specific student
  // ─────────────────────────────────────────────────────────
  const fetchParentsForStudent = async (studentId) => {
    setLoadingParents(true);
    try {
      const response = await apiClient.get(`/students/${studentId}/parents/`);
      console.log("Parents for student:", response.data);
      const parentsData = response.data.data?.parents || response.data.data || [];
      setStudentParents(parentsData);
      return parentsData;
    } catch (error) {
      console.error("Error fetching parents for student:", error);
      toast.error(t('students.messages.fetchError'));
      setStudentParents([]);
      return [];
    } finally {
      setLoadingParents(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // API: Fetch teachers for a specific student (with subjects)
  // ─────────────────────────────────────────────────────────
  const fetchTeachersForStudent = async (studentId) => {
    setLoadingTeachers(true);
    try {
      const response = await apiClient.get(`/students/${studentId}/teachers-with-subjects/`);
      console.log("Teachers for student:", response.data);
      const teachersData = response.data.data;
      setStudentTeachers(teachersData);
      return teachersData;
    } catch (error) {
      console.error("Error fetching teachers for student:", error);
      toast.error(t('students.messages.fetchError'));
      setStudentTeachers(null);
      return null;
    } finally {
      setLoadingTeachers(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // API: Fetch students for a specific parent
  // ─────────────────────────────────────────────────────────
  const fetchStudentsForParent = async (parentId) => {
    setLoadingStudents(true);
    try {
      const response = await apiClient.get(`/students/parents/${parentId}/students/`);
      console.log("Students for parent:", response.data);
      const studentsData = response.data.data?.students || response.data.data || [];
      setParentStudents(studentsData);
      return studentsData;
    } catch (error) {
      console.error("Error fetching students for parent:", error);
      toast.error(t('students.messages.fetchError'));
      setParentStudents([]);
      return [];
    } finally {
      setLoadingStudents(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────
  
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all data without pagination for frontend filtering
      const [studentsRes, parentsRes, classroomsRes, academicYearsRes, schoolLevelsRes, classLevelsRes, termsRes] = await Promise.all([
        apiClient.get('/students/?page_size=1000'),
        apiClient.get('/students/parents/?page_size=1000'),
        apiClient.get('/academics/class-rooms/'),
        apiClient.get('/academics/academic-years/'),
        apiClient.get('/academics/school-levels/'),
        apiClient.get('/academics/class-levels/'),
        apiClient.get('/academics/terms/'),
      ]);
      
      let studentsData = studentsRes.data.data?.results ?? studentsRes.data.data ?? [];
      let parentsData = parentsRes.data.data?.results ?? parentsRes.data.data ?? [];
      let classroomsData = classroomsRes.data.data?.results ?? classroomsRes.data.data ?? [];
      let academicYearsData = academicYearsRes.data.data?.results ?? academicYearsRes.data.data ?? [];
      let schoolLevelsData = schoolLevelsRes.data.data?.results ?? schoolLevelsRes.data.data ?? [];
      let classLevelsData = classLevelsRes.data.data?.results ?? classLevelsRes.data.data ?? [];
      let termsData = termsRes.data.data?.results ?? termsRes.data.data ?? [];
      
      console.log("Fetched students:", studentsData);
      console.log("Fetched parents:", parentsData);
      console.log("Fetched classrooms:", classroomsData);
      
      // Fetch classroom assignments for each student
      const assignmentsPromises = studentsData.map(student => 
        apiClient.get(`/students/${student.id}/classrooms/`).catch(() => ({ data: { data: [] } }))
      );
      const assignmentsResults = await Promise.all(assignmentsPromises);
      
      // Build assignments data with student info
      const allAssignmentsData = [];
      assignmentsResults.forEach((res, idx) => {
        const student = studentsData[idx];
        const assignments = res.data.data ?? [];
        assignments.forEach(assign => {
          allAssignmentsData.push({
            ...assign,
            student_name: student.full_name,
            student_roll_number: student.roll_number,
            student_status: student.status,
          });
        });
      });
      
      setAllStudents(studentsData);
      setAllParents(parentsData);
      setAllAssignments(allAssignmentsData);
      setAllClassrooms(classroomsData);
      setAcademicYears(academicYearsData);
      setSchoolLevels(schoolLevelsData);
      setClassLevels(classLevelsData);
      setTerms(termsData);
      setFilteredClassLevels(classLevelsData);
      setFilteredTerms(termsData);
      
      setStats({
        total_students: studentsData.length,
        active_students: studentsData.filter(s => s.status === 'active').length,
        inactive_students: studentsData.filter(s => s.status === 'inactive').length,
        total_parents: parentsData.length,
        active_parents: parentsData.filter(p => p.status === 'active').length,
        total_assignments: allAssignmentsData.length,
      });
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error(t('students.messages.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);
  
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  // ── Frontend filtering ────────────────────────────────────
  useEffect(() => {
    // Filter Students
    let filtered = [...allStudents];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.full_name?.toLowerCase().includes(term) ||
        s.roll_number?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.user?.username?.toLowerCase().includes(term)
      );
    }
    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    if (filters.school_level_id) {
      filtered = filtered.filter(s => s.current_school_level?.id == filters.school_level_id);
    }
    if (filters.class_level_id) {
      filtered = filtered.filter(s => s.current_class_level?.id == filters.class_level_id);
    }
    if (filters.academic_year_id) {
      filtered = filtered.filter(s => s.current_academic_year?.id == filters.academic_year_id);
    }
    setFilteredStudents(filtered);
    setStudentsPage(1);
  }, [allStudents, searchTerm, filters]);
  
  useEffect(() => {
    // Filter Parents
    let filtered = [...allParents];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.full_name?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.phone_number?.toLowerCase().includes(term)
      );
    }
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    if (filters.relationship_type) {
      filtered = filtered.filter(p => p.relationship_type === filters.relationship_type);
    }
    setFilteredParents(filtered);
    setParentsPage(1);
  }, [allParents, searchTerm, filters]);
  
  useEffect(() => {
    // Filter Assignments
    let filtered = [...allAssignments];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.student_name?.toLowerCase().includes(term) ||
        a.student_roll_number?.toLowerCase().includes(term) ||
        a.classroom?.name?.toLowerCase().includes(term)
      );
    }
    if (filters.classroom_id) {
      filtered = filtered.filter(a => a.classroom?.id == filters.classroom_id);
    }
    if (filters.academic_year_id) {
      filtered = filtered.filter(a => a.academic_year?.id == filters.academic_year_id);
    }
    if (filters.status) {
      filtered = filtered.filter(a => a.status === filters.status);
    }
    setFilteredAssignments(filtered);
    setAssignmentsPage(1);
  }, [allAssignments, searchTerm, filters]);
  
  // ── Handle filter changes for dynamic dropdowns ────────────
  const handleSchoolLevelFilterChange = (value) => {
    setFilters({ ...filters, school_level_id: value, class_level_id: '' });
    fetchClassLevelsBySchool(value);
  };

  const handleAcademicYearFilterChange = (value) => {
    setFilters({ ...filters, academic_year_id: value });
    fetchTermsByAcademicYear(value);
  };
  
  // ── Pagination helpers ────────────────────────────────────
  const getPaginatedData = (data, page) => {
    const start = (page - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  };
  
  const paginatedStudents = getPaginatedData(filteredStudents, studentsPage);
  const paginatedParents = getPaginatedData(filteredParents, parentsPage);
  const paginatedAssignments = getPaginatedData(filteredAssignments, assignmentsPage);
  
  const totalStudentsPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const totalParentsPages = Math.ceil(filteredParents.length / itemsPerPage);
  const totalAssignmentsPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  
  // ── CRUD Operations ────────────────────────────────────────
  const handleCreate = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'students' ? '/students/create/' : '/students/parents/create/';
      const res = await apiClient.post(url, newItem);
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.createSuccess'));
        setShowAddModal(false);
        setNewItem({});
        fetchAllData();
      } else {
        toast.error(Object.values(res.data.errors || {}).flat()[0] || res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.createError'));
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
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.updateSuccess'));
        setShowEditModal(false);
        setEditItem({});
        fetchAllData();
      } else {
        toast.error(Object.values(res.data.errors || {}).flat()[0] || res.data.message);
      }
    } catch (err) {
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
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.deleteSuccess'));
        setShowDeleteModal(false);
        setSelectedItem(null);
        fetchAllData();
      } else {
        toast.error(res.data.message || t('students.messages.deleteError'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.deleteError'));
    } finally {
      setLoading(false);
    }
  };
  
  // ── Classroom Assignment Operations ────────────────────────
  const handleAssignClassroom = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/students/classrooms/assign/', assignData);
      if (res.data.success) {
        toast.success(t('students.messages.assignmentSuccess'));
        setShowAssignModal(false);
        setAssignData({});
        fetchAllData();
      } else {
        toast.error(res.data.message || t('students.messages.assignmentError'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.assignmentError'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleUnassignClassroom = async () => {
    setLoading(true);
    try {
      const res = await apiClient.patch(`/students/classrooms/${selectedAssignment.id}/update/`, {
        status: 'inactive'
      });
      if (res.data.success) {
        toast.success(t('students.messages.unassignSuccess'));
        setShowUnassignModal(false);
        setSelectedAssignment(null);
        fetchAllData();
      } else {
        toast.error(res.data.message || t('students.messages.unassignError'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.unassignError'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleLinkParent = async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/students/parents/create/', {
        ...newItem,
        student_ids: [selectedItem.id]
      });
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.parentLinked'));
        setShowLinkModal(false);
        setNewItem({});
        fetchAllData();
      } else {
        toast.error(Object.values(res.data.errors || {}).flat()[0] || res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.createError'));
    } finally {
      setLoading(false);
    }
  };
  
  // ── Performance Data ───────────────────────────────────────
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
      }
    } catch (err) {
      console.error('Performance fetch error:', err);
      toast.error(t('students.messages.performanceError'));
    } finally {
      setLoadingPerformance(false);
    }
  }, [t]);
  
  // ── Report Generation ──────────────────────────────────────
  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      setReportData({
        generated_on: new Date().toLocaleString(),
        students: allStudents,
        parents: allParents,
        assignments: allAssignments,
        summary: {
          total_students: allStudents.length,
          active_students: allStudents.filter(s => s.status === 'active').length,
          inactive_students: allStudents.filter(s => s.status === 'inactive').length,
          total_parents: allParents.length,
          active_parents: allParents.filter(p => p.status === 'active').length,
          total_assignments: allAssignments.length,
          active_assignments: allAssignments.filter(a => a.status === 'active').length,
          students_with_parents: allStudents.filter(s => s.parents_count > 0).length,
        },
      });
      setShowReportModal(true);
      toast.success(t('students.messages.reportGenerated'));
    } catch (err) {
      toast.error(t('students.messages.reportError'));
    } finally {
      setLoading(false);
    }
  };
  
  // ── Modal Handlers ─────────────────────────────────────────
  const openEditModal = (item) => {
    setEditItem(item);
    setShowEditModal(true);
  };
  
  const openViewModal = async (item, tabType) => {
    setSelectedItem(item);
    setShowViewModal(true);
    
    if (tabType === 'students') {
      // Fetch parents and teachers for this student
      await fetchParentsForStudent(item.id);
      await fetchTeachersForStudent(item.id);
    } else if (tabType === 'parents') {
      // Fetch students for this parent
      await fetchStudentsForParent(item.id);
    }
  };
  
  const openPerformanceModal = async (student) => {
    setSelectedStudentForPerformance(student);
    setShowPerformanceModal(true);
    const academicYearId = filters.academic_year_id || (academicYears.find(y => y.is_current)?.id);
    await fetchStudentPerformance(student.id, academicYearId, null);
  };
  
  const openAssignModal = (student) => {
    setAssignData({
      student_id: student.id,
      academic_year_id: student.current_academic_year?.id || '',
      class_level_id: student.current_class_level?.id || '',
      school_level_id: student.current_school_level?.id || '',
      classroom_id: '',
    });
    setShowAssignModal(true);
  };
  
  // ── Form Fields ────────────────────────────────────────────
  const getStudentFields = () => [
    { name: 'full_name', label: t('students.form.fullName'), type: 'text', required: true },
    { name: 'email', label: t('students.form.email'), type: 'email', required: false },
    { name: 'phone_number', label: t('students.form.phone'), type: 'tel', required: false },
    { name: 'birth_date', label: t('students.form.birthDate'), type: 'date', required: false },
    { name: 'current_academic_year_id', label: t('students.form.academicYear'), type: 'select', required: false, 
      options: academicYears.map(y => ({ value: y.id, label: y.name })) },
    { name: 'current_school_level_id', label: t('students.form.schoolLevel'), type: 'select', required: false, 
      options: schoolLevels.map(s => ({ value: s.id, label: s.name })) },
    { name: 'current_class_level_id', label: t('students.form.classLevel'), type: 'select', required: false, 
      options: filteredClassLevels.map(c => ({ value: c.id, label: c.name })) },
  ];
  
  const getParentFields = () => [
    { name: 'full_name', label: t('students.form.fullName'), type: 'text', required: true },
    { name: 'phone_number', label: t('students.form.phone'), type: 'tel', required: true },
    { name: 'email', label: t('students.form.email'), type: 'email', required: true },
    { name: 'physical_address', label: t('students.form.physicalAddress'), type: 'textarea', required: false },
    { name: 'relationship_type', label: t('students.form.relationshipType'), type: 'select', required: true,
      options: [
        { value: 'father', label: t('students.relationship.father') },
        { value: 'mother', label: t('students.relationship.mother') },
        { value: 'guardian', label: t('students.relationship.guardian') },
        { value: 'other', label: t('students.relationship.other') },
      ] },
  ];
  
  const renderFormFields = (fields, item, setItem) => (
    <div className="space-y-3">
      {fields.map(field => (
        <div key={field.name}>
          <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">
            {field.label}{field.required && <span className="text-green-600 ml-0.5">*</span>}
          </label>
          {field.type === 'select' ? (
            <select
              value={item[field.name] ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setItem({ ...item, [field.name]: value });
                // If this is school level, update class levels
                if (field.name === 'current_school_level_id') {
                  fetchClassLevelsBySchool(value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent text-sm outline-none"
            >
              <option value="">— {t('students.actions.select')} —</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              value={item[field.name] ?? ''}
              onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent text-sm outline-none"
              rows={3}
            />
          ) : (
            <input
              type={field.type}
              value={item[field.name] ?? ''}
              onChange={(e) => setItem({ ...item, [field.name]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent text-sm outline-none"
            />
          )}
        </div>
      ))}
    </div>
  );
  
  // ── Render View Modal Content (Student View) ───────────────
  const renderStudentViewContent = () => {
    if (!selectedItem) return null;
    
    const studentAssignments = allAssignments.filter(a => a.student === selectedItem.id);
    const activeAssignment = studentAssignments.find(a => a.status === 'active');
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-green-700 flex items-center justify-center text-white text-lg font-bold">
            {selectedItem.full_name?.[0] ?? 'S'}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{selectedItem.full_name}</p>
            <p className="text-xs font-mono text-green-700 dark:text-green-400">{selectedItem.roll_number}</p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" />
              {selectedItem.user?.username || t('students.labels.noUserAccount')}
            </p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadge(selectedItem.status)}`}>
            {t(`students.status.${selectedItem.status}`)}
          </span>
        </div>
        
        {/* Student Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            [t('students.table.email'), selectedItem.email || '—'],
            [t('students.table.phone'), selectedItem.phone_number || '—'],
            [t('students.form.birthDate'), selectedItem.birth_date || '—'],
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
        
        {/* Current Classroom Assignment */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-900/30">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
            <DoorOpen className="w-3.5 h-3.5" /> {t('students.classroom.currentAssignment')}
          </p>
          {activeAssignment ? (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800 dark:text-white">{activeAssignment.classroom?.name}</p>
                <p className="text-xs text-gray-500">{activeAssignment.academic_year?.name} • {activeAssignment.term?.name || 'No term'}</p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedAssignment(activeAssignment);
                  setShowUnassignModal(true);
                }}
                className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 transition-colors"
              >
                {t('students.actions.unassign')}
              </button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-gray-400">{t('students.messages.noClassroomAssigned')}</p>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  openAssignModal(selectedItem);
                }}
                className="mt-2 text-xs text-green-700 hover:text-green-800 font-medium"
              >
                + {t('students.actions.assignClassroom')}
              </button>
            </div>
          )}
        </div>
        
        {/* Parents Section - NEW: Display all parents with full details */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" /> {t('students.tabs.parents')} ({studentParents.length})
          </p>
          {loadingParents ? (
            <div className="text-center py-4">
              <Spinner />
              <p className="text-xs text-gray-400 mt-1">Loading parents...</p>
            </div>
          ) : studentParents.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {studentParents.map(parent => (
                <div key={parent.id} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100">
                  <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {parent.full_name?.[0] ?? 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{parent.full_name}</p>
                      <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 rounded-full capitalize">
                        {t(`students.relationship.${parent.relationship_type}`) || parent.relationship_type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {parent.phone_number || '—'}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {parent.email || '—'}
                    </p>
                    {parent.physical_address && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {parent.physical_address}
                      </p>
                    )}
                    <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full ${getStatusBadge(parent.status)}`}>
                      {t(`students.status.${parent.status}`)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <p className="text-xs text-gray-400">{t('students.messages.noParentsLinked')}</p>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedItem(selectedItem);
                  setShowLinkModal(true);
                }}
                className="mt-2 text-xs text-green-700 hover:text-green-800 font-medium flex items-center gap-1 justify-center"
              >
                <Plus className="w-3 h-3" /> {t('students.actions.addParent')}
              </button>
            </div>
          )}
        </div>
        
        {/* Teachers Section - NEW: Display teachers with their subjects */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" /> {t('students.tabs.teachers')} ({studentTeachers?.teachers?.length || 0})
          </p>
          {loadingTeachers ? (
            <div className="text-center py-4">
              <Spinner />
              <p className="text-xs text-gray-400 mt-1">Loading teachers...</p>
            </div>
          ) : studentTeachers?.teachers?.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {studentTeachers.teachers.map(teacher => (
                <div key={teacher.id} className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {teacher.full_name?.[0] ?? 'T'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{teacher.full_name}</p>
                        <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 rounded-full">
                          {teacher.specialization || 'Teacher'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {teacher.email || '—'}
                      </p>
                      {teacher.phone_number && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {teacher.phone_number}
                        </p>
                      )}
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Subjects taught:</p>
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects.map(subject => (
                            <span key={subject.id} className="text-xs px-2 py-0.5 bg-white dark:bg-gray-800 rounded-full border border-purple-200 dark:border-purple-800">
                              {subject.name} ({subject.code})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <p className="text-xs text-gray-400">No teachers assigned to this student yet.</p>
            </div>
          )}
        </div>
        
        {/* Classroom Info if available */}
        {studentTeachers?.classroom && (
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">
              Classroom: <span className="font-semibold">{studentTeachers.classroom.name} ({studentTeachers.classroom.code})</span>
              {studentTeachers.academic_year && ` | Academic Year: ${studentTeachers.academic_year}`}
              {studentTeachers.term && ` | Term: ${studentTeachers.term}`}
            </p>
          </div>
        )}
        
        {/* Performance Button */}
        <button
          onClick={() => {
            setShowViewModal(false);
            openPerformanceModal(selectedItem);
          }}
          className="w-full py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          {t('students.actions.viewFullPerformance')}
        </button>
      </div>
    );
  };
  
  // ── Render View Modal Content (Parent View) ────────────────
  const renderParentViewContent = () => {
    if (!selectedItem) return null;
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-green-50 dark:from-amber-900/20 dark:to-green-900/20 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-amber-600 flex items-center justify-center text-white text-lg font-bold">
            {selectedItem.full_name?.[0] ?? 'P'}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{selectedItem.full_name}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 capitalize">
              {t(`students.relationship.${selectedItem.relationship_type}`)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" />
              {selectedItem.user?.username || t('students.labels.noUserAccount')}
            </p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadge(selectedItem.status)}`}>
            {t(`students.status.${selectedItem.status}`)}
          </span>
        </div>
        
        {/* Parent Info Grid */}
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
        
        {/* Students Section - NEW: Display all students with their details */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5" /> {t('students.tabs.students')} ({parentStudents.length})
          </p>
          {loadingStudents ? (
            <div className="text-center py-4">
              <Spinner />
              <p className="text-xs text-gray-400 mt-1">Loading students...</p>
            </div>
          ) : parentStudents.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {parentStudents.map(student => (
                <div key={student.id} className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {student.full_name?.[0] ?? 'S'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{student.full_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(student.status)}`}>
                          {t(`students.status.${student.status}`)}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-green-700 dark:text-green-400 mt-0.5">
                        Roll: {student.roll_number}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div>
                          <p className="text-gray-500">School Level</p>
                          <p className="font-medium">{student.current_school_level?.name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Class Level</p>
                          <p className="font-medium">{student.current_class_level?.name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Classroom</p>
                          <p className="font-medium">{student.current_classroom?.name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Academic Year</p>
                          <p className="font-medium">{student.current_academic_year?.name || '—'}</p>
                        </div>
                      </div>
                      {student.email && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" /> {student.email}
                        </p>
                      )}
                      {student.phone_number && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {student.phone_number}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <p className="text-xs text-gray-400">No students linked to this parent yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // ── Render View Modal (switches based on tab) ──────────────
  const renderViewModalContent = () => {
    if (!selectedItem) return null;
    
    if (activeTab === 'students') {
      return renderStudentViewContent();
    } else if (activeTab === 'parents') {
      return renderParentViewContent();
    }
    
    return null;
  };
  
  // ── Performance Modal Content ──────────────────────────────
  const renderPerformanceContent = () => {
    if (!performanceData) return null;
    
    const { academic_performance, discipline } = performanceData;
    const academic = academic_performance || {};
    const disc = discipline || {};
    
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-green-700 flex items-center justify-center text-white text-xl font-bold">
            {selectedStudentForPerformance?.full_name?.[0] ?? 'S'}
          </div>
          <div>
            <p className="font-bold text-lg text-gray-900 dark:text-white">{selectedStudentForPerformance?.full_name}</p>
            <p className="text-xs font-mono text-green-700 dark:text-green-400">{selectedStudentForPerformance?.roll_number}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200">
            <p className="text-xs text-gray-500">{t('students.performance.overallAverage')}</p>
            <p className="text-2xl font-bold text-green-700">{academic?.overall_average?.toFixed(1) || '—'}%</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200">
            <p className="text-xs text-gray-500">{t('students.performance.disciplineScore')}</p>
            <p className="text-2xl font-bold text-amber-700">{disc?.discipline_score?.toFixed(1) || '—'}%</p>
          </div>
        </div>
        
        {academic?.subject_results?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200">
            <p className="text-xs font-semibold mb-2">{t('students.performance.subjectPerformance')}</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {academic.subject_results.map((subject, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-sm">{subject.subject_name}</span>
                  <span className="text-sm font-semibold">{subject.final_percentage?.toFixed(1) || 0}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // ── Report Modal ───────────────────────────────────────────
  const renderReportModal = () => {
    if (!reportData) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('students.reports.title')}</h2>
            <button onClick={() => setShowReportModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-5">{t('students.reports.generatedOn')}: {reportData.generated_on}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              ['Total Students', reportData.summary.total_students],
              ['Active Students', reportData.summary.active_students],
              ['Total Parents', reportData.summary.total_parents],
              ['Active Assignments', reportData.summary.active_assignments],
            ].map(([label, value]) => (
              <div key={label} className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                <p className="text-xs text-green-700 dark:text-green-400">{label}</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-300">{value}</p>
              </div>
            ))}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                const dataStr = JSON.stringify(reportData, null, 2);
                const link = document.createElement('a');
                link.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr));
                link.setAttribute('download', `student_report_${new Date().toISOString().split('T')[0]}.json`);
                link.click();
                toast.success(t('students.messages.exportSuccess'));
              }}
              className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> {t('students.actions.downloadReport')}
            </button>
            <button onClick={() => window.print()} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> {t('students.actions.printReport')}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // ── Table Rendering ────────────────────────────────────────
  const renderStudentsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100">
          <tr>
            {[t('students.table.rollNumber'), t('students.table.fullName'), t('students.table.username'), t('students.table.classLevel'), t('students.table.classroom'), t('students.table.parents'), t('students.table.status'), t('students.table.actions')].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedStudents.map(student => {
            const studentAssignments = allAssignments.filter(a => a.student === student.id);
            const activeAssignment = studentAssignments.find(a => a.status === 'active');
            return (
              <tr key={student.id} className="hover:bg-green-50/50 transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-green-700">{student.roll_number}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{student.full_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 font-mono text-xs">
                    <User className="w-3 h-3" />
                    {student.user?.username || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{student.current_school_level?.name || '—'}-{student.current_class_level?.name || '—'}</td>
                <td className="px-4 py-3 text-sm">
                  {activeAssignment?.classroom ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                      <DoorOpen className="w-3 h-3" />
                      {activeAssignment.classroom_name} - {activeAssignment.classroom_code}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium"
                  >
                    <UsersIcon className="w-3 h-3" />{student.parents_count || 0}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(student.status)}`}>
                    {t(`students.status.${student.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => openViewModal(student, 'students')} className="p-1.5 rounded-lg hover:bg-green-100" title={t('students.actions.view')}>
                      <Eye className="w-3.5 h-3.5 text-green-700" />
                    </button>
                    <button onClick={() => openEditModal(student)} className="p-1.5 rounded-lg hover:bg-amber-50" title={t('students.actions.edit')}>
                      <Edit className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                    <button onClick={() => openAssignModal(student)} className="p-1.5 rounded-lg hover:bg-blue-50" title={t('students.actions.assignClassroom')}>
                      <DoorOpen className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                    <button onClick={() => { setSelectedItem(student); setShowDeleteModal(true); }} className="p-1.5 rounded-lg hover:bg-red-50" title={t('students.actions.delete')}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
  
  const renderParentsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100">
          <tr>
            {[t('students.table.fullName'), t('students.table.username'), t('students.table.phone'), t('students.table.email'), t('students.table.relationship'), t('students.table.students'), t('students.table.status'), t('students.table.actions')].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedParents.map(parent => (
            <tr key={parent.id} className="hover:bg-green-50/50 transition-colors">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{parent.full_name}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 font-mono text-xs">
                  <User className="w-3 h-3" />
                  {parent.user?.username || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{parent.phone_number}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{parent.email}</td>
              <td className="px-4 py-3 text-sm">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs capitalize">
                  {t(`students.relationship.${parent.relationship_type}`)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                  <GraduationCap className="w-3 h-3" />{parent.students_count ?? 0}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(parent.status)}`}>
                  {t(`students.status.${parent.status}`)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  <button onClick={() => openViewModal(parent, 'parents')} className="p-1.5 rounded-lg hover:bg-green-100">
                    <Eye className="w-3.5 h-3.5 text-green-700" />
                  </button>
                  <button onClick={() => openEditModal(parent)} className="p-1.5 rounded-lg hover:bg-amber-50">
                    <Edit className="w-3.5 h-3.5 text-amber-600" />
                  </button>
                  <button onClick={() => { setSelectedItem(parent); setShowDeleteModal(true); }} className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  const renderAssignmentsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100">
          <tr>
            {[t('students.table.studentName'), t('students.table.rollNumber'), t('students.table.classroom'), t('students.table.academicYear'), t('students.table.schoolLevel'), t('students.table.classLevel'), t('students.table.term'), t('students.table.status'), t('students.table.actions')].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedAssignments.map(assignment => (
            <tr key={assignment.id} className="hover:bg-green-50/50 transition-colors">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{assignment.student_name}</td>
              <td className="px-4 py-3 text-sm font-mono text-green-700">{assignment.student_roll_number}</td>
              <td className="px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                  <DoorOpen className="w-3 h-3" />
                  {assignment.classroom_code} - {assignment.classroom_name}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{assignment.academic_year_name}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{assignment.school_level_name}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{assignment.class_level_name}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{assignment.term_name || '—'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(assignment.status)}`}>
                  {t(`students.status.${assignment.status}`)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  {assignment.status === 'active' && (
                    <button
                      onClick={() => { setSelectedAssignment(assignment); setShowUnassignModal(true); }}
                      className="p-1.5 rounded-lg hover:bg-red-50"
                      title={t('students.actions.unassign')}
                    >
                      <DoorOpen className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  // ── Pagination Component ───────────────────────────────────
  const Pagination = ({ currentPage, totalPages, onPageChange }) => (
    <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>{t('students.pagination.showing')}</span>
        <select
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
          className="px-2 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-green-700"
        >
          {[5, 10, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>{t('students.pagination.perPage')}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className="px-2 py-1 text-xs border rounded-lg disabled:opacity-40">
          {t('students.pagination.first')}
        </button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 border rounded-lg disabled:opacity-40">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm px-3">
          {t('students.pagination.page')} {currentPage} {t('students.pagination.of')} {totalPages || 1}
        </span>
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="p-1.5 border rounded-lg disabled:opacity-40">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage >= totalPages} className="px-2 py-1 text-xs border rounded-lg disabled:opacity-40">
          {t('students.pagination.last')}
        </button>
      </div>
    </div>
  );
  
  // ── Modals ─────────────────────────────────────────────────
  const ModalWrapper = ({ children, maxW = 'max-w-2xl' }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ${maxW} w-full mx-4 p-5 max-h-[90vh] overflow-y-auto border border-green-100`}>
        {children}
      </div>
    </div>
  );
  
  // ── Tabs Configuration ─────────────────────────────────────
  const tabs = [
    { id: 'students', label: t('students.tabs.students'), icon: GraduationCap, count: filteredStudents.length },
    { id: 'parents', label: t('students.tabs.parents'), icon: Shield, count: filteredParents.length },
    { id: 'classrooms', label: t('students.tabs.classrooms'), icon: DoorOpen, count: filteredAssignments.length },
    { id: 'reports', label: t('students.tabs.reports'), icon: BarChart3 },
  ];
  
  // Get the current tab label as a string, not a function
  const getCurrentTabLabel = () => {
    const tab = tabs.find(tab => tab.id === activeTab);
    return tab?.label || '';
  };
  
  // ── Main Render ────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        
        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('students.stats.totalStudents'), value: stats.total_students, color: 'from-green-700 to-green-900' },
            { label: t('students.stats.activeStudents'), value: stats.active_students, color: 'from-green-500 to-green-700' },
            { label: t('students.stats.totalParents'), value: stats.total_parents, color: 'from-amber-500 to-amber-700' },
            { label: t('students.stats.totalAssignments'), value: stats.total_assignments, color: 'from-blue-500 to-blue-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white shadow-lg`}>
              <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>
        
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t('students.title')}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{t('students.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-white dark:bg-gray-800 border rounded-xl shadow-sm">
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
            </button>
            {activeTab === 'reports' && (
              <button onClick={handleGenerateReport} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="w-4 h-4" /> {t('students.actions.generateReport')}
              </button>
            )}
            {activeTab !== 'reports' && (
              <button onClick={() => { setNewItem({}); setShowAddModal(true); }} className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl flex items-center gap-2 text-sm font-medium">
                <Plus className="w-4 h-4" /> {`${t('students.actions.addNew')} ${getCurrentTabLabel()}`}
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-1.5 flex gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); setFilters({}); setStudentsPage(1); setParentsPage(1); setAssignmentsPage(1); }}
                className={`px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 rounded-xl whitespace-nowrap flex-1 justify-center
                  ${isActive ? 'bg-green-700 text-white shadow-md' : 'text-gray-500 hover:text-green-700 hover:bg-green-50'}`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-200'}`}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Filters & Search */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('students.actions.search')}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); }}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl bg-white dark:bg-gray-700 text-gray-900 focus:ring-2 focus:ring-green-700 outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-3 py-2 text-sm border rounded-xl bg-white">
                <option value="">{t('students.filters.allStatus')}</option>
                <option value="active">{t('students.status.active')}</option>
                <option value="inactive">{t('students.status.inactive')}</option>
                <option value="transferred">{t('students.status.transferred')}</option>
                <option value="graduated">{t('students.status.graduated')}</option>
              </select>
              
              {activeTab === 'students' && (
                <>
                  <select 
                    value={filters.academic_year_id} 
                    onChange={(e) => handleAcademicYearFilterChange(e.target.value)} 
                    className="px-3 py-2 text-sm border rounded-xl bg-white"
                  >
                    <option value="">{t('students.filters.allAcademicYears')}</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                  <select 
                    value={filters.school_level_id} 
                    onChange={(e) => handleSchoolLevelFilterChange(e.target.value)} 
                    className="px-3 py-2 text-sm border rounded-xl bg-white"
                  >
                    <option value="">{t('students.filters.allSchoolLevels')}</option>
                    {schoolLevels.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select 
                    value={filters.class_level_id} 
                    onChange={(e) => setFilters({ ...filters, class_level_id: e.target.value })} 
                    className="px-3 py-2 text-sm border rounded-xl bg-white"
                  >
                    <option value="">{t('students.filters.allClassLevels')}</option>
                    {filteredClassLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </>
              )}
              
              {activeTab === 'parents' && (
                <select value={filters.relationship_type} onChange={(e) => setFilters({ ...filters, relationship_type: e.target.value })} className="px-3 py-2 text-sm border rounded-xl bg-white">
                  <option value="">{t('students.filters.allRelationships')}</option>
                  <option value="father">{t('students.relationship.father')}</option>
                  <option value="mother">{t('students.relationship.mother')}</option>
                  <option value="guardian">{t('students.relationship.guardian')}</option>
                  <option value="other">{t('students.relationship.other')}</option>
                </select>
              )}
              
              {activeTab === 'classrooms' && (
                <>
                  <select 
                    value={filters.academic_year_id} 
                    onChange={(e) => handleAcademicYearFilterChange(e.target.value)} 
                    className="px-3 py-2 text-sm border rounded-xl bg-white"
                  >
                    <option value="">{t('students.filters.allAcademicYears')}</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                  <select 
                    value={filters.school_level_id} 
                    onChange={(e) => handleSchoolLevelFilterChange(e.target.value)} 
                    className="px-3 py-2 text-sm border rounded-xl bg-white"
                  >
                    <option value="">{t('students.filters.allSchoolLevels')}</option>
                    {schoolLevels.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select 
                    value={filters.class_level_id} 
                    onChange={(e) => setFilters({ ...filters, class_level_id: e.target.value })} 
                    className="px-3 py-2 text-sm border rounded-xl bg-white"
                  >
                    <option value="">{t('students.filters.allClassLevels')}</option>
                    {filteredClassLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select 
                    value={filters.classroom_id} 
                    onChange={(e) => setFilters({ ...filters, classroom_id: e.target.value })} 
                    className="px-3 py-2 text-sm border rounded-xl bg-white"
                  >
                    <option value="">{t('students.filters.allClassrooms')}</option>
                    {allClassrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </>
              )}
              
              <button onClick={() => { setFilters({}); setSearchTerm(''); setFilteredClassLevels(classLevels); setFilteredTerms(terms); }} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center gap-1.5 text-sm font-medium">
                <RefreshCw className="w-4 h-4" /> {t('students.actions.reset')}
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-20 text-center">
            <Spinner />
            <p className="mt-4 text-gray-500">{t('students.messages.loading')}</p>
          </div>
        ) : activeTab === 'reports' ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-green-700" />
            </div>
            <h3 className="text-lg font-bold mb-2">{t('students.reports.clickToGenerate')}</h3>
            <button onClick={handleGenerateReport} className="px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl inline-flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> {t('students.actions.generateReport')}
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden">
            {activeTab === 'students' && renderStudentsTable()}
            {activeTab === 'parents' && renderParentsTable()}
            {activeTab === 'classrooms' && renderAssignmentsTable()}
            
            {activeTab === 'students' && filteredStudents.length > 0 && (
              <Pagination currentPage={studentsPage} totalPages={totalStudentsPages} onPageChange={setStudentsPage} />
            )}
            {activeTab === 'parents' && filteredParents.length > 0 && (
              <Pagination currentPage={parentsPage} totalPages={totalParentsPages} onPageChange={setParentsPage} />
            )}
            {activeTab === 'classrooms' && filteredAssignments.length > 0 && (
              <Pagination currentPage={assignmentsPage} totalPages={totalAssignmentsPages} onPageChange={setAssignmentsPage} />
            )}
            
            {((activeTab === 'students' && filteredStudents.length === 0) ||
              (activeTab === 'parents' && filteredParents.length === 0) ||
              (activeTab === 'classrooms' && filteredAssignments.length === 0)) && (
              <div className="p-10 text-center">
                <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">{t('students.messages.noData')}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Modals */}
        {showReportModal && renderReportModal()}
        
        {showPerformanceModal && (
          <ModalWrapper maxW="max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{t('students.performance.title')}</h2>
              <button onClick={() => { setShowPerformanceModal(false); setPerformanceData(null); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {loadingPerformance ? (
              <div className="py-12 text-center"><Spinner /><p className="mt-2">{t('students.messages.loadingPerformance')}</p></div>
            ) : renderPerformanceContent()}
            <button onClick={() => setShowPerformanceModal(false)} className="w-full mt-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl">Close</button>
          </ModalWrapper>
        )}
        
        {/* View Modal - Now with enhanced content */}
        {showViewModal && selectedItem && (
          <ModalWrapper maxW="max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{t('students.actions.viewDetails')}</h2>
              <button onClick={() => {
                setShowViewModal(false);
                setStudentParents([]);
                setStudentTeachers(null);
                setParentStudents([]);
              }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderViewModalContent()}
            <button onClick={() => {
              setShowViewModal(false);
              setStudentParents([]);
              setStudentTeachers(null);
              setParentStudents([]);
            }} className="w-full mt-4 py-2.5 bg-green-700 text-white rounded-xl">Close</button>
          </ModalWrapper>
        )}
        
        {/* Add Modal */}
        {showAddModal && (
          <ModalWrapper>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{`${t('students.actions.add')} ${getCurrentTabLabel()}`}</h2>
              <button onClick={() => { setShowAddModal(false); setNewItem({}); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {renderFormFields(activeTab === 'students' ? getStudentFields() : getParentFields(), newItem, setNewItem)}
            <div className="flex gap-3 mt-5">
              <button onClick={handleCreate} disabled={loading} className="flex-1 py-2.5 bg-green-700 text-white rounded-xl">{loading ? <Spinner /> : t('students.actions.create')}</button>
              <button onClick={() => { setShowAddModal(false); setNewItem({}); }} className="flex-1 py-2.5 bg-gray-100 rounded-xl">Cancel</button>
            </div>
          </ModalWrapper>
        )}
        
        {/* Edit Modal */}
        {showEditModal && (
          <ModalWrapper>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{`${t('students.actions.edit')} ${getCurrentTabLabel()}`}</h2>
              <button onClick={() => { setShowEditModal(false); setEditItem({}); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {renderFormFields(activeTab === 'students' ? getStudentFields() : getParentFields(), editItem, setEditItem)}
            <div className="flex gap-3 mt-5">
              <button onClick={handleUpdate} disabled={loading} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl">{loading ? <Spinner /> : t('students.actions.update')}</button>
              <button onClick={() => { setShowEditModal(false); setEditItem({}); }} className="flex-1 py-2.5 bg-gray-100 rounded-xl">Cancel</button>
            </div>
          </ModalWrapper>
        )}
        
        {/* Assign Classroom Modal */}
        {showAssignModal && (
          <ModalWrapper>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{t('students.actions.assignClassroom')}</h2>
              <button onClick={() => { setShowAssignModal(false); setAssignData({}); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Academic Year</label>
                <select 
                  value={assignData.academic_year_id} 
                  onChange={(e) => {
                    setAssignData({ ...assignData, academic_year_id: e.target.value });
                    fetchTermsByAcademicYear(e.target.value);
                  }} 
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Term (Optional)</label>
                <select 
                  value={assignData.term_id} 
                  onChange={(e) => setAssignData({ ...assignData, term_id: e.target.value })} 
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select Term</option>
                  {filteredTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">School Level</label>
                <select 
                  value={assignData.school_level_id} 
                  onChange={(e) => {
                    setAssignData({ ...assignData, school_level_id: e.target.value });
                    fetchClassLevelsBySchool(e.target.value);
                  }} 
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select</option>
                  {schoolLevels.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Class Level</label>
                <select 
                  value={assignData.class_level_id} 
                  onChange={(e) => setAssignData({ ...assignData, class_level_id: e.target.value })} 
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select</option>
                  {filteredClassLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Classroom</label>
                <select 
                  value={assignData.classroom_id} 
                  onChange={(e) => setAssignData({ ...assignData, classroom_id: e.target.value })} 
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select</option>
                  {allClassrooms.filter(c => c.assigned_class_level?.id == assignData.class_level_id).map(c => (
                    <option key={c.id} value={c.id}>{c.name} (Capacity: {c.capacity})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleAssignClassroom} disabled={loading} className="flex-1 py-2.5 bg-green-700 text-white rounded-xl">{loading ? <Spinner /> : 'Assign'}</button>
              <button onClick={() => { setShowAssignModal(false); setAssignData({}); }} className="flex-1 py-2.5 bg-gray-100 rounded-xl">Cancel</button>
            </div>
          </ModalWrapper>
        )}
        
        {/* Unassign Modal */}
        {showUnassignModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full mx-4 p-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-lg font-bold mb-2">{t('students.unassign.title')}</h2>
                <p className="text-gray-500 text-sm">{t('students.unassign.confirmation')}</p>
                <p className="text-sm font-semibold mt-3">{selectedAssignment.student_name} → {selectedAssignment.classroom?.name}</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleUnassignClassroom} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl">{loading ? <Spinner /> : t('students.actions.unassign')}</button>
                <button onClick={() => { setShowUnassignModal(false); setSelectedAssignment(null); }} className="flex-1 py-2.5 bg-gray-100 rounded-xl">Cancel</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Link Parent Modal */}
        {showLinkModal && selectedItem && (
          <ModalWrapper>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{t('students.actions.addParent')}</h2>
              <button onClick={() => { setShowLinkModal(false); setNewItem({}); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">For: <span className="font-semibold">{selectedItem.full_name}</span></p>
            {renderFormFields(getParentFields(), newItem, setNewItem)}
            <div className="flex gap-3 mt-5">
              <button onClick={handleLinkParent} disabled={loading} className="flex-1 py-2.5 bg-green-700 text-white rounded-xl">{loading ? <Spinner /> : t('students.actions.linkParent')}</button>
              <button onClick={() => setShowLinkModal(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl">Cancel</button>
            </div>
          </ModalWrapper>
        )}
        
        {/* Delete Modal */}
        {showDeleteModal && selectedItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full mx-4 p-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-lg font-bold mb-2">{t('students.delete.title')}</h2>
                <p className="text-gray-500 text-sm">{t('students.delete.confirmation')}</p>
                <p className="text-sm font-semibold mt-3">{selectedItem.full_name}</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleDelete} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl">{loading ? <Spinner /> : t('students.actions.delete')}</button>
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl">Cancel</button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default StudentManagement;