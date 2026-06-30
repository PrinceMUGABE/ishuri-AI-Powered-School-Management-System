// Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, GraduationCap, BookOpen, CreditCard, Calendar, CheckCircle,
  Clock, AlertCircle, TrendingUp, TrendingDown, DollarSign, UserCheck,
  UserX, Activity, RefreshCw, Download, FileText, BarChart3, PieChart,
  LineChart, ArrowUpRight, ArrowDownRight, MoreVertical, Eye, EyeOff,
  ChevronLeft, ChevronRight, School, Building2, DoorOpen, UserPlus,
  Target, Award, Zap, Shield, Globe, Smartphone, Laptop, Tablet
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart as ReLineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
const API_BASE_URL = 'http://127.0.0.1:8000/api/dashboard';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  const language = localStorage.getItem('user_language') || 'en';
  config.headers['X-Language'] = language;
  return config;
}, (error) => Promise.reject(error));

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const COLORS = {
  primary:  '#10b981',
  secondary:'#3b82f6',
  danger:   '#ef4444',
  warning:  '#f59e0b',
  info:     '#8b5cf6',
  success:  '#10b981',
  purple:   '#8b5cf6',
  pink:     '#ec4899',
  indigo:   '#6366f1',
  cyan:     '#06b6d4',
  orange:   '#f97316',
  teal:     '#14b8a6',
  slate:    '#64748b',
  blue:     '#3b82f6',
};

const PIE_COLORS = [
  COLORS.primary, COLORS.blue, COLORS.purple,
  COLORS.orange,  COLORS.pink, COLORS.cyan,
];

// ---------------------------------------------------------------------------
// Shared Y-axis props — forces integer ticks on every bar/area chart
// ---------------------------------------------------------------------------
const integerYAxisProps = {
  allowDecimals: false,
  tickFormatter: (v) => Number.isInteger(v) ? v : '',
  stroke: '#6b7280',
};

// Shared tooltip style
const tooltipStyle = {
  contentStyle: { backgroundColor: '#1f2937', borderRadius: '8px', border: 'none' },
  labelStyle:   { color: '#fff' },
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const [loading,           setLoading]           = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);
  const [overviewData,      setOverviewData]      = useState(null);
  const [showCharts,        setShowCharts]        = useState(true);
  const [lastUpdated,       setLastUpdated]       = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await apiClient.get('/overview/');
      if (response.data) {
        setOverviewData(response.data);
        setLastUpdated(new Date());
        toast.success(t('dashboard.messages.dataLoaded', 'Dashboard data loaded successfully'));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error(error.response?.data?.message || t('dashboard.messages.fetchError', 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const handleRefresh = () => { setRefreshing(true); fetchDashboardData(); };

  // ── Loading / empty states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('dashboard.messages.loading', 'Loading dashboard...')}</p>
        </div>
      </div>
    );
  }

  if (!overviewData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('dashboard.messages.noData', 'No data available')}</p>
          <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors">
            {t('dashboard.actions.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatCurrency = (value) => {
    if (!value) return '0';
    return new Intl.NumberFormat('en-RW', {
      style: 'currency', currency: 'RWF',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value) => {
    if (!value) return '0';
    return new Intl.NumberFormat().format(value);
  };

  const getColorClasses = (color) => {
    const map = {
      blue:   { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-600 dark:text-blue-400' },
      green:  { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
      purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
      red:    { bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-600 dark:text-red-400' },
      yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
      orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
      teal:   { bg: 'bg-teal-100 dark:bg-teal-900/30',   text: 'text-teal-600 dark:text-teal-400' },
      indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
      cyan:   { bg: 'bg-cyan-100 dark:bg-cyan-900/30',   text: 'text-cyan-600 dark:text-cyan-400' },
      pink:   { bg: 'bg-pink-100 dark:bg-pink-900/30',   text: 'text-pink-600 dark:text-pink-400' },
    };
    return map[color] || map.blue;
  };

  const renderCardValue = (card) => {
    if (card.format === 'currency') return formatCurrency(card.value);
    if (typeof card.value === 'number') return formatNumber(card.value);
    return card.value;
  };

  // ── Chart data ───────────────────────────────────────────────────────────
  const monthlyEnrollmentTrend = overviewData.monthly_enrollment_trend    || [];
  const monthlyCollectionTrend = overviewData.monthly_collection_trend    || [];
  const studentsBySchoolLevel  = overviewData.students_by_school_level    || [];
  const usersByRole            = overviewData.users_by_role               || {};
  const paymentStatusDist      = overviewData.payment_status_distribution || {};
  const gradeStatusDist        = overviewData.grade_status_distribution   || {};
  const attendanceSummary      = overviewData.attendance_summary          || { present: 0, absent: 0, late: 0, excused: 0 };

  const revenueData = monthlyCollectionTrend.map(item => ({
    month: item.month,
    revenue: item.total || 0,
  }));

  const userRoleData = Object.entries(usersByRole).map(([name, value]) => ({
    name:  t(`dashboard.roles.${name}`, name),
    value,
  }));

  const paymentStatusData = Object.entries(paymentStatusDist).map(([status, count]) => ({
    name:  t(`dashboard.paymentStatus.${status}`, status),
    value: count,
    color: status === 'completed'      ? COLORS.success
         : status === 'partially_paid' ? COLORS.warning
         : status === 'overdue'        ? COLORS.danger
         : COLORS.slate,
  }));

  const gradeStatusData = Object.entries(gradeStatusDist).map(([status, count]) => ({
    name:  t(`dashboard.gradeStatus.${status}`, status),
    value: count,
    color: status === 'approved'  ? COLORS.success
         : status === 'pending'   ? COLORS.warning
         : status === 'rejected'  ? COLORS.danger
         : COLORS.info,
  }));

  const attendanceData = [
    { name: t('dashboard.attendance.present', 'Present'), value: attendanceSummary.present || 0, color: COLORS.success },
    { name: t('dashboard.attendance.absent',  'Absent'),  value: attendanceSummary.absent  || 0, color: COLORS.danger  },
    { name: t('dashboard.attendance.late',    'Late'),    value: attendanceSummary.late    || 0, color: COLORS.warning },
    { name: t('dashboard.attendance.excused', 'Excused'), value: attendanceSummary.excused || 0, color: COLORS.info    },
  ];

  // ── Card definitions ─────────────────────────────────────────────────────
  const summaryCards = [
    { title: t('dashboard.summary.totalUsers',        'Total Users'),          value: overviewData.total_users               || 0, icon: Users,       color: 'blue',   trend: '+12%', trendUp: true },
    { title: t('dashboard.summary.totalStudents',     'Total Students'),       value: overviewData.total_students            || 0, icon: GraduationCap, color: 'green', trend: '+8%',  trendUp: true },
    { title: t('dashboard.summary.activeStudents',    'Active Students'),      value: overviewData.active_students           || 0, icon: UserCheck,   color: 'green',  subtitle: t('dashboard.summary.ofTotal', 'of total students') },
    { title: t('dashboard.summary.totalTeachers',    'Total Teachers'),        value: overviewData.total_teachers            || 0, icon: BookOpen,    color: 'purple', trend: '+5%',  trendUp: true },
    { title: t('dashboard.summary.activeTeachers',   'Active Teachers'),       value: overviewData.active_teachers           || 0, icon: UserCheck,   color: 'purple', trend: '+3%',  trendUp: true },
    { title: t('dashboard.summary.totalParents',     'Total Parents'),         value: overviewData.total_parents             || 0, icon: Users,       color: 'orange', trend: '+15%', trendUp: true },
    { title: t('dashboard.summary.totalSchoolLevels','School Levels'),         value: overviewData.total_school_levels       || 0, icon: School,      color: 'teal' },
    { title: t('dashboard.summary.totalClassLevels', 'Class Levels'),          value: overviewData.total_class_levels        || 0, icon: Building2,   color: 'indigo' },
    { title: t('dashboard.summary.totalClassrooms',  'Classrooms'),            value: overviewData.total_classrooms          || 0, icon: DoorOpen,    color: 'cyan' },
    { title: t('dashboard.summary.totalSubjects',    'Subjects'),              value: overviewData.total_subjects            || 0, icon: BookOpen,    color: 'pink' },
    { title: t('dashboard.summary.teacherAssignments','Teacher Assignments'),  value: overviewData.total_teacher_assignments || 0, icon: Target,      color: 'indigo', trend: '+10%', trendUp: true },
    { title: t('dashboard.summary.activeAssignments','Active Assignments'),    value: overviewData.active_teacher_assignments|| 0, icon: Activity,    color: 'green' },
  ];

  const financialCards = [
    { title: t('dashboard.financial.expectedRevenue',  'Expected Revenue'),   value: overviewData.total_expected_revenue  || 0, icon: DollarSign, color: 'green',  format: 'currency' },
    { title: t('dashboard.financial.collectedRevenue', 'Collected Revenue'),  value: overviewData.total_collected_revenue || 0, icon: CreditCard, color: 'blue',   format: 'currency' },
    { title: t('dashboard.financial.collectionRate',   'Collection Rate'),    value: overviewData.collection_rate         || 0, icon: TrendingUp, color: 'purple', suffix: '%' },
    { title: t('dashboard.financial.overduePayments',  'Overdue Payments'),   value: overviewData.overdue_payments        || 0, icon: AlertCircle,color: 'red' },
  ];

  const academicCards = [
    { title: t('dashboard.academic.currentYear', 'Current Academic Year'), value: overviewData.current_academic_year || 'N/A', icon: Calendar, color: 'green' },
    { title: t('dashboard.academic.currentTerm', 'Current Term'),          value: overviewData.current_term          || 'N/A', icon: Clock,    color: 'blue' },
  ];

  const gradeCards = [
    { title: t('dashboard.grades.totalUploads',      'Total Grade Uploads'), value: overviewData.total_grade_uploads   || 0, icon: FileText,    color: 'purple' },
    { title: t('dashboard.grades.pendingUploads',    'Pending Review'),       value: overviewData.pending_grade_uploads || 0, icon: Clock,       color: 'yellow' },
    { title: t('dashboard.grades.approvedUploads',   'Approved'),             value: overviewData.approved_grade_uploads|| 0, icon: CheckCircle, color: 'green' },
    { title: t('dashboard.grades.totalStudentGrades','Student Grades'),       value: overviewData.total_student_grades  || 0, icon: Award,       color: 'indigo' },
    { title: t('dashboard.grades.publishedGrades',   'Published Grades'),     value: overviewData.published_grades      || 0, icon: Eye,         color: 'blue' },
  ];

  const chatCards = [
    { title: t('dashboard.chat.totalChatrooms', 'Chat Rooms'), value: overviewData.total_chatrooms || 0, icon: Users,    color: 'cyan' },
    { title: t('dashboard.chat.totalMessages',  'Messages'),   value: overviewData.total_messages  || 0, icon: Activity, color: 'teal' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Page header ── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-green-600" />
                {t('dashboard.title', 'Dashboard Analytics')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('dashboard.subtitle', 'Real-time insights and analytics for your institution')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCharts(v => !v)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
              >
                {showCharts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="text-sm hidden sm:inline">
                  {showCharts
                    ? t('dashboard.actions.hideCharts', 'Hide Charts')
                    : t('dashboard.actions.showCharts', 'Show Charts')}
                </span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-3 py-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 text-white"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm hidden sm:inline">{t('dashboard.actions.refresh', 'Refresh')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Last updated */}
        {lastUpdated && (
          <div className="text-right text-xs text-gray-500 dark:text-gray-400">
            {t('dashboard.lastUpdated', 'Last updated')}: {lastUpdated.toLocaleTimeString()}
          </div>
        )}

        {/* ── Academic cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {academicCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-800 dark:to-green-900 rounded-xl p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">{card.title}</p>
                    <p className="text-white text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Overview stats ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            {t('dashboard.sections.overview', 'Overview Statistics')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {summaryCards.map((card, index) => {
              const colors = getColorClasses(card.color);
              const Icon = card.icon;
              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    {card.trend && (
                      <div className={`flex items-center gap-1 text-xs ${card.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                        {card.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {card.trend}
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{renderCardValue(card)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.title}</p>
                  {card.subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.subtitle}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Financial ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            {t('dashboard.sections.financial', 'Financial Overview')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {financialCards.map((card, index) => {
              const colors = getColorClasses(card.color);
              const Icon = card.icon;
              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {card.suffix ? `${renderCardValue(card)}${card.suffix}` : renderCardValue(card)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.title}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Grades ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            {t('dashboard.sections.grades', 'Grade Management')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {gradeCards.map((card, index) => {
              const colors = getColorClasses(card.color);
              const Icon = card.icon;
              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{renderCardValue(card)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.title}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Charts ── */}
        {showCharts && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-green-600" />
              {t('dashboard.sections.charts', 'Analytics & Charts')}
            </h2>

            {/* Enrollment + Revenue trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Enrollment Trend */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  {t('dashboard.charts.enrollmentTrend', 'Student Enrollment Trend')}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyEnrollmentTrend}>
                    <defs>
                      <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={COLORS.primary} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    {/* ← integer Y-axis */}
                    <YAxis {...integerYAxisProps} />
                    <Tooltip {...tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#enrollmentGradient)"
                      name={t('dashboard.charts.newStudents', 'New Students')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue Trend */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  {t('dashboard.charts.revenueTrend', 'Revenue Collection Trend')}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    {/* Revenue is currency so we keep it as-is but still no decimals */}
                    <YAxis
                      allowDecimals={false}
                      tickFormatter={(v) => formatCurrency(v)}
                      stroke="#6b7280"
                      width={90}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value) => [formatCurrency(value), t('dashboard.charts.revenue', 'Revenue')]}
                    />
                    <Bar
                      dataKey="revenue"
                      fill={COLORS.primary}
                      radius={[4, 4, 0, 0]}
                      name={t('dashboard.charts.revenue', 'Revenue')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribution pie charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Users by Role */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  {t('dashboard.charts.usersByRole', 'Users by Role')}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie data={userRoleData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {userRoleData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  {t('dashboard.charts.paymentStatus', 'Payment Status')}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie data={paymentStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              {/* Attendance */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  {t('dashboard.charts.attendance', 'Attendance Overview')}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie data={attendanceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {attendanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      {t('dashboard.attendance.overallRate', 'Overall Attendance Rate')}: {overviewData.overall_attendance_rate || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grade status + Students by school level */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Grade Status — horizontal bar */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  {t('dashboard.charts.gradeStatus', 'Grade Upload Status')}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={gradeStatusData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    {/* X-axis is the numeric axis in a vertical layout */}
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tickFormatter={(v) => Number.isInteger(v) ? v : ''}
                      stroke="#6b7280"
                    />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" width={100} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} name={t('dashboard.charts.count', 'Count')}>
                      {gradeStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS.primary} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Students by School Level */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  {t('dashboard.charts.studentsByLevel', 'Students by School Level')}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={studentsBySchoolLevel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="current_school_level__name" stroke="#6b7280" />
                    {/* ← integer Y-axis — fixes the 0 / 0.25 / 0.5 / 0.75 / 1 problem */}
                    <YAxis {...integerYAxisProps} />
                    <Tooltip {...tooltipStyle} />
                    <Bar
                      dataKey="count"
                      fill={COLORS.primary}
                      radius={[4, 4, 0, 0]}
                      name={t('dashboard.charts.students', 'Students')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── Communication ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            {t('dashboard.sections.communication', 'Communication Overview')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {chatCards.map((card, index) => {
              const colors = getColorClasses(card.color);
              const Icon = card.icon;
              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(card.value)}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.title}</p>
                    </div>
                    <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;