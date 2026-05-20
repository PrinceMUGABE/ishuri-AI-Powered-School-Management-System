// TeacherTimetable.jsx - Fixed version with proper day handling
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import {
  Calendar, Clock, BookOpen, Users, MapPin, School,
  Download, RefreshCw, Loader2, Sun, Sunset, Moon
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  const language = localStorage.getItem("user_language") || "en";
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  config.headers["X-Language"] = language;
  return config;
});

// Helper function to format time
const formatTime = (timeStr) => {
  if (!timeStr) return "--:--";
  return timeStr.substring(0, 5);
};

// Helper function to get greeting icon
const GreetingIcon = ({ hour, className }) => {
  if (hour < 12) return <Sun className={className} />;
  if (hour < 18) return <Sunset className={className} />;
  return <Moon className={className} />;
};

// Toast Container
const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
    {toasts.map(toast => (
      <div key={toast.id} className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-in ${
        toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-blue-600"
      } text-white`}>
        <span>{toast.message}</span>
        <button onClick={() => removeToast(toast.id)} className="ml-2 hover:opacity-80">×</button>
      </div>
    ))}
  </div>
);

// Main Component
export default function TeacherTimetable() {
  const { t, i18n } = useTranslation();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState(null);
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [term, setTerm] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  // Track dark mode
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const addToast = useCallback((message, type = "success") => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // Colors based on dark mode
  const colors = dark ? {
    bg: "#0f1117",
    surface: "#1a1d27",
    surface2: "#22263a",
    border: "#2d3150",
    text: "#e8eaf6",
    text2: "#9ba3c2",
    accent: "#166534",
    accentLight: "#1b5e20",
  } : {
    bg: "#f0f2f5",
    surface: "#ffffff",
    surface2: "#f7f8fa",
    border: "#e0e3ea",
    text: "#111827",
    text2: "#6b7280",
    accent: "#166534",
    accentLight: "#dcfce7",
  };

  // Day mapping for display (ordered Monday to Sunday)
  const DAY_ORDER = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6,
    "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6
  };

  const getDayDisplayName = (dayKey) => {
    const dayNames = {
      "Monday": t("teacher_timetable.days.monday"),
      "Tuesday": t("teacher_timetable.days.tuesday"),
      "Wednesday": t("teacher_timetable.days.wednesday"),
      "Thursday": t("teacher_timetable.days.thursday"),
      "Friday": t("teacher_timetable.days.friday"),
      "Saturday": t("teacher_timetable.days.saturday"),
      "Sunday": t("teacher_timetable.days.sunday"),
      "0": t("teacher_timetable.days.monday"),
      "1": t("teacher_timetable.days.tuesday"),
      "2": t("teacher_timetable.days.wednesday"),
      "3": t("teacher_timetable.days.thursday"),
      "4": t("teacher_timetable.days.friday"),
      "5": t("teacher_timetable.days.saturday"),
      "6": t("teacher_timetable.days.sunday"),
    };
    return dayNames[dayKey] || dayKey;
  };

  // Fetch teacher timetable
  const fetchTimetable = useCallback(async () => {
    setLoading(true);
    try {
      console.log("\n🟢 [FETCH] Starting to fetch teacher timetable...");
      
      // First get current teacher info
      const teacherRes = await apiClient.get("/teachers/me/");
      
      if (teacherRes.data.success) {
        setTeacherInfo(teacherRes.data.data);
        console.log("✅ Teacher info set:", teacherRes.data.data);
      }

      // Get timetable with current academic year and term
      const timetableRes = await apiClient.get("/teachers/timetable/");
      
      if (timetableRes.data.success) {
        const data = timetableRes.data.data;
        
        // Get the current teacher's timetable
        const currentTeacherId = teacherRes.data.data?.id;
        let currentTeacherTimetable = null;
        
        if (currentTeacherId && data?.timetables) {
          currentTeacherTimetable = data.timetables.find(
            t => t.teacher?.id === currentTeacherId
          );
        }
        
        if (!currentTeacherTimetable && data?.timetables?.length > 0) {
          currentTeacherTimetable = data.timetables[0];
        }
        
        // Transform the timetable data to ensure consistent format
        const rawTimetable = currentTeacherTimetable?.timetable || {};
        
        // Normalize day keys - ensure they're consistent (string day names)
        const normalizedTimetable = {};
        Object.keys(rawTimetable).forEach(dayKey => {
          // Keep the day key as is (it's already a string like "Monday")
          normalizedTimetable[dayKey] = rawTimetable[dayKey];
        });
        
        console.log("📊 Normalized timetable days:", Object.keys(normalizedTimetable));
        
        setTimetable(normalizedTimetable);
        setAcademicYear(data.academic_year);
        setTerm(data.term);
      }
    } catch (err) {
      console.error("Error fetching timetable:", err);
      addToast(t("teacher_timetable.errors.fetch_failed"), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  // Export timetable
  const handleExport = async () => {
    try {
      const response = await apiClient.get("/teachers/timetable/export/");
      if (response.data.success) {
        const data = response.data.data;
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `timetable_${teacherInfo?.full_name || "teacher"}_${academicYear?.name || "year"}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast(t("teacher_timetable.messages.export_success"), "success");
      }
    } catch (err) {
      console.error("Export error:", err);
      addToast(t("teacher_timetable.errors.export_failed"), "error");
    }
  };

  // Get sorted days (Monday to Friday first, then weekend)
  const getSortedDays = () => {
    if (!timetable) return [];
    
    const days = Object.keys(timetable).filter(day => timetable[day]?.length > 0);
    
    // Sort days according to DAY_ORDER
    return days.sort((a, b) => {
      const orderA = DAY_ORDER[a] ?? 99;
      const orderB = DAY_ORDER[b] ?? 99;
      return orderA - orderB;
    });
  };

  // Get all time slots across all days, sorted by time
  const getAllTimeSlots = () => {
    if (!timetable) return [];
    const slots = new Set();
    
    Object.values(timetable).forEach(dayEntries => {
      dayEntries.forEach(entry => {
        slots.add(`${entry.start_time}-${entry.end_time}`);
      });
    });
    
    // Sort slots by start time
    return Array.from(slots).sort((a, b) => {
      const timeA = a.split("-")[0];
      const timeB = b.split("-")[0];
      return timeA.localeCompare(timeB);
    });
  };

  // Get entry for specific day and time slot
  const getEntryForSlot = (day, slotKey) => {
    if (!timetable[day]) return null;
    return timetable[day].find(entry => `${entry.start_time}-${entry.end_time}` === slotKey);
  };

  const sortedDays = getSortedDays();
  const timeSlots = getAllTimeSlots();

  // Get greeting
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.bg }}>
        <div className="text-center">
          <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: colors.accent }} />
          <p style={{ color: colors.text2 }}>{t("teacher_timetable.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg, color: colors.text }}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: colors.accentLight }}>
                <Calendar className="w-6 h-6" style={{ color: colors.accent }} />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t("teacher_timetable.title")}</h1>
                <p className="text-sm" style={{ color: colors.text2 }}>
                  {teacherInfo?.full_name || t("teacher_timetable.loading")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: colors.surface2 }}>
                <GreetingIcon hour={hour} className="w-4 h-4 text-amber-500" />
                <span className="text-sm">
                  {t(`teacher_timetable.greeting.${greeting}`)}, {teacherInfo?.first_name || ""}
                </span>
              </div> */}
              
              <button
                onClick={fetchTimetable}
                className="p-2 rounded-lg transition-colors"
                style={{ background: colors.surface2, border: `1px solid ${colors.border}` }}
                title={t("teacher_timetable.actions.refresh")}
              >
                <RefreshCw size={18} />
              </button>
              
              {/* <button
                onClick={handleExport}
                className="p-2 rounded-lg transition-colors"
                style={{ background: colors.surface2, border: `1px solid ${colors.border}` }}
                title={t("teacher_timetable.actions.export")}
              >
                <Download size={18} />
              </button> */}
            </div>
          </div>
          
          {/* Academic info bar */}
          {academicYear && term && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs" style={{ color: colors.text2 }}>
              <span className="px-2 py-1 rounded" style={{ background: colors.surface2 }}>
                {t("teacher_timetable.academic_year")}: {academicYear.name}
              </span>
              <span className="px-2 py-1 rounded" style={{ background: colors.surface2 }}>
                {t("teacher_timetable.term")}: {term.name}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!timetable || sortedDays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: colors.surface2 }}>
              <Calendar size={40} style={{ color: colors.text2 }} />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("teacher_timetable.no_timetable")}</h3>
            <p className="text-sm" style={{ color: colors.text2 }}>{t("teacher_timetable.no_timetable_desc")}</p>
            <button
              onClick={fetchTimetable}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: colors.accent, color: "#fff" }}
            >
              {t("teacher_timetable.actions.refresh")}
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 text-left font-semibold sticky left-0 z-10 min-w-[100px]" style={{ background: colors.surface, borderBottom: `2px solid ${colors.border}`, color: colors.text }}>
                      {t("teacher_timetable.time")}
                    </th>
                    {sortedDays.map(day => (
                      <th key={day} className="p-3 text-left font-semibold min-w-[200px]" style={{ borderBottom: `2px solid ${colors.border}`, color: colors.text }}>
                        <div className="flex items-center gap-2">
                          <Clock size={14} style={{ color: colors.accent }} />
                          {getDayDisplayName(day)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(slot => {
                    const [startTime, endTime] = slot.split("-");
                    const hasAnyEntry = sortedDays.some(day => getEntryForSlot(day, slot));
                    
                    return (
                      <tr key={slot}>
                        <td className="p-3 text-sm sticky left-0" style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}`, color: colors.text2 }}>
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatTime(startTime)} - {formatTime(endTime)}
                          </div>
                        </td>
                        {sortedDays.map(day => {
                          const entry = getEntryForSlot(day, slot);
                          return (
                            <td key={`${day}-${slot}`} className="p-2 align-top" style={{ borderBottom: `1px solid ${colors.border}` }}>
                              {entry ? (
                                <div className="p-3 rounded-xl" style={{ background: colors.accentLight }}>
                                  <div className="flex items-start gap-2">
                                    <BookOpen size={16} style={{ color: colors.accent }} className="flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm truncate">{entry.subject_name || entry.subject}</p>
                                      <div className="mt-1 space-y-1 text-xs" style={{ color: colors.text2 }}>
                                        <div className="flex items-center gap-1">
                                          <Users size={10} />
                                          <span className="truncate">{entry.class_level_name || entry.class_level}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <MapPin size={10} />
                                          <span className="truncate">{entry.classroom_name || entry.classroom}</span>
                                        </div>
                                        {entry.school_level_name && (
                                          <div className="flex items-center gap-1">
                                            <School size={10} />
                                            <span className="truncate">{entry.school_level_name}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: colors.accent }}>
                                        <Clock size={10} />
                                        <span>{entry.duration_minutes} min</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : hasAnyEntry ? (
                                <div className="p-3 rounded-xl" style={{ background: colors.surface2, minHeight: "100px" }} />
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Footer summary */}
            <div className="mt-6 p-4 rounded-xl" style={{ background: colors.surface, border: `1px solid ${colors.border}` }}>
              <div className="flex flex-wrap gap-4 justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{t("teacher_timetable.summary.total_classes")}</p>
                  <p className="text-2xl font-bold" style={{ color: colors.accent }}>
                    {Object.values(timetable).flat().length}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("teacher_timetable.summary.total_hours")}</p>
                  <p className="text-2xl font-bold" style={{ color: colors.accent }}>
                    {Math.round(Object.values(timetable).flat().reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60 * 10) / 10}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("teacher_timetable.summary.teaching_days")}</p>
                  <p className="text-2xl font-bold" style={{ color: colors.accent }}>
                    {sortedDays.length}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}