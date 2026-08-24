// StudentLayout.jsx — Full i18n (all keys under student_layout.*) + Dark Mode
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  LayoutDashboard, GraduationCap, CalendarCheck,
  Users, MessageCircle, User, LogOut, Menu, X,
  BarChart3, FileText, Bell, Sun, Sunset, Moon,
  ChevronDown, Dot, Clock, AlertCircle,
  CheckCircle, BellOff, Loader2, ChevronRight,
  BookOpen, Calendar, Key, UserCircle, Shield, Save,
  Eye, EyeOff, Mail, Phone,
  CalendarDays, CreditCard, Check, FilePlus,
} from 'lucide-react';
import ThemeToggle from '../../common/ThemeToggle';
import LanguageSwitcher from '../../common/LanguageSwitcher';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Constants & API clients
// ---------------------------------------------------------------------------
const API_BASE   = 'http://127.0.0.1:8000/api';
const NOTIF_BASE = 'http://127.0.0.1:8000/api/notifications';

const mkClient = (base) => {
  const c = axios.create({ baseURL: base, timeout: 30000 });
  c.interceptors.request.use((cfg) => {
    const token = localStorage.getItem('access_token');
    const lang  = localStorage.getItem('user_language') || 'en';
    if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
    cfg.headers['X-Language'] = lang;
    return cfg;
  });
  return c;
};

const apiClient   = mkClient(API_BASE);
const notifClient = mkClient(NOTIF_BASE);

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------
const formatTimeAgo = (ds, t) => {
  if (!ds) return t('student_layout.common.na', 'N/A');
  const d  = new Date(ds);
  const ms = Date.now() - d;
  const m  = Math.floor(ms / 60000);
  const h  = Math.floor(ms / 3600000);
  const dy = Math.floor(ms / 86400000);
  if (m  < 1)  return t('student_layout.time.just_now',    'Just now');
  if (m  < 60) return t('student_layout.time.minutes_ago', '{{count}}m ago', { count: m });
  if (h  < 24) return t('student_layout.time.hours_ago',   '{{count}}h ago', { count: h });
  return t('student_layout.time.days_ago', '{{count}}d ago', { count: dy });
};

const priorityClass = (p) => {
  switch (p?.toLowerCase()) {
    case 'high':   return 'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-400';
    case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700  dark:text-yellow-400';
    case 'low':    return 'bg-green-100  dark:bg-green-900/30  text-green-700   dark:text-green-400';
    default:       return 'bg-gray-100   dark:bg-gray-700       text-gray-600    dark:text-gray-300';
  }
};

const notifIcon = (type) => {
  const m = {
    user_created:           <UserCircle    size={14} />,
    user_updated:           <User          size={14} />,
    grade_uploaded:         <BookOpen      size={14} />,
    grade_approved:         <CheckCircle   size={14} />,
    assignment_created:     <BookOpen      size={14} />,
    assignment_submitted:   <FileText      size={14} />,
    attendance_marked:      <Calendar      size={14} />,
    low_attendance_warning: <AlertCircle   size={14} />,
    message_received:       <MessageCircle size={14} />,
    deadline_reminder:      <Clock         size={14} />,
  };
  return m[type] || <Bell size={14} />;
};

// Password strength helpers
const pwChecks = (pw) => ({
  length:    pw.length >= 6,
  uppercase: /[A-Z]/.test(pw),
  lowercase: /[a-z]/.test(pw),
  number:    /[0-9]/.test(pw),
  special:   /[!@#$%^&*(),.?":{}|<>]/.test(pw),
});

const pwStrengthPct   = (checks) =>
  (Object.values(checks).filter(Boolean).length / 5) * 100;

const pwStrengthColor = (pct) => {
  if (pct === 100) return 'bg-green-500';
  if (pct >= 60)   return 'bg-yellow-500';
  return 'bg-red-500';
};

// Live clock
const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

// Greeting icon
const GreetingIcon = ({ hour, className }) => {
  if (hour < 12) return <Sun    className={className} />;
  if (hour < 18) return <Sunset className={className} />;
  return <Moon className={className} />;
};

// ---------------------------------------------------------------------------
// PROFILE MODAL
// ---------------------------------------------------------------------------
function ProfileModal({ isOpen, onClose, studentProfile, onUpdate }) {
  const { t } = useTranslation();

  const [tab, setTab]           = useState('profile');
  const [saving, setSaving]     = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: '', email: '', phone_number: '', birth_date: '',
  });
  const [pwForm, setPwForm] = useState({
    current_password: '', new_password: '', confirm_password: '',
  });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [checks, setChecks]         = useState(pwChecks(''));
  const [formErrors, setFormErrors] = useState({});
  const [pwErrors,   setPwErrors]   = useState({});

  const modalRef = useRef(null);

  useEffect(() => {
    if (studentProfile) {
      setForm({
        full_name:    studentProfile.full_name    || '',
        email:        studentProfile.email        || '',
        phone_number: studentProfile.phone_number || '',
        birth_date:   studentProfile.birth_date   || '',
      });
    }
  }, [studentProfile]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey  = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('keydown',   onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown',   onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [isOpen, onClose]);

  // ── Validate profile ────────────────────────────────────────────────────
  const validateForm = () => {
    const e = {};
    if (!form.full_name.trim())
      e.full_name = t('student_layout.profile.errors.full_name_required');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = t('student_layout.profile.errors.invalid_email');
    if (form.phone_number && !/^(\+?[0-9]{10,15})$/.test(form.phone_number))
      e.phone_number = t('student_layout.profile.errors.invalid_phone');
    setFormErrors(e);
    return !Object.keys(e).length;
  };

  // ── Validate password ───────────────────────────────────────────────────
  const validatePw = () => {
    const e = {};
    if (!pwForm.current_password)
      e.current_password = t('student_layout.password.errors.current_required');
    const c = pwChecks(pwForm.new_password);
    if (!pwForm.new_password)    e.new_password = t('student_layout.password.errors.new_required');
    else if (!c.length)          e.new_password = t('student_layout.password.errors.min_length');
    else if (!c.uppercase)       e.new_password = t('student_layout.password.errors.uppercase');
    else if (!c.lowercase)       e.new_password = t('student_layout.password.errors.lowercase');
    else if (!c.number)          e.new_password = t('student_layout.password.errors.number');
    else if (!c.special)         e.new_password = t('student_layout.password.errors.special');
    if (!pwForm.confirm_password)
      e.confirm_password = t('student_layout.password.errors.confirm_required');
    else if (pwForm.new_password !== pwForm.confirm_password)
      e.confirm_password = t('student_layout.password.errors.mismatch');
    setPwErrors(e);
    return !Object.keys(e).length;
  };

  // ── Save profile ────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!validateForm()) return;
    if (!studentProfile?.id) {
      toast.error(t('student_layout.profile.not_loaded'));
      return;
    }
    setSaving(true);
    try {
      const payload = {};
      if (form.full_name    !== (studentProfile.full_name    || '')) payload.full_name    = form.full_name;
      if (form.phone_number !== (studentProfile.phone_number || '')) payload.phone_number = form.phone_number || null;
      if (form.birth_date   !== (studentProfile.birth_date   || '')) payload.birth_date   = form.birth_date   || null;
      if (form.email        !== (studentProfile.email        || '')) payload.email        = form.email        || null;

      const res = await apiClient.patch(`/students/${studentProfile.id}/update/`, payload);
      if (res.data?.success) {
        toast.success(res.data.message || t('student_layout.profile.update_success'));
        onUpdate(res.data.data);
        onClose();
      } else {
        const firstErr = res.data?.errors
          ? Object.values(res.data.errors).flat()[0]
          : res.data?.message;
        toast.error(firstErr || t('student_layout.profile.update_failed'));
      }
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat()[0]
        : err.response?.data?.message || t('student_layout.profile.update_failed');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ─────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!validatePw()) return;
    setPwSaving(true);
    try {
      const res = await apiClient.post('/account/change-password/', {
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
        confirm_password: pwForm.confirm_password,
      });
      if (res.data?.success) {
        toast.success(res.data.message || t('student_layout.password.change_success'));
        setPwForm({ current_password: '', new_password: '', confirm_password: '' });
        setChecks(pwChecks(''));
        setTab('profile');
      } else {
        toast.error(res.data?.message || t('student_layout.password.change_failed'));
      }
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat()[0]
        : err.response?.data?.message || t('student_layout.password.change_failed');
      toast.error(msg);
    } finally {
      setPwSaving(false);
    }
  };

  if (!isOpen) return null;

  const pct = pwStrengthPct(checks);
  const allPwChecksPass =
    checks.length && checks.uppercase && checks.lowercase &&
    checks.number  && checks.special  &&
    pwForm.new_password === pwForm.confirm_password &&
    pwForm.current_password;

  const inp = (hasErr) =>
    `w-full px-3 py-2 border rounded-xl text-sm
     bg-white dark:bg-gray-700/80 text-gray-900 dark:text-white
     placeholder:text-gray-400 dark:placeholder:text-gray-500
     focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
     transition-colors
     ${hasErr ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl
                   flex flex-col max-h-[92vh] animate-slideUp"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('student_layout.profile.title')}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('student_layout.profile.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 flex-shrink-0">
          {[
            { id: 'profile',  icon: UserCircle, label: t('student_layout.profile.tabs.profile')  },
            { id: 'password', icon: Key,        label: t('student_layout.profile.tabs.password') },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${tab === id
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ====== PROFILE TAB ====== */}
          {tab === 'profile' && (
            <>
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Shield size={11} /> {t('student_layout.profile.account_details')}
                </p>
                {[
                  { label: t('student_layout.profile.fields.roll_number'), value: studentProfile?.roll_number     },
                  { label: t('student_layout.profile.fields.role'),        value: t('student_layout.common.student') },
                  { label: t('student_layout.profile.fields.status'),      value: studentProfile?.status          },
                  { label: t('student_layout.profile.fields.enrolled'),    value: studentProfile?.enrollment_date },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-0.5">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 capitalize">
                      {value || '—'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {/* Full name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {t('student_layout.profile.fields.full_name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className={inp(formErrors.full_name)}
                    placeholder={t('student_layout.profile.placeholders.full_name')}
                  />
                  {formErrors.full_name && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={10} /> {formErrors.full_name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {t('student_layout.profile.fields.email')}
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={`${inp(formErrors.email)} pl-9`}
                      placeholder={t('student_layout.profile.placeholders.email')}
                    />
                  </div>
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={10} /> {formErrors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {t('student_layout.profile.fields.phone')}
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      className={`${inp(formErrors.phone_number)} pl-9`}
                      placeholder={t('student_layout.profile.placeholders.phone')}
                    />
                  </div>
                  {formErrors.phone_number && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={10} /> {formErrors.phone_number}
                    </p>
                  )}
                </div>

                {/* Birth date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {t('student_layout.profile.fields.birth_date')}
                  </label>
                  <div className="relative">
                    <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                      className={`${inp(false)} pl-9`}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ====== PASSWORD TAB ====== */}
          {tab === 'password' && (
            <>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-3">
                <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                  {t('student_layout.password.notice')}{' '}
                  <strong>{t('student_layout.password.current_label')}</strong>{' '}
                  {t('student_layout.password.notice_suffix')}
                </p>
              </div>

              {/* Current password */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  {t('student_layout.password.fields.current')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw.current ? 'text' : 'password'}
                    value={pwForm.current_password}
                    onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                    className={`${inp(pwErrors.current_password)} pr-10`}
                    placeholder={t('student_layout.password.placeholders.current')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw({ ...showPw, current: !showPw.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw.current ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwErrors.current_password && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {pwErrors.current_password}
                  </p>
                )}
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  {t('student_layout.password.fields.new')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw.new ? 'text' : 'password'}
                    value={pwForm.new_password}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPwForm({ ...pwForm, new_password: v });
                      setChecks(pwChecks(v));
                    }}
                    className={`${inp(pwErrors.new_password)} pr-10`}
                    placeholder={t('student_layout.password.placeholders.new')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw({ ...showPw, new: !showPw.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw.new ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwErrors.new_password && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {pwErrors.new_password}
                  </p>
                )}

                {/* Strength bar */}
                {pwForm.new_password && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{t('student_layout.password.strength.label')}</span>
                      <span className="font-semibold text-gray-600 dark:text-gray-300">
                        {pct === 100
                          ? t('student_layout.password.strength.strong')
                          : pct >= 60
                            ? t('student_layout.password.strength.medium')
                            : t('student_layout.password.strength.weak')}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${pwStrengthColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                      {[
                        { key: 'length',    label: t('student_layout.password.requirements.length')    },
                        { key: 'uppercase', label: t('student_layout.password.requirements.uppercase') },
                        { key: 'lowercase', label: t('student_layout.password.requirements.lowercase') },
                        { key: 'number',    label: t('student_layout.password.requirements.number')    },
                        { key: 'special',   label: t('student_layout.password.requirements.special')   },
                      ].map(({ key, label }) => (
                        <span
                          key={key}
                          className={`flex items-center gap-1 text-xs transition-colors
                            ${checks[key]
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-400 dark:text-gray-500'}`}
                        >
                          {checks[key]
                            ? <Check size={10} className="flex-shrink-0" />
                            : <div className="w-2.5 h-2.5 rounded-full border border-current flex-shrink-0" />
                          }
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  {t('student_layout.password.fields.confirm')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw.confirm ? 'text' : 'password'}
                    value={pwForm.confirm_password}
                    onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                    className={`${inp(
                      pwErrors.confirm_password ||
                      (pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password)
                    )} pr-10`}
                    placeholder={t('student_layout.password.placeholders.confirm')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw({ ...showPw, confirm: !showPw.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {t('student_layout.password.errors.mismatch')}
                  </p>
                )}
                {pwForm.confirm_password && pwForm.new_password === pwForm.confirm_password && pwForm.new_password && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <Check size={10} /> {t('student_layout.password.match')}
                  </p>
                )}
                {pwErrors.confirm_password && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {pwErrors.confirm_password}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                       bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                       hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('student_layout.common.cancel')}
          </button>
          <button
            onClick={tab === 'profile' ? handleSaveProfile : handleChangePassword}
            disabled={
              (tab === 'profile'  && saving)    ||
              (tab === 'password' && (pwSaving || !allPwChecksPass))
            }
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                       bg-emerald-600 hover:bg-emerald-700 text-white
                       flex items-center justify-center gap-2
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       shadow-sm shadow-emerald-500/30"
          >
            {(saving || pwSaving)
              ? <Loader2 size={15} className="animate-spin" />
              : <Save size={15} />
            }
            {tab === 'profile'
              ? t('student_layout.profile.save_changes')
              : t('student_layout.password.update_button')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .animate-slideUp { animation: slideUp 0.25s ease-out; }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NOTIFICATIONS DROPDOWN
// ---------------------------------------------------------------------------
function NotificationsDropdown({ isOpen, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]         = useState([]);
  const [loading,       setLoading]        = useState(false);
  const [markingAll,    setMarkingAll]     = useState(false);
  const [error,         setError]          = useState(null);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notifClient.get('/', { params: { page: 1, page_size: 50 } });
      let list = [];
      if      (res.data?.results)             list = res.data.results;
      else if (Array.isArray(res.data?.data)) list = res.data.data;
      else if (Array.isArray(res.data))       list = res.data;
      setNotifications(list);
      setUnread(list.filter((n) => n.status === 'unread' || n.is_read === false));
    } catch (err) {
      setError(err.response?.data?.message || t('student_layout.notifications.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const markRead = async (id) => {
    try {
      await notifClient.patch(`/${id}/`);
      const updated = notifications.map((n) =>
        n.id === id ? { ...n, status: 'read', is_read: true } : n
      );
      setNotifications(updated);
      setUnread(updated.filter((n) => n.status === 'unread' || n.is_read === false));
    } catch {
      toast.error(t('student_layout.notifications.mark_read_failed'));
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await notifClient.post('/mark-read/', { mark_all: true });
      const updated = notifications.map((n) => ({ ...n, status: 'read', is_read: true }));
      setNotifications(updated);
      setUnread([]);
      toast.success(t('student_layout.notifications.all_marked_read'));
    } catch {
      toast.error(t('student_layout.notifications.mark_all_failed'));
    } finally {
      setMarkingAll(false);
    }
  };

  useEffect(() => { if (isOpen) fetchNotifs(); }, [isOpen, fetchNotifs]);

  return (
    <div className={`absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl
                     shadow-xl border border-gray-200 dark:border-gray-700 z-50
                     transition-all duration-200
                     ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
          <Bell size={16} />
          {t('student_layout.notifications.title')}
          {unread.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
              {unread.length}
            </span>
          )}
        </h3>
        {unread.length > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            {markingAll ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
            {t('student_layout.notifications.mark_all_read')}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-emerald-600" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle size={28} className="mx-auto mb-2 text-red-400" />
            <p className="text-xs text-red-500">{error}</p>
            <button onClick={fetchNotifs} className="mt-2 text-xs text-emerald-600 hover:underline">
              {t('student_layout.common.retry')}
            </button>
          </div>
        ) : unread.length === 0 ? (
          <div className="text-center py-12">
            <BellOff size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400">
              {t('student_layout.notifications.no_unread')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {unread.slice(0, 10).map((n) => (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer
                           bg-blue-50/40 dark:bg-blue-900/10 transition-colors"
              >
                <div className="flex gap-3">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${priorityClass(n.priority)}`}>
                    {notifIcon(n.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white leading-snug">
                        {n.title}
                      </p>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={9} /> {formatTimeAgo(n.created_at, t)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => { onClose(); navigate('/app/student/notifications'); }}
          className="w-full text-xs text-emerald-600 dark:text-emerald-400 hover:underline
                     flex items-center justify-center gap-1 py-1"
        >
          {t('student_layout.notifications.view_all')} <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HEADER
// ---------------------------------------------------------------------------
function StudentHeader({ studentProfile, onMenuClick, sidebarOpen, isMobile, onOpenProfile }) {
  const { t, i18n } = useTranslation();
  const navigate    = useNavigate();
  const now         = useClock();

  const dropdownRef = useRef(null);
  const notifRef    = useRef(null);

  const [dropdownOpen,        setDropdownOpen]        = useState(false);
  const [showNotifications,   setShowNotifications]   = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notifClient.get('/unread-count/');
      if (res.data?.success) setUnreadNotifications(res.data.data.unread_count ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(id);
  }, [fetchUnreadCount]);

  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current    && !notifRef.current.contains(e.target))    setShowNotifications(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const hour     = now.getHours();
  const greeting = hour < 12
    ? t('student_layout.greeting.morning')
    : hour < 18
      ? t('student_layout.greeting.afternoon')
      : t('student_layout.greeting.evening');

  const firstName = studentProfile?.full_name?.split(' ')[0] || t('student_layout.common.student');

  const dateStr = now.toLocaleDateString(
    i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'rw' ? 'rw-RW' : 'en-US',
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  );
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const initials = studentProfile?.full_name?.charAt(0)?.toUpperCase() || 'S';

  return (
    <header className={`
      fixed top-0 right-0 z-30 h-16
      bg-white/90 dark:bg-gray-900/90 backdrop-blur-md
      border-b border-gray-200/80 dark:border-gray-700/80
      transition-all duration-300
      ${sidebarOpen && !isMobile ? 'left-64' : 'left-0'}
    `}>
      <div className="flex items-center justify-between h-full px-4 gap-4">

        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <GreetingIcon hour={hour} className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {greeting}, <span className="text-emerald-600 dark:text-emerald-400">{firstName}</span>
            </span>
          </div>
        </div>

        {/* Centre */}
        <div className="hidden md:flex flex-col items-center leading-tight select-none">
          <span className="text-xs text-gray-400 font-medium">{dateStr}</span>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums tracking-wide">{timeStr}</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <LanguageSwitcher />
          <ThemeToggle />

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setShowNotifications((v) => !v); setDropdownOpen(false); }}
              className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={t('student_layout.notifications.title')}
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white
                                 text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
            <NotificationsDropdown
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          </div>

          {/* Avatar dropdown */}
          <div ref={dropdownRef} className="relative ml-1">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl
                         hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40
                              flex items-center justify-center ring-2 ring-emerald-500/30">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{initials}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200
                                       ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl
                              shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {studentProfile?.full_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{studentProfile?.email}</p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full
                                   bg-emerald-100 dark:bg-emerald-900/30
                                   text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wide">
                    {t('student_layout.common.student')}
                  </span>
                </div>

                <button
                  onClick={() => { setDropdownOpen(false); onOpenProfile(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                             text-gray-700 dark:text-gray-300
                             hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  {t('student_layout.nav.my_profile')}
                </button>

                <hr className="my-1 border-gray-100 dark:border-gray-700" />

                <button
                  onClick={() => { setDropdownOpen(false); document.dispatchEvent(new Event('student:logout')); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                             text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('student_layout.nav.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// NAV ITEM
// ---------------------------------------------------------------------------
const NavItem = ({ item, active, onClick }) => (
  <li>
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group
        ${active
          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
        }`}
    >
      <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform
                              ${active ? '' : 'group-hover:scale-110'}`} />
      <span className="truncate">{item.label}</span>
      {active && <Dot className="ml-auto w-4 h-4 opacity-70" />}
    </button>
  </li>
);

// ---------------------------------------------------------------------------
// STUDENT LAYOUT (main)
// ---------------------------------------------------------------------------
const StudentLayout = () => {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen,      setSidebarOpen]      = useState(true);
  const [isMobile,         setIsMobile]         = useState(false);
  const [studentProfile,   setStudentProfile]   = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isAuthenticated = () => {
    const token   = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return false;
    try {
      const expiry = localStorage.getItem('token_expiry');
      if (expiry && Date.now() > parseInt(expiry)) { localStorage.clear(); return false; }
      return true;
    } catch { return false; }
  };

  const fetchStudentProfile = useCallback(async () => {
    try {
      const res = await apiClient.get('/students/me/');
      if (res.data?.success) {
        setStudentProfile(res.data.data);
      } else {
        toast.error(res.data?.message || t('student_layout.profile.load_failed'));
      }
    } catch (err) {
      console.error('fetchStudentProfile error:', err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/', { replace: true });
      } else {
        toast.error(t('student_layout.profile.load_failed'));
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, t]);

  const handleLogout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      const access  = localStorage.getItem('access_token');
      if (refresh && access) await apiClient.post('/account/logout/', { refresh });
    } catch { /* silent */ }
    localStorage.clear();
    sessionStorage.clear();
    toast.success(t('student_layout.auth.logout_success'));
    navigate('/', { replace: true });
  }, [navigate, t]);

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/', { replace: true }); return; }
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.role !== 'student') { navigate('/app/dashboard', { replace: true }); return; }
    } catch { /* ignore */ }
    fetchStudentProfile();
  }, [navigate, fetchStudentProfile]);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.addEventListener('student:logout', handleLogout);
    return () => document.removeEventListener('student:logout', handleLogout);
  }, [handleLogout]);

  const menuItems = [
    { path: '/app/student/dashboard',  icon: LayoutDashboard, label: t('student_layout.nav.dashboard')  },
    { path: '/app/student/assignments',     icon: FilePlus,       label: t('student_layout.nav.assignments')},
    { path: '/app/student/digital-id', icon: CalendarCheck,   label: t('student_layout.nav.digital_id') },
    // { path: '/app/student/teachers',   icon: Users,           label: t('student_layout.nav.teachers')   },
    // { path: '/app/student/chats',      icon: MessageCircle,   label: t('student_layout.nav.chats')      },
    // { path: '/app/student/payments',   icon: CreditCard,      label: t('student_layout.nav.payments')   },
    // { path: '/app/student/reports',    icon: FileText,        label: t('student_layout.nav.reports')    },
  ];

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('student_layout.common.loading_dashboard')}
          </p>
        </div>
      </div>
    );
  }

  const initials = studentProfile?.full_name?.charAt(0)?.toUpperCase() || 'S';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* SIDEBAR */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen w-64
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-700/80
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">

          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-16
                          border-b border-gray-200 dark:border-gray-700/80 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center
                              shadow-md shadow-emerald-500/30">
                <GraduationCap className="w-[18px] h-[18px] text-white" />
              </div>
              <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                {t('student_layout.app.name')}
              </span>
            </div>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={t('student_layout.common.close')}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Student card */}
          {studentProfile && (
            <div className="mx-3 mt-4 p-3 rounded-2xl
                            bg-gradient-to-br from-emerald-50 to-teal-50
                            dark:from-emerald-900/20 dark:to-teal-900/20
                            border border-emerald-100 dark:border-emerald-800/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/40
                                flex items-center justify-center flex-shrink-0
                                ring-2 ring-emerald-500/20">
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                    {studentProfile.full_name}
                  </p>
                  <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                    {studentProfile.roll_number}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                                   bg-emerald-100 dark:bg-emerald-900/40
                                   text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                    {studentProfile.current_class_level?.name || t('student_layout.common.student')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              {t('student_layout.nav.section_label')}
            </p>
            <ul className="space-y-0.5">
              {menuItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  active={isActive(item.path)}
                  onClick={() => { navigate(item.path); if (isMobile) setSidebarOpen(false); }}
                />
              ))}
            </ul>

            {/* Profile shortcut */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60">
              <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {t('student_layout.nav.account_label')}
              </p>
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                           text-gray-600 dark:text-gray-400
                           hover:bg-gray-100 dark:hover:bg-gray-700/60
                           hover:text-gray-900 dark:hover:text-white transition-all group"
              >
                <UserCircle className="w-[18px] h-[18px] flex-shrink-0 group-hover:scale-110 transition-transform" />
                {t('student_layout.nav.my_profile')}
              </button>
            </div>
          </nav>

          {/* Logout */}
          <div className="px-3 pb-4 flex-shrink-0 border-t border-gray-100 dark:border-gray-700/80 pt-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                         text-red-500 dark:text-red-400
                         hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
            >
              <LogOut className="w-[18px] h-[18px] group-hover:-translate-x-0.5 transition-transform" />
              {t('student_layout.nav.logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* HEADER */}
      <StudentHeader
        studentProfile={studentProfile}
        onMenuClick={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
        isMobile={isMobile}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {/* MAIN CONTENT */}
      <main className={`
        transition-all duration-300 pt-16 min-h-screen
        ${sidebarOpen && !isMobile ? 'lg:ml-64' : ''}
      `}>
        <div className="p-4 md:p-6">
          <Outlet context={{ studentProfile, refreshProfile: fetchStudentProfile }} />
        </div>
      </main>

      {/* PROFILE MODAL */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        studentProfile={studentProfile}
        onUpdate={(updated) => setStudentProfile(updated)}
      />
    </div>
  );
};

export default StudentLayout;