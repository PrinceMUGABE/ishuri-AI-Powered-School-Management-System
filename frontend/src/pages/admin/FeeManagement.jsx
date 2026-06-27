// PaymentManagement.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  CreditCard, DollarSign, Plus, Edit, Trash2, Search, Eye, X,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle, AlertCircle,
  Sun, Moon, Download, Printer, FileText, Calendar, Clock,
  Wallet, Phone, Building, Receipt, TrendingUp, TrendingDown,
  User, GraduationCap, BookOpen, Shield, Link, Filter,
  Send, Ban, CheckSquare, AlertTriangle, Info, Loader, Users,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// API Configuration
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
// Helper Components
// ─────────────────────────────────────────────────────────────
const Spinner = ({ size = 'sm' }) => (
  <div className={`border-2 border-white border-t-transparent rounded-full animate-spin ${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'}`} />
);

const StatusBadge = ({ status }) => {
  const colors = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    waiting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    started: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    partially_paid: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || colors.waiting}`}>
      {status === 'completed' && <CheckCircle className="w-3 h-3" />}
      {status === 'overdue' && <AlertCircle className="w-3 h-3" />}
      {status === 'waiting' && <Clock className="w-3 h-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const FeeManagement = () => {
  const { t } = useTranslation();

  // ── UI State ──────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('assignments');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // ── Modal State ───────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);

  // ── Data State ────────────────────────────────────────────
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);

  // ── Pagination ────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // ── Filters ───────────────────────────────────────────────
  const [filters, setFilters] = useState({
    status: '',
    student_id: '',
    academic_year_id: '',
  });

  // ── Form State ────────────────────────────────────────────
  const [createForm, setCreateForm] = useState({
    student_id: '',
    class_level_cost_ids: [],
    academic_year_id: '',
    payment_due_date: '',
    payment_start_date: new Date().toISOString().split('T')[0],
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'mobile_money',
    phone_number: '',
    mobile_money_provider: 'mtn',
    bank_name: '',
    bank_account_number: '',
    bank_receipt_number: '',
    notes: '',
  });

  const [extendForm, setExtendForm] = useState({
    new_due_date: '',
  });

  // ── Student Selection for Filter ──────────────────────────
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // ── Bulk Assignment State ─────────────────────────────────
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMode, setBulkMode] = useState('school_level'); // 'school_level' | 'class_level' | 'all_students'
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [filteredClassLevelsForBulk, setFilteredClassLevelsForBulk] = useState([]);
  const [bulkForm, setBulkForm] = useState({
    school_level_id: '',
    class_level_id: '',
    class_level_cost_ids: [],
    academic_year_id: '',
    payment_due_date: '',
    payment_start_date: new Date().toISOString().split('T')[0],
  });
  const [bulkResult, setBulkResult] = useState(null); // summary after submission

  // ─────────────────────────────────────────────────────────
  // Fetch Data
  // ─────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    try {
      const res = await apiClient.get('/students/?page_size=1000');
      if (res.data.success) {
        const studentsData = res.data.data?.results ?? res.data.data ?? [];
        setStudents(studentsData);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  }, []);

  const fetchAcademicYears = useCallback(async () => {
    try {
      const res = await apiClient.get('/academics/academic-years/');
      if (res.data.success) {
        const years = res.data.data?.results ?? res.data.data ?? [];
        setAcademicYears(years);
        if (years.length > 0 && !createForm.academic_year_id) {
          const currentYear = years.find(y => y.is_current);
          setCreateForm(prev => ({ ...prev, academic_year_id: currentYear?.id || years[0]?.id || '' }));
        }
      }
    } catch (err) {
      console.error('Error fetching academic years:', err);
    }
  }, [createForm.academic_year_id]);

  const fetchFeeStructures = useCallback(async () => {
    try {
      const res = await apiClient.get('/academics/class-level-costs/');
      if (res.data.success) {
        const fees = res.data.data?.results ?? res.data.data ?? [];
        setFeeStructures(fees);
      }
    } catch (err) {
      console.error('Error fetching fee structures:', err);
    }
  }, []);

  const fetchSchoolLevels = useCallback(async () => {
    try {
      const res = await apiClient.get('/academics/school-levels/');
      if (res.data.success) {
        setSchoolLevels(res.data.data?.results ?? res.data.data ?? []);
      }
    } catch (err) {
      console.error('Error fetching school levels:', err);
    }
  }, []);

  const fetchClassLevels = useCallback(async () => {
    try {
      const res = await apiClient.get('/academics/class-levels/');
      if (res.data.success) {
        setClassLevels(res.data.data?.results ?? res.data.data ?? []);
      }
    } catch (err) {
      console.error('Error fetching class levels:', err);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.status) params.append('status', filters.status);
      if (filters.student_id) params.append('student_id', filters.student_id);
      if (filters.academic_year_id) params.append('academic_year_id', filters.academic_year_id);
      params.append('page', currentPage);
      params.append('page_size', itemsPerPage);

      const res = await apiClient.get(`/payments/all/?${params.toString()}`);

      // Log response to console
      console.log('📊 Fetch Assignments Response:', {
        status: res.status,
        success: res.data.success,
        count: res.data.count,
        data: res.data.data,
      });

      if (res.data.success) {
        const assignmentsData = res.data.data?.results ?? res.data.data ?? [];
        setAssignments(assignmentsData);
        setTotalItems(res.data.count || assignmentsData.length);
        toast.success(t('payments.messages.dataLoaded'));
      } else {
        toast.error(res.data.message || t('payments.messages.fetchError'));
      }
    } catch (err) {
      console.error('❌ Error fetching assignments:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || t('payments.messages.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, currentPage, itemsPerPage, t]);

  const fetchStudentPaymentSummary = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      const res = await apiClient.get(`/payments/student/${studentId}/summary/`);
      console.log('💰 Payment Summary Response:', res.data);
      if (res.data.success) {
        setPaymentSummary(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching payment summary:', err);
    }
  }, []);

  const fetchTransactions = useCallback(async (assignmentId) => {
    try {
      const res = await apiClient.get(`/payments/assignments/${assignmentId}/transactions/`);
      console.log('💳 Transactions Response:', res.data);
      if (res.data.success) {
        setTransactions(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // Initial Data Load
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStudents();
    fetchAcademicYears();
    fetchFeeStructures();
    fetchSchoolLevels();
    fetchClassLevels();
  }, [fetchStudents, fetchAcademicYears, fetchFeeStructures, fetchSchoolLevels, fetchClassLevels]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // ─────────────────────────────────────────────────────────
  // Student Filtering
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const filtered = students.filter(student =>
      student.full_name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.roll_number?.toLowerCase().includes(studentSearchTerm.toLowerCase())
    );
    setFilteredStudents(filtered.slice(0, 10));
  }, [studentSearchTerm, students]);

  // ─────────────────────────────────────────────────────────
  // Create Payment Assignment
  // ─────────────────────────────────────────────────────────
  const handleCreateAssignment = async () => {
    if (!createForm.student_id || createForm.class_level_cost_ids.length === 0 || !createForm.academic_year_id || !createForm.payment_due_date) {
      toast.error(t('payments.messages.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        student_id: createForm.student_id,
        class_level_cost_ids: createForm.class_level_cost_ids,
        academic_year_id: createForm.academic_year_id,
        payment_due_date: createForm.payment_due_date,
        payment_start_date: createForm.payment_start_date,
      };

      console.log('📝 Creating Payment Assignment:', payload);
      const res = await apiClient.post('/payments/assignments/create/', payload);
      console.log('✅ Create Assignment Response:', res.data);

      if (res.data.success) {
        toast.success(res.data.message);
        setShowCreateModal(false);
        setCreateForm({
          student_id: '',
          class_level_cost_ids: [],
          academic_year_id: academicYears.find(y => y.is_current)?.id || academicYears[0]?.id || '',
          payment_due_date: '',
          payment_start_date: new Date().toISOString().split('T')[0],
        });
        fetchAssignments();
      } else {
        toast.error(res.data.message || t('payments.messages.createError'));
      }
    } catch (err) {
      console.error('❌ Error creating assignment:', err.response?.data);
      const errorMsg = err.response?.data?.errors || err.response?.data?.message || t('payments.messages.createError');
      toast.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Process Payment
  // ─────────────────────────────────────────────────────────
  const handleProcessPayment = async () => {
    if (!selectedAssignment) {
      toast.error(t('payments.messages.noAssignmentSelected'));
      return;
    }

    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error(t('payments.messages.validAmount'));
      return;
    }

    if (parseFloat(paymentForm.amount) > selectedAssignment.remaining_amount) {
      toast.error(`${t('payments.messages.amountExceeds')} ${selectedAssignment.remaining_amount}`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        payment_assignment_id: selectedAssignment.id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        phone_number: paymentForm.phone_number,
        mobile_money_provider: paymentForm.mobile_money_provider,
        bank_name: paymentForm.bank_name,
        bank_account_number: paymentForm.bank_account_number,
        bank_receipt_number: paymentForm.bank_receipt_number,
        notes: paymentForm.notes,
      };

      console.log('💰 Processing Payment:', payload);
      const res = await apiClient.post('/payments/make-payment/', payload);
      console.log('✅ Payment Response:', res.data);

      if (res.data.success) {
        toast.success(`${t('payments.messages.paymentSuccess')} ${res.data.data.transaction_reference}`);
        setShowPaymentModal(false);
        setPaymentForm({
          amount: '',
          payment_method: 'mobile_money',
          phone_number: '',
          mobile_money_provider: 'mtn',
          bank_name: '',
          bank_account_number: '',
          bank_receipt_number: '',
          notes: '',
        });
        fetchAssignments();
        if (selectedAssignment.student_id) {
          fetchStudentPaymentSummary(selectedAssignment.student_id);
        }
      } else {
        toast.error(res.data.message || t('payments.messages.paymentError'));
      }
    } catch (err) {
      console.error('❌ Error processing payment:', err.response?.data);
      toast.error(err.response?.data?.message || t('payments.messages.paymentError'));
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Extend Payment Deadline
  // ─────────────────────────────────────────────────────────
  const handleExtendDeadline = async () => {
    if (!selectedAssignment || !extendForm.new_due_date) {
      toast.error(t('payments.messages.selectNewDate'));
      return;
    }

    setLoading(true);
    try {
      const payload = { new_due_date: extendForm.new_due_date };
      console.log('📅 Extending Deadline:', { assignmentId: selectedAssignment.id, ...payload });
      const res = await apiClient.post(`/payments/assignments/${selectedAssignment.id}/extend-deadline/`, payload);
      console.log('✅ Extend Deadline Response:', res.data);

      if (res.data.success) {
        toast.success(res.data.message);
        setShowExtendModal(false);
        setExtendForm({ new_due_date: '' });
        fetchAssignments();
      } else {
        toast.error(res.data.message || t('payments.messages.extendError'));
      }
    } catch (err) {
      console.error('❌ Error extending deadline:', err.response?.data);
      toast.error(err.response?.data?.message || t('payments.messages.extendError'));
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Delete Assignment
  // ─────────────────────────────────────────────────────────
  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;

    setLoading(true);
    try {
      console.log('🗑️ Deleting Assignment:', selectedAssignment.id);
      const res = await apiClient.delete(`/payments/assignments/${selectedAssignment.id}/delete/`);
      console.log('✅ Delete Response:', res.data);

      if (res.data.success) {
        toast.success(res.data.message);
        setShowDeleteModal(false);
        setSelectedAssignment(null);
        fetchAssignments();
      } else {
        toast.error(res.data.message || t('payments.messages.deleteError'));
      }
    } catch (err) {
      console.error('❌ Error deleting assignment:', err.response?.data);
      toast.error(err.response?.data?.message || t('payments.messages.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = async () => {
    if (bulkForm.class_level_cost_ids.length === 0) {
      toast.error(t('payments.messages.selectAtLeastOneFee') || 'Select at least one fee structure');
      return;
    }
    if (!bulkForm.academic_year_id || !bulkForm.payment_due_date) {
      toast.error(t('payments.messages.fillAllFields'));
      return;
    }
    if (bulkMode === 'school_level' && !bulkForm.school_level_id) {
      toast.error(t('payments.messages.selectSchoolLevel') || 'Select a school level');
      return;
    }
    if (bulkMode === 'class_level' && (!bulkForm.school_level_id || !bulkForm.class_level_id)) {
      toast.error(t('payments.messages.selectClassLevel') || 'Select a school level and class level');
      return;
    }

    setLoading(true);
    setBulkResult(null);
    try {
      const basePayload = {
        class_level_cost_ids: bulkForm.class_level_cost_ids,
        academic_year_id: parseInt(bulkForm.academic_year_id),
        payment_due_date: bulkForm.payment_due_date,
        payment_start_date: bulkForm.payment_start_date,
      };

      const endpointMap = {
        school_level: {
          url: '/payments/assignments/bulk/school-level/',
          payload: { ...basePayload, school_level_id: parseInt(bulkForm.school_level_id) },
        },
        class_level: {
          url: '/payments/assignments/bulk/class-level/',
          payload: {
            ...basePayload,
            school_level_id: parseInt(bulkForm.school_level_id),
            class_level_id: parseInt(bulkForm.class_level_id),
          },
        },
        all_students: {
          url: '/payments/assignments/bulk/all-students/',
          payload: basePayload,
        },
      };

      const { url, payload } = endpointMap[bulkMode];
      console.log('🚀 Bulk Assign:', { mode: bulkMode, url, payload });

      const res = await apiClient.post(url, payload);
      console.log('✅ Bulk Assign Response:', res.data);

      if (res.data.success) {
        setBulkResult(res.data.data);
        toast.success(res.data.message);
        fetchAssignments();
      } else {
        toast.error(res.data.message || t('payments.messages.createError'));
      }
    } catch (err) {
      console.error('❌ Bulk assign error:', err.response?.data);
      toast.error(err.response?.data?.message || t('payments.messages.createError'));
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // View Assignment Details
  // ─────────────────────────────────────────────────────────
  const handleViewDetails = async (assignment) => {
    setSelectedAssignment(assignment);
    await fetchTransactions(assignment.id);
    setShowDetailsModal(true);
  };

  // ─────────────────────────────────────────────────────────
  // Handle Student Selection
  // ─────────────────────────────────────────────────────────
  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setFilters(prev => ({ ...prev, student_id: student.id }));
    setStudentSearchTerm('');
    setShowStudentDropdown(false);
    fetchStudentPaymentSummary(student.id);
  };

  // ─────────────────────────────────────────────────────────
  // Reset Filters
  // ─────────────────────────────────────────────────────────
  const resetFilters = () => {
    setFilters({ status: '', student_id: '', academic_year_id: '' });
    setSelectedStudent(null);
    setSearchTerm('');
    setCurrentPage(1);
  };

  // ─────────────────────────────────────────────────────────
  // Tabs Configuration
  // ─────────────────────────────────────────────────────────
  const tabs = [
    { id: 'assignments', label: t('payments.tabs.assignments'), icon: CreditCard },
    { id: 'bulk', label: t('payments.tabs.bulk') || 'Bulk Assign', icon: Users },  // ← add
    { id: 'overview', label: t('payments.tabs.overview'), icon: TrendingUp },
  ];

  // ─────────────────────────────────────────────────────────
  // Payment Method Options
  // ─────────────────────────────────────────────────────────
  const paymentMethods = [
    { value: 'mobile_money', label: t('payments.methods.mobileMoney'), icon: Phone },
    { value: 'bank_transfer', label: t('payments.methods.bankTransfer'), icon: Building },
    { value: 'cash', label: t('payments.methods.cash'), icon: Wallet },
    { value: 'cheque', label: t('payments.methods.cheque'), icon: Receipt },
  ];

  // ─────────────────────────────────────────────────────────
  // Render Table Headers
  // ─────────────────────────────────────────────────────────
  const renderTableHeaders = () => (
    <>
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('payments.table.student')}
      </th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('payments.table.feeName')}
      </th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('payments.table.totalAmount')}
      </th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('payments.table.paidAmount')}
      </th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('payments.table.remaining')}
      </th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('payments.table.dueDate')}
      </th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('payments.table.status')}
      </th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('payments.table.actions')}
      </th>
    </>
  );

  // ─────────────────────────────────────────────────────────
  // Render Table Row
  // ─────────────────────────────────────────────────────────
  const renderTableRow = (assignment) => (
    <tr key={assignment.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {assignment.student_details?.full_name || '—'}
          </p>
          <p className="text-xs text-gray-400 font-mono">
            {assignment.student_details?.roll_number || ''}
          </p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {assignment.class_level_cost_details?.name || '—'}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {parseFloat(assignment.total_amount).toLocaleString()} FRW
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-green-600 dark:text-green-400 font-semibold">
          {parseFloat(assignment.paid_amount).toLocaleString()} FRW
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-sm font-semibold ${assignment.remaining_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {parseFloat(assignment.remaining_amount).toLocaleString()} FRW
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(assignment.payment_due_date).toLocaleDateString()}
        </div>
        {assignment.is_overdue && (
          <span className="text-xs text-red-500 flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3" /> {t('payments.status.overdue')}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={assignment.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5">
          <button
            onClick={() => handleViewDetails(assignment)}
            className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
            title={t('payments.actions.viewDetails')}
          >
            <Eye className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
          </button>
          <button
            onClick={() => {
              setSelectedAssignment(assignment);
              setPaymentForm({ ...paymentForm, amount: '' });
              setShowPaymentModal(true);
            }}
            disabled={assignment.status === 'completed'}
            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={t('payments.actions.makePayment')}
          >
            <DollarSign className="w-3.5 h-3.5 text-blue-600" />
          </button>
          <button
            onClick={() => {
              setSelectedAssignment(assignment);
              setExtendForm({ new_due_date: '' });
              setShowExtendModal(true);
            }}
            className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
            title={t('payments.actions.extendDeadline')}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
          </button>
          <button
            onClick={() => {
              setSelectedAssignment(assignment);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
            title={t('payments.actions.delete')}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </td>
    </tr>
  );

  // ─────────────────────────────────────────────────────────
  // Payment Summary Cards
  // ─────────────────────────────────────────────────────────
  const renderPaymentSummary = () => {
    if (!selectedStudent) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-green-700 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('payments.overview.selectStudent')}
          </h3>
          <p className="text-sm text-gray-400">
            {t('payments.overview.selectStudentHint')}
          </p>
        </div>
      );
    }

    if (!paymentSummary) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader className="w-8 h-8 animate-spin text-green-700" />
        </div>
      );
    }

    const summaryCards = [
      {
        label: t('payments.summary.totalAssigned'),
        value: `FRW${parseFloat(paymentSummary.total_assigned).toLocaleString()}`,
        icon: CreditCard,
        color: 'blue',
      },
      {
        label: t('payments.summary.totalPaid'),
        value: `FRW${parseFloat(paymentSummary.total_paid).toLocaleString()}`,
        icon: CheckCircle,
        color: 'green',
      },
      {
        label: t('payments.summary.totalRemaining'),
        value: `FRW${parseFloat(paymentSummary.total_remaining).toLocaleString()}`,
        icon: AlertCircle,
        color: 'red',
      },
      {
        label: t('payments.summary.totalOverdue'),
        value: `FRW${parseFloat(paymentSummary.total_overdue).toLocaleString()}`,
        icon: AlertTriangle,
        color: 'orange',
      },
      {
        label: t('payments.summary.completedCount'),
        value: paymentSummary.completed_count,
        icon: CheckSquare,
        color: 'green',
      },
      {
        label: t('payments.summary.pendingCount'),
        value: paymentSummary.pending_count,
        icon: Clock,
        color: 'yellow',
      },
      {
        label: t('payments.summary.overdueCount'),
        value: paymentSummary.overdue_count,
        icon: AlertTriangle,
        color: 'red',
      },
      {
        label: t('payments.summary.paymentPercentage'),
        value: `${paymentSummary.payment_percentage.toFixed(1)}%`,
        icon: TrendingUp,
        color: 'purple',
      },
    ];

    const colorClasses = {
      blue: 'from-blue-500 to-blue-700',
      green: 'from-green-500 to-green-700',
      red: 'from-red-500 to-red-700',
      orange: 'from-orange-500 to-orange-700',
      yellow: 'from-yellow-500 to-yellow-700',
      purple: 'from-purple-500 to-purple-700',
    };

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-green-700 to-green-900 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">{t('payments.overview.studentInfo')}</p>
              <h3 className="text-xl font-bold">{selectedStudent.full_name}</h3>
              <p className="text-sm opacity-80 font-mono">{selectedStudent.roll_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">{t('payments.overview.classLevel')}</p>
              <p className="font-semibold">{selectedStudent.current_class_level?.name || '—'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className={`bg-gradient-to-br ${colorClasses[card.color]} rounded-xl p-3 text-white shadow-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5 opacity-80" />
                  <span className="text-xs opacity-80">{card.label}</span>
                </div>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Render Details Modal Content
  // ─────────────────────────────────────────────────────────
  const renderDetailsModal = () => {
    if (!selectedAssignment) return null;

    const paidPercentage = (selectedAssignment.paid_amount / selectedAssignment.total_amount) * 100;

    return (
      <div className="space-y-4">
        {/* Assignment Info */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-xl p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('payments.details.student')}</p>
              <p className="font-semibold text-gray-900 dark:text-white">{selectedAssignment.student_details?.full_name}</p>
              <p className="text-xs text-gray-500 font-mono">{selectedAssignment.student_details?.roll_number}</p>
            </div>
            <StatusBadge status={selectedAssignment.status} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">{t('payments.details.feeName')}</p>
              <p className="font-medium">{selectedAssignment.class_level_cost_details?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('payments.details.academicYear')}</p>
              <p className="font-medium">{selectedAssignment.academic_year?.name || '—'}</p>
            </div>
          </div>
        </div>

        {/* Amount Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
            {t('payments.details.paymentProgress')}
          </p>
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('payments.details.progress')}</span>
              <span>{paidPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: `${paidPercentage}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center pt-2">
            <div>
              <p className="text-xs text-gray-500">{t('payments.details.total')}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {parseFloat(selectedAssignment.total_amount).toLocaleString()} FRW
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('payments.details.paid')}</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">
                {parseFloat(selectedAssignment.paid_amount).toLocaleString()} FRW
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('payments.details.remaining')}</p>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">
                {parseFloat(selectedAssignment.remaining_amount).toLocaleString()} FRW
              </p>
            </div>
          </div>
        </div>

        {/* Date Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
            {t('payments.details.dateInfo')}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">{t('payments.details.startDate')}</p>
              <p className="font-medium">{new Date(selectedAssignment.payment_start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('payments.details.dueDate')}</p>
              <p className={`font-medium ${selectedAssignment.is_overdue ? 'text-red-600' : ''}`}>
                {new Date(selectedAssignment.payment_due_date).toLocaleDateString()}
              </p>
            </div>
            {selectedAssignment.payment_extended_until && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">{t('payments.details.extendedUntil')}</p>
                <p className="font-medium text-amber-600">
                  {new Date(selectedAssignment.payment_extended_until).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Transactions */}
        {transactions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
              {t('payments.details.transactionHistory')}
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {transactions.map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.transaction_status === 'completed'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-yellow-100 dark:bg-yellow-900/30'
                      }`}>
                      {tx.transaction_status === 'completed'
                        ? <CheckCircle className="w-4 h-4 text-green-600" />
                        : <Clock className="w-4 h-4 text-yellow-600" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-semibold">FRw {parseFloat(tx.amount).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{tx.payment_method_display}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{new Date(tx.paid_at || tx.created_at).toLocaleDateString()}</p>
                    <p className="text-xs font-mono text-gray-500">{tx.transaction_reference}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Page Header */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {t('payments.title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              {t('payments.subtitle')}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-green-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {t('payments.actions.newAssignment')}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 rounded-xl flex-1 justify-center
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

        {/* Content */}
        {activeTab === 'assignments' ? (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row gap-3">

                <div className="flex gap-2 flex-wrap">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                  >
                    <option value="">{t('payments.filters.allStatus')}</option>
                    <option value="waiting">{t('payments.status.waiting')}</option>
                    <option value="started">{t('payments.status.started')}</option>
                    <option value="partially_paid">{t('payments.status.partiallyPaid')}</option>
                    <option value="completed">{t('payments.status.completed')}</option>
                    <option value="overdue">{t('payments.status.overdue')}</option>
                  </select>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('payments.filters.searchStudent')}
                      value={filters.student_id ? students.find(s => s.id === filters.student_id)?.full_name || '' : ''}
                      onFocus={() => setShowStudentDropdown(true)}
                      onChange={(e) => {
                        setFilters({ ...filters, student_id: '' });
                        setStudentSearchTerm(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none w-64"
                    />
                    {showStudentDropdown && filteredStudents.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                        {filteredStudents.map(student => (
                          <button
                            key={student.id}
                            onClick={() => handleStudentSelect(student)}
                            className="w-full text-left px-3 py-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm"
                          >
                            <p className="font-semibold">{student.full_name}</p>
                            <p className="text-xs text-gray-400">{student.roll_number}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <select
                    value={filters.academic_year_id}
                    onChange={(e) => setFilters({ ...filters, academic_year_id: e.target.value })}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                  >
                    <option value="">{t('payments.filters.allAcademicYears')}</option>
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={resetFilters}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors text-sm font-medium"
                  >
                    {t('payments.actions.clearFilters')}
                  </button>

                  <button
                    onClick={fetchAssignments}
                    className="px-3 py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-900/40 rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400"
                  >
                    <RefreshCw className="w-4 h-4" /> {t('payments.actions.refresh')}
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/30">
                    <tr>{renderTableHeaders()}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-12 text-center">
                          <div className="flex justify-center items-center gap-3">
                            <div className="w-6 h-6 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-500">{t('payments.messages.loading')}</span>
                          </div>
                        </td>
                      </tr>
                    ) : assignments.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center">
                              <CreditCard className="w-6 h-6 text-green-300 dark:text-green-700" />
                            </div>
                            <p className="text-sm text-gray-400">{t('payments.messages.noData')}</p>
                            <button
                              onClick={() => setShowCreateModal(true)}
                              className="text-green-700 hover:text-green-800 dark:text-green-400 text-sm font-semibold"
                            >
                              {t('payments.actions.createFirst')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      assignments.map(renderTableRow)
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!loading && totalItems > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{t('payments.pagination.showing')}</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-700 outline-none"
                    >
                      {[5, 10, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span>{t('payments.pagination.perPage')}</span>
                    <span className="ml-2">
                      {`${t('payments.pagination.total')}:`} <strong className="text-green-700 dark:text-green-400">{totalItems}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 disabled:opacity-40 transition-colors"
                    >
                      {t('payments.pagination.first')}
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm px-3 text-gray-600 dark:text-gray-400">
                      {`${t('payments.pagination.page')} `}
                      <strong className="text-green-700 dark:text-green-400">{currentPage}</strong>
                      {` ${t('payments.pagination.of')} ${Math.ceil(totalItems / itemsPerPage)}`}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalItems / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                      className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.ceil(totalItems / itemsPerPage))}
                      disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 disabled:opacity-40 transition-colors"
                    >
                      {t('payments.pagination.last')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // Overview Tab
          <div className="space-y-4">
            {/* Student Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                    {t('payments.overview.selectStudent')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('payments.overview.searchStudentPlaceholder')}
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      onFocus={() => setShowStudentDropdown(true)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                    />
                    {showStudentDropdown && filteredStudents.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                        {filteredStudents.map(student => (
                          <button
                            key={student.id}
                            onClick={() => handleStudentSelect(student)}
                            className="w-full text-left px-3 py-2 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          >
                            <p className="font-semibold text-sm">{student.full_name}</p>
                            <p className="text-xs text-gray-400 font-mono">{student.roll_number}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {selectedStudent && (
                  <button
                    onClick={() => {
                      setSelectedStudent(null);
                      setFilters(prev => ({ ...prev, student_id: '' }));
                      setPaymentSummary(null);
                    }}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Payment Summary */}
            {renderPaymentSummary()}

            {/* Student's Assignments List */}
            {selectedStudent && assignments.filter(a => a.student_id === selectedStudent.id).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('payments.overview.recentAssignments')}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-green-50 dark:bg-green-900/20">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{t('payments.table.feeName')}</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{t('payments.table.totalAmount')}</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{t('payments.table.paidAmount')}</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{t('payments.table.remaining')}</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{t('payments.table.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {assignments.filter(a => a.student_id === selectedStudent.id).map(assignment => (
                        <tr key={assignment.id} className="hover:bg-green-50/50">
                          <td className="px-4 py-2 text-sm">{assignment.class_level_cost_details?.name}</td>
                          <td className="px-4 py-2 text-sm">${parseFloat(assignment.total_amount).toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-green-600">${parseFloat(assignment.paid_amount).toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-red-600">${parseFloat(assignment.remaining_amount).toLocaleString()}</td>
                          <td className="px-4 py-2"><StatusBadge status={assignment.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bulk' ? (
          <div className="space-y-5">
            {/* Mode Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {t('payments.bulk.selectMode') || 'Select assignment scope'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'school_level',
                    label: t('payments.bulk.bySchoolLevel') || 'By School Level',
                    desc: t('payments.bulk.bySchoolLevelDesc') || 'Assign to all students in a school level',
                    icon: GraduationCap,
                    color: 'blue',
                  },
                  {
                    id: 'class_level',
                    label: t('payments.bulk.byClassLevel') || 'By Class Level',
                    desc: t('payments.bulk.byClassLevelDesc') || 'Assign to all students in a specific class',
                    icon: BookOpen,
                    color: 'amber',
                  },
                  // {
                  //   id: 'all_students',
                  //   label: t('payments.bulk.allStudents') || 'All Students',
                  //   desc: t('payments.bulk.allStudentsDesc') || 'Assign school-wide to every active student',
                  //   icon: Users,
                  //   color: 'green',
                  // },
                ].map(mode => {
                  const Icon = mode.icon;
                  const isActive = bulkMode === mode.id;
                  const colorMap = {
                    blue: { active: 'border-blue-600 bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600', badge: 'bg-blue-600' },
                    amber: { active: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600', badge: 'bg-amber-500' },
                    green: { active: 'border-green-600 bg-green-50 dark:bg-green-900/20', icon: 'text-green-700', badge: 'bg-green-700' },
                  };
                  const c = colorMap[mode.color];
                  return (
                    <button
                      key={mode.id}
                      onClick={() => {
                        setBulkMode(mode.id);
                        setBulkForm(prev => ({ ...prev, school_level_id: '', class_level_id: '', class_level_cost_ids: [] }));
                        setFilteredClassLevelsForBulk([]);
                        setBulkResult(null);
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${isActive
                        ? c.active
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-5 h-5 ${isActive ? c.icon : 'text-gray-400'}`} />
                        <span className={`text-sm font-semibold ${isActive ? '' : 'text-gray-700 dark:text-gray-300'}`}>
                          {mode.label}
                        </span>
                        {isActive && (
                          <span className={`ml-auto px-1.5 py-0.5 ${c.badge} text-white text-xs rounded-full font-bold`}>✓</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{mode.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bulk Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-green-700" />
                {t('payments.bulk.configureAssignment') || 'Configure Assignment'}
              </h3>

              {/* School Level (school_level + class_level modes) */}
              {(bulkMode === 'school_level' || bulkMode === 'class_level') && (
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {t('payments.bulk.schoolLevel') || 'School Level'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bulkForm.school_level_id}
                    onChange={e => {
                      const slId = e.target.value;
                      const filtered = classLevels.filter(
                        cl => cl.school_level === parseInt(slId) && cl.is_active
                      );
                      setFilteredClassLevelsForBulk(filtered);
                      setBulkForm(prev => ({ ...prev, school_level_id: slId, class_level_id: '', class_level_cost_ids: [] }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none text-sm"
                  >
                    <option value="">{t('payments.bulk.selectSchoolLevel') || 'Select school level…'}</option>
                    {schoolLevels.filter(sl => sl.is_active).map(sl => (
                      <option key={sl.id} value={sl.id}>{sl.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Class Level (class_level mode only) */}
              {bulkMode === 'class_level' && (
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {t('payments.bulk.classLevel') || 'Class Level'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bulkForm.class_level_id}
                    onChange={e => setBulkForm(prev => ({ ...prev, class_level_id: e.target.value, class_level_cost_ids: [] }))}
                    disabled={!bulkForm.school_level_id}
                    className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${!bulkForm.school_level_id
                      ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700'
                      }`}
                  >
                    <option value="">
                      {bulkForm.school_level_id
                        ? (t('payments.bulk.selectClassLevel') || 'Select class level…')
                        : (t('payments.bulk.selectSchoolLevelFirst') || 'Select school level first')}
                    </option>
                    {filteredClassLevelsForBulk.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.name} ({cl.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Academic Year */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  {t('payments.form.academicYear')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={bulkForm.academic_year_id}
                  onChange={e => setBulkForm(prev => ({ ...prev, academic_year_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none text-sm"
                >
                  <option value="">{t('payments.filters.allAcademicYears')}</option>
                  {academicYears.map(y => (
                    <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (Current)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {t('payments.form.startDate')}
                  </label>
                  <input
                    type="date"
                    value={bulkForm.payment_start_date}
                    onChange={e => setBulkForm(prev => ({ ...prev, payment_start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {t('payments.form.dueDate')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={bulkForm.payment_due_date}
                    onChange={e => setBulkForm(prev => ({ ...prev, payment_due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Fee Structures checklist */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  {t('payments.form.feeStructures')} <span className="text-red-500">*</span>
                </label>

                {/* Filter the visible fee structures based on scope */}
                {(() => {
                  const visibleFees = feeStructures.filter(fs => {
                    if (bulkMode === 'class_level' && bulkForm.class_level_id) {
                      return fs.class_level === parseInt(bulkForm.class_level_id);
                    }
                    if (bulkMode === 'school_level' && bulkForm.school_level_id) {
                      const classLevelIds = filteredClassLevelsForBulk.map(cl => cl.id);
                      return classLevelIds.includes(fs.class_level);
                    }
                    return true; // all_students — show everything
                  });

                  if (visibleFees.length === 0) {
                    return (
                      <p className="text-sm text-gray-400 italic py-3 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        {bulkMode !== 'all_students' && !bulkForm.school_level_id
                          ? (t('payments.bulk.selectScopeFeeHint') || 'Select a scope above to filter fee structures')
                          : (t('payments.messages.noFeeStructures') || 'No fee structures found')}
                      </p>
                    );
                  }

                  const allSelected = visibleFees.every(fs => bulkForm.class_level_cost_ids.includes(fs.id));

                  return (
                    <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                      {/* Select-all header */}
                      <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={allSelected && visibleFees.length > 0}
                          onChange={e =>
                            setBulkForm(prev => ({
                              ...prev,
                              class_level_cost_ids: e.target.checked
                                ? [...new Set([...prev.class_level_cost_ids, ...visibleFees.map(fs => fs.id)])]
                                : prev.class_level_cost_ids.filter(id => !visibleFees.find(fs => fs.id === id)),
                            }))
                          }
                          className="w-4 h-4 rounded accent-green-700"
                        />
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                          {allSelected ? (t('payments.bulk.deselectAll') || 'Deselect all') : (t('payments.bulk.selectAll') || 'Select all')}
                        </span>
                        {bulkForm.class_level_cost_ids.length > 0 && (
                          <span className="ml-auto px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs rounded-md font-semibold">
                            {bulkForm.class_level_cost_ids.length} selected
                          </span>
                        )}
                      </label>

                      {/* Fee rows */}
                      <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                        {visibleFees.map(fs => (
                          <label
                            key={fs.id}
                            className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={bulkForm.class_level_cost_ids.includes(fs.id)}
                              onChange={e =>
                                setBulkForm(prev => ({
                                  ...prev,
                                  class_level_cost_ids: e.target.checked
                                    ? [...prev.class_level_cost_ids, fs.id]
                                    : prev.class_level_cost_ids.filter(id => id !== fs.id),
                                }))
                              }
                              className="w-4 h-4 rounded accent-green-700"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 dark:text-white truncate">{fs.name}</p>
                              <p className="text-xs text-gray-400">
                                {fs.class_level_name || `Class level ${fs.class_level}`}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-green-700 dark:text-green-400 shrink-0">
                              {new Intl.NumberFormat('en-RW').format(fs.amount)} RWF
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Submit */}
              <button
                onClick={handleBulkAssign}
                disabled={
                  loading ||
                  bulkForm.class_level_cost_ids.length === 0 ||
                  !bulkForm.academic_year_id ||
                  !bulkForm.payment_due_date ||
                  (bulkMode === 'school_level' && !bulkForm.school_level_id) ||
                  (bulkMode === 'class_level' && (!bulkForm.school_level_id || !bulkForm.class_level_id))
                }
                className="w-full py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('payments.bulk.assigning') || 'Assigning…'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t('payments.bulk.assign') || 'Assign Fee Structures'}
                  </>
                )}
              </button>
            </div>

            {/* Result Summary */}
            {bulkResult && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  {t('payments.bulk.resultSummary') || 'Assignment Result'}
                </h3>

                {/* Counts */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t('payments.bulk.created') || 'Created', value: bulkResult.created_count, color: 'green' },
                    { label: t('payments.bulk.skipped') || 'Skipped', value: bulkResult.skipped_count, color: 'amber' },
                    { label: t('payments.bulk.errors') || 'Errors', value: bulkResult.error_count, color: 'red' },
                  ].map(item => (
                    <div
                      key={item.label}
                      className={`rounded-xl p-3 text-center border ${item.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30' :
                        item.color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30' :
                          'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30'
                        }`}
                    >
                      <p className={`text-2xl font-bold ${item.color === 'green' ? 'text-green-700 dark:text-green-300' :
                        item.color === 'amber' ? 'text-amber-700 dark:text-amber-300' :
                          'text-red-700 dark:text-red-300'
                        }`}>
                        {item.value}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>

                {/* Skipped detail */}
                {bulkResult.skipped_count > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 list-none">
                      <AlertTriangle className="w-4 h-4" />
                      {t('payments.bulk.viewSkipped') || `View ${bulkResult.skipped_count} skipped`}
                      <ChevronDown className="w-3 h-3 ml-auto group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {bulkResult.skipped.map((s, i) => (
                        <div key={i} className="flex justify-between text-xs p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                          <span className="font-medium text-gray-700 dark:text-gray-300 truncate mr-2">
                            {s.student} — {s.cost}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 shrink-0">{s.reason}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Errors detail */}
                {bulkResult.error_count > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1 list-none">
                      <AlertCircle className="w-4 h-4" />
                      {t('payments.bulk.viewErrors') || `View ${bulkResult.error_count} errors`}
                      <ChevronDown className="w-3 h-3 ml-auto group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {bulkResult.errors.map((e, i) => (
                        <div key={i} className="flex justify-between text-xs p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                          <span className="font-medium text-gray-700 dark:text-gray-300 truncate mr-2">
                            {e.student} — {e.cost}
                          </span>
                          <span className="text-red-600 dark:text-red-400 shrink-0">{e.reason}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Reset */}
                <button
                  onClick={() => {
                    setBulkResult(null);
                    setBulkForm({
                      school_level_id: '',
                      class_level_id: '',
                      class_level_cost_ids: [],
                      academic_year_id: academicYears.find(y => y.is_current)?.id || '',
                      payment_due_date: '',
                      payment_start_date: new Date().toISOString().split('T')[0],
                    });
                    setFilteredClassLevelsForBulk([]);
                  }}
                  className="w-full py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {t('payments.bulk.newBulkAssignment') || 'Start New Bulk Assignment'}
                </button>
              </div>
            )}
          </div>
        ) : null}


        {/* Create Assignment Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto border border-green-100 dark:border-green-900/30">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Plus className="w-5 h-5 text-green-700 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('payments.modal.newAssignment')}
                  </h2>
                </div>
                <button
                  onClick={() => { setShowCreateModal(false); setCreateForm({ ...createForm, class_level_cost_ids: [] }); }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Student Select */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {t('payments.form.student')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.student_id}
                    onChange={(e) => setCreateForm({ ...createForm, student_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                  >
                    <option value="">{t('payments.form.selectStudent')}</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.roll_number}) - {s.current_class_level?.name || 'No class'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fee Structures Selection */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {t('payments.form.feeStructures')} <span className="text-red-500">*</span>
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 space-y-2">
                    {feeStructures.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        {t('payments.messages.noFeeStructures')}
                      </p>
                    ) : (
                      feeStructures
                        .filter(feeStructure => {
                          const selectedStudent = students.find(s => s.id === createForm.student_id);
                          if (!selectedStudent) return true;
                          // Check if the fee structure belongs to the selected student's class level
                          return feeStructure.class_level === selectedStudent.current_class_level?.id;
                        })
                        .map(feeStructure => (
                          <label
                            key={feeStructure.id}
                            className="flex items-center gap-2 cursor-pointer p-2 hover:bg-green-50 dark:hover:bg-green-900/10 rounded-lg transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={createForm.class_level_cost_ids.includes(feeStructure.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCreateForm({
                                    ...createForm,
                                    class_level_cost_ids: [...createForm.class_level_cost_ids, feeStructure.id]
                                  });
                                } else {
                                  setCreateForm({
                                    ...createForm,
                                    class_level_cost_ids: createForm.class_level_cost_ids.filter(id => id !== feeStructure.id)
                                  });
                                }
                              }}
                              className="w-4 h-4 text-green-700 rounded accent-green-700 focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {feeStructure.name}
                              </p>
                              <div className="flex gap-3 mt-0.5">
                                <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                                  ${parseFloat(feeStructure.amount).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {feeStructure.frequency === 'termly' ? t('payments.frequency.termly') :
                                    feeStructure.frequency === 'yearly' ? t('payments.frequency.yearly') :
                                      t('payments.frequency.monthly')}
                                </p>
                              </div>
                            </div>
                          </label>
                        ))
                    )}
                    {feeStructures.filter(fs => {
                      const selectedStudent = students.find(s => s.id === createForm.student_id);
                      if (!selectedStudent) return true;
                      return fs.class_level === selectedStudent.current_class_level?.id;
                    }).length === 0 && feeStructures.length > 0 && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 text-center py-4">
                          {t('payments.messages.noMatchingFeeStructures')}
                        </p>
                      )}
                  </div>
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {t('payments.form.academicYear')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.academic_year_id}
                    onChange={(e) => setCreateForm({ ...createForm, academic_year_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                  >
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id}>{y.name} {y.is_current ? '(Current)' : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      {t('payments.form.startDate')}
                    </label>
                    <input
                      type="date"
                      value={createForm.payment_start_date}
                      onChange={(e) => setCreateForm({ ...createForm, payment_start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      {t('payments.form.dueDate')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={createForm.payment_due_date}
                      onChange={(e) => setCreateForm({ ...createForm, payment_due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateAssignment}
                  disabled={loading || createForm.class_level_cost_ids.length === 0 || !createForm.student_id || !createForm.payment_due_date}
                  className="flex-1 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl disabled:opacity-60 text-sm font-semibold transition-colors"
                >
                  {loading ? <Spinner /> : t('payments.actions.create')}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {t('payments.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 border border-blue-100 dark:border-blue-900/30">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('payments.modal.makePayment')}
                  </h2>
                </div>
                <button
                  onClick={() => { setShowPaymentModal(false); setPaymentForm({ ...paymentForm, amount: '' }); }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('payments.modal.paymentFor')}</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedAssignment.class_level_cost_details?.name}</p>
                <p className="text-xs text-gray-500">Student: {selectedAssignment.student_details?.full_name}</p>
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm">{t('payments.table.remaining')}:</span>
                  <span className="text-lg font-bold text-red-600">
                    FRW {parseFloat(selectedAssignment.remaining_amount).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {t('payments.form.amount')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {t('payments.form.paymentMethod')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map(method => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setPaymentForm({ ...paymentForm, payment_method: method.value })}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${paymentForm.payment_method === method.value
                              ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                              : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700'
                            }`}
                        >
                          <Icon className="w-4 h-4" />
                          {method.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {paymentForm.payment_method === 'mobile_money' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        {t('payments.form.phoneNumber')}
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          value={paymentForm.phone_number}
                          onChange={(e) => setPaymentForm({ ...paymentForm, phone_number: e.target.value })}
                          placeholder="+250XXXXXXXXX"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        {t('payments.form.provider')}
                      </label>
                      <select
                        value={paymentForm.mobile_money_provider}
                        onChange={(e) => setPaymentForm({ ...paymentForm, mobile_money_provider: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                      >
                        <option value="mtn">MTN</option>
                        <option value="airtel">Airtel</option>
                        <option value="tigo">Tigo</option>
                      </select>
                    </div>
                  </>
                )}

                {paymentForm.payment_method === 'bank_transfer' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        {t('payments.form.bankName')}
                      </label>
                      <input
                        type="text"
                        value={paymentForm.bank_name}
                        onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        {t('payments.form.bankReceiptNumber')}
                      </label>
                      <input
                        type="text"
                        value={paymentForm.bank_receipt_number}
                        onChange={(e) => setPaymentForm({ ...paymentForm, bank_receipt_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {t('payments.form.notes')}
                  </label>
                  <textarea
                    rows="2"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                    placeholder={t('payments.form.notesPlaceholder')}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleProcessPayment}
                  disabled={loading || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-60 text-sm font-semibold transition-colors"
                >
                  {loading ? <Spinner /> : t('payments.actions.processPayment')}
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {t('payments.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto border border-green-100 dark:border-green-900/30">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Eye className="w-5 h-5 text-green-700 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('payments.modal.paymentDetails')}
                  </h2>
                </div>
                <button
                  onClick={() => { setShowDetailsModal(false); setTransactions([]); }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {renderDetailsModal()}

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full mt-6 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {t('payments.actions.close')}
              </button>
            </div>
          </div>
        )}

        {/* Extend Deadline Modal */}
        {showExtendModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 border border-amber-100 dark:border-amber-900/30">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Calendar className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('payments.modal.extendDeadline')}
                  </h2>
                </div>
                <button
                  onClick={() => setShowExtendModal(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('payments.modal.currentDueDate')}</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(selectedAssignment.payment_due_date).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {t('payments.form.newDueDate')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={extendForm.new_due_date}
                    onChange={(e) => setExtendForm({ new_due_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleExtendDeadline}
                  disabled={loading || !extendForm.new_due_date}
                  className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl disabled:opacity-60 text-sm font-semibold transition-colors"
                >
                  {loading ? <Spinner /> : t('payments.actions.extend')}
                </button>
                <button
                  onClick={() => setShowExtendModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {t('payments.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 border border-red-100 dark:border-red-900/30">
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{t('payments.delete.title')}</h2>
                <p className="text-gray-500 text-sm mb-3">{t('payments.delete.confirmation')}</p>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-3">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    {selectedAssignment.class_level_cost_details?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedAssignment.student_details?.full_name}
                  </p>
                </div>
                <p className="text-xs text-gray-400">{t('payments.delete.warning')}</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleDeleteAssignment}
                  disabled={loading}
                  className="flex-1 px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors"
                >
                  {loading ? <Spinner /> : <><Trash2 className="w-4 h-4" /> {t('payments.actions.delete')}</>}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {t('payments.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeeManagement;