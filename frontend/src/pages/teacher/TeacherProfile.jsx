import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, Mail, Phone, MapPin, Briefcase,
  Save, Camera, X, Upload, Edit2,
  Eye, EyeOff, Lock, Loader2, CheckCircle,
  AlertCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a File object and return a base64 data URI string. */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);   // already "data:<mime>;base64,..."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const API_BASE = 'http://127.0.0.1:8000/api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  'X-Language': localStorage.getItem('user_language') || 'en',
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2">
    <div className="mt-0.5 p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30">
      <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-none mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{value || '—'}</p>
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

const inputCls = (editing) =>
  `w-full px-3 py-2 text-sm rounded-lg border transition-colors
   ${editing
    ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
    : 'border-transparent bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 cursor-default'
   }`;

const PasswordInput = ({ name, value, onChange, show, onToggle, placeholder }) => (
  <div className="relative">
    <input
      type={show ? 'text' : 'password'}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${inputCls(true)} pr-10`}
    />
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Webcam Modal
// ---------------------------------------------------------------------------

const WebcamModal = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  // Start stream when modal mounts
  useEffect(() => {
    let cancelled = false;

    const startStream = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;

        // Wait for the video element to be in the DOM before assigning srcObject
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => {
            if (!cancelled) setReady(true);
          };
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not access camera');
      }
    };

    startStream();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    // Convert directly to base64 data URI — no Blob/File needed
    const dataUri = canvas.toDataURL('image/jpeg', 0.9);
    onCapture(dataUri);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">Take Photo</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Video area */}
        <div className="relative bg-gray-950 aspect-video flex items-center justify-center">
          {error ? (
            <div className="text-center px-6">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-300">{error}</p>
              <p className="text-xs text-gray-400 mt-1">Check browser permissions and try again.</p>
            </div>
          ) : (
            <>
              {/* autoPlay + playsInline needed for the stream to play */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
              )}
              {/* Viewfinder overlay */}
              {ready && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-8 border-2 border-white/30 rounded-lg" />
                  <div className="absolute top-8 left-8 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
                  <div className="absolute top-8 right-8 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
                  <div className="absolute bottom-8 left-8 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
                  <div className="absolute bottom-8 right-8 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br" />
                </div>
              )}
            </>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={capture}
            disabled={!ready || !!error}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Camera className="w-4 h-4" />
            Capture
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const TeacherProfile = () => {
  const { t } = useTranslation();
  const { teacherProfile, user, refreshProfile } = useOutletContext();

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', middle_name: '',
    phone_number: '', address: '', gender: 'male',
    qualifications: '', bio: '',
  });

  // Profile picture: we store a base64 data URI for both preview and submission
  const [pictureDataUri, setPictureDataUri] = useState(null);   // new picture (pending save)
  const [currentPictureUrl, setCurrentPictureUrl] = useState(null); // from server

  const [passwordData, setPasswordData] = useState({
    current_password: '', new_password: '', confirm_password: '',
  });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  const fileInputRef = useRef(null);

  // ---- Populate form from profile ----------------------------------------
  useEffect(() => {
    if (!teacherProfile) return;
    setFormData({
      first_name: teacherProfile.first_name || '',
      last_name: teacherProfile.last_name || '',
      middle_name: teacherProfile.middle_name || '',
      phone_number: teacherProfile.phone_number || '',
      address: teacherProfile.address || '',
      gender: teacherProfile.gender || 'male',
      qualifications: teacherProfile.qualifications || '',
      bio: teacherProfile.bio || '',
    });
    setCurrentPictureUrl(teacherProfile.profile_picture_url || null);
    setPictureDataUri(null); // clear any pending new picture
  }, [teacherProfile]);

  // ---- Cancel editing ----------------------------------------------------
  const handleCancel = () => {
    setIsEditing(false);
    setPictureDataUri(null);
    // Reset form to original profile data
    if (teacherProfile) {
      setFormData({
        first_name: teacherProfile.first_name || '',
        last_name: teacherProfile.last_name || '',
        middle_name: teacherProfile.middle_name || '',
        phone_number: teacherProfile.phone_number || '',
        address: teacherProfile.address || '',
        gender: teacherProfile.gender || 'male',
        qualifications: teacherProfile.qualifications || '',
        bio: teacherProfile.bio || '',
      });
    }
  };

  // ---- Handle file input -------------------------------------------------
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB');
      return;
    }

    try {
      const uri = await fileToBase64(file);
      setPictureDataUri(uri);
    } catch {
      toast.error('Failed to read the image file');
    }

    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  };

  // ---- Webcam capture callback -------------------------------------------
  const handleWebcamCapture = useCallback((dataUri) => {
    setPictureDataUri(dataUri);
    setShowWebcam(false);
    toast.success('Photo captured!');
  }, []);

  // ---- Update profile ----------------------------------------------------
  const updateProfile = async () => {
    setLoading(true);
    try {
      const payload = { ...formData };

      // Only include profile_picture if a new one was chosen
      if (pictureDataUri) {
        payload.profile_picture = pictureDataUri;
      }

      const res = await fetch(`${API_BASE}/teachers/profile/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || 'Profile updated successfully');
        setIsEditing(false);
        setPictureDataUri(null);
        await refreshProfile();
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('updateProfile error:', err);
      toast.error('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  // ---- Change password ---------------------------------------------------
  const changePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch(`${API_BASE}/teachers/change-password/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(passwordData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || 'Password changed successfully');
        setShowPasswordSection(false);
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('changePassword error:', err);
      toast.error('Network error — please try again');
    } finally {
      setPwLoading(false);
    }
  };

  // ---- Derived display values --------------------------------------------
  const displayPicture = pictureDataUri || currentPictureUrl;
  const initials = `${teacherProfile?.first_name?.charAt(0) ?? ''}${teacherProfile?.last_name?.charAt(0) ?? ''}`.toUpperCase();

  // ---- Loading skeleton --------------------------------------------------
  if (!teacherProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // ========================================================================
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('profile.title', 'My Profile')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {t('profile.subtitle', 'Manage your personal information and account settings')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ================================================================
            LEFT — Avatar card
        ================================================================ */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">

            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-emerald-500/40 shadow-lg bg-emerald-50 dark:bg-emerald-900/30">
                  {displayPicture ? (
                    <img
                      src={displayPicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 select-none">
                        {initials}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pending-picture indicator */}
                {pictureDataUri && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Upload / webcam buttons (only in edit mode) */}
              {isEditing && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                  <button
                    onClick={() => setShowWebcam(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Camera
                  </button>
                </div>
              )}

              {/* Clear pending picture */}
              {isEditing && pictureDataUri && (
                <button
                  onClick={() => setPictureDataUri(null)}
                  className="mt-1.5 text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" /> Remove new photo
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white text-center leading-tight">
                {teacherProfile.full_name}
              </h2>
              <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                Teacher
              </span>
            </div>

            {/* Quick info */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-0.5">
              <InfoRow icon={User} label="Username" value={user?.username} />
              <InfoRow icon={Mail} label="Email" value={teacherProfile.email} />
              <InfoRow icon={Briefcase} label="Hire Date" value={teacherProfile.hire_date} />
              {teacherProfile.status && (
                <InfoRow icon={CheckCircle} label="Status" value={teacherProfile.status} />
              )}
            </div>
          </div>

          {/* Specializations card */}
          {teacherProfile.specializations_detail?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Specializations
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {teacherProfile.specializations_detail.map((s) => (
                  <span
                    key={s.id}
                    className="px-2 py-0.5 text-xs rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================
            RIGHT — Form + Password
        ================================================================ */}
        <div className="lg:col-span-2 space-y-6">

          {/* Profile form card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">

            {/* Card header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {isEditing ? 'Edit Profile' : 'Personal Information'}
              </h3>
              <div className="flex gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={loading}
                      className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateProfile}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {loading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Save className="w-3.5 h-3.5" />
                      }
                      Save Changes
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">

              <Field label={t('profile.firstName', 'First Name')}>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))}
                  disabled={!isEditing}
                  className={inputCls(isEditing)}
                />
              </Field>

              <Field label={t('profile.lastName', 'Last Name')}>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))}
                  disabled={!isEditing}
                  className={inputCls(isEditing)}
                />
              </Field>

              <Field label={t('profile.middleName', 'Middle Name')}>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={(e) => setFormData(p => ({ ...p, middle_name: e.target.value }))}
                  disabled={!isEditing}
                  className={inputCls(isEditing)}
                />
              </Field>

              <Field label={t('profile.phoneNumber', 'Phone Number')}>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData(p => ({ ...p, phone_number: e.target.value }))}
                  disabled={!isEditing}
                  className={inputCls(isEditing)}
                />
              </Field>

              <Field label={t('profile.gender', 'Gender')}>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData(p => ({ ...p, gender: e.target.value }))}
                  disabled={!isEditing}
                  className={inputCls(isEditing)}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label={t('profile.address', 'Address')}>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                  disabled={!isEditing}
                  rows={2}
                  className={inputCls(isEditing)}
                />
              </Field>

              <Field label={t('profile.qualifications', 'Qualifications')}>
                <textarea
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={(e) => setFormData(p => ({ ...p, qualifications: e.target.value }))}
                  disabled={!isEditing}
                  rows={3}
                  className={`${inputCls(isEditing)} md:col-span-2`}
                />
              </Field>

              <Field label={t('profile.bio', 'Biography')}>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))}
                  disabled={!isEditing}
                  rows={3}
                  className={inputCls(isEditing)}
                />
              </Field>

            </div>
          </div>

          {/* ---- Change password card ---- */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

            <button
              onClick={() => setShowPasswordSection((v) => !v)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  Change Password
                </span>
              </div>
              <RefreshCw
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showPasswordSection ? 'rotate-180' : ''}`}
              />
            </button>

            {showPasswordSection && (
              <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="space-y-4 mt-3">

                  <Field label="Current Password">
                    <PasswordInput
                      name="current_password"
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData(p => ({ ...p, current_password: e.target.value }))}
                      show={showPw.current}
                      onToggle={() => setShowPw(p => ({ ...p, current: !p.current }))}
                      placeholder="Enter current password"
                    />
                  </Field>

                  <Field label="New Password">
                    <PasswordInput
                      name="new_password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData(p => ({ ...p, new_password: e.target.value }))}
                      show={showPw.new}
                      onToggle={() => setShowPw(p => ({ ...p, new: !p.new }))}
                      placeholder="At least 8 characters"
                    />
                  </Field>

                  <Field label="Confirm New Password">
                    <PasswordInput
                      name="confirm_password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData(p => ({ ...p, confirm_password: e.target.value }))}
                      show={showPw.confirm}
                      onToggle={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                      placeholder="Repeat new password"
                    />
                  </Field>

                  {/* Match indicator */}
                  {passwordData.new_password && passwordData.confirm_password && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${
                      passwordData.new_password === passwordData.confirm_password
                        ? 'text-emerald-600'
                        : 'text-red-500'
                    }`}>
                      {passwordData.new_password === passwordData.confirm_password
                        ? <><CheckCircle className="w-3.5 h-3.5" /> Passwords match</>
                        : <><AlertCircle className="w-3.5 h-3.5" /> Passwords do not match</>
                      }
                    </div>
                  )}

                  <button
                    onClick={changePassword}
                    disabled={pwLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {pwLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Lock className="w-4 h-4" />
                    }
                    Update Password
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Webcam modal — mounted outside the grid so it's truly full-screen */}
      {showWebcam && (
        <WebcamModal
          onCapture={handleWebcamCapture}
          onClose={() => setShowWebcam(false)}
        />
      )}
    </div>
  );
};

export default TeacherProfile;