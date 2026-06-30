// StudentDashboard.jsx — Full Rewrite
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  User, Search, Eye, X, ChevronLeft, ChevronRight,
  RefreshCw, CheckCircle, AlertCircle, GraduationCap,
  BookOpen, Calendar, Sun, Moon, FileText, BarChart3,
  UserCheck, BookOpenCheck, TrendingUp, Clock, Award,
  Activity, Star, MoveRight, DoorOpen, Building2,
  AlertTriangle, School, Users as UsersIcon, Check,
  Loader2, Wallet, CreditCard, MessageCircle,
  ChevronDown, ChevronUp, DollarSign, Receipt,
  AlertOctagon, ExternalLink, MessageSquare, LogOut,
  Settings, PieChart, Lock, Unlock, Hash, Phone,
  Banknote, ChevronsRight, ShieldCheck, BadgeCheck,
  CircleDollarSign, History, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── API ────────────────────────────────────────────────────────────────────
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

// ─── Spinner ────────────────────────────────────────────────────────────────
const Spinner = ({ size = 'sm' }) => (
  <div className={`${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto`} />
);

// ─── Status helpers ─────────────────────────────────────────────────────────
const getPercentageColor = (pct) => {
  if (pct >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (pct >= 50) return { bar: 'bg-amber-400', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { bar: 'bg-rose-500', text: 'text-rose-600', badge: 'bg-rose-100 text-rose-700 border-rose-200' };
};

const getPaymentStatusMeta = (payment) => {
  const remaining = parseFloat(payment.remaining_amount) || 0;
  const paid = parseFloat(payment.paid_amount) || 0;
  if (remaining <= 0) return { label: 'Fully Paid', color: 'emerald', icon: <BadgeCheck className="w-4 h-4" />, dot: 'bg-emerald-500' };
  if (paid > 0) return { label: 'Partially Paid', color: 'amber', icon: <AlertCircle className="w-4 h-4" />, dot: 'bg-amber-400' };
  return { label: 'Unpaid', color: 'rose', icon: <AlertTriangle className="w-4 h-4" />, dot: 'bg-rose-500' };
};

// ─── Mini progress bar ───────────────────────────────────────────────────────
const ProgressBar = ({ value, colorClass }) => (
  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
    <div
      className={`h-full ${colorClass} rounded-full transition-all duration-700`}
      style={{ width: `${Math.min(value, 100)}%` }}
    />
  </div>
);

// ─── Performance ring ────────────────────────────────────────────────────────
const RingChart = ({ value, size = 120 }) => {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  const color = value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth="10" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth="10" fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
};

// ─── Subject card ────────────────────────────────────────────────────────────
const SubjectCard = ({ subject, t }) => {
  const pct = subject.final_percentage || 0;
  const colors = getPercentageColor(pct);
  const icon = pct >= 80
    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
    : pct >= 50
      ? <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
      : <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
  return (
    <div className="group flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm transition-all">
      <div className={`w-1 self-stretch rounded-full ${colors.bar}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{subject.subject_name}</p>
          {icon}
        </div>
        <ProgressBar value={pct} colorClass={colors.bar} />
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <p className={`text-base font-bold ${colors.text}`}>{pct.toFixed(1)}%</p>
        <p className="text-xs text-gray-400">{subject.grade_letter || '—'}</p>
      </div>
    </div>
  );
};

// ─── Teacher card ────────────────────────────────────────────────────────────
const TeacherCard = ({ teacher, t }) => {
  const initials = teacher.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  const palettes = [
    { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-200 dark:ring-blue-800' },
    { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-200 dark:ring-violet-800' },
    { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', ring: 'ring-teal-200 dark:ring-teal-800' },
    { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-200 dark:ring-rose-800' },
    { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-200 dark:ring-amber-800' },
  ];
  const p = palettes[(teacher.id || 0) % palettes.length];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ring-2 ${p.bg} ${p.text} ${p.ring} flex-shrink-0`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{teacher.full_name}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {(teacher.subjects || []).slice(0, 3).map(s => (
            <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 font-medium">
              {s.name}
            </span>
          ))}
          {(teacher.subjects || []).length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 font-medium">
              +{teacher.subjects.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Teachers panel ──────────────────────────────────────────────────────────
const TeachersPanel = ({ student, t }) => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!student?.id) return;
    setLoading(true);
    apiClient.get('/students/get_my_current_teachers/')
      .then(res => setTeachers(res.data?.data?.teachers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [student?.id]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t('student_dashboard.myTeachers')}
            {teachers.length > 0 && (
              <span className="ml-2 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-medium">
                {teachers.length}
              </span>
            )}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {loading ? (
            <div className="py-4 text-center"><Spinner /></div>
          ) : teachers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">{t('student_dashboard.noTeachers')}</p>
          ) : (
            teachers.map(t2 => <TeacherCard key={t2.id} teacher={t2} t={t} />)
          )}
        </div>
      )}
    </div>
  );
};

// ─── Transaction row ─────────────────────────────────────────────────────────
const TransactionRow = ({ tx }) => {
  const methodIcon = tx.payment_method === 'mobile_money'
    ? <Phone className="w-3 h-3" />
    : tx.payment_method === 'bank_transfer'
      ? <Banknote className="w-3 h-3" />
      : <CircleDollarSign className="w-3 h-3" />;

  const statusColor = tx.transaction_status === 'completed'
    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
    : tx.transaction_status === 'failed'
      ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
      : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
          {methodIcon}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {tx.payment_method_display || tx.payment_method}
          </p>
          <p className="text-[10px] text-gray-400">
            {tx.paid_at ? new Date(tx.paid_at).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-bold text-gray-800 dark:text-white">
          {parseFloat(tx.amount).toLocaleString()} FRW
        </p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor}`}>
          {tx.transaction_status_display || tx.transaction_status}
        </span>
      </div>
    </div>
  );
};

// ─── Fee Status Card (enhanced) ──────────────────────────────────────────────
const FeeStatusCard = ({ payment, t }) => {
  const [expanded, setExpanded] = useState(false);
  const total = parseFloat(payment.total_amount) || 0;
  const paid = parseFloat(payment.paid_amount) || 0;
  const remaining = parseFloat(payment.remaining_amount) || 0;
  const pct = total > 0 ? (paid / total) * 100 : 0;
  const meta = getPaymentStatusMeta(payment);
  const transactions = payment.transactions || [];
  const completedTx = transactions.filter(tx => tx.transaction_status === 'completed');

  const borderColor = meta.color === 'emerald'
    ? 'border-l-emerald-500'
    : meta.color === 'amber'
      ? 'border-l-amber-400'
      : 'border-l-rose-500';

  const headerBg = meta.color === 'emerald'
    ? 'bg-emerald-50 dark:bg-emerald-900/15'
    : meta.color === 'amber'
      ? 'bg-amber-50 dark:bg-amber-900/15'
      : 'bg-rose-50 dark:bg-rose-900/15';

  const badgeClass = meta.color === 'emerald'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : meta.color === 'amber'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';

  const barColor = meta.color === 'emerald' ? 'bg-emerald-500' : meta.color === 'amber' ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <div className={`rounded-xl border border-gray-100 dark:border-gray-700 border-l-4 ${borderColor} overflow-hidden shadow-sm`}>
      {/* Header */}
      <div className={`${headerBg} px-4 py-3`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
              {payment.class_level_cost_details?.name || t('student_dashboard.schoolFees')}
            </p>
            {payment.due_date && remaining > 0 && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                Due: {new Date(payment.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
          <span className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
            {meta.icon}
            {meta.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 space-y-3">
        {/* Progress */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-500">Payment progress</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>

        {/* Amount breakdown */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total', value: total, cls: 'text-gray-700 dark:text-gray-200' },
            { label: 'Paid', value: paid, cls: 'text-emerald-600' },
            { label: 'Balance', value: remaining, cls: remaining > 0 ? 'text-rose-600' : 'text-emerald-600' },
          ].map(item => (
            <div key={item.label} className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{item.label}</p>
              <p className={`text-xs font-bold ${item.cls}`}>
                {item.value.toLocaleString()}
                <span className="text-[9px] font-normal ml-0.5 text-gray-400">FRW</span>
              </p>
            </div>
          ))}
        </div>

        {/* Partially paid breakdown — installments */}
        {paid > 0 && remaining > 0 && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Info className="w-3 h-3 text-amber-600" />
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Partially paid</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Amount paid so far</span>
                <span className="font-semibold text-emerald-600">{paid.toLocaleString()} FRW</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Still outstanding</span>
                <span className="font-semibold text-rose-600">{remaining.toLocaleString()} FRW</span>
              </div>
            </div>
          </div>
        )}

        {/* Fully paid callout */}
        {remaining <= 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 p-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              Fee fully cleared — no balance outstanding
            </p>
          </div>
        )}

        {/* Transaction history toggle */}
        {transactions.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(e => !e)}
              className="w-full flex items-center justify-between text-[11px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                <History className="w-3 h-3" />
                {completedTx.length} payment transaction{completedTx.length !== 1 ? 's' : ''}
              </span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {expanded && (
              <div className="mt-2 space-y-0.5 border-t border-gray-100 dark:border-gray-700 pt-2">
                {transactions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">No transactions yet</p>
                ) : (
                  transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Stat chip ───────────────────────────────────────────────────────────────
const StatChip = ({ label, value, colorClass }) => (
  <div className="text-center">
    <p className={`text-2xl font-black ${colorClass}`}>{value}</p>
    <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5 leading-tight">{label}</p>
  </div>
);

// ─── Info card ───────────────────────────────────────────────────────────────
const InfoCard = ({ icon, label, value, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{value || '—'}</p>
    </div>
  </div>
);

// ─── Academic Report Modal ───────────────────────────────────────────────────
const AcademicReportModal = ({ student, reportData, onClose, t }) => {
  const [selectedTerm, setSelectedTerm] = useState(null);
  const terms = useMemo(() => reportData?.term_performances || [], [reportData]);
  const currentPerformance = useMemo(() => {
    if (selectedTerm) return terms.find(term => term.term_id === selectedTerm);
    return terms.find(term => term.is_current) || terms[0];
  }, [terms, selectedTerm]);

  const handlePrint = () => window.print();
  const handleDownload = () => {
    const link = document.createElement('a');
    link.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2)));
    link.setAttribute('download', `report_${student.roll_number}_${new Date().toISOString().split('T')[0]}.json`);
    link.click();
    toast.success(t('student_dashboard.reportDownloaded'));
  };

  if (!reportData) return null;

  const C = {
    primary: '#059669', light: '#f0fdf4', border: '#a7f3d0',
    accent: '#d97706', white: '#ffffff', text: '#111827', muted: '#6b7280',
  };

  const subjectMap = {};
  terms.forEach((term, idx) => {
    (term.subject_results || []).forEach(sub => {
      if (!subjectMap[sub.subject_name]) subjectMap[sub.subject_name] = {};
      subjectMap[sub.subject_name][idx] = sub.final_percentage ?? null;
    });
  });

  const subjectRows = Object.entries(subjectMap).map(([name, scores]) => {
    const vals = terms.map((_, i) => scores[i] ?? null);
    const valid = vals.filter(s => s !== null);
    const avg = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    const grade = avg === null ? 'F' : avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : avg >= 60 ? 'D' : avg >= 30 ? 'E' : 'F';
    return { name, scores: vals, avg, grade };
  });

  const allAvgs = subjectRows.map(r => r.avg).filter(Boolean);
  const totalAvg = allAvgs.length > 0 ? allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length : null;
  const totalGrade = totalAvg === null ? 'F' : totalAvg >= 90 ? 'A' : totalAvg >= 80 ? 'B' : totalAvg >= 70 ? 'C' : totalAvg >= 60 ? 'D' : totalAvg >= 30 ? 'E' : 'F';

  const gradeColor = (g) => {
    if (g === 'A') return { bg: '#059669', text: '#fff' };
    if (g === 'B') return { bg: '#d97706', text: '#fff' };
    if (g === 'C') return { bg: '#fef3c7', text: '#92400e' };
    if (g === 'D') return { bg: '#dcfce7', text: '#166534' };
    return { bg: '#f3f4f6', text: '#6b7280' };
  };

  const scoreColor = (s) => s >= 80 ? '#059669' : s >= 60 ? '#d97706' : '#ef4444';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: C.white, borderRadius: 12, maxWidth: 940, width: '100%', maxHeight: '92vh', overflowY: 'auto', fontFamily: 'Georgia, serif', color: C.text, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
        {/* Toolbar */}
        <div style={{ position: 'sticky', top: 0, background: C.white, borderBottom: `3px solid ${C.primary}`, padding: '10px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8, zIndex: 10 }} className="print:hidden">
          {[
            { label: 'Download', onClick: handleDownload, outline: true },
            { label: 'Print', onClick: handlePrint, outline: true },
            { label: 'Close', onClick: onClose, outline: false },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} style={{ background: btn.outline ? 'transparent' : C.primary, border: `1px solid ${C.primary}`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', color: btn.outline ? C.primary : C.white, fontSize: 13, fontFamily: 'sans-serif', fontWeight: 500 }}>
              {btn.label}
            </button>
          ))}
        </div>
        <div style={{ padding: '24px 28px' }}>
          {/* School header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20, paddingBottom: 16, borderBottom: `3px solid ${C.primary}` }}>
            <div style={{ width: 76, height: 76, borderRadius: 10, background: C.primary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GraduationCap size={30} color={C.accent} />
              <div style={{ color: C.white, fontSize: 8, fontWeight: 'bold', textAlign: 'center', marginTop: 4, fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.3 }}>
                Les Hirondelles<br />de Don Bosco
              </div>
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 'bold', color: C.primary, margin: 0 }}>{t('student_dashboard.reportTitle')}</h1>
              <p style={{ margin: '4px 0 0', fontFamily: 'sans-serif', fontSize: 13, color: C.muted }}>{t('student_dashboard.academicReport')}</p>
            </div>
          </div>
          {/* Student info */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontFamily: 'sans-serif', fontSize: 13 }}>
            <tbody>
              {[
                [t('student_dashboard.studentName'), student.full_name, t('student_dashboard.classLevel'), student.current_class_level?.name || 'N/A'],
                [t('student_dashboard.academicYear'), reportData.academic_year_name, t('student_dashboard.rollNumber'), student.roll_number],
              ].map((row, i) => (
                <tr key={i}>
                  {[0, 2].map(ci => (
                    <React.Fragment key={ci}>
                      <td style={{ border: `1px solid ${C.primary}`, padding: '7px 12px', background: C.light, color: C.primary, fontWeight: 600, width: 145 }}>{row[ci]}</td>
                      <td style={{ border: `1px solid ${C.primary}`, padding: '7px 12px' }}>{row[ci + 1]}</td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Grades table */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: C.primary, color: C.white, padding: '8px 14px', fontSize: 14, fontWeight: 'bold', fontFamily: 'sans-serif', borderRadius: '4px 4px 0 0' }}>
                {t('student_dashboard.semestralGrades')}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'sans-serif', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ background: C.primary, color: C.white, padding: '8px 12px', textAlign: 'left', border: `1px solid ${C.primary}`, fontWeight: 600 }}>Subject</th>
                    {terms.map(term => (
                      <th key={term.term_id} style={{ background: C.primary, color: C.white, padding: '8px 10px', textAlign: 'center', border: `1px solid ${C.primary}`, fontWeight: 600, whiteSpace: 'nowrap' }}>{term.term_name}</th>
                    ))}
                    <th style={{ background: C.primary, color: C.white, padding: '8px 10px', textAlign: 'center', border: `1px solid ${C.primary}`, fontWeight: 600 }}>Avg</th>
                    <th style={{ background: C.primary, color: C.white, padding: '8px 10px', textAlign: 'center', border: `1px solid ${C.primary}`, fontWeight: 600 }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectRows.map((row, idx) => {
                    const gc = gradeColor(row.grade);
                    return (
                      <tr key={row.name} style={{ background: idx % 2 === 0 ? '#fff' : C.light }}>
                        <td style={{ padding: '7px 12px', border: `1px solid ${C.border}`, fontWeight: 500 }}>{row.name}</td>
                        {row.scores.map((s, si) => (
                          <td key={si} style={{ padding: '7px 10px', border: `1px solid ${C.border}`, textAlign: 'center', color: s !== null ? scoreColor(s) : C.muted, fontWeight: 500 }}>
                            {s !== null ? s.toFixed(1) : '—'}
                          </td>
                        ))}
                        <td style={{ padding: '7px 10px', border: `1px solid ${C.border}`, textAlign: 'center', fontWeight: 'bold', color: row.avg !== null ? scoreColor(row.avg) : C.muted }}>
                          {row.avg !== null ? row.avg.toFixed(2) : '—'}
                        </td>
                        <td style={{ padding: '7px 10px', border: `1px solid ${C.border}`, textAlign: 'center', fontWeight: 'bold', fontSize: 14, background: gc.bg, color: gc.text }}>
                          {row.grade}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td style={{ padding: '8px 12px', border: `1px solid ${C.primary}`, fontWeight: 'bold', background: '#dcfce7', color: '#166534', fontFamily: 'sans-serif' }}>Overall Average</td>
                    {terms.map((_, i) => <td key={i} style={{ border: `1px solid ${C.primary}`, background: '#dcfce7' }} />)}
                    <td style={{ padding: '8px 10px', border: `1px solid ${C.primary}`, textAlign: 'center', fontWeight: 'bold', background: '#dcfce7', color: totalAvg !== null ? scoreColor(totalAvg) : '#166534', fontSize: 14 }}>
                      {totalAvg !== null ? totalAvg.toFixed(2) : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', border: `1px solid ${C.primary}`, textAlign: 'center', fontWeight: 'bold', fontSize: 14, background: gradeColor(totalGrade).bg, color: gradeColor(totalGrade).text }}>
                      {totalGrade}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Grade scale */}
            <div style={{ width: 145, flexShrink: 0 }}>
              <div style={{ background: C.accent, color: C.white, padding: '8px 14px', fontSize: 14, fontWeight: 'bold', fontFamily: 'sans-serif', borderRadius: '4px 4px 0 0' }}>
                Grade Scale
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'sans-serif', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '7px 10px', textAlign: 'left', border: `1px solid ${C.border}`, background: C.light, color: C.primary, fontWeight: 600 }}>Range</th>
                    <th style={{ padding: '7px 10px', textAlign: 'center', border: `1px solid ${C.border}`, background: C.light, color: C.primary, fontWeight: 600 }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {[['90–100','A'],['80–89','B'],['70–79','C'],['60–69','D'],['30–59','E'],['0–29','F']].map(([range, g]) => {
                    const gc = gradeColor(g);
                    return (
                      <tr key={g}>
                        <td style={{ padding: '7px 10px', border: `1px solid ${C.border}`, background: gc.bg, color: gc.text, fontWeight: 500 }}>{range}</td>
                        <td style={{ padding: '7px 10px', border: `1px solid ${C.border}`, textAlign: 'center', background: gc.bg, color: gc.text, fontWeight: 'bold', fontSize: 15 }}>{g}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {/* Discipline */}
          {currentPerformance?.discipline && (
            <div style={{ marginTop: 24 }}>
              <div style={{ background: C.primary, color: C.white, padding: '8px 14px', fontSize: 14, fontWeight: 'bold', fontFamily: 'sans-serif', borderRadius: '4px 4px 0 0' }}>
                {t('student_dashboard.disciplineAttendance')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 10 }}>
                {[
                  { label: 'Attendance Rate', value: `${(currentPerformance.discipline.attendance_rate ?? 0).toFixed(1)}%` },
                  { label: 'Present', value: currentPerformance.discipline.present ?? 0 },
                  { label: 'Absent', value: currentPerformance.discipline.absent ?? 0 },
                  { label: 'Late', value: currentPerformance.discipline.late ?? 0 },
                ].map(item => (
                  <div key={item.label} style={{ background: C.light, borderRadius: 6, padding: '12px 10px', textAlign: 'center', border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, color: C.primary, fontFamily: 'sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: C.primary, fontFamily: 'Georgia, serif', marginTop: 4 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {currentPerformance?.remarks && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: C.light, borderLeft: `4px solid ${C.primary}`, borderRadius: '0 6px 6px 0', fontSize: 13, fontFamily: 'sans-serif' }}>
              <strong style={{ color: C.primary }}>Remarks: </strong>{currentPerformance.remarks}
            </div>
          )}
          <div style={{ marginTop: 24, paddingTop: 14, borderTop: `2px solid ${C.border}`, textAlign: 'center', fontSize: 12, color: C.muted, fontFamily: 'sans-serif' }}>
            <p style={{ margin: '0 0 4px' }}>Les Hirondelles de Don Bosco — {t('student_dashboard.qualityEducation')}</p>
            <p style={{ margin: 0 }}>Generated on: {new Date().toLocaleDateString()} | {t('student_dashboard.reportFooter')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const { t } = useTranslation();
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [paymentData, setPaymentData] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(null);

  const fetchStudentProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [studentRes, yearRes] = await Promise.all([
        apiClient.get('/students/me/'),
        apiClient.get('/academics/academic-years/'),
      ]);
      if (studentRes.data.success) setStudentProfile(studentRes.data.data);
      const years = yearRes.data.data?.results || yearRes.data.data || [];
      setAcademicYears(years);
      const current = years.find(y => y.is_current);
      if (current) setSelectedAcademicYearId(current.id);
    } catch {
      toast.error(t('student_dashboard.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchStudentPayments = useCallback(async () => {
    if (!studentProfile) return;
    setLoadingPayments(true);
    try {
      const res = await apiClient.get('/payments/my-payments/');
      if (res.data.success) {
        const payments = res.data.data || [];
        setPaymentData(payments);
        let totalAssigned = 0, totalPaid = 0, totalRemaining = 0, completedCount = 0, overdueCount = 0, pendingCount = 0;
        payments.forEach(p => {
          totalAssigned += parseFloat(p.total_amount) || 0;
          totalPaid += parseFloat(p.paid_amount) || 0;
          totalRemaining += parseFloat(p.remaining_amount) || 0;
          if (p.status === 'completed') completedCount++;
          if (p.status === 'overdue') overdueCount++;
          if (p.status !== 'completed') pendingCount++;
        });
        setPaymentSummary({
          total_assigned: totalAssigned, total_paid: totalPaid, total_remaining: totalRemaining,
          completed_count: completedCount, pending_count: pendingCount, overdue_count: overdueCount,
          is_fully_paid: totalRemaining <= 0,
        });
      }
    } catch { /* silent */ } finally { setLoadingPayments(false); }
  }, [studentProfile]);

  const fetchStudentPerformance = useCallback(async (yearId) => {
    if (!studentProfile) return;
    setLoadingPerformance(true);
    try {
      const res = await apiClient.get(`/academics-records/performance/me/${yearId ? `?academic_year_id=${yearId}` : ''}`);
      if (res.data.success) setPerformanceData(res.data.data);
    } catch {
      toast.error(t('student_dashboard.performanceError'));
    } finally { setLoadingPerformance(false); }
  }, [studentProfile, t]);

  const fetchAcademicReport = useCallback(async (yearId) => {
    if (!studentProfile) return;
    if (!paymentSummary?.is_fully_paid) { toast.error(t('student_dashboard.paymentRequiredForReport')); return; }
    setLoadingReport(true);
    try {
      const res = await apiClient.get(`/academics-records/performance/student/my-full-report/${yearId ? `?academic_year_id=${yearId}` : ''}`);
      if (res.data.success) { setReportData(res.data.data); setShowReportModal(true); }
    } catch {
      toast.error(t('student_dashboard.reportError'));
    } finally { setLoadingReport(false); }
  }, [studentProfile, paymentSummary, t]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  };

  useEffect(() => { fetchStudentProfile(); }, [fetchStudentProfile]);
  useEffect(() => { if (studentProfile) fetchStudentPayments(); }, [studentProfile, fetchStudentPayments]);
  useEffect(() => { if (studentProfile && selectedAcademicYearId) fetchStudentPerformance(selectedAcademicYearId); }, [studentProfile, selectedAcademicYearId, fetchStudentPerformance]);

  const chartData = useMemo(() => {
    if (!performanceData) return null;
    return {
      overallAverage: performanceData.academic_performance?.overall_average || 0,
      disciplineScore: performanceData.discipline?.discipline_score || 0,
      attendanceRate: performanceData.discipline?.attendance_rate || 0,
      subjectsPassed: performanceData.academic_performance?.subjects_passed || 0,
      subjectsFailed: performanceData.academic_performance?.subjects_failed || 0,
      totalSubjects: performanceData.academic_performance?.total_subjects || 0,
      subjectResults: performanceData.academic_performance?.subject_results || [],
      grade_letter: performanceData.academic_performance?.grade_letter || 'N/A',
    };
  }, [performanceData]);

  const feeStatusMeta = useMemo(() => {
    if (!paymentSummary) return null;
    if (paymentSummary.is_fully_paid) return { label: 'All fees paid', color: 'emerald', icon: <BadgeCheck className="w-5 h-5 text-emerald-600" /> };
    if (paymentSummary.total_paid > 0) return { label: 'Fees partially paid', color: 'amber', icon: <AlertCircle className="w-5 h-5 text-amber-500" /> };
    return { label: 'Fees unpaid', color: 'rose', icon: <AlertTriangle className="w-5 h-5 text-rose-500" /> };
  }, [paymentSummary]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-400">{t('student_dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  if (!studentProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8 space-y-3">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('student_dashboard.profileNotFound')}</p>
          <p className="text-sm text-gray-400">{t('student_dashboard.profileNotFoundMessage')}</p>
        </div>
      </div>
    );
  }

  const ovPct = paymentSummary
    ? paymentSummary.total_assigned > 0
      ? (paymentSummary.total_paid / paymentSummary.total_assigned) * 100
      : 0
    : 0;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">

        {/* ── Top nav bar ── */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 dark:text-white leading-tight truncate">{studentProfile.full_name}</p>
              <p className="text-[11px] text-gray-400 leading-tight">#{studentProfile.roll_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {academicYears.length > 0 && (
              <select
                value={selectedAcademicYearId || ''}
                onChange={e => { setSelectedAcademicYearId(e.target.value); fetchStudentPerformance(e.target.value); }}
                className="text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' ★' : ''}</option>
                ))}
              </select>
            )}
            <button onClick={() => setDarkMode(d => !d)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-500" />}
            </button>
            <button onClick={handleLogout} className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 transition-colors">
              <LogOut className="w-4 h-4 text-rose-500" />
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

          {/* ── Page title ── */}
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
              {t('student_dashboard.title')}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{t('student_dashboard.welcome')}, {studentProfile.full_name}</p>
          </div>

          {/* ── Fee status banner ── */}
          {feeStatusMeta && paymentSummary && (
            <div className={`rounded-2xl border p-4 flex flex-wrap gap-4 items-center justify-between ${
              feeStatusMeta.color === 'emerald'
                ? 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800'
                : feeStatusMeta.color === 'amber'
                  ? 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-900/15 border-rose-200 dark:border-rose-800'
            }`}>
              <div className="flex items-center gap-3">
                {feeStatusMeta.icon}
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{feeStatusMeta.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {paymentSummary.total_paid.toLocaleString()} FRW paid of {paymentSummary.total_assigned.toLocaleString()} FRW total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Paid</p>
                  <p className="text-sm font-bold text-emerald-600">{paymentSummary.total_paid.toLocaleString()} FRW</p>
                </div>
                {paymentSummary.total_remaining > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Balance</p>
                    <p className="text-sm font-bold text-rose-600">{paymentSummary.total_remaining.toLocaleString()} FRW</p>
                  </div>
                )}
                <div className="w-24">
                  <p className="text-[10px] text-gray-400 mb-1 text-right">{ovPct.toFixed(0)}%</p>
                  <ProgressBar value={ovPct} colorClass={feeStatusMeta.color === 'emerald' ? 'bg-emerald-500' : feeStatusMeta.color === 'amber' ? 'bg-amber-400' : 'bg-rose-500'} />
                </div>
              </div>
            </div>
          )}

          {/* ── Info cards row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard
              icon={<GraduationCap className="w-5 h-5 text-emerald-600" />}
              label={t('student_dashboard.classLevel')}
              value={studentProfile.current_class_level?.name}
              color="bg-emerald-50 dark:bg-emerald-900/20"
            />
            <InfoCard
              icon={<School className="w-5 h-5 text-blue-600" />}
              label={t('student_dashboard.schoolLevel')}
              value={studentProfile.current_school_level?.name}
              color="bg-blue-50 dark:bg-blue-900/20"
            />
            <InfoCard
              icon={<Calendar className="w-5 h-5 text-violet-600" />}
              label={t('student_dashboard.age')}
              value={studentProfile.age ? `${studentProfile.age} yrs` : null}
              color="bg-violet-50 dark:bg-violet-900/20"
            />
            <InfoCard
              icon={<Award className="w-5 h-5 text-amber-600" />}
              label={t('student_dashboard.currentGrade')}
              value={chartData?.grade_letter}
              color="bg-amber-50 dark:bg-amber-900/20"
            />
          </div>

          {/* ── Three-column main grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT: Performance ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Performance overview */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    {t('student_dashboard.performanceOverview')}
                  </h2>
                  {loadingPerformance && <Spinner />}
                </div>
                {loadingPerformance ? (
                  <div className="py-10 text-center"><Spinner size="lg" /></div>
                ) : chartData ? (
                  <div className="space-y-4">
                    {/* Ring + bars */}
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="relative flex-shrink-0">
                        <RingChart value={chartData.overallAverage} size={128} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-black text-gray-800 dark:text-white leading-none">{chartData.overallAverage.toFixed(0)}%</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">Overall</span>
                        </div>
                      </div>
                      <div className="flex-1 w-full space-y-3">
                        {[
                          { label: t('student_dashboard.overallAverage'), val: chartData.overallAverage },
                          { label: t('student_dashboard.disciplineScore'), val: chartData.disciplineScore },
                          { label: t('student_dashboard.attendanceRate'), val: chartData.attendanceRate },
                        ].map(item => {
                          const c = getPercentageColor(item.val);
                          return (
                            <div key={item.label}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-500">{item.label}</span>
                                <span className={`text-xs font-bold ${c.text}`}>{item.val.toFixed(1)}%</span>
                              </div>
                              <ProgressBar value={item.val} colorClass={c.bar} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Subject counts */}
                    <div className="flex items-center justify-around pt-4 border-t border-gray-100 dark:border-gray-700">
                      <StatChip label="Passed" value={chartData.subjectsPassed} colorClass="text-emerald-600" />
                      <div className="w-px h-8 bg-gray-100 dark:bg-gray-700" />
                      <StatChip label="Failed" value={chartData.subjectsFailed} colorClass="text-rose-500" />
                      <div className="w-px h-8 bg-gray-100 dark:bg-gray-700" />
                      <StatChip label="Total" value={chartData.totalSubjects} colorClass="text-blue-600" />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">{t('student_dashboard.noPerformanceData')}</p>
                )}
              </div>

              {/* Subject breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  {t('student_dashboard.subjectPerformance')}
                </h2>
                {loadingPerformance ? (
                  <div className="py-8 text-center"><Spinner /></div>
                ) : chartData?.subjectResults?.length > 0 ? (
                  <div className="space-y-2">
                    {chartData.subjectResults.map(sub => <SubjectCard key={sub.subject_id} subject={sub} t={t} />)}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">{t('student_dashboard.noSubjectData')}</p>
                )}

                {/* View report button */}
                <button
                  onClick={() => fetchAcademicReport(selectedAcademicYearId)}
                  disabled={loadingReport || !paymentSummary?.is_fully_paid}
                  className={`w-full mt-5 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    paymentSummary?.is_fully_paid
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {loadingReport
                    ? <><Spinner /><span>Loading report…</span></>
                    : paymentSummary?.is_fully_paid
                      ? <><FileText className="w-4 h-4" /><span>{t('student_dashboard.viewFullReport')}</span></>
                      : <><Lock className="w-4 h-4" /><span>{t('student_dashboard.viewFullReport')} — {t('student_dashboard.feesRequired')}</span></>
                  }
                </button>
              </div>
            </div>

            {/* ── RIGHT: Fees + Quick Stats + Parents ── */}
            <div className="space-y-5">

              {/* Fee breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  {t('student_dashboard.feeStatus')}
                </h2>

                {loadingPayments ? (
                  <div className="py-8 text-center"><Spinner /></div>
                ) : paymentData.length > 0 ? (
                  <div className="space-y-3">
                    {paymentData.map(p => <FeeStatusCard key={p.id} payment={p} t={t} />)}
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-1">
                    <Receipt className="w-8 h-8 text-gray-200 mx-auto" />
                    <p className="text-sm text-gray-400">{t('student_dashboard.noPaymentData')}</p>
                    <p className="text-xs text-gray-300">{t('student_dashboard.contactAdmin')}</p>
                  </div>
                )}
              </div>

              {/* Quick stats */}
              {chartData && (
                <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-5 text-white space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-200">{t('student_dashboard.quickStats')}</h3>
                  {[
                    { label: t('student_dashboard.overallGrade'), value: chartData.grade_letter, highlight: true },
                    { label: t('student_dashboard.attendance'), value: `${chartData.attendanceRate?.toFixed(1) || 0}%`,
                      valueClass: chartData.attendanceRate >= 80 ? 'text-emerald-300' : chartData.attendanceRate >= 50 ? 'text-amber-300' : 'text-rose-300' },
                    { label: t('student_dashboard.discipline'), value: `${chartData.disciplineScore?.toFixed(1) || 0}%`,
                      valueClass: chartData.disciplineScore >= 80 ? 'text-emerald-300' : chartData.disciplineScore >= 50 ? 'text-amber-300' : 'text-rose-300' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-white/10 last:border-0">
                      <span className="text-xs text-emerald-100">{item.label}</span>
                      <span className={`text-sm font-bold ${item.valueClass || 'text-white'}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Parents */}
              {studentProfile.parents?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                    <UsersIcon className="w-4 h-4 text-emerald-600" />
                    {t('student_dashboard.parents')}
                  </h2>
                  <div className="space-y-2">
                    {studentProfile.parents.map(parent => (
                      <div key={parent.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{parent.full_name}</p>
                          <p className="text-[11px] text-gray-400">{parent.relationship_type_display}</p>
                          {parent.phone_number && <p className="text-[11px] text-gray-400">{parent.phone_number}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teachers */}
              <TeachersPanel student={studentProfile} t={t} />
            </div>
          </div>
        </main>
      </div>

      {/* Report modal */}
      {showReportModal && reportData && studentProfile && (
        <AcademicReportModal
          student={studentProfile}
          reportData={reportData}
          onClose={() => { setShowReportModal(false); setReportData(null); }}
          t={t}
        />
      )}
    </div>
  );
};

export default StudentDashboard;