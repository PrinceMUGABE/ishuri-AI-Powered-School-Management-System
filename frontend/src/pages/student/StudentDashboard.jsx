// StudentDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    User, Edit, Search, Eye, X,
    ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
    AlertCircle, GraduationCap, BookOpen, Calendar,
    Sun, Moon, Info, Mail, Phone, MapPin,
    FileText, BarChart3, Hash,
    User as UserIcon, UserCheck, Shield, Baby,
    BookOpenCheck, Filter, TrendingUp, Clock,
    Award, Activity, Star, Heart, MoveRight, Home,
    DoorOpen, Building2, Repeat, AlertTriangle, School,
    Users as UsersIcon, UserCircle, Check, Loader2,
    Wallet, CreditCard, MessageCircle, ChevronDown,
    DollarSign, Receipt, AlertOctagon, ExternalLink,
    UserSquare2, MessageSquare, LogOut, Settings,
    PieChart, Lock, Unlock
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================
// API Configuration
// ============================================================
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

// ============================================================
// Helper Functions
// ============================================================
const Spinner = () => (
    <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
);

// ============================================================
// Performance Chart Component (Color-coded based on score)
// ============================================================
const PerformanceChart = ({ percentage, label }) => {
    const getColorClasses = () => {
        if (percentage >= 80) return 'bg-green-500';
        if (percentage >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };
    return (
        <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                <span className={`text-xs font-semibold ${
                    percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>{percentage}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getColorClasses()} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

// ============================================================
// Subject Performance Card (Color-coded based on AI zone classification)
// ============================================================
const SubjectPerformanceCard = ({ subject, t }) => {
    const percentage = subject.final_percentage || 0;
    
    const getBorderColor = () => {
        if (percentage >= 80) return 'border-green-500';
        if (percentage >= 50) return 'border-yellow-500';
        return 'border-red-500';
    };
    
    const getBgColor = () => {
        if (percentage >= 80) return 'bg-green-50 dark:bg-green-900/20';
        if (percentage >= 50) return 'bg-yellow-50 dark:bg-yellow-900/20';
        return 'bg-red-50 dark:bg-red-900/20';
    };
    
    const getStatusIcon = () => {
        if (percentage >= 80) return <CheckCircle className="w-4 h-4 text-green-600" />;
        if (percentage >= 50) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
    };
    
    const getZoneLabel = () => {
        if (percentage >= 80) return t('student_dashboard.excellent');
        if (percentage >= 50) return t('student_dashboard.average');
        return t('student_dashboard.needsImprovement');
    };
    
    return (
        <div className={`p-3 rounded-xl border-l-4 ${getBorderColor()} ${getBgColor()}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 dark:text-white">{subject.subject_name}</p>
                        {getStatusIcon()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{getZoneLabel()}</p>
                    <p className="text-xs text-gray-400">{subject.grade_letter || 'N/A'}</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{percentage.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">{subject.passed ? t('student_dashboard.passed') : t('student_dashboard.failed')}</p>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// Teacher Card Component
// ============================================================
const TeacherCard = ({ teacher, onChatClick, t }) => {
    const initials = teacher.full_name
        ?.split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';

    const colorSets = [
        { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
        { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
        { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
        { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
        { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300' },
    ];
    const colorIdx = (teacher.id || 0) % colorSets.length;
    const { bg, text } = colorSets[colorIdx];

    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-700 hover:shadow-sm transition-all group">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${bg} ${text}`}>
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{teacher.full_name}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {(teacher.subjects || []).map(subject => (
                        <span
                            key={subject.id}
                            className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800"
                        >
                            {subject.name}
                        </span>
                    ))}
                </div>
            </div>
            {/* <button
                onClick={() => onChatClick(teacher)}
                title={t('student_dashboard.chatWithTeacher', { name: teacher.full_name })}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors opacity-90 group-hover:opacity-100"
            >
                <MessageCircle className="w-3.5 h-3.5" />
                {t('student_dashboard.chat')}
            </button> */}
        </div>
    );
};

// ============================================================
// Teachers Panel Component
// ============================================================
const TeachersPanel = ({ student, onChatWithTeacher, t }) => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!student?.id) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setTeachers([]);

        apiClient.get(`/students/get_my_current_teachers/`)
            .then(res => {
                if (cancelled) return;
                const data = res.data?.data;
                console.log("Retrieved student's teachers: ", data);
                setTeachers(data?.teachers || []);
            })
            .catch(err => {
                if (cancelled) return;
                console.error('Failed to fetch teachers:', err);
                setError(t('student_dashboard.teachersLoadError'));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [student?.id, t]);

    if (loading) {
        return (
            <div className="mt-3 px-1 py-4 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                    {t('student_dashboard.loadingTeachers')}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 text-sm">
                {error}
            </div>
        );
    }

    if (teachers.length === 0) {
        return (
            <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 text-center">
                <p className="text-sm text-gray-500">{t('student_dashboard.noTeachers')}</p>
            </div>
        );
    }

    return (
        <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                {t('student_dashboard.myTeachers')} ({teachers.length})
            </p>
            {teachers.map(teacher => (
                <TeacherCard
                    key={teacher.id}
                    teacher={teacher}
                    onChatClick={onChatWithTeacher}
                    t={t}
                />
            ))}
        </div>
    );
};

// ============================================================
// Fee Status Card Component
// ============================================================
const FeeStatusCard = ({ payment, t }) => {
    const totalAmount = parseFloat(payment.total_amount) || 0;
    const paidAmount = parseFloat(payment.paid_amount) || 0;
    const remainingAmount = parseFloat(payment.remaining_amount) || 0;
    const percentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    
    const getStatusColor = () => {
        if (remainingAmount <= 0) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200';
        if (paidAmount > 0) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200';
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200';
    };
    
    const getStatusIcon = () => {
        if (remainingAmount <= 0) return <CheckCircle className="w-4 h-4 text-green-600" />;
        if (paidAmount > 0) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
    };
    
    const getStatusText = () => {
        if (remainingAmount <= 0) return t('student_dashboard.fullyPaid');
        if (paidAmount > 0) return t('student_dashboard.partiallyPaid');
        return t('student_dashboard.unpaid');
    };
    
    return (
        <div className={`p-4 rounded-xl border ${getStatusColor()}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <p className="font-semibold">{payment.class_level_cost_details?.name || t('student_dashboard.schoolFees')}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-white/50 dark:bg-gray-800/50">
                    {getStatusText()}
                </span>
            </div>
            <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                    <span>{t('student_dashboard.paid')}: {paidAmount.toLocaleString()} FRW</span>
                    <span>{t('student_dashboard.total')}: {totalAmount.toLocaleString()} FRW</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all ${
                            percentage >= 100 ? 'bg-green-500' : percentage > 0 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
            </div>
            <div className="flex justify-between items-center">
                <p className="text-sm font-semibold">
                    {t('student_dashboard.remaining')}: {remainingAmount.toLocaleString()} FRW
                </p>
                {payment.due_date && remainingAmount > 0 && (
                    <p className="text-xs text-gray-500">
                        {t('student_dashboard.dueDate')}: {new Date(payment.due_date).toLocaleDateString()}
                    </p>
                )}
            </div>
        </div>
    );
};

// ============================================================
// Academic Report Modal (with print/download)
// ============================================================
const AcademicReportModal = ({ student, reportData, onClose, t }) => {
    const [selectedTerm, setSelectedTerm] = useState(null);

    const terms = useMemo(() => {
        if (!reportData?.term_performances) return [];
        return reportData.term_performances;
    }, [reportData]);

    const currentPerformance = useMemo(() => {
        if (selectedTerm) return terms.find(term => term.term_id === selectedTerm);
        return terms.find(term => term.is_current) || terms[0];
    }, [terms, selectedTerm]);

    const handlePrint = () => window.print();
    const handleDownload = () => {
        const dataStr = JSON.stringify(reportData, null, 2);
        const link = document.createElement('a');
        link.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr));
        link.setAttribute('download', `academic_report_${student.roll_number}_${new Date().toISOString().split('T')[0]}.json`);
        link.click();
        toast.success(t('student_dashboard.reportDownloaded'));
    };

    if (!reportData) return null;

    const C = {
        primary: '#15803d', primaryDark: '#166534', primaryLight: '#f0fdf4',
        primaryBorder: '#bbf7d0', accent: '#d97706', accentLight: '#fef3c7',
        accentDark: '#92400e', gradeA_bg: '#15803d', gradeA_text: '#ffffff',
        gradeB_bg: '#d97706', gradeB_text: '#ffffff', gradeC_bg: '#fef3c7',
        gradeC_text: '#92400e', gradeD_bg: '#dcfce7', gradeD_text: '#166534',
        gradeF_bg: '#f3f4f6', gradeF_text: '#6b7280', rowEven: '#ffffff',
        rowOdd: '#f0fdf4', totalRowBg: '#dcfce7', totalRowText: '#166534',
        white: '#ffffff', text: '#1a1a1a', textMuted: '#6b7280',
    };

    const getGradeBg = (grade) => {
        if (grade === 'A') return { bg: C.gradeA_bg, color: C.gradeA_text };
        if (grade === 'B') return { bg: C.gradeB_bg, color: C.gradeB_text };
        if (grade === 'C') return { bg: C.gradeC_bg, color: C.gradeC_text };
        if (grade === 'D') return { bg: C.gradeD_bg, color: C.gradeD_text };
        return { bg: C.gradeF_bg, color: C.gradeF_text };
    };

    const getScoreBg = (s) => s >= 90 ? C.gradeA_bg : s >= 80 ? C.gradeB_bg : s >= 70 ? C.gradeC_bg : s >= 60 ? C.gradeD_bg : C.gradeF_bg;
    const getScoreColor = (s) => s >= 80 ? C.white : s >= 60 ? C.accentDark : C.gradeF_text;

    const gradeScale = [
        { range: '90–100', grade: 'A' }, { range: '80–89', grade: 'B' },
        { range: '70–79', grade: 'C' }, { range: '60–69', grade: 'D' },
        { range: '30–59', grade: 'E' }, { range: '0–29', grade: 'F' },
    ];

    const subjectMap = {};
    terms.forEach((term, idx) => {
        (term.subject_results || []).forEach(sub => {
            if (!subjectMap[sub.subject_name]) subjectMap[sub.subject_name] = { scores: {} };
            subjectMap[sub.subject_name].scores[idx] = sub.final_percentage ?? null;
        });
    });

    const subjectRows = Object.entries(subjectMap).map(([name, data]) => {
        const scores = terms.map((_, i) => data.scores[i] ?? null);
        const valid = scores.filter(s => s !== null);
        const avg = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
        const grade = avg === null ? 'F' : avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : avg >= 60 ? 'D' : avg >= 30 ? 'E' : 'F';
        return { name, scores, avg, grade };
    });

    const allAvgs = subjectRows.map(r => r.avg).filter(a => a !== null);
    const totalAvg = allAvgs.length > 0 ? allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length : null;
    const totalGrade = totalAvg === null ? 'F' : totalAvg >= 90 ? 'A' : totalAvg >= 80 ? 'B' : totalAvg >= 70 ? 'C' : totalAvg >= 60 ? 'D' : totalAvg >= 30 ? 'E' : 'F';

    const S = {
        overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' },
        modal: { background: C.white, borderRadius: '12px', maxWidth: '920px', width: '100%', maxHeight: '92vh', overflowY: 'auto', fontFamily: "'Georgia', 'Times New Roman', serif", color: C.text, boxShadow: '0 25px 60px rgba(0,0,0,0.35)' },
        stickyBar: { position: 'sticky', top: 0, background: C.white, borderBottom: `3px solid ${C.primary}`, padding: '10px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px', zIndex: 10 },
        outlineBtn: { background: 'transparent', border: `1px solid ${C.primary}`, borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', color: C.primary, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontFamily: 'sans-serif', fontWeight: '500' },
        solidBtn: { background: C.primary, border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', color: C.white, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontFamily: 'sans-serif', fontWeight: '500' },
        body: { padding: '24px 28px' },
        headerRow: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', paddingBottom: '16px', borderBottom: `3px solid ${C.primary}` },
        logoBox: { width: '80px', height: '80px', borderRadius: '8px', background: C.primary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
        logoText: { color: C.white, fontSize: '9px', fontWeight: 'bold', textAlign: 'center', marginTop: '4px', lineHeight: '1.3', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' },
        reportTitle: { fontSize: '28px', fontWeight: 'bold', color: C.primary, margin: 0, fontFamily: "'Georgia', serif" },
        infoTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontFamily: 'sans-serif', fontSize: '13px' },
        infoTd: { border: `1px solid ${C.primary}`, padding: '7px 12px' },
        infoLabel: { background: C.primaryLight, color: C.primary, fontWeight: '600', width: '145px' },
        infoValue: { color: C.text },
        greenHeader: { background: C.primary, color: C.white, padding: '8px 14px', fontSize: '14px', fontWeight: 'bold', fontFamily: 'sans-serif', borderRadius: '4px 4px 0 0' },
        amberHeader: { background: C.accent, color: C.white, padding: '8px 14px', fontSize: '14px', fontWeight: 'bold', fontFamily: 'sans-serif', borderRadius: '4px 4px 0 0' },
        gradeTable: { width: '100%', borderCollapse: 'collapse', fontFamily: 'sans-serif', fontSize: '13px' },
        th: { background: C.primary, color: C.white, padding: '8px 10px', textAlign: 'center', border: `1px solid ${C.primary}`, fontWeight: '600', whiteSpace: 'nowrap' },
        thLeft: { background: C.primary, color: C.white, padding: '8px 12px', textAlign: 'left', border: `1px solid ${C.primary}`, fontWeight: '600' },
        tdSubject: { padding: '7px 12px', border: `1px solid ${C.primaryBorder}`, fontWeight: '500', color: C.text },
        tdScore: { padding: '7px 10px', border: `1px solid ${C.primaryBorder}`, textAlign: 'center', fontWeight: '500' },
        tdTotalLabel: { padding: '8px 12px', border: `1px solid ${C.primary}`, fontWeight: 'bold', background: C.totalRowBg, color: C.totalRowText, fontFamily: 'sans-serif' },
        tdTotalCell: { padding: '8px 10px', border: `1px solid ${C.primary}`, textAlign: 'center', fontWeight: 'bold', background: C.totalRowBg, color: C.totalRowText },
        scaleTable: { width: '100%', borderCollapse: 'collapse', fontFamily: 'sans-serif', fontSize: '13px' },
        scaleTh: { padding: '7px 10px', textAlign: 'left', border: `1px solid ${C.primaryBorder}`, background: C.primaryLight, color: C.primary, fontWeight: '600' },
        scaleTd: { padding: '7px 10px', border: `1px solid ${C.primaryBorder}`, textAlign: 'center' },
        disciplineGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '10px' },
        disciplineCard: { background: C.primaryLight, borderRadius: '6px', padding: '12px 10px', textAlign: 'center', border: `1px solid ${C.primaryBorder}` },
        disciplineLabel: { fontSize: '11px', color: C.primary, fontFamily: 'sans-serif', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
        disciplineValue: { fontSize: '24px', fontWeight: 'bold', color: C.primary, fontFamily: "'Georgia', serif", marginTop: '4px' },
        remarks: { marginTop: '16px', padding: '12px 16px', background: C.primaryLight, borderLeft: `4px solid ${C.primary}`, borderRadius: '0 6px 6px 0', fontSize: '13px', fontFamily: 'sans-serif', color: C.text },
        footer: { marginTop: '24px', paddingTop: '14px', borderTop: `2px solid ${C.primaryBorder}`, textAlign: 'center', fontSize: '12px', color: C.textMuted, fontFamily: 'sans-serif' },
    };

    return (
        <div style={S.overlay}>
            <div style={S.modal}>
                <div style={S.stickyBar} className="print:hidden">
                    <button onClick={handleDownload} style={S.outlineBtn}><Download className="w-4 h-4" /> {t('student_dashboard.download')}</button>
                    <button onClick={handlePrint} style={S.outlineBtn}><Printer className="w-4 h-4" /> {t('student_dashboard.print')}</button>
                    <button onClick={onClose} style={S.solidBtn}><X className="w-4 h-4" /> {t('student_dashboard.close')}</button>
                </div>
                <div style={S.body}>
                    <div style={S.headerRow}>
                        <div style={S.logoBox}>
                            <GraduationCap size={32} color={C.accent} />
                            <div style={S.logoText}>Les Hirondelles<br />de Don Bosco</div>
                        </div>
                        <div>
                            <h1 style={S.reportTitle}>{t('student_dashboard.reportTitle')}</h1>
                            <p style={{ margin: '4px 0 0', fontFamily: 'sans-serif', fontSize: '13px', color: C.textMuted }}>{t('student_dashboard.academicReport')}</p>
                        </div>
                    </div>
                    <table style={S.infoTable}>
                        <tbody>
                            <tr>
                                <td style={{ ...S.infoTd, ...S.infoLabel }}>{t('student_dashboard.studentName')}</td>
                                <td style={{ ...S.infoTd, ...S.infoValue }}>{student.full_name}</td>
                                <td style={{ ...S.infoTd, ...S.infoLabel }}>{t('student_dashboard.classLevel')}</td>
                                <td style={{ ...S.infoTd, ...S.infoValue }}>{student.current_class_level?.name || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style={{ ...S.infoTd, ...S.infoLabel }}>{t('student_dashboard.academicYear')}</td>
                                <td style={{ ...S.infoTd, ...S.infoValue }}>{reportData.academic_year_name}</td>
                                <td style={{ ...S.infoTd, ...S.infoLabel }}>{t('student_dashboard.rollNumber')}</td>
                                <td style={{ ...S.infoTd, ...S.infoValue }}>{student.roll_number}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={S.greenHeader}>{t('student_dashboard.semestralGrades')}</div>
                            <table style={S.gradeTable}>
                                <thead>
                                    <tr>
                                        <th style={{ ...S.thLeft, minWidth: '130px' }}>{t('student_dashboard.subject')}</th>
                                        {terms.map(term => <th key={term.term_id} style={S.th}>{term.term_name}</th>)}
                                        <th style={S.th}>{t('student_dashboard.overallAverage')}</th>
                                        <th style={S.th}>{t('student_dashboard.grade')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjectRows.map((row, idx) => {
                                        const rowBg = idx % 2 === 0 ? C.rowEven : C.rowOdd;
                                        return (
                                            <tr key={row.name}>
                                                <td style={{ ...S.tdSubject, background: rowBg }}>{row.name}</td>
                                                {row.scores.map((score, si) => (
                                                    <td key={si} style={{ ...S.tdScore, background: score !== null ? getScoreBg(score) : rowBg, color: score !== null ? getScoreColor(score) : C.textMuted }}>
                                                        {score !== null ? score.toFixed(1) : '—'}
                                                    </td>
                                                ))}
                                                <td style={{ ...S.tdScore, background: row.avg !== null ? getScoreBg(row.avg) : C.gradeF_bg, color: row.avg !== null ? getScoreColor(row.avg) : C.textMuted, fontWeight: 'bold' }}>
                                                    {row.avg !== null ? row.avg.toFixed(2) : '—'}
                                                </td>
                                                <td style={{ ...S.tdScore, background: getGradeBg(row.grade).bg, color: getGradeBg(row.grade).color, fontWeight: 'bold', fontSize: '14px' }}>
                                                    {row.grade}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr>
                                        <td style={S.tdTotalLabel}>{t('student_dashboard.overallAverage')}</td>
                                        {terms.map((_, i) => <td key={i} style={S.tdTotalCell} />)}
                                        <td style={{ ...S.tdTotalCell, background: totalAvg !== null ? getScoreBg(totalAvg) : C.totalRowBg, color: totalAvg !== null ? getScoreColor(totalAvg) : C.totalRowText, fontSize: '14px' }}>
                                            {totalAvg !== null ? totalAvg.toFixed(2) : '—'}
                                        </td>
                                        <td style={{ ...S.tdTotalCell, background: getGradeBg(totalGrade).bg, color: getGradeBg(totalGrade).color, fontSize: '14px' }}>
                                            {totalGrade}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div style={{ width: '155px', flexShrink: 0 }}>
                            <div style={S.amberHeader}>{t('student_dashboard.gradeScale')}</div>
                            <table style={S.scaleTable}>
                                <thead>
                                    <tr>
                                        <th style={S.scaleTh}>{t('student_dashboard.range')}</th>
                                        <th style={{ ...S.scaleTh, textAlign: 'center' }}>{t('student_dashboard.grade')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gradeScale.map(({ range, grade }) => {
                                        const { bg, color } = getGradeBg(grade);
                                        return (
                                            <tr key={grade}>
                                                <td style={{ ...S.scaleTd, textAlign: 'left', paddingLeft: '10px', background: bg, color, fontWeight: '500' }}>{range}</td>
                                                <td style={{ ...S.scaleTd, background: bg, color, fontWeight: 'bold', fontSize: '15px' }}>{grade}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {currentPerformance?.discipline && (
                        <div style={{ marginTop: '24px' }}>
                            <div style={S.greenHeader}>{t('student_dashboard.disciplineAttendance')}</div>
                            <div style={S.disciplineGrid}>
                                {[
                                    { label: t('student_dashboard.attendanceRate'), value: `${(currentPerformance.discipline.attendance_rate ?? 0).toFixed(1)}%` },
                                    { label: t('student_dashboard.present'), value: currentPerformance.discipline.present ?? 0 },
                                    { label: t('student_dashboard.absent'), value: currentPerformance.discipline.absent ?? 0 },
                                    { label: t('student_dashboard.late'), value: currentPerformance.discipline.late ?? 0 },
                                ].map(item => (
                                    <div key={item.label} style={S.disciplineCard}>
                                        <div style={S.disciplineLabel}>{item.label}</div>
                                        <div style={S.disciplineValue}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {currentPerformance?.remarks && (
                        <div style={S.remarks}>
                            <strong style={{ color: C.primary }}>{t('student_dashboard.remarks')}: </strong>
                            {currentPerformance.remarks}
                        </div>
                    )}
                    <div style={S.footer}>
                        <p style={{ margin: '0 0 4px' }}>Les Hirondelles de Don Bosco — {t('student_dashboard.qualityEducation')}</p>
                        <p style={{ margin: 0 }}>{t('student_dashboard.generatedOn')}: {new Date().toLocaleDateString()} &nbsp;|&nbsp; {t('student_dashboard.reportFooter')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// Main Student Dashboard Component
// ============================================================
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
    const [currentAcademicYear, setCurrentAcademicYear] = useState(null);
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(null);

    // Fetch student profile
    const fetchStudentProfile = useCallback(async () => {
        setLoading(true);
        try {
            const studentRes = await apiClient.get('/students/me/');
            if (studentRes.data.success) {
                setStudentProfile(studentRes.data.data);
            }
            const yearRes = await apiClient.get('/academics/academic-years/');
            const years = yearRes.data.data?.results || yearRes.data.data || [];
            setAcademicYears(years);
            const current = years.find(y => y.is_current);
            if (current) {
                setCurrentAcademicYear(current);
                setSelectedAcademicYearId(current.id);
            }
        } catch (error) {
            console.error('Error fetching student data:', error);
            toast.error(t('student_dashboard.fetchError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    // Fetch student payments
    const fetchStudentPayments = useCallback(async () => {
        if (!studentProfile) return;
        setLoadingPayments(true);
        try {
            const res = await apiClient.get(`/payments/my-payments/`);
            if (res.data.success) {
                const payments = res.data.data || [];
                setPaymentData(payments);
                
                // Calculate summary
                let totalAssigned = 0, totalPaid = 0, totalRemaining = 0;
                let completedCount = 0, pendingCount = 0, overdueCount = 0;
                
                payments.forEach(p => {
                    const totalAmount = parseFloat(p.total_amount) || 0;
                    const paidAmount = parseFloat(p.paid_amount) || 0;
                    const remainingAmount = parseFloat(p.remaining_amount) || 0;
                    
                    totalAssigned += totalAmount;
                    totalPaid += paidAmount;
                    totalRemaining += remainingAmount;
                    
                    if (p.status === 'completed') completedCount++;
                    if (p.status === 'overdue') overdueCount++;
                    if (p.status !== 'completed') pendingCount++;
                });
                
                setPaymentSummary({
                    total_assigned: totalAssigned,
                    total_paid: totalPaid,
                    total_remaining: totalRemaining,
                    completed_count: completedCount,
                    pending_count: pendingCount,
                    overdue_count: overdueCount,
                    is_fully_paid: totalRemaining <= 0
                });
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            // Don't show error toast - just log it
        } finally {
            setLoadingPayments(false);
        }
    }, [studentProfile]);

    const fetchStudentPerformance = useCallback(async (academicYearId) => {
        if (!studentProfile) return;
        setLoadingPerformance(true);
        try {
            const url = `/academics-records/performance/me/`;
            const params = new URLSearchParams();
            if (academicYearId) params.append('academic_year_id', academicYearId);
            const res = await apiClient.get(`${url}?${params.toString()}`);
            if (res.data.success) setPerformanceData(res.data.data);
        } catch (error) {
            console.error('Error fetching performance:', error);
            toast.error(t('student_dashboard.performanceError'));
        } finally {
            setLoadingPerformance(false);
        }
    }, [studentProfile, t]);

    const fetchAcademicReport = useCallback(async (academicYearId) => {
        if (!studentProfile) return;
        
        // Check if fees are fully paid before allowing report access
        if (!paymentSummary?.is_fully_paid) {
            toast.error(t('student_dashboard.paymentRequiredForReport'));
            return;
        }
        
        setLoadingReport(true);
        try {
            const url = `/academics-records/performance/student/my-full-report/`;
            const params = new URLSearchParams();
            if (academicYearId) params.append('academic_year_id', academicYearId);
            const res = await apiClient.get(`${url}?${params.toString()}`);
            if (res.data.success) {
                setReportData(res.data.data);
                setShowReportModal(true);
            }
        } catch (error) {
            console.error('Error fetching report:', error);
            toast.error(t('student_dashboard.reportError'));
        } finally {
            setLoadingReport(false);
        }
    }, [studentProfile, paymentSummary, t]);

    const handleViewReport = () => {
        fetchAcademicReport(selectedAcademicYearId);
    };

    const handleAcademicYearChange = (yearId) => {
        setSelectedAcademicYearId(yearId);
        fetchStudentPerformance(yearId);
    };

    // Navigate to chat
    const handleChatWithTeacher = useCallback(async (teacher) => {
        sessionStorage.setItem('chatTarget', JSON.stringify({
            teacherUserId: teacher.user?.id,
            teacherName: teacher.full_name,
            studentId: studentProfile?.id,
            studentName: studentProfile?.full_name,
            studentRollNumber: studentProfile?.roll_number,
        }));
        window.location.href = '/student/chats';
    }, [studentProfile]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
    };

    useEffect(() => {
        fetchStudentProfile();
    }, [fetchStudentProfile]);

    useEffect(() => {
        if (studentProfile) {
            fetchStudentPayments();
        }
    }, [studentProfile, fetchStudentPayments]);

    useEffect(() => {
        if (studentProfile && selectedAcademicYearId) {
            fetchStudentPerformance(selectedAcademicYearId);
        }
    }, [studentProfile, selectedAcademicYearId, fetchStudentPerformance]);

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
            grade_letter: performanceData.academic_performance?.grade_letter || 'N/A'
        };
    }, [performanceData]);

    // Determine overall fee status color
    const getOverallFeeStatus = () => {
        if (!paymentSummary) return 'bg-gray-100 text-gray-600';
        if (paymentSummary.is_fully_paid) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        if (paymentSummary.total_paid > 0) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    };

    const getOverallFeeStatusText = () => {
        if (!paymentSummary) return t('student_dashboard.loading');
        if (paymentSummary.is_fully_paid) return t('student_dashboard.fullyPaid');
        if (paymentSummary.total_paid > 0) return t('student_dashboard.partiallyPaid');
        return t('student_dashboard.unpaid');
    };

    const getOverallFeeStatusIcon = () => {
        if (!paymentSummary) return null;
        if (paymentSummary.is_fully_paid) return <CheckCircle className="w-5 h-5 text-green-600" />;
        if (paymentSummary.total_paid > 0) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Spinner />
                    <p className="mt-4 text-gray-500">{t('student_dashboard.loading')}</p>
                </div>
            </div>
        );
    }

    if (!studentProfile) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center p-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        {t('student_dashboard.profileNotFound')}
                    </h2>
                    <p className="text-gray-500">{t('student_dashboard.profileNotFoundMessage')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
            <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 md:p-6">

                {/* Header */}
                <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                            {t('student_dashboard.title')}
                        </h1>
                        <p className="text-gray-500 text-sm">
                            {t('student_dashboard.welcome')}, {studentProfile?.full_name}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {t('student_dashboard.rollNumber')}: {studentProfile?.roll_number}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {/* Academic Year Selector */}
                        {academicYears.length > 0 && (
                            <select
                                value={selectedAcademicYearId || ''}
                                onChange={(e) => handleAcademicYearChange(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                {academicYears.map(year => (
                                    <option key={year.id} value={year.id}>
                                        {year.name} {year.is_current ? `(${t('student_dashboard.current')})` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="p-2 bg-white dark:bg-gray-800 border rounded-xl shadow-sm"
                        >
                            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl shadow-sm hover:bg-red-100 transition-colors"
                        >
                            <LogOut className="w-4 h-4 text-red-600" />
                        </button>
                    </div>
                </div>

                {/* Overall Fee Status Banner */}
                {paymentSummary && (
                    <div className={`mb-6 p-4 rounded-xl border ${getOverallFeeStatus()} flex justify-between items-center flex-wrap gap-3`}>
                        <div className="flex items-center gap-3">
                            {getOverallFeeStatusIcon()}
                            <div>
                                <p className="font-semibold">{t('student_dashboard.feeStatus')}: {getOverallFeeStatusText()}</p>
                                <p className="text-sm">
                                    {t('student_dashboard.paidAmount')}: {(paymentSummary.total_paid || 0).toLocaleString()} FRW / 
                                    {t('student_dashboard.totalAmount')}: {(paymentSummary.total_assigned || 0).toLocaleString()} FRW
                                </p>
                            </div>
                        </div>
                        {!paymentSummary.is_fully_paid && (
                            <div className="text-sm">
                                <p className="font-semibold text-red-600 dark:text-red-400">
                                    {t('student_dashboard.remainingBalance')}: {(paymentSummary.total_remaining || 0).toLocaleString()} FRW
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Student Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('student_dashboard.classLevel')}</p>
                                <p className="font-semibold">{studentProfile?.current_class_level?.name || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <School className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('student_dashboard.schoolLevel')}</p>
                                <p className="font-semibold">{studentProfile?.current_school_level?.name || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('student_dashboard.age')}</p>
                                <p className="font-semibold">{studentProfile?.age || 'N/A'} {t('student_dashboard.yearsOld')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <Award className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('student_dashboard.currentGrade')}</p>
                                <p className="font-semibold">{chartData?.grade_letter || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Teachers Panel */}
                <div className="mb-6">
                    <TeachersPanel
                        student={studentProfile}
                        onChatWithTeacher={handleChatWithTeacher}
                        t={t}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column - Performance */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                                {t('student_dashboard.performanceOverview')}
                            </h2>
                            {loadingPerformance ? (
                                <div className="py-8 text-center">
                                    <Spinner />
                                    <p className="mt-2 text-gray-500">{t('student_dashboard.loadingPerformance')}</p>
                                </div>
                            ) : chartData ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <PerformanceChart percentage={chartData.overallAverage} label={t('student_dashboard.overallAverage')} />
                                            <PerformanceChart percentage={chartData.disciplineScore} label={t('student_dashboard.disciplineScore')} />
                                            <PerformanceChart percentage={chartData.attendanceRate} label={t('student_dashboard.attendanceRate')} />
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="relative w-32 h-32 mx-auto">
                                                    <svg className="w-32 h-32 transform -rotate-90">
                                                        <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                                                        <circle cx="64" cy="64" r="56" stroke={chartData.overallAverage >= 80 ? '#22c55e' : chartData.overallAverage >= 50 ? '#eab308' : '#ef4444'} strokeWidth="12" fill="none"
                                                            strokeDasharray={`${2 * Math.PI * 56}`}
                                                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - chartData.overallAverage / 100)}`}
                                                            className="transition-all duration-500" />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-2xl font-bold text-gray-800 dark:text-white">{chartData.overallAverage.toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-2">{t('student_dashboard.overallPerformance')}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-green-600">{chartData.subjectsPassed}</p>
                                            <p className="text-xs text-gray-500">{t('student_dashboard.subjectsPassed')}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-red-600">{chartData.subjectsFailed}</p>
                                            <p className="text-xs text-gray-500">{t('student_dashboard.subjectsFailed')}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-blue-600">{chartData.totalSubjects}</p>
                                            <p className="text-xs text-gray-500">{t('student_dashboard.totalSubjects')}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">{t('student_dashboard.noPerformanceData')}</div>
                            )}
                        </div>

                        {/* Subject Performance - Color-coded */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-green-600" />
                                {t('student_dashboard.subjectPerformance')}
                            </h2>
                            {loadingPerformance ? (
                                <div className="py-8 text-center"><Spinner /></div>
                            ) : chartData?.subjectResults?.length > 0 ? (
                                <div className="space-y-2">
                                    {chartData.subjectResults.map(subject => (
                                        <SubjectPerformanceCard key={subject.subject_id} subject={subject} t={t} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">{t('student_dashboard.noSubjectData')}</div>
                            )}
                            
                            {/* View Report Button - Only enabled if fees are fully paid */}
                            <button
                                onClick={handleViewReport}
                                disabled={loadingReport || !paymentSummary?.is_fully_paid}
                                className={`w-full mt-6 py-3 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2 ${
                                    paymentSummary?.is_fully_paid 
                                        ? 'bg-green-600 hover:bg-green-700' 
                                        : 'bg-gray-400 cursor-not-allowed'
                                }`}
                            >
                                {loadingReport ? <Spinner /> : paymentSummary?.is_fully_paid ? <FileText className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                {t('student_dashboard.viewFullReport')}
                                {!paymentSummary?.is_fully_paid && (
                                    <span className="text-xs ml-2">({t('student_dashboard.feesRequired')})</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Column - Fee Status & Quick Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Fee Status Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-green-600" />
                                {t('student_dashboard.feeStatus')}
                            </h2>
                            {loadingPayments ? (
                                <div className="py-8 text-center"><Spinner /></div>
                            ) : paymentData.length > 0 ? (
                                <div className="space-y-3">
                                    {paymentData.map(payment => (
                                        <FeeStatusCard key={payment.id} payment={payment} t={t} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>{t('student_dashboard.noPaymentData')}</p>
                                    <p className="text-xs mt-2">{t('student_dashboard.contactAdmin')}</p>
                                </div>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-2xl p-6 text-white">
                            <h3 className="font-semibold mb-3">{t('student_dashboard.quickStats')}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>{t('student_dashboard.overallGrade')}:</span>
                                    <span className="font-bold">{chartData?.grade_letter || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t('student_dashboard.attendance')}:</span>
                                    <span className={`font-bold ${
                                        (chartData?.attendanceRate || 0) >= 80 ? 'text-green-300' : 
                                        (chartData?.attendanceRate || 0) >= 50 ? 'text-yellow-300' : 'text-red-300'
                                    }`}>
                                        {chartData?.attendanceRate?.toFixed(1) || 0}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t('student_dashboard.discipline')}:</span>
                                    <span className={`font-bold ${
                                        (chartData?.disciplineScore || 0) >= 80 ? 'text-green-300' : 
                                        (chartData?.disciplineScore || 0) >= 50 ? 'text-yellow-300' : 'text-red-300'
                                    }`}>
                                        {chartData?.disciplineScore?.toFixed(1) || 0}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Parents/Guardians */}
                        {studentProfile?.parents && studentProfile.parents.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <UsersIcon className="w-5 h-5 text-green-600" />
                                    {t('student_dashboard.parents')}
                                </h2>
                                <div className="space-y-3">
                                    {studentProfile.parents.map(parent => (
                                        <div key={parent.id} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                                            <p className="font-medium text-gray-800 dark:text-white">{parent.full_name}</p>
                                            <p className="text-xs text-gray-500">{parent.relationship_type_display}</p>
                                            {parent.phone_number && (
                                                <p className="text-xs text-gray-400 mt-1">{parent.phone_number}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modals */}
                {showReportModal && reportData && studentProfile && (
                    <AcademicReportModal
                        student={studentProfile}
                        reportData={reportData}
                        onClose={() => { setShowReportModal(false); setReportData(null); }}
                        t={t}
                    />
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;