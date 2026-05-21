// StudentDigitalId.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  User, GraduationCap, Calendar, Mail, Phone, MapPin,
  Sun, Moon, Download, Printer, RefreshCw, CheckCircle,
  AlertCircle, CreditCard, QrCode, Fingerprint, Award,
  BookOpen, School, Clock, UserCheck, Shield, Star,
  Heart, Users, FileText, QrCode as QrCodeIcon, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import schoolLogo from '../../../public/imgs/school-logo.png';

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
// Helper Components
// ============================================================
const Spinner = () => (
  <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
);

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

// ============================================================
// Digital ID Card Component - Responsive sizing
// ============================================================
const DigitalIDCard = ({ student, onDownload, t, screenSize }, ref) => {
  const cardRef = useRef(null);
  
  // Determine card size based on screen width
  const getCardSizeClass = () => {
    if (screenSize === 'mobile') {
      return 'max-w-[95%] scale-95';
    } else if (screenSize === 'tablet') {
      return 'max-w-md';
    } else {
      return 'max-w-lg';
    }
  };
  
  // Determine font sizes based on screen size
  const getFontSizes = () => {
    if (screenSize === 'mobile') {
      return {
        title: 'text-lg',
        subtitle: 'text-[10px]',
        name: 'text-lg',
        rollNumber: 'text-base',
        detailLabel: 'text-[10px]',
        detailValue: 'text-xs',
        badgeText: 'text-[10px]'
      };
    } else if (screenSize === 'tablet') {
      return {
        title: 'text-xl',
        subtitle: 'text-xs',
        name: 'text-xl',
        rollNumber: 'text-lg',
        detailLabel: 'text-xs',
        detailValue: 'text-sm',
        badgeText: 'text-xs'
      };
    } else {
      return {
        title: 'text-2xl',
        subtitle: 'text-sm',
        name: 'text-2xl',
        rollNumber: 'text-xl',
        detailLabel: 'text-xs',
        detailValue: 'text-base',
        badgeText: 'text-xs'
      };
    }
  };
  
  const fontSizes = getFontSizes();
  
  const getInitials = (name) => {
    if (!name) return 'S';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'transferred': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'graduated': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  const getStatusText = (status, t) => {
    switch(status) {
      case 'active': return t('student_id.active');
      case 'inactive': return t('student_id.inactive');
      case 'transferred': return t('student_id.transferred');
      case 'graduated': return t('student_id.graduated');
      default: return status || t('student_id.na');
    }
  };
  
  // Avatar size based on screen
  const getAvatarSize = () => {
    if (screenSize === 'mobile') return 'w-20 h-20 text-2xl';
    if (screenSize === 'tablet') return 'w-24 h-24 text-3xl';
    return 'w-28 h-28 text-4xl';
  };
  
  return (
    <div 
      ref={cardRef} 
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 mx-auto transition-all duration-300 ${getCardSizeClass()}`}
    >
      {/* Header with Logo */}
      <div className="bg-gradient-to-r from-green-700 to-green-900 px-4 md:px-6 py-3 md:py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* School Logo Image */}
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-md">
              <img 
                src={schoolLogo} 
                alt="School Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="w-full h-full bg-green-600 flex items-center justify-center"><GraduationCap class="w-6 h-6 text-white" /></div>';
                }}
              />
            </div>
            <div>
              <h2 className={`${fontSizes.title} font-bold leading-tight`}>{t('student_id.school_name')}</h2>
              <p className={`${fontSizes.subtitle} text-green-200 mt-0.5`}>{t('student_id.school_motto')}</p>
            </div>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
        </div>
      </div>
      
      {/* ID Content */}
      <div className="p-4 md:p-6">
        {/* Avatar / Photo Area */}
        <div className="flex justify-center mb-3 md:mb-4">
          <div className="relative">
            <div className={`${getAvatarSize()} rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-900 flex items-center justify-center border-4 border-white shadow-lg`}>
              <span className={`${fontSizes.name} font-bold text-green-700 dark:text-green-300`}>
                {getInitials(student?.full_name)}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 md:w-7 md:h-7 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
              <Shield className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
            </div>
          </div>
        </div>
        
        {/* Student Name */}
        <div className="text-center mb-3 md:mb-4">
          <h3 className={`${fontSizes.name} font-bold text-gray-800 dark:text-white`}>{student?.full_name}</h3>
          <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${fontSizes.badgeText} font-medium ${getStatusColor(student?.status)}`}>
              <CheckCircle className="w-3 h-3" />
              {getStatusText(student?.status, t)}
            </span>
            <span className={`${fontSizes.badgeText} text-gray-500 dark:text-gray-400`}>
              {t('student_id.id_card')}
            </span>
          </div>
        </div>
        
        {/* ID Number */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2 md:p-3 mb-3 md:mb-4 text-center">
          <p className={`${fontSizes.detailLabel} text-gray-500 dark:text-gray-400`}>{t('student_id.roll_number')}</p>
          <p className={`${fontSizes.rollNumber} font-mono font-bold text-gray-800 dark:text-white`}>{student?.roll_number}</p>
        </div>
        
        {/* Student Details Grid */}
        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="flex items-center gap-1 md:gap-2">
            <GraduationCap className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className={`${fontSizes.detailLabel} text-gray-500 dark:text-gray-400`}>{t('student_id.class')}</p>
              <p className={`${fontSizes.detailValue} font-medium text-gray-800 dark:text-white truncate`}>
                {student?.current_class_level?.name || t('student_id.na')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <School className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className={`${fontSizes.detailLabel} text-gray-500 dark:text-gray-400`}>{t('student_id.school_level')}</p>
              <p className={`${fontSizes.detailValue} font-medium text-gray-800 dark:text-white truncate`}>
                {student?.current_school_level?.name || t('student_id.na')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className={`${fontSizes.detailLabel} text-gray-500 dark:text-gray-400`}>{t('student_id.birth_date')}</p>
              <p className={`${fontSizes.detailValue} font-medium text-gray-800 dark:text-white`}>
                {formatDate(student?.birth_date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Award className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className={`${fontSizes.detailLabel} text-gray-500 dark:text-gray-400`}>{t('student_id.age')}</p>
              <p className={`${fontSizes.detailValue} font-medium text-gray-800 dark:text-white`}>
                {student?.age || t('student_id.na')} {t('student_id.years')}
              </p>
            </div>
          </div>
        </div>
        
        {/* Contact Information */}
        {(student?.email || student?.phone_number) && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 md:pt-3 mb-3 md:mb-4">
            {student?.email && (
              <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                <Mail className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400" />
                <span className={`${fontSizes.detailValue} text-gray-600 dark:text-gray-300 break-all`}>{student.email}</span>
              </div>
            )}
            {student?.phone_number && (
              <div className="flex items-center gap-1 md:gap-2">
                <Phone className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400" />
                <span className={`${fontSizes.detailValue} text-gray-600 dark:text-gray-300`}>{student.phone_number}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Academic Year */}
        {student?.current_academic_year && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-1.5 md:p-2 text-center mb-3 md:mb-4">
            <p className={`${fontSizes.detailLabel} text-green-700 dark:text-green-300`}>
              {t('student_id.academic_year')}: {student.current_academic_year.name}
            </p>
          </div>
        )}
        
        {/* Footer */}
        {/* <div className="text-center pt-2 md:pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-1 md:gap-2">
            <Shield className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400" />
            <span className={`${fontSizes.badgeText} text-gray-400`}>{t('student_id.valid_id')}</span>
          </div>
          <div className="flex items-center justify-center gap-1 mt-1 md:mt-2">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
              <QrCodeIcon className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
            </div>
            <div className="text-[6px] md:text-[8px] text-gray-400 uppercase tracking-wider">
              {student?.roll_number?.slice(-6) || '------'}
            </div>
          </div>
        </div> */}
      </div>
      
      {/* Actions */}
      {/* <div className="bg-gray-50 dark:bg-gray-700/30 px-4 md:px-6 py-2 md:py-3 flex gap-2">
        <button
          onClick={() => onDownload(cardRef)}
          className="flex-1 py-1.5 md:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs md:text-sm font-medium flex items-center justify-center gap-1 md:gap-2 transition-colors"
        >
          <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
          {t('student_id.download')}
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 py-1.5 md:py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-white rounded-lg text-xs md:text-sm font-medium flex items-center justify-center gap-1 md:gap-2 transition-colors"
        >
          <Printer className="w-3.5 h-3.5 md:w-4 md:h-4" />
          {t('student_id.print')}
        </button>
      </div> */}
    </div>
  );
};

const DigitalIDCardRef = React.forwardRef(DigitalIDCard);

// ============================================================
// Main Student Digital ID Component
// ============================================================
const StudentDigitalId = () => {
  const { t, i18n } = useTranslation();
  
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [screenSize, setScreenSize] = useState('desktop');
  const cardRef = useRef(null);
  
  // Detect screen size for responsive adjustments
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const fetchStudentProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/students/me/');
      if (res.data.success) {
        setStudentProfile(res.data.data);
      } else {
        toast.error(t('student_id.profile_error'));
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
      toast.error(t('student_id.fetch_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);
  
  const handleDownload = async (ref) => {
    if (!ref.current) return;
    
    setDownloading(true);
    try {
      // Temporarily remove responsive scaling for better quality download
      const originalStyle = ref.current.style.transform;
      ref.current.style.transform = 'scale(1)';
      
      const canvas = await html2canvas(ref.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false
      });
      
      // Restore original style
      ref.current.style.transform = originalStyle;
      
      const link = document.createElement('a');
      link.download = `student_id_${studentProfile?.roll_number || 'card'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success(t('student_id.download_success'));
    } catch (error) {
      console.error('Error downloading ID card:', error);
      toast.error(t('student_id.download_error'));
    } finally {
      setDownloading(false);
    }
  };
  
  useEffect(() => {
    fetchStudentProfile();
  }, [fetchStudentProfile]);
  
  const LanguageSwitcher = () => (
    <select
      value={i18n.language}
      onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('user_language', e.target.value); }}
      className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
      <option value="rw">Kinyarwanda</option>
    </select>
  );
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-gray-500 dark:text-gray-400">{t('student_id.loading')}</p>
        </div>
      </div>
    );
  }
  
  if (!studentProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('student_id.no_profile')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">{t('student_id.no_profile_message')}</p>
          <button
            onClick={fetchStudentProfile}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            {t('student_id.retry')}
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-3 md:p-6">
        
        {/* Header */}
        {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-green-600 dark:text-green-500" />
              {t('student_id.title')}
            </h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1">
              {studentProfile?.full_name} · {t('student_id.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 md:p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" /> : <Moon className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500" />}
            </button>
            <button
              onClick={fetchStudentProfile}
              className="p-1.5 md:p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div> */}
        
        {/* ID Card - Responsive sizing passed as prop */}
        <div className="flex justify-center">
          <DigitalIDCardRef
            ref={cardRef}
            student={studentProfile}
            onDownload={handleDownload}
            t={t}
            screenSize={screenSize}
          />
        </div>
        
        {/* Additional Info - Responsive padding */}
        <div className="max-w-md mx-auto mt-4 md:mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 md:mb-3 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" />
              {t('student_id.important_info')}
            </h3>
            <ul className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400 space-y-1.5 md:space-y-2">
              <li className="flex items-start gap-1.5 md:gap-2">
                <Shield className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{t('student_id.info_1')}</span>
              </li>
              {/* <li className="flex items-start gap-1.5 md:gap-2">
                <UserCheck className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{t('student_id.info_2')}</span>
              </li>
              <li className="flex items-start gap-1.5 md:gap-2">
                <Phone className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{t('student_id.info_3')}</span>
              </li> */}
            </ul>
          </div>
        </div>
        
        {/* Parents/Guardians Section - Responsive */}
        {/* {studentProfile?.parents && studentProfile.parents.length > 0 && (
          <div className="max-w-md mx-auto mt-3 md:mt-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 md:mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" />
                {t('student_id.parents_guardians')}
              </h3>
              <div className="space-y-1.5 md:space-y-2">
                {studentProfile.parents.map(parent => (
                  <div key={parent.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 md:py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-800 dark:text-white">{parent.full_name}</p>
                      <p className="text-[10px] md:text-xs text-gray-500">{parent.relationship_type_display}</p>
                    </div>
                    {parent.phone_number && (
                      <p className="text-[10px] md:text-xs text-gray-500 mt-1 sm:mt-0">{parent.phone_number}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
         */}
      </div>
      
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .digital-id-card, .digital-id-card * {
            visibility: visible;
          }
          .digital-id-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentDigitalId;