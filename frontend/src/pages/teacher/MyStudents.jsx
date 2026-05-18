import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, Search, Eye, X, ChevronLeft, ChevronRight, RefreshCw,
  GraduationCap, BookOpen, Calendar, Sun, Moon, Info, Mail, Phone, MapPin,
  User, Shield, DoorOpen, School, Filter, Clock, Award, Activity,
  UserCheck, AlertCircle, Loader2, Building2, BookMarked
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
  
  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
  
  return config;
}, (error) => {
  console.error('[API Request Error]', error);
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`[API Response Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} - Status: ${error.response?.status}`);
    console.error(`  Error:`, error.response?.data || error.message);
    return Promise.reject(error);
  }
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

// ─────────────────────────────────────────────────────────────
// Main Component - Teacher Students Dashboard
// ─────────────────────────────────────────────────────────────
const TeacherStudents = () => {
  const { t } = useTranslation();

  // ── UI state ──────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // ── Teacher data ────────────────────────────────────────────
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [teacherSchoolLevels, setTeacherSchoolLevels] = useState([]);
  const [teacherClassLevels, setTeacherClassLevels] = useState([]);
  const [teacherClassrooms, setTeacherClassrooms] = useState([]);
  
  // ── Student data ────────────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  
  // ── Filters ─────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    school_level_id: '',
    class_level_id: '',
    classroom_id: '',
    status: '',
  });
  
  // ── Dynamic filter options ──────────────────────────────────
  const [availableClassLevels, setAvailableClassLevels] = useState([]);
  const [availableClassrooms, setAvailableClassrooms] = useState([]);
  
  // ── Pagination ──────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // ── Modal states ────────────────────────────────────────────
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentParents, setStudentParents] = useState([]);
  const [studentClassroom, setStudentClassroom] = useState(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  
  // ── Stats ─────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total_students: 0,
    active_students: 0,
    total_classrooms: 0,
    total_school_levels: 0,
  });

  // ─────────────────────────────────────────────────────────
  // Fetch Teacher Profile and Teaching Assignments
  // ─────────────────────────────────────────────────────────
  
  const fetchTeacherProfile = useCallback(async () => {
    console.log('\n========== FETCHING TEACHER PROFILE ==========');
    try {
      console.log('[API] GET /teachers/me/');
      const profileRes = await apiClient.get('/teachers/me/');
      console.log('[API Response] /teachers/me/:', profileRes.data);
      
      const teacher = profileRes.data.data;
      setTeacherProfile(teacher);
      console.log('[Teacher Profile]', { id: teacher.id, full_name: teacher.full_name, email: teacher.email });
      
      console.log('\n[API] GET /teachers/timetable/my-assignments/');
      const timetableRes = await apiClient.get('/teachers/timetable/my-assignments/');
      console.log('[API Response] /teachers/timetable/my-assignments/:', timetableRes.data);
      
      const teachingData = timetableRes.data.data || {};
      
      const schoolLevels = teachingData.school_levels || [];
      const classLevels = teachingData.class_levels || [];
      const classrooms = teachingData.classrooms || [];
      
      console.log(`[School Levels] ${schoolLevels.length}`, schoolLevels);
      console.log(`[Class Levels] ${classLevels.length}`, classLevels);
      console.log(`[Classrooms] ${classrooms.length}`, classrooms);
      
      setTeacherSchoolLevels(schoolLevels);
      setTeacherClassLevels(classLevels);
      setTeacherClassrooms(classrooms);
      
      return { teacher, teachingData };
    } catch (error) {
      console.error('[Error] fetchTeacherProfile:', error);
      toast.error(t('teacher.messages.fetchProfileError'));
      return null;
    }
  }, [t]);
  
  // Fetch all students for teacher (across all assigned classrooms)
  const fetchAllTeacherStudents = useCallback(async () => {
    console.log('\n========== FETCHING TEACHER STUDENTS ==========');
    setLoading(true);
    try {
      console.log('[API] GET /students/teacher/my-students/');
      const response = await apiClient.get('/students/teacher/my-students/');
      console.log('[API Response] /students/teacher/my-students/:', response.data);
      
      const studentsData = response.data.data?.students || response.data.data || [];
      console.log(`[Students] Found ${studentsData.length} students`);
      
      setStudents(studentsData);
      setStats(prev => ({
        ...prev,
        total_students: studentsData.length,
        active_students: studentsData.filter(s => s.status === 'active').length,
        total_classrooms: teacherClassrooms.length,
        total_school_levels: teacherSchoolLevels.length,
      }));
      
      return studentsData;
    } catch (error) {
      console.error('[Error] fetchAllTeacherStudents:', error);
      toast.error(t('teacher.messages.fetchStudentsError'));
      setStudents([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [t, teacherClassrooms.length, teacherSchoolLevels.length]);
  
  // Fetch student details with parents and classroom
  const fetchStudentDetails = useCallback(async (studentId) => {
    console.log(`\n========== FETCHING STUDENT DETAILS (ID: ${studentId}) ==========`);
    setLoadingStudentDetails(true);
    try {
      console.log(`[API] GET /students/teacher/student/${studentId}/`);
      const response = await apiClient.get(`/students/teacher/student/${studentId}/`);
      console.log(`[API Response] /students/teacher/student/${studentId}/:`, response.data);
      
      // The API response structure has data directly in response.data.data
      const data = response.data.data || {};
      
      // The student object is the data itself (not nested under 'student')
      // Based on the console output, the student fields are directly in 'data'
      const student = {
        id: data.id,
        full_name: data.full_name,
        roll_number: data.roll_number,
        email: data.email,
        phone_number: data.phone_number,
        birth_date: data.birth_date,
        status: data.status,
        user: data.user,
        current_school_level: data.current_school_level,
        current_class_level: data.current_class_level,
        current_academic_year: data.current_academic_year,
      };
      
      // Parents are directly in data.parents array
      const parents = data.parents || [];
      
      // Classroom is directly in data.current_classroom
      const classroom = data.current_classroom || null;
      
      console.log('[Student Details Summary]', {
        name: student.full_name,
        roll: student.roll_number,
        email: student.email,
        schoolLevel: student.current_school_level?.name,
        classLevel: student.current_class_level?.name,
        academicYear: student.current_academic_year?.name,
        parentsCount: parents.length,
        classroom: classroom?.name || 'None'
      });
      
      setSelectedStudent(student);
      setStudentParents(parents);
      setStudentClassroom(classroom);
      
      return { student, parents, classroom };
    } catch (error) {
      console.error('[Error] fetchStudentDetails:', error);
      toast.error(t('teacher.messages.fetchStudentDetailsError'));
      return null;
    } finally {
      setLoadingStudentDetails(false);
    }
  }, [t]);
  
  // ─────────────────────────────────────────────────────────
  // Filter Handling
  // ─────────────────────────────────────────────────────────
  
  // Update available class levels based on selected school level
  useEffect(() => {
    if (filters.school_level_id) {
      const filtered = teacherClassLevels.filter(
        cl => cl.school_level_id === parseInt(filters.school_level_id)
      );
      setAvailableClassLevels(filtered);
    } else {
      setAvailableClassLevels(teacherClassLevels);
    }
    setFilters(prev => ({ ...prev, class_level_id: '', classroom_id: '' }));
  }, [filters.school_level_id, teacherClassLevels]);
  
  // Update available classrooms based on selected class level
  useEffect(() => {
    if (filters.class_level_id) {
      const filtered = teacherClassrooms.filter(
        cr => cr.class_level_id === parseInt(filters.class_level_id)
      );
      setAvailableClassrooms(filtered);
    } else {
      setAvailableClassrooms(teacherClassrooms);
    }
    setFilters(prev => ({ ...prev, classroom_id: '' }));
  }, [filters.class_level_id, teacherClassrooms]);
  
  // Filter students based on search and filters
  useEffect(() => {
    let filtered = [...students];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.full_name?.toLowerCase().includes(term) ||
        s.roll_number?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term)
      );
    }
    
    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    
    if (filters.classroom_id) {
      filtered = filtered.filter(s => 
        s.current_classroom?.id === parseInt(filters.classroom_id) ||
        s.classroom_id === parseInt(filters.classroom_id)
      );
    }
    
    setFilteredStudents(filtered);
    setCurrentPage(1);
  }, [students, searchTerm, filters]);
  
  // Load initial data
  useEffect(() => {
    console.log('\n========== INITIALIZING TEACHER DASHBOARD ==========');
    const init = async () => {
      const result = await fetchTeacherProfile();
      if (result) {
        await fetchAllTeacherStudents();
      }
    };
    init();
  }, [fetchTeacherProfile, fetchAllTeacherStudents]);
  
  // ── Pagination helpers ────────────────────────────────────
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  
  // ── Reset filters ─────────────────────────────────────────
  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      school_level_id: '',
      class_level_id: '',
      classroom_id: '',
      status: '',
    });
    setAvailableClassLevels(teacherClassLevels);
    setAvailableClassrooms(teacherClassrooms);
  };
  
  // ── Open View Modal ───────────────────────────────────────
  const openViewModal = async (student) => {
    console.log(`[Action] Opening student details modal for: ${student.full_name}`);
    await fetchStudentDetails(student.id);
    setShowViewModal(true);
  };
  
  // ── Render View Modal Content ─────────────────────────────
  const renderViewModalContent = () => {
    if (!selectedStudent) return null;
    
    console.log('[Render Modal] Student data:', selectedStudent);
    console.log('[Render Modal] Parents:', studentParents);
    console.log('[Render Modal] Classroom:', studentClassroom);
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-green-700 flex items-center justify-center text-white text-lg font-bold">
            {selectedStudent.full_name?.[0] ?? 'S'}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{selectedStudent.full_name || '—'}</p>
            <p className="text-xs font-mono text-green-700 dark:text-green-400">{selectedStudent.roll_number || '—'}</p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" />
              {selectedStudent.user?.username || t('students.labels.noUserAccount')}
            </p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadge(selectedStudent.status)}`}>
            {t(`students.status.${selectedStudent.status}`)}
          </span>
        </div>
        
        {/* Student Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            [t('students.table.email'), selectedStudent.email || '—'],
            [t('students.table.phone'), selectedStudent.phone_number || '—'],
            [t('students.form.birthDate'), selectedStudent.birth_date || '—'],
            [t('students.table.schoolLevel'), selectedStudent.current_school_level?.name || '—'],
            [t('students.table.classLevel'), selectedStudent.current_class_level?.name || '—'],
            [t('students.form.academicYear'), selectedStudent.current_academic_year?.name || '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="font-medium text-gray-800 dark:text-white text-xs break-words">{value}</p>
            </div>
          ))}
        </div>
        
        {/* Current Classroom */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-900/30">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
            <DoorOpen className="w-3.5 h-3.5" /> {t('students.classroom.currentAssignment')}
          </p>
          {studentClassroom ? (
            <div>
              <p className="font-medium text-gray-800 dark:text-white">{studentClassroom.name}</p>
              <p className="text-xs text-gray-500">Code: {studentClassroom.code} | Capacity: {studentClassroom.capacity}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">{t('students.messages.noClassroomAssigned')}</p>
          )}
        </div>
        
        {/* Parents Section */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" /> {t('students.tabs.parents')} ({studentParents.length})
          </p>
          {studentParents.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {studentParents.map(parent => (
                <div key={parent.id} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100">
                  <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {parent.full_name?.[0] ?? 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{parent.full_name || '—'}</p>
                      <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 rounded-full capitalize">
                        {t(`students.relationship.${parent.relationship_type}`) || parent.relationship_type || '—'}
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
                      {t(`students.status.${parent.status}`) || parent.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <p className="text-xs text-gray-400">{t('students.messages.noParentsLinked')}</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // ── Students Table ─────────────────────────────────────────
  const renderStudentsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100">
          <tr>
            {[t('students.table.rollNumber'), t('students.table.fullName'), t('students.table.email'), t('students.table.schoolLevel'), t('students.table.classLevel'), t('students.table.classroom'), t('students.table.status'), t('students.table.actions')].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedStudents.map(student => (
            <tr key={student.id} className="hover:bg-green-50/50 transition-colors">
              <td className="px-4 py-3 text-sm font-mono text-green-700">{student.roll_number || '—'}</td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{student.full_name || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{student.email || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{student.current_school_level?.name || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{student.current_class_level?.name || '—'}</td>
              <td className="px-4 py-3 text-sm">
                {student.current_classroom ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                    <DoorOpen className="w-3 h-3" />
                    {student.current_classroom.name}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(student.status)}`}>
                  {t(`students.status.${student.status}`)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => openViewModal(student)} 
                    className="p-1.5 rounded-lg hover:bg-green-100" 
                    title={t('students.actions.view')}
                  >
                    <Eye className="w-3.5 h-3.5 text-green-700" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
       </table>
    </div>
  );
  
  // ── Pagination Component ───────────────────────────────────
  const Pagination = () => (
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
        <button 
          onClick={() => setCurrentPage(1)} 
          disabled={currentPage === 1} 
          className="px-2 py-1 text-xs border rounded-lg disabled:opacity-40"
        >
          {t('students.pagination.first')}
        </button>
        <button 
          onClick={() => setCurrentPage(prev => prev - 1)} 
          disabled={currentPage === 1} 
          className="p-1.5 border rounded-lg disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm px-3">
          {t('students.pagination.page')} {currentPage} {t('students.pagination.of')} {totalPages || 1}
        </span>
        <button 
          onClick={() => setCurrentPage(prev => prev + 1)} 
          disabled={currentPage >= totalPages} 
          className="p-1.5 border rounded-lg disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setCurrentPage(totalPages)} 
          disabled={currentPage >= totalPages} 
          className="px-2 py-1 text-xs border rounded-lg disabled:opacity-40"
        >
          {t('students.pagination.last')}
        </button>
      </div>
    </div>
  );
  
  // ── Modal Wrapper ─────────────────────────────────────────
  const ModalWrapper = ({ children, maxW = 'max-w-2xl' }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ${maxW} w-full mx-4 p-5 max-h-[90vh] overflow-y-auto border border-green-100`}>
        {children}
      </div>
    </div>
  );
  
  // ── Teacher Welcome Banner ─────────────────────────────────
  const TeacherWelcomeBanner = () => (
    <div className="bg-gradient-to-r from-green-700 to-green-800 rounded-2xl p-5 text-white shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-green-100 text-sm mt-1">
            {t('teacher.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl">
          <BookMarked className="w-4 h-4" />
          <span className="text-sm font-medium">
            {teacherClassrooms.length} {t('teacher.classroomsAssigned')}
          </span>
        </div>
      </div>
    </div>
  );
  
  // ── Stats Cards ───────────────────────────────────────────
  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: t('teacher.stats.totalStudents'), value: stats.total_students, color: 'from-green-700 to-green-900', icon: Users },
        { label: t('teacher.stats.activeStudents'), value: stats.active_students, color: 'from-green-500 to-green-700', icon: UserCheck },
        { label: t('teacher.stats.classrooms'), value: stats.total_classrooms || teacherClassrooms.length, color: 'from-blue-500 to-blue-700', icon: DoorOpen },
        { label: t('teacher.stats.schoolLevels'), value: stats.total_school_levels || teacherSchoolLevels.length, color: 'from-amber-500 to-amber-700', icon: School },
      ].map(({ label, value, color, icon: Icon }) => (
        <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white shadow-lg`}>
          <div className="flex items-center justify-between">
            <Icon className="w-5 h-5 opacity-80" />
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <p className="text-xs font-medium opacity-80 mt-2">{label}</p>
        </div>
      ))}
    </div>
  );
  
  // ── Main Render ────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        
        {/* Dark Mode Toggle */}
        <div className="flex justify-end">
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="p-2 bg-white dark:bg-gray-800 border rounded-xl shadow-sm"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
          </button>
        </div>
        
        {/* Welcome Banner */}
        <TeacherWelcomeBanner />
        
        {/* Stats */}
        <StatsCards />
        
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {t('teacher.myStudents')}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {t('teacher.myStudentsSubtitle')}
            </p>
          </div>
          <button 
            onClick={() => {
              fetchAllTeacherStudents();
              resetFilters();
            }} 
            className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" /> {t('students.actions.refresh')}
          </button>
        </div>
        
        {/* Filters & Search */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border">
          <div className="flex flex-col gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('students.actions.search')}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl bg-white dark:bg-gray-700 text-gray-900 focus:ring-2 focus:ring-green-700 outline-none"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <select 
                value={filters.school_level_id} 
                onChange={(e) => setFilters(prev => ({ ...prev, school_level_id: e.target.value }))} 
                className="px-3 py-2 text-sm border rounded-xl bg-white dark:bg-gray-700"
              >
                <option value="">{t('teacher.filters.allSchoolLevels')}</option>
                {teacherSchoolLevels.map(level => (
                  <option key={level.id} value={level.id}>{level.name}</option>
                ))}
              </select>
              
              <select 
                value={filters.class_level_id} 
                onChange={(e) => setFilters(prev => ({ ...prev, class_level_id: e.target.value }))} 
                className="px-3 py-2 text-sm border rounded-xl bg-white dark:bg-gray-700"
              >
                <option value="">{t('teacher.filters.allClassLevels')}</option>
                {availableClassLevels.map(level => (
                  <option key={level.id} value={level.id}>{level.name}</option>
                ))}
              </select>
              
              <select 
                value={filters.classroom_id} 
                onChange={(e) => setFilters(prev => ({ ...prev, classroom_id: e.target.value }))} 
                className="px-3 py-2 text-sm border rounded-xl bg-white dark:bg-gray-700"
              >
                <option value="">{t('teacher.filters.allClassrooms')}</option>
                {availableClassrooms.map(classroom => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name} ({classroom.code})
                  </option>
                ))}
              </select>
              
              <select 
                value={filters.status} 
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} 
                className="px-3 py-2 text-sm border rounded-xl bg-white dark:bg-gray-700"
              >
                <option value="">{t('students.filters.allStatus')}</option>
                <option value="active">{t('students.status.active')}</option>
                <option value="inactive">{t('students.status.inactive')}</option>
                <option value="transferred">{t('students.status.transferred')}</option>
                <option value="graduated">{t('students.status.graduated')}</option>
              </select>
              
              <button 
                onClick={resetFilters} 
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl flex items-center gap-1.5 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" /> {t('students.actions.reset')}
              </button>
            </div>
          </div>
        </div>
        
        {/* Students Table */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-20 text-center">
            <Spinner />
            <p className="mt-4 text-gray-500">{t('students.messages.loading')}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden">
            {filteredStudents.length > 0 ? (
              <>
                {renderStudentsTable()}
                <Pagination />
              </>
            ) : (
              <div className="p-10 text-center">
                <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">
                  {searchTerm || filters.school_level_id || filters.class_level_id || filters.classroom_id || filters.status
                    ? t('students.messages.noFilterResults')
                    : t('teacher.messages.noStudentsAssigned')}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* View Student Modal */}
        {showViewModal && selectedStudent && (
          <ModalWrapper maxW="max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{t('students.actions.viewDetails')}</h2>
              <button 
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedStudent(null);
                  setStudentParents([]);
                  setStudentClassroom(null);
                }} 
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {loadingStudentDetails ? (
              <div className="py-12 text-center">
                <Spinner />
                <p className="mt-2 text-gray-500">{t('students.messages.loading')}</p>
              </div>
            ) : (
              renderViewModalContent()
            )}
            
            <button 
              onClick={() => {
                setShowViewModal(false);
                setSelectedStudent(null);
                setStudentParents([]);
                setStudentClassroom(null);
              }} 
              className="w-full mt-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl transition-colors"
            >
              {t('students.actions.close')}
            </button>
          </ModalWrapper>
        )}
        
      </div>
    </div>
  );
};

export default TeacherStudents;