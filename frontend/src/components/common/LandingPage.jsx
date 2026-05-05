import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  GraduationCap,
  Brain,
  MessageSquare,
  BarChart3,
  Users,
  Shield,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Star,
  FileText,
  CreditCard,
  Heart,
  X,
  User,
  Lock,
  LogIn,
  ArrowLeft,
  Mail,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/Common/ThemeToggle';
import LanguageSwitcher from '../../components/Common/LanguageSwitcher';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import schoolLogo from '../../../public/imgs/school-logo.png';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ─── Color Palette (from hdb.rw + logo) ────────────────────────────────────
// Primary green: #2e7d32 / #388e3c (logo green)
// Gold/accent:   #f9a825 / #fbc02d (logo golden ring)
// Dark navy:     #1a237e / #283593 (logo dark blue-black text)
// White:         #ffffff
// ────────────────────────────────────────────────────────────────────────────

// ─── Dashboard Chart Data (editable here) ───────────────────────────────────
export const DASHBOARD_CHART_DATA = {
  labels: ['Term 1', 'Term 2', 'Term 3'],
  datasets: [
    {
      label: 'Class Average (%)',
      data: [72, 78, 81],
      backgroundColor: 'rgba(46,125,50,0.82)',
      borderColor: '#2e7d32',
      borderWidth: 2,
      borderRadius: 6,
    },
    {
      label: 'At-Risk Students',
      data: [30, 24, 18],
      backgroundColor: 'rgba(249,168,37,0.82)',
      borderColor: '#f9a825',
      borderWidth: 2,
      borderRadius: 6,
    },
    {
      label: 'Attendance Rate (%)',
      data: [88, 91, 94],
      backgroundColor: 'rgba(40,53,147,0.75)',
      borderColor: '#283593',
      borderWidth: 2,
      borderRadius: 6,
    },
  ],
};

export const DASHBOARD_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
  },
  scales: {
    x: {
      ticks: { color: '#ccc', font: { size: 13 } },
      grid: { color: 'rgba(255,255,255,0.07)' },
    },
    y: {
      ticks: { color: '#ccc', font: { size: 12 } },
      grid: { color: 'rgba(255,255,255,0.07)' },
      min: 0,
      max: 110,
    },
  },
};
// ────────────────────────────────────────────────────────────────────────────

// ─── Login Modal ─────────────────────────────────────────────────────────────
const LoginModal = ({ onClose, onForgotPassword }) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: '' });

  const roles = [
    { value: 'student', label: t('roles.student') },
    { value: 'teacher', label: t('roles.teacher') },
    { value: 'parent', label: t('roles.parent') },
    { value: 'admin', label: t('roles.admin') },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.role) { toast.error(t('login.selectRole')); return; }
    setLoading(true);
    try {
      await login(formData.username, formData.password, formData.role);
      toast.success(t('login.welcome'));
      onClose();
      navigate('/app/dashboard');
    } catch {
      toast.error(t('login.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="w-5 h-5 text-gray-500" />
      </button>

      <div className="text-center mb-6">
        <img src={schoolLogo} alt="HDB Logo" className="w-16 h-16 mx-auto mb-3 rounded-full object-contain" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('login.title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('login.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('login.username')}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('login.usernamePlaceholder')}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('login.password')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('login.passwordPlaceholder')}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('login.role')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {roles.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => setFormData({ ...formData, role: role.value })}
                className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  formData.role === role.value
                    ? 'border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-400 text-gray-700 dark:text-gray-300'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-green-700 dark:text-green-400 hover:underline"
          >
            {t('login.forgotPassword')}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <><LogIn className="w-4 h-4" />{t('login.signIn')}</>
          )}
        </button>
      </form>

      <p className="text-xs text-center text-gray-400 mt-5">{t('login.adminNote')}</p>
    </div>
  );
};

// ─── Forgot Password Modal ────────────────────────────────────────────────────
const ForgotPasswordModal = ({ onBack, onClose }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="w-5 h-5 text-gray-500" />
      </button>

      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-3">
          <Mail className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('forgotPassword.title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('forgotPassword.subtitle')}</p>
      </div>

      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('forgotPassword.emailLabel')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder={t('forgotPassword.emailPlaceholder')}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : t('forgotPassword.sendReset')}
          </button>
        </form>
      ) : (
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 text-sm">{t('forgotPassword.sentMessage')}</p>
        </div>
      )}

      <button
        onClick={onBack}
        className="mt-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-700 dark:hover:text-green-400 transition-colors mx-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('forgotPassword.backToSignIn')}
      </button>
    </div>
  );
};

// ─── Modal Overlay ────────────────────────────────────────────────────────────
const AuthModal = ({ onClose }) => {
  const [view, setView] = useState('login'); // 'login' | 'forgot'

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      {view === 'login' ? (
        <LoginModal onClose={onClose} onForgotPassword={() => setView('forgot')} />
      ) : (
        <ForgotPasswordModal onBack={() => setView('login')} onClose={onClose} />
      )}
    </div>
  );
};

// ─── Main Landing Page ────────────────────────────────────────────────────────
const LandingPage = () => {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: Brain, title: t('features.ai.title'), description: t('features.ai.desc') },
    { icon: BarChart3, title: t('features.dashboard.title'), description: t('features.dashboard.desc') },
    { icon: MessageSquare, title: t('features.communication.title'), description: t('features.communication.desc') },
    { icon: Shield, title: t('features.security.title'), description: t('features.security.desc') },
    { icon: FileText, title: t('features.reports.title'), description: t('features.reports.desc') },
    { icon: CreditCard, title: t('features.fees.title'), description: t('features.fees.desc') },
  ];

  const stats = [
    { value: '486', label: t('stats.students'), icon: Users },
    { value: '32', label: t('stats.teachers'), icon: GraduationCap },
    { value: '98%', label: t('stats.satisfaction'), icon: Heart },
    { value: '0', label: t('stats.paperForms'), icon: FileText },
  ];

  const testimonials = [
    { name: 'Jean Paul Uwimana', role: t('roles.parent'), content: t('testimonials.parent'), avatar: '👨' },
    { name: 'Marie Claire Uwase', role: t('roles.teacher'), content: t('testimonials.teacher'), avatar: '👩‍🏫' },
    { name: 'Fr. Jean Bosco', role: t('testimonials.directorRole'), content: t('testimonials.director'), avatar: '👨‍💼' },
  ];

  const chartLegend = [
    { color: '#2e7d32', label: t('chart.classAverage') },
    { color: '#f9a825', label: t('chart.atRisk') },
    { color: '#283593', label: t('chart.attendance') },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 dark:bg-gray-900/95 shadow-lg backdrop-blur-sm border-b border-green-100 dark:border-green-900/30'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Logo + Brand */}
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={schoolLogo}
                alt="Les Hirondelles de Don Bosco"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-contain flex-shrink-0 ring-2 ring-green-700/30"
              />
              <div className="min-w-0">
                <span className="text-lg sm:text-xl font-bold text-green-800 dark:text-green-400 leading-none block">
                  Ishuri
                </span>
                <span className="text-[10px] text-gray-400 hidden sm:block leading-none mt-0.5">
                  Les Hirondelles de Don Bosco
                </span>
              </div>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {['features', 'about', 'testimonials', 'contact'].map((section) => (
                <a
                  key={section}
                  href={`#${section}`}
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 transition-colors font-medium capitalize"
                >
                  {t(`nav.${section}`)}
                </a>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
              >
                {t('nav.signIn')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-green-900/10" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full mb-6">
              <Brain className="w-4 h-4 text-green-700" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {t('hero.badge')}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              {t('hero.title')}
              <span className="text-green-700 dark:text-green-400"> Les Hirondelles de Don Bosco</span>
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              {t('hero.description')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors font-medium text-lg"
              >
                {t('hero.getStarted')}
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-700 transition-colors font-medium text-lg text-gray-700 dark:text-gray-300"
              >
                {t('hero.learnMore')}
                <ChevronRight className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* ── Dashboard Preview with real Chart ── */}
          <div className="mt-16 relative">
            <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
              {/* Browser chrome */}
              <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-400 ml-2">ishuri.donbosco.rw/app/dashboard</span>
              </div>

              {/* Chart area */}
              <div className="p-6 bg-gray-900">
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-4">
                  {chartLegend.map((item) => (
                    <span key={item.color} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ background: item.color }} />
                      {item.label}
                    </span>
                  ))}
                </div>
                <div style={{ position: 'relative', width: '100%', height: '260px' }}>
                  <Bar data={DASHBOARD_CHART_DATA} options={DASHBOARD_CHART_OPTIONS} />
                </div>
                <p className="text-xs text-gray-500 text-center mt-3">{t('chart.title')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-4 bg-green-800 dark:bg-green-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-white/10 rounded-full">
                    <stat.icon className="w-6 h-6 text-amber-300" />
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white">{stat.value}</div>
                <div className="text-green-200 mt-1 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('featuresSection.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {t('featuresSection.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-green-100 dark:border-green-900/30 rounded-xl p-6"
              >
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg w-fit mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                  <feature.icon className="w-6 h-6 text-green-700 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role Cards ── */}
      <section id="about" className="py-20 px-4 bg-gradient-to-r from-green-50 to-amber-50 dark:from-gray-800 dark:to-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('rolesSection.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">{t('rolesSection.subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                role: t('roles.students'),
                icon: GraduationCap,
                features: [
                  t('roleFeatures.student.0'), t('roleFeatures.student.1'),
                  t('roleFeatures.student.2'), t('roleFeatures.student.3'),
                ],
              },
              {
                role: t('roles.parents'),
                icon: Users,
                features: [
                  t('roleFeatures.parent.0'), t('roleFeatures.parent.1'),
                  t('roleFeatures.parent.2'), t('roleFeatures.parent.3'),
                ],
              },
              {
                role: t('roles.teachers'),
                icon: Brain,
                features: [
                  t('roleFeatures.teacher.0'), t('roleFeatures.teacher.1'),
                  t('roleFeatures.teacher.2'), t('roleFeatures.teacher.3'),
                ],
              },
              {
                role: t('roles.admins'),
                icon: Shield,
                features: [
                  t('roleFeatures.admin.0'), t('roleFeatures.admin.1'),
                  t('roleFeatures.admin.2'), t('roleFeatures.admin.3'),
                ],
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center hover:shadow-xl transition-all border border-green-100 dark:border-green-900/30"
              >
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-green-700 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">{item.role}</h3>
                <ul className="space-y-2 text-left">
                  {item.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Analytics ── */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full mb-6">
                <Brain className="w-4 h-4 text-green-700" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">{t('aiSection.badge')}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {t('aiSection.title')}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">{t('aiSection.description')}</p>
              <div className="space-y-4">
                {[
                  { color: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-900/20', title: t('zones.green.title'), desc: t('zones.green.desc'), text: 'text-green-800 dark:text-green-300', subdesc: 'text-green-600 dark:text-green-400' },
                  { color: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', title: t('zones.yellow.title'), desc: t('zones.yellow.desc'), text: 'text-amber-800 dark:text-amber-300', subdesc: 'text-amber-600 dark:text-amber-400' },
                  { color: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20', title: t('zones.red.title'), desc: t('zones.red.desc'), text: 'text-red-800 dark:text-red-300', subdesc: 'text-red-600 dark:text-red-400' },
                ].map((zone) => (
                  <div key={zone.color} className={`flex items-center gap-3 p-3 ${zone.bg} rounded-lg`}>
                    <div className={`w-4 h-4 ${zone.color} rounded-full flex-shrink-0`} />
                    <div>
                      <p className={`font-medium ${zone.text}`}>{zone.title}</p>
                      <p className={`text-sm ${zone.subdesc}`}>{zone.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 text-white">
              <BarChart3 className="w-12 h-12 text-green-400 mb-4" />
              <h3 className="text-2xl font-bold mb-4">{t('aiSection.cardTitle')}</h3>
              <p className="text-gray-300 mb-6">{t('aiSection.cardDesc')}</p>
              <div className="space-y-3">
                {[
                  { label: t('aiSection.classAvg'), value: '78%', color: 'bg-green-500', width: '78%', textColor: 'text-green-400' },
                  { label: t('aiSection.atRisk'), value: '24', color: 'bg-amber-500', width: '24%', textColor: 'text-amber-400' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.label}</span>
                      <span className={item.textColor}>{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className={`${item.color} h-2 rounded-full`} style={{ width: item.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('testimonialsSection.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">{t('testimonialsSection.subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-green-100 dark:border-green-900/30 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-400 italic text-sm">"{testimonial.content}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-green-700 to-green-900 rounded-2xl text-white p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('cta.title')}</h2>
            <p className="text-lg text-green-100 mb-8">{t('cta.subtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 bg-white text-green-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                {t('cta.signIn')}
              </button>
              <a
                href="#contact"
                className="px-6 py-3 border-2 border-white/30 rounded-lg hover:bg-white/10 transition-colors font-medium"
              >
                {t('cta.contact')}
              </a>
            </div>
            <p className="text-sm text-green-200 mt-6">{t('cta.note')}</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src={schoolLogo} alt="HDB Logo" className="w-8 h-8 rounded-full object-contain ring-1 ring-green-700/40" />
                <span className="text-xl font-bold text-white">Ishuri</span>
              </div>
              <p className="text-sm">{t('footer.description')}</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('footer.quickLinks')}</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-green-400 transition-colors">{t('nav.features')}</a></li>
                <li><a href="#testimonials" className="hover:text-green-400 transition-colors">{t('nav.testimonials')}</a></li>
                <li><button onClick={() => setShowAuthModal(true)} className="hover:text-green-400 transition-colors">{t('nav.signIn')}</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('footer.contact')}</h3>
              <ul className="space-y-2 text-sm">
                <li>Les Hirondelles de Don Bosco</li>
                <li>Ndera, Rwanda</li>
                <li>info@hdb.rw</li>
                <li>+250 783 201 428</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('footer.resources')}</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="https://hdb.rw" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">{t('footer.schoolWebsite')}</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">{t('footer.documentation')}</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">{t('footer.support')}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 Ishuri — Les Hirondelles de Don Bosco. {t('footer.rights')}</p>
            <p className="mt-1">{t('footer.tagline')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;