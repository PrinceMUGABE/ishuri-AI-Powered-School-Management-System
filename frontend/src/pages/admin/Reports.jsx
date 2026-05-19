// Reports.jsx - With Real-time Data from Backend
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import toast from "react-hot-toast";
import {
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  Users, 
  GraduationCap,
  AlertTriangle,
  FileText,
  PieChart,
  Activity,
  RefreshCw,
  School,
  BookOpen,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  Eye,
  EyeOff
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// API Configuration
const API_BASE_URL = "http://127.0.0.1:8000/api/dashboard";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  const lang = localStorage.getItem("user_language") || "en";
  config.headers["X-Language"] = lang;
  return config;
});

// Helper Functions
const formatNumber = (value) => {
  if (!value && value !== 0) return "0";
  return Number(value).toLocaleString();
};

const formatPercentage = (value) => {
  if (!value && value !== 0) return "0%";
  return `${Number(value).toFixed(1)}%`;
};

const Reports = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportType, setReportType] = useState("academic");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // State for real-time data
  const [overviewData, setOverviewData] = useState(null);
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [teacherAttendance, setTeacherAttendance] = useState([]);
  const [classAttendance, setClassAttendance] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [riskStudents, setRiskStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [gradeDistributionStats, setGradeDistributionStats] = useState({
    overall_average: 0,
    pass_rate: 0,
    total_grades_analyzed: 0
  });
  const [riskStats, setRiskStats] = useState({
    danger_count: 0,
    warning_count: 0,
    total_students_analyzed: 0
  });

  // Check dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Fetch academic years
  const fetchAcademicYears = useCallback(async () => {
    try {
      const response = await apiClient.get("/academic-years/");
      if (response.data?.academic_years) {
        setAcademicYears(response.data.academic_years);
        // Set default to current academic year
        const current = response.data.academic_years.find(y => y.is_current);
        if (current) {
          setSelectedAcademicYear(current.id);
        } else if (response.data.academic_years.length > 0) {
          setSelectedAcademicYear(response.data.academic_years[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching academic years:", error);
    }
  }, []);

  // Fetch terms when academic year changes
  useEffect(() => {
    const fetchTerms = async () => {
      if (selectedAcademicYear) {
        try {
          const response = await apiClient.get("/terms/");
          if (response.data?.terms) {
            const yearTerms = response.data.terms.filter(
              t => t.academic_year_id === selectedAcademicYear || t.academic_year === selectedAcademicYear
            );
            setTerms(yearTerms);
            // Set default to current term
            const current = yearTerms.find(t => t.is_current);
            if (current) {
              setSelectedTerm(current.id);
            } else if (yearTerms.length > 0) {
              setSelectedTerm(yearTerms[0].id);
            }
          }
        } catch (error) {
          console.error("Error fetching terms:", error);
        }
      }
    };
    fetchTerms();
  }, [selectedAcademicYear]);

  // Fetch all report data
  const fetchAllReportData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch overview data
      const overviewRes = await apiClient.get("/overview/");
      setOverviewData(overviewRes.data);

      // Build query params
      const params = {};
      if (selectedAcademicYear) params.academic_year = selectedAcademicYear;
      if (selectedTerm) params.term = selectedTerm;

      // Fetch all analytics in parallel
      const [
        subjectRes,
        teacherAttendanceRes,
        classAttendanceRes,
        gradeDistRes,
        riskRes
      ] = await Promise.all([
        apiClient.get("/subject-performance/", { params }),
        apiClient.get("/teacher-attendance/", { params }),
        apiClient.get("/class-attendance/", { params }),
        apiClient.get("/grade-distribution/", { params }),
        apiClient.get("/student-risk/", { params })
      ]);

      setSubjectPerformance(subjectRes.data?.subject_performance || []);
      setTeacherAttendance(teacherAttendanceRes.data?.teacher_attendance || []);
      setClassAttendance(classAttendanceRes.data?.class_attendance || []);
      setGradeDistribution(gradeDistRes.data?.grade_distribution || []);
      setGradeDistributionStats({
        overall_average: gradeDistRes.data?.overall_average || 0,
        pass_rate: gradeDistRes.data?.pass_rate || 0,
        total_grades_analyzed: gradeDistRes.data?.total_grades_analyzed || 0
      });
      setRiskStudents(riskRes.data?.risk_students || []);
      setRiskStats({
        danger_count: riskRes.data?.danger_count || 0,
        warning_count: riskRes.data?.warning_count || 0,
        total_students_analyzed: riskRes.data?.total_students_analyzed || 0
      });

      toast.success(t("reports.messages.dataLoaded", "Data loaded successfully"));
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error(t("reports.messages.fetchError", "Failed to load report data"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedAcademicYear, selectedTerm, t]);

  // Load data when filters change
  useEffect(() => {
    if (selectedAcademicYear) {
      fetchAllReportData();
    }
  }, [selectedAcademicYear, selectedTerm, fetchAllReportData]);

  // Initial load
  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllReportData();
  };

  // Export to PDF
  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = margin;

      // Header
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 8, "F");
      
      doc.setFontSize(18);
      doc.setTextColor(16, 185, 129);
      doc.setFont("helvetica", "bold");
      doc.text(t("app.name", "School Management System"), margin, yPos + 8);

      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38);
      const confidentialText = t("reports.confidential", "CONFIDENTIAL").toUpperCase();
      doc.text(confidentialText, pageWidth - margin - doc.getTextWidth(confidentialText), yPos + 8);

      yPos += 18;

      // Title
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      const reportTitle = reportType === "academic" 
        ? t("reports.academic.title", "Academic Performance Report")
        : reportType === "attendance" 
        ? t("reports.attendance.title", "Attendance Report")
        : t("reports.risk.title", "Risk Analysis Report");
      doc.text(reportTitle.toUpperCase(), margin, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`${t("reports.generatedOn", "Generated on")}: ${new Date().toLocaleString()}`, margin, yPos);
      yPos += 15;

      // Summary metrics
      const metricsData = [
        [t("reports.summary.totalStudents", "Total Students"), formatNumber(overviewData?.total_students || 0)],
        [t("reports.summary.totalTeachers", "Total Teachers"), formatNumber(overviewData?.total_teachers || 0)],
        [t("reports.summary.attendanceRate", "Attendance Rate"), formatPercentage(overviewData?.overall_attendance_rate || 0)],
        [t("reports.summary.collectionRate", "Collection Rate"), formatPercentage(overviewData?.collection_rate || 0)]
      ];

      autoTable(doc, {
        startY: yPos,
        head: [[t("reports.metric", "Metric"), t("reports.value", "Value")]],
        body: metricsData,
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 10 },
        bodyStyles: { fontSize: 9 },
        margin: { left: margin, right: margin }
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Subject Performance Data
      if (subjectPerformance.length > 0 && reportType === "academic") {
        doc.setFontSize(14);
        doc.text("Subject Performance", margin, yPos);
        yPos += 8;

        const subjectTableData = subjectPerformance.map(s => [
          s.subject,
          `${s.avg_score}%`,
          s.total_students,
          s.trend
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Subject", "Average Score", "Students", "Trend"]],
          body: subjectTableData,
          theme: "striped",
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin }
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }

      doc.save(`${reportType}_report_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success(t("reports.messages.pdfDownloaded", "PDF downloaded successfully"));
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(t("reports.messages.exportError", "Failed to export PDF"));
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      let exportData = [];
      
      if (reportType === "academic") {
        exportData = subjectPerformance;
      } else if (reportType === "attendance") {
        exportData = classAttendance;
      } else {
        exportData = riskStudents;
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, t(`reports.${reportType}.title`, "Report"));
      XLSX.writeFile(workbook, `${reportType}_report_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(t("reports.messages.excelDownloaded", "Excel file downloaded successfully"));
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error(t("reports.messages.exportError", "Failed to export Excel"));
    }
  };

  // Prepare class performance data for academic report
  const classPerformanceData = classAttendance.map(item => ({
    class: item.class,
    attendance_rate: item.overall_rate,
    students: item.total_records || 0
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t("reports.messages.loading", "Loading reports...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            📊 {t("reports.title", "System Reports")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("reports.subtitle", "Generate and export school performance reports")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{t("reports.actions.refresh", "Refresh")}</span>
          </button>
          <button 
            onClick={handleExportPDF} 
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            {t("reports.actions.exportPDF", "Export PDF")}
          </button>
          <button 
            onClick={handleExportExcel} 
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {t("reports.actions.exportExcel", "Export Excel")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("reports.filters.academicYear", "Academic Year")}
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
            >
              <option value="">{t("reports.filters.selectYear", "Select Academic Year")}</option>
              {academicYears.map(year => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("reports.filters.term", "Term")}
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
            >
              <option value="">{t("reports.filters.allTerms", "All Terms")}</option>
              {terms.map(term => (
                <option key={term.id} value={term.id}>{term.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 items-end">
            <button
              onClick={() => setReportType("academic")}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                reportType === "academic" 
                  ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              {t("reports.types.academic", "Academic")}
            </button>
            <button
              onClick={() => setReportType("attendance")}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                reportType === "attendance" 
                  ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              <Calendar className="w-4 h-4" />
              {t("reports.types.attendance", "Attendance")}
            </button>
            <button
              onClick={() => setReportType("risk")}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                reportType === "risk" 
                  ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              {t("reports.types.risk", "Risk")}
            </button>
          </div>
        </div>
      </div>

      {/* Academic Performance Report */}
      {reportType === "academic" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("reports.academic.totalStudents", "Total Students")}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(overviewData?.total_students || 0)}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("reports.academic.totalTeachers", "Total Teachers")}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(overviewData?.total_teachers || 0)}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("reports.academic.overallAverage", "Overall Average")}</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatPercentage(gradeDistributionStats.overall_average)}</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("reports.academic.passRate", "Pass Rate")}</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatPercentage(gradeDistributionStats.pass_rate)}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Subject Performance Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("reports.academic.subjectPerformance", "Subject Performance")}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.academic.subject", "Subject")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.academic.averageScore", "Average Score")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.academic.students", "Students")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.academic.trend", "Trend")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {subjectPerformance.map((subject, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{subject.subject}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`font-semibold ${
                          subject.avg_score >= 80 ? "text-green-600" :
                          subject.avg_score >= 70 ? "text-blue-600" :
                          subject.avg_score >= 60 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {subject.avg_score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{formatNumber(subject.total_students)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`flex items-center gap-1 ${subject.trend_up ? "text-green-600" : "text-red-600"}`}>
                          {subject.trend_up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {subject.trend}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {subjectPerformance.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        {t("reports.messages.noData", "No data available")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("reports.academic.gradeDistribution", "Grade Distribution")}
            </h2>
            <div className="space-y-3">
              {gradeDistribution.map((grade, idx) => (
                <div key={idx}>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{grade.grade}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(grade.students)} students ({grade.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${grade.percentage}%`, backgroundColor: grade.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Attendance Report */}
      {reportType === "attendance" && (
        <>
          {/* Attendance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("reports.attendance.overallRate", "Overall Attendance Rate")}</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatPercentage(overviewData?.overall_attendance_rate || 0)}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("reports.attendance.totalSessions", "Total Sessions")}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(overviewData?.total_attendance_sessions || 0)}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("reports.attendance.teacherRate", "Teacher Attendance")}</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatPercentage(teacherAttendance[0]?.rate || 0)}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("reports.attendance.classesAnalyzed", "Classes Analyzed")}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(classAttendance.length)}</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <School className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Class Attendance Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("reports.attendance.classAttendance", "Class Attendance")}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.attendance.class", "Class")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.attendance.attendanceRate", "Attendance Rate")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.attendance.sessions", "Sessions")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.attendance.present", "Present")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.attendance.absent", "Absent")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {classAttendance.map((cls, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{cls.class}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[100px] bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-green-600"
                              style={{ width: `${cls.overall_rate}%` }}
                            ></div>
                          </div>
                          <span className={`font-semibold ${
                            cls.overall_rate >= 90 ? "text-green-600" :
                            cls.overall_rate >= 80 ? "text-blue-600" :
                            cls.overall_rate >= 70 ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {cls.overall_rate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{cls.total_sessions}</td>
                      <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400">{formatNumber(cls.present_count)}</td>
                      <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400">{formatNumber(cls.absent_count)}</td>
                    </tr>
                  ))}
                  {classAttendance.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        {t("reports.messages.noData", "No data available")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Risk Analysis Report */}
      {reportType === "risk" && (
        <>
          {/* Risk Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("reports.risk.dangerZone", "Students in Danger Zone")}</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{riskStats.danger_count}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t("reports.risk.immediateAction", "Require immediate intervention")}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("reports.risk.nearDangerZone", "Near Danger Zone")}</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{riskStats.warning_count}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t("reports.risk.earlyIntervention", "Early intervention recommended")}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("reports.risk.totalAnalyzed", "Total Students Analyzed")}</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatNumber(riskStats.total_students_analyzed)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t("reports.risk.onTrack", "Students evaluated")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* At-Risk Students Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("reports.risk.atRiskStudents", "Students in Risk Categories")}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.risk.studentName", "Student Name")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.risk.class", "Class")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.risk.academicScore", "Academic Score")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.risk.attendance", "Attendance")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("reports.risk.status", "Status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {riskStudents.map((student, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{student.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{student.class}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`font-semibold ${student.academic_score < 50 ? "text-red-600" : "text-yellow-600"}`}>
                          {student.academic_score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`font-semibold ${student.attendance_rate < 70 ? "text-red-600" : "text-yellow-600"}`}>
                          {student.attendance_rate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          student.risk_level === "danger" 
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" 
                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                        }`}>
                          {student.risk_level === "danger" 
                            ? t("reports.risk.danger", "DANGER") 
                            : t("reports.risk.warning", "WARNING")}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {riskStudents.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                        {t("reports.risk.noAtRiskStudents", "No students in risk categories")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;