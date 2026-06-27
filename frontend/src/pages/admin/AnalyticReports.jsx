// AnalyticsReports.jsx - With Dark Mode Support
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FileText, Download, Filter, ChevronDown, ChevronUp,
  Users, GraduationCap, BookOpen, DollarSign, TrendingUp, TrendingDown,
  RefreshCw, Search, FileSpreadsheet, File as FilePdf,
  CheckCircle, AlertCircle, User, Loader2,
  Shield, Database, TrendingUp as TrendIcon, Wallet, Receipt,
  School, Building2, DoorOpen, Award, Calendar, Clock,
  Mail, Phone, Eye as EyeIcon, Sliders, X, Printer,
  BarChart3, PieChart, LineChart, Activity, UserCheck, Moon, Sun
} from "lucide-react";
import {
  BarChart, Bar, LineChart as ReLineChart, Line,
  PieChart as RePieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// API Configuration
const API_BASE_URL = "http://127.0.0.1:8000/api/dashboard";

const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const lang = localStorage.getItem("user_language") || "en";
  config.headers['X-Language'] = lang;
  return config;
});

// Helper Functions
const formatCurrency = (value) => {
  if (value === null || value === undefined) return "0 RWF";
  return `${Number(value).toLocaleString()} RWF`;
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return "0";
  return Number(value).toLocaleString();
};

const formatPercentage = (value) => {
  if (value === null || value === undefined) return "0%";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toFixed(1)}%`;
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString();
  } catch {
    return dateString;
  }
};

// Format status values for display
const formatStatus = (value) => {
  if (!value) return 'N/A';
  const statusMap = {
    'active': 'Active',
    'inactive': 'Inactive',
    'suspended': 'Suspended',
    'pending': 'Pending',
    'completed': 'Completed',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'on_leave': 'On Leave',
    'transferred': 'Transferred',
    'graduated': 'Graduated',
    'waiting': 'Waiting',
    'partially_paid': 'Partially Paid',
    'overdue': 'Overdue',
    'needs_review': 'Needs Review',
    'published': 'Published',
    'unpublished': 'Unpublished'
  };
  return statusMap[String(value).toLowerCase()] || value;
};

// Format education level
const formatEducationLevel = (value) => {
  if (!value) return 'N/A';
  const eduMap = {
    'a2': 'A2 (Secondary School Certificate)',
    'a1': 'A1 (Advanced Diploma)',
    'bachelor': "Bachelor's Degree",
    'master': "Master's Degree",
    'doctorate': 'Doctorate',
    'certificate': 'Certificate'
  };
  return eduMap[String(value).toLowerCase()] || value;
};

// Format relationship type
const formatRelationshipType = (value) => {
  if (!value) return 'N/A';
  const relMap = {
    'father': 'Father',
    'mother': 'Mother',
    'guardian': 'Guardian',
    'other': 'Other'
  };
  return relMap[String(value).toLowerCase()] || value;
};

// Format gender
const formatGender = (value) => {
  if (!value) return 'N/A';
  const genderMap = {
    'male': 'Male',
    'female': 'Female',
    'other': 'Other'
  };
  return genderMap[String(value).toLowerCase()] || value;
};

// Format boolean values
const formatBoolean = (value) => {
  if (value === null || value === undefined) return 'No';
  return value === true || value === 'true' || value === 'True' || value === 'yes' || value === 'Yes' ? 'Yes' : 'No';
};

// Color constants (works for both light and dark mode)
const COLORS = {
  primary: '#10b981',
  secondary: '#3b82f6',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#8b5cf6',
  success: '#10b981',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  cyan: '#06b6d4',
  orange: '#f97316',
  teal: '#14b8a6',
};

const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.purple, COLORS.orange, COLORS.pink, COLORS.cyan];

// ============================================================================
// COLUMN VISIBILITY MANAGER COMPONENT
// ============================================================================
function ColumnVisibilityManager({ columns, visibleColumns, onToggleColumn, onSelectAll, onClearAll }) {
  const { t } = useTranslation();
  const [showManager, setShowManager] = useState(false);
  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div className="column-manager relative">
      <button
        className="btn-manage-columns flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setShowManager(!showManager)}
      >
        <EyeIcon size={16} />
        {t('analytics.manageColumns', 'Manage Columns')}
        <ChevronDown size={12} />
      </button>

      {showManager && (
        <div className="column-dropdown absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 min-w-[260px]">
          <div className="dropdown-header p-3 border-b border-gray-200 dark:border-gray-700">
            <strong className="text-gray-900 dark:text-white text-sm">{t('analytics.selectColumns', 'Select columns to display')}</strong>
            <div className="dropdown-actions flex gap-3 mt-2">
              <button
                onClick={onSelectAll}
                className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
              >
                {t('analytics.selectAll', 'Select All')}
              </button>
              <button
                onClick={onClearAll}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                {t('analytics.clearAll', 'Clear All')}
              </button>
            </div>
          </div>
          <div className="dropdown-body max-h-80 overflow-y-auto">
            {columns.map(col => (
              <label key={col.key} className="column-checkbox flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns[col.key] !== false}
                  onChange={() => onToggleColumn(col.key)}
                  className="w-4 h-4 text-green-600 rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t(`analytics.columns.${col.label}`, col.label)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUMMARY CARD COMPONENT
// ============================================================================
function SummaryCard({ title, value, icon, color, trend, trendUp }) {
  const { t } = useTranslation();

  const getColorStyles = (colorName) => {
    const styles = {
      green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
      blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
      purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
      orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
      cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
      indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
      teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400' },
    };
    return styles[colorName] || styles.green;
  };

  const colorStyles = getColorStyles(color);

  return (
    <div className="summary-card bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t(title)}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 ${colorStyles.bg} rounded-lg flex items-center justify-center`}>
          {React.cloneElement(icon, { className: `w-5 h-5 ${colorStyles.text}` })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANALYTICS CHART COMPONENT
// ============================================================================
function AnalyticsChart({ title, data, type, dataKey, nameKey, height = 300 }) {
  const { t } = useTranslation();
  const isDark = document.documentElement.classList.contains('dark');

  if (!data || data.length === 0) return null;

  const chartTheme = {
    axis: {
      style: {
        axisLine: { stroke: isDark ? '#4b5563' : '#e5e7eb' },
        tick: { fill: isDark ? '#9ca3af' : '#6b7280' },
        tickLine: { stroke: isDark ? '#4b5563' : '#e5e7eb' }
      }
    },
    grid: { stroke: isDark ? '#374151' : '#e5e7eb' },
    tooltip: {
      contentStyle: {
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderRadius: '8px',
        border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
        color: isDark ? '#f9fafb' : '#111827'
      }
    }
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
            <XAxis
              dataKey={nameKey}
              stroke={chartTheme.axis.style.tick.fill}
              tick={{ fill: chartTheme.axis.style.tick.fill, fontSize: 12 }}
            />
            <YAxis
              stroke={chartTheme.axis.style.tick.fill}
              tick={{ fill: chartTheme.axis.style.tick.fill, fontSize: 12 }}
            />
            <Tooltip
              contentStyle={chartTheme.tooltip.contentStyle}
              labelStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
              formatter={(value) => [typeof value === 'number' ? formatNumber(value) : value, '']}
            />
            <Bar dataKey={dataKey} fill={COLORS.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'line':
        return (
          <ReLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
            <XAxis
              dataKey={nameKey}
              stroke={chartTheme.axis.style.tick.fill}
              tick={{ fill: chartTheme.axis.style.tick.fill, fontSize: 12 }}
            />
            <YAxis
              stroke={chartTheme.axis.style.tick.fill}
              tick={{ fill: chartTheme.axis.style.tick.fill, fontSize: 12 }}
            />
            <Tooltip
              contentStyle={chartTheme.tooltip.contentStyle}
              labelStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
            />
            <Line type="monotone" dataKey={dataKey} stroke={COLORS.primary} strokeWidth={2} dot={{ fill: COLORS.primary }} />
          </ReLineChart>
        );
      case 'pie':
        return (
          <RePieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={dataKey}
              nameKey={nameKey}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={chartTheme.tooltip.contentStyle}
              labelStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
            />
            <Legend wrapperStyle={{ color: isDark ? '#9ca3af' : '#6b7280' }} />
          </RePieChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
            <XAxis
              dataKey={nameKey}
              stroke={chartTheme.axis.style.tick.fill}
              tick={{ fill: chartTheme.axis.style.tick.fill, fontSize: 12 }}
            />
            <YAxis
              stroke={chartTheme.axis.style.tick.fill}
              tick={{ fill: chartTheme.axis.style.tick.fill, fontSize: 12 }}
            />
            <Tooltip
              contentStyle={chartTheme.tooltip.contentStyle}
              labelStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={COLORS.primary} fill="url(#areaGradient)" />
          </AreaChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="analytics-chart bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{t(`analytics.charts.${title}`, title)}</h4>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// FORMAT VALUE FUNCTION - Centralized value formatting
// ============================================================================
const formatValueByType = (value, type, key) => {
  if (value === null || value === undefined) return '-';

  const lowerKey = (key || '').toLowerCase();

  if (type === 'currency') return formatCurrency(value);
  if (type === 'percentage') return formatPercentage(value);
  if (type === 'date') return formatDate(value);
  if (type === 'number') return formatNumber(value);

  if (lowerKey.includes('status')) return formatStatus(value);
  if (lowerKey === 'education_level') return formatEducationLevel(value);
  if (lowerKey === 'relationship_type') return formatRelationshipType(value);
  if (lowerKey === 'gender') return formatGender(value);

  if (lowerKey === 'is_active' || lowerKey === 'is_current' ||
    lowerKey === 'is_published' || lowerKey === 'is_overdue' ||
    lowerKey === 'is_compulsory' || lowerKey === 'is_mandatory' ||
    lowerKey === 'is_fully_completed') {
    return formatBoolean(value);
  }

  return String(value);
};

// ============================================================================
// MAIN ANALYTICS REPORTS COMPONENT
// ============================================================================
export default function AnalyticsReports() {
  const { t } = useTranslation();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // State
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('overview');
  const [reportData, setReportData] = useState(null);
  const [reportSummary, setReportSummary] = useState({});
  const [reportAnalytics, setReportAnalytics] = useState({});
  const [reportColumns, setReportColumns] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState({});
  const [filters, setFilters] = useState({
    academicYear: '',
    term: '',
    schoolLevel: '',
    classLevel: '',
    startDate: '',
    endDate: '',
    status: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [classLevels, setClassLevels] = useState([]);

  // Check dark mode on mount and listen for changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Report Types Configuration
  const reportTypes = [
    {
      value: 'overview',
      label: 'analytics.reportTypes.overview',
      displayName: 'Dashboard Overview',
      icon: <Activity size={18} />,
      endpoint: '/overview/',
      hasDetails: false,
      hasAnalytics: true,
      isOverview: true
    },
    {
      value: 'users',
      label: 'analytics.reportTypes.users',
      displayName: 'User Analytics',
      icon: <Users size={18} />,
      endpoint: '/users/',
      hasDetails: true,
      hasAnalytics: true,
      detailKey: 'users',
      analyticsKey: 'analytics',
      columns: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'username', label: 'Username', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'role', label: 'Role', type: 'text' },
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'language', label: 'Language', type: 'text' },
        { key: 'created_at', label: 'Created At', type: 'date' }
      ]
    },
    {
      value: 'students',
      label: 'analytics.reportTypes.students',
      displayName: 'Student Analytics',
      icon: <GraduationCap size={18} />,
      endpoint: '/students/',
      hasDetails: true,
      hasAnalytics: true,
      detailKey: 'students',
      analyticsKey: 'analytics',
      columns: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'full_name', label: 'Full Name', type: 'text' },
        { key: 'roll_number', label: 'Roll Number', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'phone_number', label: 'Phone', type: 'text' },
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'current_class_level', label: 'Class Level', type: 'text' },
        { key: 'enrollment_date', label: 'Enrollment Date', type: 'date' }
      ]
    },
    {
      value: 'teachers',
      label: 'analytics.reportTypes.teachers',
      displayName: 'Teacher Analytics',
      icon: <BookOpen size={18} />,
      endpoint: '/teachers/',
      hasDetails: true,
      hasAnalytics: true,
      detailKey: 'teachers',
      analyticsKey: 'analytics',
      columns: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'full_name', label: 'Full Name', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'phone_number', label: 'Phone', type: 'text' },
        { key: 'gender', label: 'Gender', type: 'text' },
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'education_level', label: 'Education', type: 'text' },
        { key: 'hire_date', label: 'Hire Date', type: 'date' }
      ]
    },
    {
      value: 'parents',
      label: 'analytics.reportTypes.parents',
      displayName: 'Parent Analytics',
      icon: <Users size={18} />,
      endpoint: '/parents/',
      hasDetails: true,
      hasAnalytics: true,
      detailKey: 'parents',
      analyticsKey: 'analytics',
      columns: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'full_name', label: 'Full Name', type: 'text' },
        { key: 'phone_number', label: 'Phone', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'relationship_type', label: 'Relationship', type: 'text' },
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'total_children', label: 'Children', type: 'number' }
      ]
    },
    {
      value: 'academic-years',
      label: 'analytics.reportTypes.academicYears',
      displayName: 'Academic Years',
      icon: <Calendar size={18} />,
      endpoint: '/academic-years/',
      hasDetails: true,
      hasAnalytics: true,
      detailKey: 'academic_years',
      analyticsKey: 'analytics',
      columns: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'start_date', label: 'Start Date', type: 'date' },
        { key: 'end_date', label: 'End Date', type: 'date' },
        { key: 'is_current', label: 'Current', type: 'boolean' },
        { key: 'total_terms', label: 'Terms', type: 'number' },
        { key: 'total_students', label: 'Students', type: 'number' }
      ]
    },
    {
      value: 'class-levels',
      label: 'analytics.reportTypes.classLevels',
      displayName: 'Class Levels',
      icon: <Building2 size={18} />,
      endpoint: '/class-levels/',
      hasDetails: true,
      hasAnalytics: true,
      detailKey: 'class_levels',
      analyticsKey: 'analytics',
      columns: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'school_level', label: 'School Level', type: 'text' },
        { key: 'is_active', label: 'Active', type: 'boolean' },
        { key: 'total_subjects', label: 'Subjects', type: 'number' },
        { key: 'total_students', label: 'Students', type: 'number' }
      ]
    },
    {
      value: 'classrooms',
      label: 'analytics.reportTypes.classrooms',
      displayName: 'Classroom Analytics',
      icon: <DoorOpen size={18} />,
      endpoint: '/classrooms/',
      hasDetails: true,
      hasAnalytics: true,
      detailKey: 'classrooms',
      analyticsKey: 'analytics',
      columns: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'room_type', label: 'Type', type: 'text' },
        { key: 'capacity', label: 'Capacity', type: 'number' },
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'assigned_class_level', label: 'Assigned To', type: 'text' }
      ]
    },
    {
      value: 'subjects',
      label: 'analytics.reportTypes.subjects',
      displayName: 'Subject Analytics',
      icon: <BookOpen size={18} />,
      endpoint: '/subjects/',
      hasDetails: true,
      hasAnalytics: true,
      detailKey: 'subjects',
      analyticsKey: 'analytics',
      columns: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'total_class_levels', label: 'Class Levels', type: 'number' },
        { key: 'total_teachers', label: 'Teachers', type: 'number' }
      ]
    },
    {
      value: 'teacher-assignments',
      label: 'analytics.reportTypes.teacherAssignments',
      displayName: 'Teacher Assignments',
      icon: <TrendIcon size={18} />,
      endpoint: '/teacher-assignments/',
      hasDetails: true,
      hasAnalytics: true,
      detailKey: 'assignments',
      analyticsKey: 'analytics',
      columns: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'teacher', label: 'Teacher', type: 'text' },
        { key: 'subject', label: 'Subject', type: 'text' },
        { key: 'class_level', label: 'Class Level', type: 'text' },
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'required_hours_per_week', label: 'Hours/Week', type: 'number' }
      ]
    },
    {
      value: 'grade-uploads',
      label: 'analytics.reportTypes.gradeUploads',
      displayName: 'Grade Uploads',
      icon: <FileText size={18} />,
      endpoint: '/grade-uploads/',
      hasDetails: true,
      hasAnalytics: true,
      detailKey: 'grade_uploads',
      analyticsKey: 'analytics',
      columns: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'teacher', label: 'Teacher', type: 'text' },
        { key: 'subject', label: 'Subject', type: 'text' },
        { key: 'class_level', label: 'Class Level', type: 'text' },
        { key: 'grade_type', label: 'Grade Type', type: 'text' },
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'total_student_grades', label: 'Student Grades', type: 'number' }
      ]
    },
    {
      value: 'attendance',
      label: 'analytics.reportTypes.attendance',
      displayName: 'Attendance Analytics',
      icon: <Activity size={18} />,
      endpoint: '/attendance/',
      hasDetails: true,
      hasAnalytics: true,
      detailKey: 'sessions',
      analyticsKey: 'analytics',
      columns: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'teacher', label: 'Teacher', type: 'text' },
        { key: 'subject', label: 'Subject', type: 'text' },
        { key: 'class_level', label: 'Class Level', type: 'text' },
        { key: 'session_date', label: 'Date', type: 'date' },
        { key: 'attendance_rate', label: 'Attendance Rate', type: 'percentage' },
        { key: 'total_records', label: 'Total Records', type: 'number' }
      ]
    },
    {
      value: 'payments',
      label: 'analytics.reportTypes.payments',
      displayName: 'Payment Analytics',
      icon: <DollarSign size={18} />,
      endpoint: '/payments/',
      hasDetails: true,
      hasAnalytics: true,
      detailKey: 'payment_assignments',
      analyticsKey: 'analytics',
      columns: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'student', label: 'Student', type: 'text' },
        { key: 'fee_structure', label: 'Fee Structure', type: 'text' },
        { key: 'total_amount', label: 'Total Amount', type: 'currency' },
        { key: 'paid_amount', label: 'Paid', type: 'currency' },
        { key: 'remaining_amount', label: 'Remaining', type: 'currency' },
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'is_overdue', label: 'Overdue', type: 'boolean' }
      ]
    }
  ];

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [yearsRes, levelsRes] = await Promise.all([
        apiClient.get('/academic-years/'),
        apiClient.get('/school-levels/')
      ]);

      if (yearsRes.data?.academic_years) {
        setAcademicYears(yearsRes.data.academic_years);
      }
      if (levelsRes.data?.school_levels) {
        setSchoolLevels(levelsRes.data.school_levels);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Fetch terms when academic year changes
  useEffect(() => {
    const fetchTerms = async () => {
      if (filters.academicYear) {
        try {
          const response = await apiClient.get('/terms/');
          if (response.data?.terms) {
            setTerms(response.data.terms.filter(t => t.academic_year === filters.academicYear));
          }
        } catch (error) {
          console.error('Error fetching terms:', error);
        }
      } else {
        setTerms([]);
      }
    };
    fetchTerms();
  }, [filters.academicYear]);

  // Fetch class levels when school level changes
  useEffect(() => {
    const fetchClassLevels = async () => {
      if (filters.schoolLevel) {
        try {
          const response = await apiClient.get('/class-levels/');
          if (response.data?.class_levels) {
            setClassLevels(response.data.class_levels.filter(cl => cl.school_level === filters.schoolLevel));
          }
        } catch (error) {
          console.error('Error fetching class levels:', error);
        }
      } else {
        setClassLevels([]);
      }
    };
    fetchClassLevels();
  }, [filters.schoolLevel]);

  // Initialize visible columns when report type changes
  useEffect(() => {
    const currentConfig = reportTypes.find(r => r.value === reportType);
    if (currentConfig?.columns) {
      const initialVisible = {};
      currentConfig.columns.forEach(col => {
        initialVisible[col.key] = true;
      });
      setVisibleColumns(initialVisible);
    }
  }, [reportType]);

  // Detect column types from actual data
  const detectColumnType = (key, value) => {
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes('amount') || lowerKey.includes('revenue') ||
      lowerKey.includes('price') || lowerKey.includes('salary') ||
      lowerKey.includes('total_value') || lowerKey.includes('expected') ||
      lowerKey.includes('collected') || lowerKey.includes('fee')) {
      return 'currency';
    }

    if (lowerKey.includes('rate') || lowerKey.includes('percentage') ||
      lowerKey.includes('score') || lowerKey.includes('active_percentage') ||
      lowerKey.includes('completion') || lowerKey.includes('collection_rate') ||
      lowerKey.includes('attendance_rate')) {
      return 'percentage';
    }

    if ((lowerKey.includes('date') || lowerKey === 'created_at' || lowerKey === 'updated_at' ||
      lowerKey.includes('enrollment') || lowerKey.includes('hire') ||
      lowerKey.includes('birth') || lowerKey.includes('session_date') ||
      lowerKey.includes('paid_at') || lowerKey.includes('assigned_at')) &&
      value && typeof value === 'string' && (value.includes('-') || value.includes('/'))) {
      return 'date';
    }

    if (lowerKey.includes('is_') || lowerKey.includes('has_') ||
      lowerKey === 'active' || lowerKey === 'current' ||
      lowerKey.includes('overdue') || lowerKey.includes('published')) {
      return 'boolean';
    }

    if (typeof value === 'number' && !isNaN(value)) {
      return 'number';
    }

    return 'text';
  };

  // Generate Report
  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      const config = reportTypes.find(r => r.value === reportType);
      if (!config) return;

      let params = {};
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      if (filters.academicYear) params.academic_year = filters.academicYear;
      if (filters.term) params.term = filters.term;
      if (filters.schoolLevel) params.school_level = filters.schoolLevel;
      if (filters.classLevel) params.class_level = filters.classLevel;
      if (filters.status) params.status = filters.status;

      const response = await apiClient.get(config.endpoint, { params });
      const data = response.data;

      let detailsData = null;
      let analyticsData = null;

      if (config.isOverview) {
        detailsData = data;
        analyticsData = data;
      } else {
        if (config.detailKey && data[config.detailKey]) {
          detailsData = data[config.detailKey];
        } else if (Array.isArray(data)) {
          detailsData = data;
        } else {
          detailsData = data;
        }

        if (config.analyticsKey && data[config.analyticsKey]) {
          analyticsData = data[config.analyticsKey];
        } else {
          analyticsData = data.analytics || data;
        }
      }

      setReportData(detailsData);
      setReportSummary(analyticsData || {});
      setReportAnalytics(analyticsData || {});

      if (detailsData && Array.isArray(detailsData) && detailsData.length > 0) {
        const firstRow = detailsData[0];
        const columns = Object.keys(firstRow).map(key => {
          const value = firstRow[key];
          const detectedType = detectColumnType(key, value);
          return { key, label: key, type: detectedType };
        });
        setReportColumns(columns);

        const initialVisible = {};
        columns.forEach(col => {
          initialVisible[col.key] = true;
        });
        setVisibleColumns(initialVisible);
      }

      toast.success(t('analytics.messages.reportGenerated', 'Report generated successfully'));
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error.response?.data?.error || t('analytics.messages.generateError', 'Failed to generate report'));
    } finally {
      setLoading(false);
    }
  }, [reportType, filters, t]);

  // Download PDF
  const downloadPDF = async () => {
    try {
      setLoading(true);
      const config = reportTypes.find(r => r.value === reportType);
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = margin;

      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 8, 'F');

      doc.setFontSize(18);
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(t('app.name', 'School Management System'), margin, yPos + 8);

      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38);
      const confidentialText = t('analytics.confidential', 'CONFIDENTIAL').toUpperCase();
      doc.text(confidentialText, pageWidth - margin - doc.getTextWidth(confidentialText), yPos + 8);

      yPos += 18;

      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(t(config.label).toUpperCase(), margin, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`${t('analytics.generatedOn', 'Generated on')}: ${new Date().toLocaleString()}`, margin, yPos);
      yPos += 15;

      if (Object.keys(reportSummary).length > 0) {
        const metricsData = [];
        const keyMetrics = [
          { key: 'total_users', label: 'Total Users' },
          { key: 'total_students', label: 'Total Students' },
          { key: 'total_teachers', label: 'Total Teachers' },
          { key: 'total_parents', label: 'Total Parents' },
          { key: 'active_percentage', label: 'Active Percentage' },
          { key: 'total_expected_revenue', label: 'Expected Revenue' },
          { key: 'total_collected_revenue', label: 'Collected Revenue' },
          { key: 'collection_rate', label: 'Collection Rate' },
          { key: 'overall_attendance_rate', label: 'Attendance Rate' }
        ];

        keyMetrics.forEach(metric => {
          const value = reportSummary[metric.key];
          if (value !== undefined && value !== null) {
            let formattedValue = value;
            if (metric.key.includes('revenue')) {
              formattedValue = formatCurrency(value);
            } else if (metric.key.includes('rate') || metric.key.includes('percentage')) {
              formattedValue = formatPercentage(value);
            } else if (typeof value === 'number') {
              formattedValue = formatNumber(value);
            }
            metricsData.push([t(`analytics.summary.${metric.key}`, metric.label), formattedValue]);
          }
        });

        if (metricsData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [[t('analytics.metric', 'Metric'), t('analytics.value', 'Value')]],
            body: metricsData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 10 },
            bodyStyles: { fontSize: 9 },
            margin: { left: margin, right: margin }
          });
          yPos = doc.lastAutoTable.finalY + 10;
        }
      }

      if (reportData && Array.isArray(reportData) && reportData.length > 0) {
        if (yPos > doc.internal.pageSize.getHeight() - 50) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(14);
        doc.text(t('analytics.detailedData', 'Detailed Data'), margin, yPos);
        yPos += 8;

        const visibleCols = reportColumns.filter(col => visibleColumns[col.key] !== false);

        if (visibleCols.length > 0) {
          const headers = visibleCols.map(col => t(`analytics.columns.${col.label}`, col.label));
          const tableData = reportData.map(item => {
            return visibleCols.map(col => {
              const value = item[col.key];
              return formatValueByType(value, col.type, col.key);
            });
          });

          autoTable(doc, {
            startY: yPos,
            head: [headers],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8 },
            bodyStyles: { fontSize: 7 },
            margin: { left: margin, right: margin }
          });
        }
      }

      doc.save(`${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(t('analytics.messages.pdfDownloaded', 'PDF downloaded successfully'));
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error(t('analytics.messages.downloadError', 'Failed to download PDF'));
    } finally {
      setLoading(false);
    }
  };

  // Download Excel
  const downloadExcel = () => {
    try {
      const config = reportTypes.find(r => r.value === reportType);
      const visibleCols = reportColumns.filter(col => visibleColumns[col.key] !== false);

      let exportData = [];
      if (reportData && Array.isArray(reportData)) {
        exportData = reportData.map(item => {
          const exportItem = {};
          visibleCols.forEach(col => {
            const value = item[col.key];
            exportItem[t(`analytics.columns.${col.label}`, col.label)] = formatValueByType(value, col.type, col.key);
          });
          return exportItem;
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, config.displayName);
      XLSX.writeFile(workbook, `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(t('analytics.messages.excelDownloaded', 'Excel file downloaded successfully'));
    } catch (error) {
      console.error('Excel download error:', error);
      toast.error(t('analytics.messages.downloadError', 'Failed to download Excel'));
    }
  };

  // Download CSV
  const downloadCSV = () => {
    try {
      const visibleCols = reportColumns.filter(col => visibleColumns[col.key] !== false);
      const headers = visibleCols.map(col => t(`analytics.columns.${col.label}`, col.label));

      const csvRows = [headers.join(',')];

      if (reportData && Array.isArray(reportData)) {
        for (const row of reportData) {
          const values = visibleCols.map(col => {
            const value = row[col.key];
            const formattedValue = formatValueByType(value, col.type, col.key);
            return `"${String(formattedValue).replace(/"/g, '""')}"`;
          });
          csvRows.push(values.join(','));
        }
      }

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('analytics.messages.csvDownloaded', 'CSV file downloaded successfully'));
    } catch (error) {
      console.error('CSV download error:', error);
      toast.error(t('analytics.messages.downloadError', 'Failed to download CSV'));
    }
  };

  // Column visibility handlers
  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: prev[columnKey] === false ? true : false
    }));
  };

  const selectAllColumns = () => {
    const allVisible = {};
    reportColumns.forEach(col => {
      allVisible[col.key] = true;
    });
    setVisibleColumns(allVisible);
  };

  const clearAllColumns = () => {
    const allHidden = {};
    reportColumns.forEach(col => {
      allHidden[col.key] = false;
    });
    setVisibleColumns(allHidden);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      academicYear: '',
      term: '',
      schoolLevel: '',
      classLevel: '',
      startDate: '',
      endDate: '',
      status: ''
    });
    toast.info(t('analytics.messages.filtersReset', 'Filters reset'));
  };

  // Get formatted visible data for table
  const getFormattedVisibleData = () => {
    if (!reportData || !Array.isArray(reportData)) return [];

    const visibleCols = reportColumns.filter(col => visibleColumns[col.key] !== false);
    return reportData.map(row => {
      const formattedRow = {};
      visibleCols.forEach(col => {
        const value = row[col.key];
        const displayKey = t(`analytics.columns.${col.label}`, col.label);
        formattedRow[displayKey] = formatValueByType(value, col.type, col.key);
      });
      return formattedRow;
    });
  };

  const visibleData = getFormattedVisibleData();
  const totalPages = Math.ceil(visibleData.length / pageSize);
  const paginatedData = visibleData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const currentConfig = reportTypes.find(r => r.value === reportType);

  // Prepare chart data from analytics
  // Prepare chart data from analytics
  const prepareChartData = () => {
    const charts = [];

    if (reportAnalytics.by_role) {
      charts.push({
        title: 'usersByRole',
        data: Object.entries(reportAnalytics.by_role).map(([name, value]) => ({ name, value })),
        type: 'pie',
        dataKey: 'value',
        nameKey: 'name'
      });
    }

    if (reportAnalytics.by_status) {
      charts.push({
        title: 'distributionByStatus',
        data: Object.entries(reportAnalytics.by_status).map(([name, value]) => ({ name, value })),
        type: 'pie',
        dataKey: 'value',
        nameKey: 'name'
      });
    }

    if (reportAnalytics.monthly_registrations?.length > 0) {
      charts.push({
        title: 'monthlyTrend',
        data: reportAnalytics.monthly_registrations,
        type: 'area',
        dataKey: 'count',
        nameKey: 'month'
      });
    }

    if (reportAnalytics.monthly_collection_trend?.length > 0) {
      charts.push({
        title: 'revenueTrend',
        data: reportAnalytics.monthly_collection_trend,
        type: 'bar',
        dataKey: 'total',
        nameKey: 'month'
      });
    }

    if (reportAnalytics.payment_status_distribution) {
      charts.push({
        title: 'paymentStatus',
        data: Object.entries(reportAnalytics.payment_status_distribution).map(([name, value]) => ({ name, value })),
        type: 'pie',
        dataKey: 'value',
        nameKey: 'name'
      });
    }

    if (reportAnalytics.grade_status_distribution) {
      charts.push({
        title: 'gradeStatus',
        data: Object.entries(reportAnalytics.grade_status_distribution).map(([name, value]) => ({ name, value })),
        type: 'pie',
        dataKey: 'value',
        nameKey: 'name'
      });
    }

    // This calculates status distribution from your student data
    if (reportData && Array.isArray(reportData) && reportData.length > 0) {
      const statusCounts = {};
      reportData.forEach(student => {
        const status = student.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      if (Object.keys(statusCounts).length > 0) {
        const statusData = Object.entries(statusCounts).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize: 'active' → 'Active'
          value: value
        }));

        charts.push({
          title: 'studentsByStatus',
          data: statusData,
          type: 'pie', // You can change to 'bar' if you prefer
          dataKey: 'value',
          nameKey: 'name'
        });
      }
    }

    // Keep Students by School Level (this was already there)
    if (reportAnalytics.students_per_school_level?.length > 0) {
      charts.push({
        title: 'studentsBySchoolLevel',
        data: reportAnalytics.students_per_school_level,
        type: 'bar',
        dataKey: 'count',
        nameKey: 'current_school_level__name'
      });
    }

    return charts;
  };

  const chartData = prepareChartData();

  // Get status badge class
  const getStatusBadgeClass = (value) => {
    const valueStr = String(value).toLowerCase();
    if (valueStr === 'active' || valueStr === 'completed' || valueStr === 'approved' || valueStr === 'yes') {
      return 'status-active';
    }
    if (valueStr === 'pending' || valueStr === 'waiting') {
      return 'status-pending';
    }
    if (valueStr === 'inactive' || valueStr === 'suspended' || valueStr === 'rejected' || valueStr === 'no') {
      return 'status-inactive';
    }
    return '';
  };

  return (
    <div className="analytics-reports min-h-screen bg-gray-50 dark:bg-gray-900">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        theme={isDarkMode ? 'dark' : 'light'}
      />

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 dark:from-green-400 dark:to-green-500 bg-clip-text text-transparent">
            📊 {t('analytics.title', 'Analytics & Reports')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('analytics.subtitle', 'Comprehensive data analysis and reporting for your institution')}
          </p>
        </div>

        {/* Report Type Selector */}
        <div className="flex flex-wrap gap-2 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm mb-6">
          {reportTypes.map(type => (
            <button
              key={type.value}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${reportType === type.value
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              onClick={() => {
                setReportType(type.value);
                setReportData(null);
                setReportSummary({});
                setReportAnalytics({});
                setReportColumns([]);
              }}
            >
              {type.icon}
              <span className="hidden sm:inline">{t(type.label, type.displayName)}</span>
            </button>
          ))}
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {academicYears.length > 0 && (
              <div className="filter-group">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('analytics.filters.academicYear', 'Academic Year')}
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={filters.academicYear}
                  onChange={(e) => setFilters({ ...filters, academicYear: e.target.value, term: '' })}
                >
                  <option value="">{t('analytics.filters.all', 'All')}</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.name}>{year.name}</option>
                  ))}
                </select>
              </div>
            )}

            {terms.length > 0 && (
              <div className="filter-group">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('analytics.filters.term', 'Term')}
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={filters.term}
                  onChange={(e) => setFilters({ ...filters, term: e.target.value })}
                >
                  <option value="">{t('analytics.filters.all', 'All')}</option>
                  {terms.map(term => (
                    <option key={term.id} value={term.name}>{term.name}</option>
                  ))}
                </select>
              </div>
            )}

            {schoolLevels.length > 0 && (
              <div className="filter-group">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('analytics.filters.schoolLevel', 'School Level')}
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={filters.schoolLevel}
                  onChange={(e) => setFilters({ ...filters, schoolLevel: e.target.value, classLevel: '' })}
                >
                  <option value="">{t('analytics.filters.all', 'All')}</option>
                  {schoolLevels.map(level => (
                    <option key={level.id} value={level.name}>{level.name}</option>
                  ))}
                </select>
              </div>
            )}

            {classLevels.length > 0 && (
              <div className="filter-group">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('analytics.filters.classLevel', 'Class Level')}
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={filters.classLevel}
                  onChange={(e) => setFilters({ ...filters, classLevel: e.target.value })}
                >
                  <option value="">{t('analytics.filters.all', 'All')}</option>
                  {classLevels.map(level => (
                    <option key={level.id} value={level.name}>{level.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="filter-group">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('analytics.filters.startDate', 'Start Date')}
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div className="filter-group">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('analytics.filters.endDate', 'End Date')}
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>

            <div className="filter-group">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('analytics.filters.status', 'Status')}
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">{t('analytics.filters.all', 'All')}</option>
                <option value="active">{t('analytics.filters.active', 'Active')}</option>
                <option value="inactive">{t('analytics.filters.inactive', 'Inactive')}</option>
                <option value="pending">{t('analytics.filters.pending', 'Pending')}</option>
                <option value="completed">{t('analytics.filters.completed', 'Completed')}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={generateReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
              {t('analytics.actions.generate', 'Generate Report')}
            </button>
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all"
            >
              <RefreshCw size={18} />
              {t('analytics.actions.reset', 'Reset Filters')}
            </button>
          </div>
        </div>

        {/* Report Content */}
        {reportData && (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={downloadPDF}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FilePdf size={16} className="text-red-500" />
                  PDF
                </button>
                <button
                  onClick={downloadExcel}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FileSpreadsheet size={16} className="text-green-600" />
                  Excel
                </button>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FileSpreadsheet size={16} className="text-blue-500" />
                  CSV
                </button>
              </div>

              {reportColumns.length > 0 && (
                <ColumnVisibilityManager
                  columns={reportColumns}
                  visibleColumns={visibleColumns}
                  onToggleColumn={toggleColumn}
                  onSelectAll={selectAllColumns}
                  onClearAll={clearAllColumns}
                />
              )}
            </div>

            {/* Summary Cards */}
            {Object.keys(reportSummary).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {reportSummary.total_users !== undefined && (
                  <SummaryCard
                    title="analytics.summary.totalUsers"
                    value={formatNumber(reportSummary.total_users)}
                    icon={<Users size={20} />}
                    color="green"
                  />
                )}
                {reportSummary.total_students !== undefined && (
                  <SummaryCard
                    title="analytics.summary.totalStudents"
                    value={formatNumber(reportSummary.total_students)}
                    icon={<GraduationCap size={20} />}
                    color="blue"
                  />
                )}
                {reportSummary.active_students !== undefined && (
                  <SummaryCard
                    title="analytics.summary.activeStudents"
                    value={formatNumber(reportSummary.active_students)}
                    icon={<UserCheck size={20} />}
                    color="green"
                    trend={`${reportSummary.active_percentage || 0}%`}
                    trendUp={true}
                  />
                )}
                {reportSummary.total_teachers !== undefined && (
                  <SummaryCard
                    title="analytics.summary.totalTeachers"
                    value={formatNumber(reportSummary.total_teachers)}
                    icon={<BookOpen size={20} />}
                    color="purple"
                  />
                )}
                {reportSummary.total_expected_revenue !== undefined && (
                  <SummaryCard
                    title="analytics.summary.expectedRevenue"
                    value={formatCurrency(reportSummary.total_expected_revenue)}
                    icon={<DollarSign size={20} />}
                    color="green"
                  />
                )}
                {reportSummary.total_collected_revenue !== undefined && (
                  <SummaryCard
                    title="analytics.summary.collectedRevenue"
                    value={formatCurrency(reportSummary.total_collected_revenue)}
                    icon={<Wallet size={20} />}
                    color="blue"
                  />
                )}
                {reportSummary.collection_rate !== undefined && (
                  <SummaryCard
                    title="analytics.summary.collectionRate"
                    value={formatPercentage(reportSummary.collection_rate)}
                    icon={<TrendingUp size={20} />}
                    color="indigo"
                    trendUp={reportSummary.collection_rate > 70}
                  />
                )}
                {reportSummary.overall_attendance_rate !== undefined && (
                  <SummaryCard
                    title="analytics.summary.attendanceRate"
                    value={formatPercentage(reportSummary.overall_attendance_rate)}
                    icon={<Activity size={20} />}
                    color="cyan"
                    trendUp={reportSummary.overall_attendance_rate > 80}
                  />
                )}
              </div>
            )}

            {/* Analytics Charts */}
            {chartData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  📈 {t('analytics.insights', 'Analytics Insights')}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {chartData.map((chart, index) => (
                    <AnalyticsChart
                      key={index}
                      title={chart.title}
                      data={chart.data}
                      type={chart.type}
                      dataKey={chart.dataKey}
                      nameKey={chart.nameKey}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : paginatedData.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">{t('analytics.messages.noData', 'No data available')}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    {t('analytics.messages.selectFilters', 'Select report type and generate report')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          {Object.keys(paginatedData[0] || {}).map(key => (
                            <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            {Object.entries(row).map(([key, value], cellIdx) => {
                              const valueStr = String(value).toLowerCase();
                              const isStatus = key.toLowerCase().includes('status') ||
                                key.toLowerCase().includes('completed') ||
                                key.toLowerCase().includes('active') ||
                                key.toLowerCase().includes('overdue') ||
                                valueStr === 'yes' || valueStr === 'no';

                              const statusClass = isStatus ? getStatusBadgeClass(valueStr) : '';

                              return (
                                <td key={cellIdx} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {isStatus && statusClass ? (
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                                      {value}
                                    </span>
                                  ) : (
                                    value || '-'
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('analytics.pagination.showing', 'Showing')} {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, visibleData.length)} {t('analytics.pagination.of', 'of')} {visibleData.length} {t('analytics.pagination.entries', 'entries')}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        {[10, 20, 50, 100].map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        «
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ‹
                      </button>
                      <span className="px-3 py-1 bg-green-600 text-white rounded">{currentPage}</span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ›
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        »
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}