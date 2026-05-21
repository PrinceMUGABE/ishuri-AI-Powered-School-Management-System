import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, UserPlus, Edit, Trash2, Search, Eye, X,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  AlertCircle, GraduationCap, BookOpen, Calendar,
  Sun, Moon, Plus, Info, Mail, Phone, MapPin,
  Download, Printer, FileText, BarChart3, Hash,
  User, UserCheck, Shield, Baby, Link2,
  BookOpenCheck, Filter, TrendingUp, Clock,
  Award, Activity, Star, Heart, MoveRight, Home,
  DoorOpen, Building2, Repeat, AlertTriangle, School,
  Users as UsersIcon, UserCircle, Check, Loader2,
  MessageCircle, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ─────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  transferred: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  graduated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const getStatusBadge = (s) => STATUS_COLORS[s] || STATUS_COLORS.inactive;

const Spinner = () => (
  <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
);

// ─────────────────────────────────────────────────────────────
// StudentForm - MOVED OUTSIDE and memoized with React.memo
// ─────────────────────────────────────────────────────────────
const StudentForm = React.memo(({
  item,
  onChange,
  academicYears,
  schoolLevels,
  filteredClassLevels,
  fetchClassLevelsBySchool,
  t,
}) => {
  // Use local state for immediate input updates to avoid parent re-render delays
  const [localItem, setLocalItem] = useState(item);

  // Update local state when prop changes (e.g., when opening modal with new data)
  useEffect(() => {
    setLocalItem(item);
  }, [item]);

  const handleChange = (name, value) => {
    // Update local state immediately for responsive UI
    setLocalItem(prev => ({ ...prev, [name]: value }));
    // Notify parent after a short delay (or immediately, but parent's re-render won't break focus)
    onChange(name, value);
  };

  const fields = useMemo(() => [
    { name: 'full_name', label: t('students.form.fullName'), type: 'text', required: true },
    { name: 'email', label: t('students.form.email'), type: 'email', required: false },
    { name: 'phone_number', label: t('students.form.phone'), type: 'tel', required: false },
    { name: 'birth_date', label: t('students.form.birthDate'), type: 'date', required: false },
    {
      name: 'current_academic_year_id',
      label: t('students.form.academicYear'),
      type: 'select',
      required: false,
      options: academicYears.map(y => ({ value: y.id, label: y.name })),
    },
    {
      name: 'current_school_level_id',
      label: t('students.form.schoolLevel'),
      type: 'select',
      required: false,
      options: schoolLevels.map(s => ({ value: s.id, label: s.name })),
    },
    {
      name: 'current_class_level_id',
      label: t('students.form.classLevel'),
      type: 'select',
      required: false,
      options: filteredClassLevels.map(c => ({ value: c.id, label: c.name })),
    },
  ], [academicYears, schoolLevels, filteredClassLevels, t]);

  return (
    <div className="space-y-3">
      {fields.map(field => (
        <div key={field.name}>
          <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">
            {field.label}{field.required && <span className="text-green-600 ml-0.5">*</span>}
          </label>
          {field.type === 'select' ? (
            <select
              value={localItem[field.name] ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                handleChange(field.name, value);
                if (field.name === 'current_school_level_id') {
                  fetchClassLevelsBySchool(value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent text-sm outline-none"
            >
              <option value="">— {t('students.actions.select')} —</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              value={localItem[field.name] ?? ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent text-sm outline-none"
            />
          )}
        </div>
      ))}
    </div>
  );
});

StudentForm.displayName = 'StudentForm';

// ─────────────────────────────────────────────────────────────
// ParentForm - MOVED OUTSIDE and memoized with React.memo
// ─────────────────────────────────────────────────────────────
const ParentForm = React.memo(({ item, onChange, t }) => {
  const [localItem, setLocalItem] = useState(item);

  useEffect(() => {
    setLocalItem(item);
  }, [item]);

  const handleChange = (name, value) => {
    setLocalItem(prev => ({ ...prev, [name]: value }));
    onChange(name, value);
  };

  const fields = useMemo(() => [
    { name: 'full_name', label: t('students.form.fullName'), type: 'text', required: true },
    { name: 'phone_number', label: t('students.form.phone'), type: 'tel', required: true },
    { name: 'email', label: t('students.form.email'), type: 'email', required: true },
    { name: 'physical_address', label: t('students.form.physicalAddress'), type: 'textarea', required: false },
    {
      name: 'relationship_type',
      label: t('students.form.relationshipType'),
      type: 'select',
      required: true,
      options: [
        { value: 'father', label: t('students.relationship.father') },
        { value: 'mother', label: t('students.relationship.mother') },
        { value: 'guardian', label: t('students.relationship.guardian') },
        { value: 'other', label: t('students.relationship.other') },
      ],
    },
  ], [t]);

  return (
    <div className="space-y-3">
      {fields.map(field => (
        <div key={field.name}>
          <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">
            {field.label}{field.required && <span className="text-green-600 ml-0.5">*</span>}
          </label>
          {field.type === 'select' ? (
            <select
              value={localItem[field.name] ?? ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent text-sm outline-none"
            >
              <option value="">— {t('students.actions.select')} —</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              value={localItem[field.name] ?? ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent text-sm outline-none"
              rows={3}
            />
          ) : (
            <input
              type={field.type}
              value={localItem[field.name] ?? ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-700 focus:border-transparent text-sm outline-none"
            />
          )}
        </div>
      ))}
    </div>
  );
});

ParentForm.displayName = 'ParentForm';

// ─────────────────────────────────────────────────────────────
// ModalWrapper - MOVED OUTSIDE and memoized
// ─────────────────────────────────────────────────────────────
const ModalWrapper = React.memo(({ children, maxW = 'max-w-2xl', onClose }) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ${maxW} w-full mx-4 p-5 max-h-[90vh] overflow-y-auto border border-green-100`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
});

ModalWrapper.displayName = 'ModalWrapper';


// ============================================================
// Academic Report Modal
// ============================================================
// ============================================================
// Academic Report Modal - Complete Rewrite
// ============================================================
const AcademicReportModal = ({ student, reportData, onClose, t }) => {
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);

  const terms = useMemo(() => {
    if (!reportData?.term_performances) return [];
    return reportData.term_performances;
  }, [reportData]);

  const currentPerformance = useMemo(() => {
    if (selectedTerm) return terms.find(term => term.term_id === selectedTerm);
    return terms.find(term => term.is_current) || terms[0];
  }, [terms, selectedTerm]);

  // Save report to localStorage
  const saveToLocalStorage = useCallback(() => {
    if (!student || !reportData) return;
    
    setSaving(true);
    try {
      const savedReports = JSON.parse(localStorage.getItem('saved_academic_reports') || '[]');
      const newReport = {
        id: Date.now(),
        studentId: student.id,
        studentName: student.full_name,
        rollNumber: student.roll_number,
        classLevel: student.current_class_level?.name,
        academicYear: reportData.academic_year_name,
        generatedAt: new Date().toISOString(),
        reportData: reportData
      };
      
      // Remove any existing report for same student and academic year
      const filteredReports = savedReports.filter(r => 
        !(r.studentId === student.id && r.academicYear === reportData.academic_year_name)
      );
      
      filteredReports.unshift(newReport);
      // Keep only last 50 reports
      const trimmedReports = filteredReports.slice(0, 50);
      localStorage.setItem('saved_academic_reports', JSON.stringify(trimmedReports));
      toast.success('Report saved to local storage!');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      toast.error('Failed to save to local storage');
    } finally {
      setSaving(false);
    }
  }, [student, reportData]);

  // PDF Generation Function using autoTable correctly
  const generatePDF = useCallback(async () => {
    if (!reportData || !student) return;

    setDownloading(true);
    toast.loading('Generating PDF...', { id: 'pdf-generate' });

    try {
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;

      // Colors
      const primaryColor = [21, 128, 61];
      const accentColor = [217, 119, 6];
      const lightGreen = [240, 253, 244];

      // Helper function to add header
      const addHeader = () => {
        // Logo box
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(margin, yPos, 35, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('Les Hirondelles', margin + 17.5, yPos + 15, { align: 'center' });
        doc.text('de Don Bosco', margin + 17.5, yPos + 22, { align: 'center' });

        // Title
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Student Performance Report', margin + 50, yPos + 12);

        // Subtitle
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Academic Performance Report', margin + 50, yPos + 20);

        yPos += 45;
      };

      // Helper function to add section title
      const addSectionTitle = (title, color = primaryColor) => {
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 3, yPos + 5.5);
        yPos += 12;
      };

      // Helper function to add info table
      const addInfoTable = (data) => {
        const colWidth = (pageWidth - (margin * 2) - 20) / 4;
        let currentX = margin;

        data.forEach((row, idx) => {
          if (idx % 2 === 0) {
            doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
            doc.rect(currentX, yPos, colWidth * 2, 8, 'F');
          }
          doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
          doc.rect(currentX, yPos, colWidth * 2, 8);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(row.label, currentX + 2, yPos + 5);

          doc.setTextColor(60, 60, 60);
          doc.text(row.value, currentX + colWidth + 2, yPos + 5);
          currentX += colWidth * 2;

          if (idx % 2 === 1) {
            yPos += 8;
            currentX = margin;
          }
        });
        if (data.length % 2 !== 0) yPos += 8;
        yPos += 5;
      };

      const getGradeStyle = (grade) => {
        if (grade === 'A') return { bg: [21, 128, 61], text: [255, 255, 255] };
        if (grade === 'B') return { bg: [217, 119, 6], text: [255, 255, 255] };
        if (grade === 'C') return { bg: [254, 243, 199], text: [146, 64, 14] };
        if (grade === 'D') return { bg: [220, 252, 231], text: [22, 101, 52] };
        return { bg: [243, 244, 246], text: [107, 114, 128] };
      };

      const getScoreBg = (score) => {
        if (score >= 90) return [21, 128, 61];
        if (score >= 80) return [217, 119, 6];
        if (score >= 70) return [254, 243, 199];
        if (score >= 60) return [220, 252, 231];
        return [243, 244, 246];
      };

      const getScoreColor = (score) => {
        if (score >= 90 || score >= 80) return [255, 255, 255];
        if (score >= 70 || score >= 60) return [146, 64, 14];
        return [107, 114, 128];
      };

      // Prepare data
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

      const gradeScale = [
        { range: '90–100', grade: 'A' }, { range: '80–89', grade: 'B' },
        { range: '70–79', grade: 'C' }, { range: '60–69', grade: 'D' },
        { range: '30–59', grade: 'E' }, { range: '0–29', grade: 'F' },
      ];

      // Build PDF
      addHeader();

      // Student Info
      addSectionTitle('Student Information', primaryColor);
      const infoData = [
        { label: 'Student Name:', value: student.full_name || 'N/A' },
        { label: 'Roll Number:', value: student.roll_number || 'N/A' },
        { label: 'Class Level:', value: student.current_class_level?.name || 'N/A' },
        { label: 'Academic Year:', value: reportData.academic_year_name || 'N/A' },
      ];
      addInfoTable(infoData);

      // Performance Table - Using autoTable correctly
      addSectionTitle('Semestral Grades and Final Performance', primaryColor);

      const tableHeaders = ['Subject', ...terms.map(t => t.term_name), 'Overall Avg', 'Grade'];
      const tableBody = subjectRows.map(row => [
        row.name,
        ...row.scores.map(s => s !== null ? s.toFixed(1) : '—'),
        row.avg !== null ? row.avg.toFixed(2) : '—',
        row.grade
      ]);

      // Add total row
      tableBody.push([
        'OVERALL AVERAGE',
        ...terms.map(() => ''),
        totalAvg !== null ? totalAvg.toFixed(2) : '—',
        totalGrade
      ]);

      // Use autoTable function - note: it's imported as autoTable, not doc.autoTable
      doc.autoTable({
        startY: yPos,
        head: [tableHeaders],
        body: tableBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle', halign: 'center' },
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { textColor: [60, 60, 60] },
        alternateRowStyles: { fillColor: lightGreen },
        columnStyles: {
          0: { halign: 'left', cellWidth: 45 },
        },
        didDrawCell: (data) => {
          const { column, row, cell, doc: pdfDoc } = data;
          
          // Color grade cells
          if (column.index === tableHeaders.length - 1 && row.section === 'body') {
            const grade = cell.text[0];
            if (grade && grade !== '—') {
              const gradeStyle = getGradeStyle(grade);
              pdfDoc.setFillColor(gradeStyle.bg[0], gradeStyle.bg[1], gradeStyle.bg[2]);
              pdfDoc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
              pdfDoc.setTextColor(gradeStyle.text[0], gradeStyle.text[1], gradeStyle.text[2]);
              pdfDoc.text(grade, cell.x + cell.width / 2, cell.y + cell.height / 2 + 1.5, { align: 'center' });
            }
          }
          // Color overall average cells
          if (column.index === tableHeaders.length - 2 && row.section === 'body') {
            const avgText = cell.text[0];
            if (avgText !== '—' && !isNaN(parseFloat(avgText))) {
              const avg = parseFloat(avgText);
              const bgColor = getScoreBg(avg);
              const textColor = getScoreColor(avg);
              pdfDoc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
              pdfDoc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
              pdfDoc.setTextColor(textColor[0], textColor[1], textColor[2]);
              pdfDoc.text(avgText, cell.x + cell.width / 2, cell.y + cell.height / 2 + 1.5, { align: 'center' });
            }
          }
          // Color subject scores
          if (column.index > 0 && column.index < tableHeaders.length - 2 && row.section === 'body' && row.index < subjectRows.length) {
            const scoreText = cell.text[0];
            if (scoreText !== '—' && !isNaN(parseFloat(scoreText))) {
              const score = parseFloat(scoreText);
              const bgColor = getScoreBg(score);
              const textColor = getScoreColor(score);
              pdfDoc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
              pdfDoc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
              pdfDoc.setTextColor(textColor[0], textColor[1], textColor[2]);
              pdfDoc.text(scoreText, cell.x + cell.width / 2, cell.y + cell.height / 2 + 1.5, { align: 'center' });
            }
          }
        }
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Grade Scale Table
      addSectionTitle('Grade Scale', accentColor);
      doc.autoTable({
        startY: yPos,
        head: [['Range', 'Grade']],
        body: gradeScale.map(item => [item.range, item.grade]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
        headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 30 } },
        didDrawCell: (data) => {
          const { column, row, cell, doc: pdfDoc } = data;
          if (column.index === 1 && row.section === 'body') {
            const grade = cell.text[0];
            const gradeStyle = getGradeStyle(grade);
            pdfDoc.setFillColor(gradeStyle.bg[0], gradeStyle.bg[1], gradeStyle.bg[2]);
            pdfDoc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
            pdfDoc.setTextColor(gradeStyle.text[0], gradeStyle.text[1], gradeStyle.text[2]);
            pdfDoc.text(grade, cell.x + cell.width / 2, cell.y + cell.height / 2 + 1.5, { align: 'center' });
          }
        }
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Discipline & Attendance
      if (currentPerformance?.discipline) {
        addSectionTitle('Discipline & Attendance', primaryColor);
        
        doc.autoTable({
          startY: yPos,
          body: [
            ['Attendance Rate', `${(currentPerformance.discipline.attendance_rate ?? 0).toFixed(1)}%`],
            ['Present Days', (currentPerformance.discipline.present ?? 0).toString()],
            ['Absent Days', (currentPerformance.discipline.absent ?? 0).toString()],
            ['Late Arrivals', (currentPerformance.discipline.late ?? 0).toString()],
          ],
          margin: { left: margin, right: margin },
          styles: { fontSize: 10, cellPadding: 4 },
          columnStyles: { 
            0: { cellWidth: 60, fontStyle: 'bold', textColor: primaryColor }, 
            1: { cellWidth: 40, halign: 'center' } 
          },
          theme: 'grid',
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // Remarks
      if (currentPerformance?.remarks) {
        doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 12, 'F');
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(margin, yPos, 4, 12, 'F');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Remarks:', margin + 6, yPos + 5);
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'normal');
        const remarksLines = doc.splitTextToSize(currentPerformance.remarks, pageWidth - (margin * 2) - 10);
        doc.text(remarksLines, margin + 6, yPos + 5);
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Les Hirondelles de Don Bosco — Quality Education for All', pageWidth / 2, footerY, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY + 5, { align: 'center' });

      // Save PDF
      const filename = `Academic_Report_${student.roll_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
      // Save to localStorage
      saveToLocalStorage();

      toast.success('PDF downloaded and saved to local storage!', { id: 'pdf-generate' });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF: ' + error.message, { id: 'pdf-generate' });
    } finally {
      setDownloading(false);
    }
  }, [reportData, student, saveToLocalStorage, terms, currentPerformance]);

  const handlePrint = () => window.print();
  
  const handleDownloadJSON = () => {
    const dataStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `academic_report_${student.roll_number}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('JSON report downloaded successfully');
    saveToLocalStorage();
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
    modal: { background: C.white, borderRadius: '12px', maxWidth: '1000px', width: '100%', maxHeight: '92vh', overflowY: 'auto', fontFamily: "'Georgia', 'Times New Roman', serif", color: C.text, boxShadow: '0 25px 60px rgba(0,0,0,0.35)' },
    stickyBar: { 
      position: 'sticky', 
      top: 0, 
      background: C.white, 
      borderBottom: `3px solid ${C.primary}`, 
      padding: '10px 20px', 
      display: 'flex', 
      justifyContent: 'flex-end', 
      gap: '8px', 
      zIndex: 10,
      '@media print': { display: 'none' } // Hide buttons when printing
    },
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
        {/* Action Buttons - Hidden when printing via CSS */}
        <div style={S.stickyBar} className="no-print">
          <button onClick={generatePDF} disabled={downloading} style={S.outlineBtn}>
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            PDF
          </button>
 
          <button onClick={onClose} style={S.solidBtn}>
            <X className="w-4 h-4" /> Close
          </button>
        </div>
        
        {/* Report Content - Visible when printing */}
        <div style={S.body}>
          <div style={S.headerRow}>
            <div style={S.logoBox}>
              <GraduationCap size={32} color={C.accent} />
              <div style={S.logoText}>Les Hirondelles<br />de Don Bosco</div>
            </div>
            <div>
              <h1 style={S.reportTitle}>Student Performance Report</h1>
              <p style={{ margin: '4px 0 0', fontFamily: 'sans-serif', fontSize: '13px', color: C.textMuted }}>Academic Performance Report</p>
            </div>
          </div>
          
          <table style={S.infoTable}>
            <tbody>
              <tr>
                <td style={{ ...S.infoTd, ...S.infoLabel }}>Student Name</td>
                <td style={{ ...S.infoTd, ...S.infoValue }}>{student.full_name}</td>
                <td style={{ ...S.infoTd, ...S.infoLabel }}>Class Level</td>
                <td style={{ ...S.infoTd, ...S.infoValue }}>{student.current_class_level?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ ...S.infoTd, ...S.infoLabel }}>Academic Year</td>
                <td style={{ ...S.infoTd, ...S.infoValue }}>{reportData.academic_year_name}</td>
                <td style={{ ...S.infoTd, ...S.infoLabel }}>Roll Number</td>
                <td style={{ ...S.infoTd, ...S.infoValue }}>{student.roll_number}</td>
              </tr>
            </tbody>
          </table>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.greenHeader}>Semestral Grades and Final Performance</div>
              <table style={S.gradeTable}>
                <thead>
                  <tr>
                    <th style={{ ...S.thLeft, minWidth: '130px' }}>Subject</th>
                    {terms.map(term => <th key={term.term_id} style={S.th}>{term.term_name}</th>)}
                    <th style={S.th}>Overall Avg</th>
                    <th style={S.th}>Grade</th>
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
                    <td style={S.tdTotalLabel}>OVERALL AVERAGE</td>
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
              <div style={S.amberHeader}>Grade Scale</div>
              <table style={S.scaleTable}>
                <thead>
                  <tr>
                    <th style={S.scaleTh}>Range</th>
                    <th style={{ ...S.scaleTh, textAlign: 'center' }}>Grade</th>
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
              <div style={S.greenHeader}>Discipline & Attendance</div>
              <div style={S.disciplineGrid}>
                {[
                  { label: 'Attendance Rate', value: `${(currentPerformance.discipline.attendance_rate ?? 0).toFixed(1)}%` },
                  { label: 'Present', value: currentPerformance.discipline.present ?? 0 },
                  { label: 'Absent', value: currentPerformance.discipline.absent ?? 0 },
                  { label: 'Late', value: currentPerformance.discipline.late ?? 0 },
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
              <strong style={{ color: C.primary }}>Remarks: </strong>
              {currentPerformance.remarks}
            </div>
          )}
          
          <div style={S.footer}>
            <p style={{ margin: '0 0 4px' }}>Les Hirondelles de Don Bosco — Quality Education for All</p>
            <p style={{ margin: 0 }}>Generated on: {new Date().toLocaleDateString()} | Official Academic Report</p>
          </div>
        </div>
      </div>
      
      {/* Print-specific CSS to hide buttons */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .fixed, [class*="fixed"], [style*="position: fixed"] {
            display: none !important;
          }
          [style*="position: fixed"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const StudentManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── UI state ──────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('students');

  // ── Data states ────────────────────────────────────────────
  const [allStudents, setAllStudents] = useState([]);
  const [allParents, setAllParents] = useState([]);
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);

  // ── Filtered data ─────────────────────────────────────────
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [filteredParents, setFilteredParents] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);

  // ── Search and Filters ─────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    school_level_id: '',
    class_level_id: '',
    academic_year_id: '',
    relationship_type: '',
    classroom_id: '',
  });

  // ── Dynamic dropdown data ──────────────────────────────────
  const [filteredClassLevels, setFilteredClassLevels] = useState([]);
  const [filteredTerms, setFilteredTerms] = useState([]);

  // ── Pagination states ─────────────────────────────────────
  const [studentsPage, setStudentsPage] = useState(1);
  const [parentsPage, setParentsPage] = useState(1);
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ── Modal states ──────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedStudentForPerformance, setSelectedStudentForPerformance] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [newItem, setNewItem] = useState({});
  const [editItem, setEditItem] = useState({});
  const [assignData, setAssignData] = useState({});
  const [reportData, setReportData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  // ── Additional data for modals ─────────────────────────────
  const [studentParents, setStudentParents] = useState([]);
  const [studentTeachers, setStudentTeachers] = useState(null);
  const [parentStudents, setParentStudents] = useState([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // ── Dropdown data ──────────────────────────────────────────
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  // ── Stats ─────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total_students: 0, active_students: 0, inactive_students: 0,
    total_parents: 0, active_parents: 0,
    total_assignments: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [studentId, setStudentId] = useState(null);
  const [academicYearId, setAcademicYearId] = useState(null);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);



  const fetchAcademicReport = useCallback(async (studentId, academicYearId) => {
    if (!studentId) return;
    setLoadingReport(true);
    try {
      const url = `/academics-records/performance/student/${studentId}/full-report/`;
      const params = new URLSearchParams();
      if (academicYearId) params.append('academic_year_id', academicYearId);
      const res = await apiClient.get(`${url}?${params.toString()}`);
      if (res.data.success) { setReportData(res.data.data); setShowReportModal(true); }
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error(t('parent_dashboard.reportError'));
    } finally {
      setLoadingReport(false);
    }
  }, [t]);

  // ─────────────────────────────────────────────────────────
  // Helper Functions
  // ─────────────────────────────────────────────────────────

  const fetchClassLevelsBySchool = useCallback(async (schoolLevelId) => {
    if (!schoolLevelId) {
      setFilteredClassLevels(classLevels);
      return;
    }
    try {
      const response = await apiClient.get(`/academics/school-levels/${schoolLevelId}/class-levels/`);
      const levels = response.data.data || [];
      setFilteredClassLevels(levels);
    } catch (error) {
      console.error('Error fetching class levels:', error);
      setFilteredClassLevels([]);
    }
  }, [classLevels]);

  const fetchTermsByAcademicYear = useCallback(async (academicYearId) => {
    if (!academicYearId) {
      setFilteredTerms(terms);
      return;
    }
    try {
      const response = await apiClient.get(`/academics/terms/?academic_year=${academicYearId}`);
      const termsList = response.data.data?.results || response.data.data || [];
      setFilteredTerms(termsList);
    } catch (error) {
      console.error('Error fetching terms:', error);
      setFilteredTerms([]);
    }
  }, [terms]);

  // ─────────────────────────────────────────────────────────
  // API Calls
  // ─────────────────────────────────────────────────────────

  const fetchParentsForStudent = useCallback(async (studentId) => {
    setLoadingParents(true);
    try {
      const response = await apiClient.get(`/students/${studentId}/parents/`);
      const parentsData = response.data.data?.parents || response.data.data || [];
      setStudentParents(parentsData);
      return parentsData;
    } catch (error) {
      console.error('Error fetching parents for student:', error);
      toast.error(t('students.messages.fetchError'));
      setStudentParents([]);
      return [];
    } finally {
      setLoadingParents(false);
    }
  }, [t]);

  const fetchTeachersForStudent = useCallback(async (studentId) => {
    setLoadingTeachers(true);
    try {
      const response = await apiClient.get(`/students/${studentId}/teachers-with-subjects/`);
      const teachersData = response.data.data;
      setStudentTeachers(teachersData);
      return teachersData;
    } catch (error) {
      console.error('Error fetching teachers for student:', error);
      toast.error(t('students.messages.fetchError'));
      setStudentTeachers(null);
      return null;
    } finally {
      setLoadingTeachers(false);
    }
  }, [t]);

  const fetchStudentsForParent = useCallback(async (parentId) => {
    setLoadingStudents(true);
    try {
      const response = await apiClient.get(`/students/parents/${parentId}/students/`);
      const studentsData = response.data.data?.students || response.data.data || [];
      setParentStudents(studentsData);
      return studentsData;
    } catch (error) {
      console.error('Error fetching students for parent:', error);
      toast.error(t('students.messages.fetchError'));
      setParentStudents([]);
      return [];
    } finally {
      setLoadingStudents(false);
    }
  }, [t]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        studentsRes, parentsRes, classroomsRes,
        academicYearsRes, schoolLevelsRes, classLevelsRes, termsRes,
      ] = await Promise.all([
        apiClient.get('/students/?page_size=1000'),
        apiClient.get('/students/parents/?page_size=1000'),
        apiClient.get('/academics/class-rooms/'),
        apiClient.get('/academics/academic-years/'),
        apiClient.get('/academics/school-levels/'),
        apiClient.get('/academics/class-levels/'),
        apiClient.get('/academics/terms/'),
      ]);

      const studentsData = studentsRes.data.data?.results ?? studentsRes.data.data ?? [];
      const parentsData = parentsRes.data.data?.results ?? parentsRes.data.data ?? [];
      const classroomsData = classroomsRes.data.data?.results ?? classroomsRes.data.data ?? [];
      const academicYearsData = academicYearsRes.data.data?.results ?? academicYearsRes.data.data ?? [];
      const schoolLevelsData = schoolLevelsRes.data.data?.results ?? schoolLevelsRes.data.data ?? [];
      const classLevelsData = classLevelsRes.data.data?.results ?? classLevelsRes.data.data ?? [];
      const termsData = termsRes.data.data?.results ?? termsRes.data.data ?? [];

      const assignmentsPromises = studentsData.map(student =>
        apiClient.get(`/students/${student.id}/classrooms/`).catch(() => ({ data: { data: [] } }))
      );
      const assignmentsResults = await Promise.all(assignmentsPromises);

      const allAssignmentsData = [];
      assignmentsResults.forEach((res, idx) => {
        const student = studentsData[idx];
        const assignments = res.data.data ?? [];
        assignments.forEach(assign => {
          allAssignmentsData.push({
            ...assign,
            student_name: student.full_name,
            student_roll_number: student.roll_number,
            student_status: student.status,
          });
        });
      });

      setAllStudents(studentsData);
      setAllParents(parentsData);
      setAllAssignments(allAssignmentsData);
      setAllClassrooms(classroomsData);
      setAcademicYears(academicYearsData);
      setSchoolLevels(schoolLevelsData);
      setClassLevels(classLevelsData);
      setTerms(termsData);
      setFilteredClassLevels(classLevelsData);
      setFilteredTerms(termsData);

      setStats({
        total_students: studentsData.length,
        active_students: studentsData.filter(s => s.status === 'active').length,
        inactive_students: studentsData.filter(s => s.status === 'inactive').length,
        total_parents: parentsData.length,
        active_parents: parentsData.filter(p => p.status === 'active').length,
        total_assignments: allAssignmentsData.length,
      });
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error(t('students.messages.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // ── Frontend filtering ────────────────────────────────────
  useEffect(() => {
    let filtered = [...allStudents];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.full_name?.toLowerCase().includes(term) ||
        s.roll_number?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.user?.username?.toLowerCase().includes(term)
      );
    }
    if (filters.status) filtered = filtered.filter(s => s.status === filters.status);
    if (filters.school_level_id) filtered = filtered.filter(s => s.current_school_level?.id == filters.school_level_id);
    if (filters.class_level_id) filtered = filtered.filter(s => s.current_class_level?.id == filters.class_level_id);
    if (filters.academic_year_id) filtered = filtered.filter(s => s.current_academic_year?.id == filters.academic_year_id);
    setFilteredStudents(filtered);
    setStudentsPage(1);
  }, [allStudents, searchTerm, filters]);

  useEffect(() => {
    let filtered = [...allParents];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.full_name?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.phone_number?.toLowerCase().includes(term)
      );
    }
    if (filters.status) filtered = filtered.filter(p => p.status === filters.status);
    if (filters.relationship_type) filtered = filtered.filter(p => p.relationship_type === filters.relationship_type);
    setFilteredParents(filtered);
    setParentsPage(1);
  }, [allParents, searchTerm, filters]);

  useEffect(() => {
    let filtered = [...allAssignments];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.student_name?.toLowerCase().includes(term) ||
        a.student_roll_number?.toLowerCase().includes(term) ||
        a.classroom?.name?.toLowerCase().includes(term)
      );
    }
    if (filters.classroom_id) filtered = filtered.filter(a => a.classroom?.id == filters.classroom_id);
    if (filters.academic_year_id) filtered = filtered.filter(a => a.academic_year?.id == filters.academic_year_id);
    if (filters.status) filtered = filtered.filter(a => a.status === filters.status);
    setFilteredAssignments(filtered);
    setAssignmentsPage(1);
  }, [allAssignments, searchTerm, filters]);

  // ── Handle filter changes ─────────────────────────────────
  const handleSchoolLevelFilterChange = useCallback((value) => {
    setFilters({ ...filters, school_level_id: value, class_level_id: '' });
    fetchClassLevelsBySchool(value);
  }, [filters, fetchClassLevelsBySchool]);

  const handleAcademicYearFilterChange = useCallback((value) => {
    setFilters({ ...filters, academic_year_id: value });
    fetchTermsByAcademicYear(value);
  }, [filters, fetchTermsByAcademicYear]);

  // ── Pagination helpers ────────────────────────────────────
  const getPaginatedData = useCallback((data, page) => {
    const start = (page - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [itemsPerPage]);

  const paginatedStudents = getPaginatedData(filteredStudents, studentsPage);
  const paginatedParents = getPaginatedData(filteredParents, parentsPage);
  const paginatedAssignments = getPaginatedData(filteredAssignments, assignmentsPage);

  const totalStudentsPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const totalParentsPages = Math.ceil(filteredParents.length / itemsPerPage);
  const totalAssignmentsPages = Math.ceil(filteredAssignments.length / itemsPerPage);

  // ── CRUD Operations ────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    setLoading(true);
    try {
      const url = activeTab === 'students' ? '/students/create/' : '/students/parents/create/';
      const res = await apiClient.post(url, newItem);
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.createSuccess'));
        setShowAddModal(false);
        setNewItem({});
        fetchAllData();
      } else {
        toast.error(Object.values(res.data.errors || {}).flat()[0] || res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.createError'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, newItem, t, fetchAllData]);

  const handleUpdate = useCallback(async () => {
    setLoading(true);
    try {
      const url = activeTab === 'students'
        ? `/students/${editItem.id}/update/`
        : `/students/parents/${editItem.id}/update/`;
      const payload = { ...editItem };
      delete payload.id;
      const res = await apiClient.patch(url, payload);
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.updateSuccess'));
        setShowEditModal(false);
        setEditItem({});
        fetchAllData();
      } else {
        toast.error(Object.values(res.data.errors || {}).flat()[0] || res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.updateError'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, editItem, t, fetchAllData]);

  const handleDelete = useCallback(async () => {
    setLoading(true);
    try {
      const url = activeTab === 'students'
        ? `/students/${selectedItem.id}/delete/`
        : `/students/parents/${selectedItem.id}/delete/`;
      const res = await apiClient.delete(url);
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.deleteSuccess'));
        setShowDeleteModal(false);
        setSelectedItem(null);
        fetchAllData();
      } else {
        toast.error(res.data.message || t('students.messages.deleteError'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.deleteError'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedItem, t, fetchAllData]);

  const handleAssignClassroom = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/students/classrooms/assign/', assignData);
      if (res.data.success) {
        toast.success(t('students.messages.assignmentSuccess'));
        setShowAssignModal(false);
        setAssignData({});
        fetchAllData();
      } else {
        toast.error(res.data.message || t('students.messages.assignmentError'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.assignmentError'));
    } finally {
      setLoading(false);
    }
  }, [assignData, t, fetchAllData]);

  const handleUnassignClassroom = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.patch(`/students/classrooms/${selectedAssignment.id}/update/`, {
        status: 'inactive',
      });
      if (res.data.success) {
        toast.success(t('students.messages.unassignSuccess'));
        setShowUnassignModal(false);
        setSelectedAssignment(null);
        fetchAllData();
      } else {
        toast.error(res.data.message || t('students.messages.unassignError'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.unassignError'));
    } finally {
      setLoading(false);
    }
  }, [selectedAssignment, t, fetchAllData]);

  const handleLinkParent = useCallback(async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/students/parents/create/', {
        ...newItem,
        student_ids: [selectedItem.id],
      });
      if (res.data.success) {
        toast.success(res.data.message || t('students.messages.parentLinked'));
        setShowLinkModal(false);
        setNewItem({});
        fetchAllData();
      } else {
        toast.error(Object.values(res.data.errors || {}).flat()[0] || res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('students.messages.createError'));
    } finally {
      setLoading(false);
    }
  }, [selectedItem, newItem, t, fetchAllData]);

  // ── Performance Data ───────────────────────────────────────
  const fetchStudentPerformance = useCallback(async (studentId, academicYearId, termId) => {
    setLoadingPerformance(true);
    try {
      let url = `/academics-records/performance/student/${studentId}/`;
      const params = new URLSearchParams();
      if (academicYearId) params.append('academic_year_id', academicYearId);
      if (termId) params.append('term_id', termId);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await apiClient.get(url);
      if (res.data.success) setPerformanceData(res.data.data);
    } catch (err) {
      console.error('Performance fetch error:', err);
      toast.error(t('students.messages.performanceError'));
    } finally {
      setLoadingPerformance(false);
    }
  }, [t]);

  // ── Report Generation ──────────────────────────────────────
  const handleGenerateReport = useCallback(async () => {
    setLoading(true);
    try {
      setReportData({
        generated_on: new Date().toLocaleString(),
        students: allStudents,
        parents: allParents,
        assignments: allAssignments,
        summary: {
          total_students: allStudents.length,
          active_students: allStudents.filter(s => s.status === 'active').length,
          inactive_students: allStudents.filter(s => s.status === 'inactive').length,
          total_parents: allParents.length,
          active_parents: allParents.filter(p => p.status === 'active').length,
          total_assignments: allAssignments.length,
          active_assignments: allAssignments.filter(a => a.status === 'active').length,
          students_with_parents: allStudents.filter(s => s.parents_count > 0).length,
        },
      });
      setShowReportModal(true);
      toast.success(t('students.messages.reportGenerated'));
    } catch (err) {
      toast.error(t('students.messages.reportError'));
    } finally {
      setLoading(false);
    }
  }, [allStudents, allParents, allAssignments, t]);

  // ── Modal Handlers ─────────────────────────────────────────
  const openEditModal = useCallback((item) => {
    setEditItem({ ...item });
    setShowEditModal(true);
  }, []);

  const openViewModal = useCallback(async (item, tabType) => {
    setSelectedItem(item);
    setShowViewModal(true);
    if (tabType === 'students') {
      await fetchParentsForStudent(item.id);
      await fetchTeachersForStudent(item.id);
    } else if (tabType === 'parents') {
      await fetchStudentsForParent(item.id);
    }
  }, [fetchParentsForStudent, fetchTeachersForStudent, fetchStudentsForParent]);

  const openPerformanceModal = useCallback(async (student) => {
    setSelectedStudentForPerformance(student);
    setShowPerformanceModal(true);
    const academicYearId = filters.academic_year_id || (academicYears.find(y => y.is_current)?.id);
    await fetchStudentPerformance(student.id, academicYearId, null);
  }, [filters.academic_year_id, academicYears, fetchStudentPerformance]);

  const openAssignModal = useCallback((student) => {
    setAssignData({
      student_id: student.id,
      academic_year_id: student.current_academic_year?.id || '',
      class_level_id: student.current_class_level?.id || '',
      school_level_id: student.current_school_level?.id || '',
      classroom_id: '',
    });
    setShowAssignModal(true);
  }, []);

  // ── Form Field Handlers ────────────────────────────────────
  const handleNewItemChange = useCallback((name, value) => {
    setNewItem(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleEditItemChange = useCallback((name, value) => {
    setEditItem(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleAssignDataChange = useCallback((name, value) => {
    setAssignData(prev => ({ ...prev, [name]: value }));
  }, []);

  // ── Chat Functions ─────────────────────────────────────────
  const handleChatWithUser = useCallback(async (userId, userName, userRole) => {
    if (!userId) { toast.error(t('students.messages.noUserAccount')); return; }

    const roomType = userRole === 'parent' ? 'admin_parent'
      : userRole === 'student' ? 'admin_student'
        : 'admin_teacher';

    try {
      const response = await apiClient.get('/chat/chatrooms/all/');
      const chatrooms = response.data.chatrooms || [];

      let existingRoom = chatrooms.find(room =>
        room.room_type === roomType &&
        room.members?.some(m => m.user_id === userId || m.user === userId)
      );

      let roomId;
      if (existingRoom) {
        roomId = existingRoom.id;
      } else {
        const createResponse = await apiClient.post('/chat/chatrooms/create/', {
          name: `Chat with ${userName}`,
          room_type: roomType,
          user_id: userId,
        });
        if (createResponse.data.chatroom) {
          roomId = createResponse.data.chatroom.id;
        } else {
          toast.error(t('students.messages.chatCreationError'));
          return;
        }
      }
      navigate(`/app/chat?room=${roomId}`);
    } catch (error) {
      console.error('Error setting up chat:', error);
      toast.error(t('students.messages.chatError'));
    }
  }, [navigate, t]);

  // ── Render View Modal Content ──────────────────────────────
  const renderStudentViewContent = useCallback(() => {
    if (!selectedItem) return null;
    const studentAssignments = allAssignments.filter(a => a.student === selectedItem.id);
    const activeAssignment = studentAssignments.find(a => a.status === 'active');

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-green-700 flex items-center justify-center text-white text-lg font-bold">
            {selectedItem.full_name?.[0] ?? 'S'}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{selectedItem.full_name}</p>
            <p className="text-xs font-mono text-green-700 dark:text-green-400">{selectedItem.roll_number}</p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" />
              {selectedItem.user?.username || t('students.labels.noUserAccount')}
            </p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadge(selectedItem.status)}`}>
            {t(`students.status.${selectedItem.status}`)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            [t('students.table.email'), selectedItem.email || '—'],
            [t('students.table.phone'), selectedItem.phone_number || '—'],
            [t('students.form.birthDate'), selectedItem.birth_date || '—'],
            [t('students.table.schoolLevel'), selectedItem.current_school_level?.name || '—'],
            [t('students.table.classLevel'), selectedItem.current_class_level?.name || '—'],
            [t('students.form.academicYear'), selectedItem.current_academic_year?.name || '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="font-medium text-gray-800 dark:text-white text-xs">{value}</p>
            </div>
          ))}
        </div>

        {/* Classroom */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-900/30">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
            <DoorOpen className="w-3.5 h-3.5" /> {t('students.classroom.currentAssignment')}
          </p>
          {activeAssignment ? (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800 dark:text-white">{activeAssignment.classroom?.name}</p>
                <p className="text-xs text-gray-500">{activeAssignment.academic_year?.name} • {activeAssignment.term?.name || 'No term'}</p>
              </div>
              <button
                onClick={() => { setShowViewModal(false); setSelectedAssignment(activeAssignment); setShowUnassignModal(true); }}
                className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 transition-colors"
              >
                {t('students.actions.unassign')}
              </button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-gray-400">{t('students.messages.noClassroomAssigned')}</p>
              <button
                onClick={() => { setShowViewModal(false); openAssignModal(selectedItem); }}
                className="mt-2 text-xs text-green-700 hover:text-green-800 font-medium"
              >
                + {t('students.actions.assignClassroom')}
              </button>
            </div>
          )}
        </div>

        {/* Parents */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-2">
            <Shield className="w-3.5 h-3.5" /> {t('students.tabs.parents')} ({studentParents.length})
          </p>
          {loadingParents ? (
            <div className="text-center py-4"><Spinner /><p className="text-xs text-gray-400 mt-1">Loading parents...</p></div>
          ) : studentParents.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {studentParents.map(parent => (
                <div key={parent.id} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100">
                  <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {parent.full_name?.[0] ?? 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{parent.full_name}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 rounded-full capitalize">
                          {t(`students.relationship.${parent.relationship_type}`) || parent.relationship_type}
                        </span>
                        <button
                          onClick={() => {
                            setShowViewModal(false);
                            const userId = parent.user_id || parent.user?.id;
                            userId ? handleChatWithUser(userId, parent.full_name, 'parent') : toast.error(t('students.messages.noUserAccount'));
                          }}
                          className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors ml-1"
                          title="Chat with parent"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {parent.phone_number || '—'}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {parent.email || '—'}</p>
                    {parent.physical_address && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {parent.physical_address}</p>
                    )}
                    <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full ${getStatusBadge(parent.status)}`}>
                      {t(`students.status.${parent.status}`)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <p className="text-xs text-gray-400">{t('students.messages.noParentsLinked')}</p>
              <button
                onClick={() => { setShowViewModal(false); setSelectedItem(selectedItem); setShowLinkModal(true); }}
                className="mt-2 text-xs text-green-700 hover:text-green-800 font-medium flex items-center gap-1 justify-center"
              >
                <Plus className="w-3 h-3" /> {t('students.actions.addParent')}
              </button>
            </div>
          )}
        </div>

        {/* Teachers */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-2">
            <BookOpen className="w-3.5 h-3.5" /> {t('students.tabs.teachers')} ({studentTeachers?.teachers?.length || 0})
          </p>
          {loadingTeachers ? (
            <div className="text-center py-4"><Spinner /><p className="text-xs text-gray-400 mt-1">Loading teachers...</p></div>
          ) : studentTeachers?.teachers?.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {studentTeachers.teachers.map(teacher => (
                <div key={teacher.id} className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {teacher.full_name?.[0] ?? 'T'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{teacher.full_name}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 rounded-full">
                            {teacher.specialization || 'Teacher'}
                          </span>
                          <button
                            onClick={() => {
                              setShowViewModal(false);
                              const userId = teacher.user_id || teacher.user?.id;
                              userId ? handleChatWithUser(userId, teacher.full_name, 'teacher') : toast.error(t('students.messages.noUserAccount'));
                            }}
                            className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors ml-1"
                            title="Chat with teacher"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {teacher.email || '—'}</p>
                      {teacher.phone_number && (
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {teacher.phone_number}</p>
                      )}
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Subjects taught:</p>
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects?.map(subject => (
                            <span key={subject.id} className="text-xs px-2 py-0.5 bg-white dark:bg-gray-800 rounded-full border border-purple-200 dark:border-purple-800">
                              {subject.name} ({subject.code})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <p className="text-xs text-gray-400">No teachers assigned to this student yet.</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowViewModal(false);
              openPerformanceModal(selectedItem);
            }}
            className="flex-1 py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            {t('students.actions.viewPerformance') || 'View Performance'}
          </button>
          <button
            onClick={async () => {
              setShowViewModal(false);
              const academicYearId = filters.academic_year_id || (academicYears.find(y => y.is_current)?.id);
              await fetchAcademicReport(selectedItem.id, academicYearId);
            }}
            className="flex-1 py-2 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {t('students.actions.fullReport') || 'Full Report'}
          </button>
        </div>
      </div>
    );
  }, [selectedItem, allAssignments, studentParents, loadingParents, studentTeachers, loadingTeachers, t, openAssignModal, openPerformanceModal, handleChatWithUser]);

  const renderParentViewContent = useCallback(() => {
    if (!selectedItem) return null;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-green-50 dark:from-amber-900/20 dark:to-green-900/20 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-amber-600 flex items-center justify-center text-white text-lg font-bold">
            {selectedItem.full_name?.[0] ?? 'P'}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{selectedItem.full_name}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 capitalize">
              {t(`students.relationship.${selectedItem.relationship_type}`)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" />
              {selectedItem.user?.username || t('students.labels.noUserAccount')}
            </p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadge(selectedItem.status)}`}>
            {t(`students.status.${selectedItem.status}`)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            [t('students.table.phone'), selectedItem.phone_number],
            [t('students.table.email'), selectedItem.email],
            [t('students.form.physicalAddress'), selectedItem.physical_address || '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="font-medium text-gray-800 dark:text-white text-xs break-all">{value || '—'}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-2">
            <GraduationCap className="w-3.5 h-3.5" /> {t('students.tabs.students')} ({parentStudents.length})
          </p>
          {loadingStudents ? (
            <div className="text-center py-4"><Spinner /><p className="text-xs text-gray-400 mt-1">Loading students...</p></div>
          ) : parentStudents.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {parentStudents.map(student => (
                <div key={student.id} className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {student.full_name?.[0] ?? 'S'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{student.full_name}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(student.status)}`}>
                            {t(`students.status.${student.status}`)}
                          </span>
                          <button
                            onClick={() => {
                              setShowViewModal(false);
                              const userId = student.user_id || student.user?.id;
                              userId ? handleChatWithUser(userId, student.full_name, 'student') : toast.error(t('students.messages.noUserAccount'));
                            }}
                            className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                            title="Chat with student"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-green-700 dark:text-green-400 mt-0.5">Roll: {student.roll_number}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div><p className="text-gray-500">School Level</p><p className="font-medium">{student.current_school_level?.name || '—'}</p></div>
                        <div><p className="text-gray-500">Class Level</p><p className="font-medium">{student.current_class_level?.name || '—'}</p></div>
                        <div><p className="text-gray-500">Classroom</p><p className="font-medium">{student.current_classroom?.name || '—'}</p></div>
                        <div><p className="text-gray-500">Academic Year</p><p className="font-medium">{student.current_academic_year?.name || '—'}</p></div>
                      </div>
                      {student.email && <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Mail className="w-3 h-3" /> {student.email}</p>}
                      {student.phone_number && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {student.phone_number}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <p className="text-xs text-gray-400">No students linked to this parent yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  }, [selectedItem, parentStudents, loadingStudents, t, handleChatWithUser]);

  const renderViewModalContent = useCallback(() => {
    if (!selectedItem) return null;
    if (activeTab === 'students') return renderStudentViewContent();
    if (activeTab === 'parents') return renderParentViewContent();
    return null;
  }, [selectedItem, activeTab, renderStudentViewContent, renderParentViewContent]);

  // ── Performance Modal Content ──────────────────────────────
  const renderPerformanceContent = useCallback(() => {
    if (!performanceData) return null;
    const { academic_performance, discipline } = performanceData;
    const academic = academic_performance || {};
    const disc = discipline || {};

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-green-700 flex items-center justify-center text-white text-xl font-bold">
            {selectedStudentForPerformance?.full_name?.[0] ?? 'S'}
          </div>
          <div>
            <p className="font-bold text-lg text-gray-900 dark:text-white">{selectedStudentForPerformance?.full_name}</p>
            <p className="text-xs font-mono text-green-700 dark:text-green-400">{selectedStudentForPerformance?.roll_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200">
            <p className="text-xs text-gray-500">{t('students.performance.overallAverage')}</p>
            <p className="text-2xl font-bold text-green-700">{academic?.overall_average?.toFixed(1) || '—'}%</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200">
            <p className="text-xs text-gray-500">{t('students.performance.disciplineScore')}</p>
            <p className="text-2xl font-bold text-amber-700">{disc?.discipline_score?.toFixed(1) || '—'}%</p>
          </div>
        </div>

        {academic?.subject_results?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200">
            <p className="text-xs font-semibold mb-2">{t('students.performance.subjectPerformance')}</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {academic.subject_results.map((subject, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-sm">{subject.subject_name}</span>
                  <span className="text-sm font-semibold">{subject.final_percentage?.toFixed(1) || 0}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }, [performanceData, selectedStudentForPerformance, t]);

  // ── Report Modal ───────────────────────────────────────────
  const renderReportModal = useCallback(() => {
    if (!reportData) return null;
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('students.reports.title')}</h2>
            <button onClick={() => setShowReportModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-5">{t('students.reports.generatedOn')}: {reportData.generated_on}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              ['Total Students', reportData.summary.total_students],
              ['Active Students', reportData.summary.active_students],
              ['Total Parents', reportData.summary.total_parents],
              ['Active Assignments', reportData.summary.active_assignments],
            ].map(([label, value]) => (
              <div key={label} className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                <p className="text-xs text-green-700 dark:text-green-400">{label}</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-300">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                const dataStr = JSON.stringify(reportData, null, 2);
                const link = document.createElement('a');
                link.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr));
                link.setAttribute('download', `student_report_${new Date().toISOString().split('T')[0]}.json`);
                link.click();
                toast.success(t('students.messages.exportSuccess'));
              }}
              className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> {t('students.actions.downloadReport')}
            </button>
            <button onClick={() => window.print()} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> {t('students.actions.printReport')}
            </button>
          </div>
        </div>
      </div>
    );
  }, [reportData, t]);

  // ── Table Rendering ────────────────────────────────────────
  const renderStudentsTable = useCallback(() => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100">
          <tr>
            {[t('students.table.rollNumber'), t('students.table.fullName'), t('students.table.username'), t('students.table.classLevel'), t('students.table.classroom'), t('students.table.parents'), t('students.table.status'), t('students.table.actions')].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedStudents.map(student => {
            const studentAssignments = allAssignments.filter(a => a.student === student.id);
            const activeAssignment = studentAssignments.find(a => a.status === 'active');
            return (
              <tr key={student.id} className="hover:bg-green-50/50 transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-green-700">{student.roll_number}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{student.full_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 font-mono text-xs">
                    <User className="w-3 h-3" />{student.user?.username || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{student.current_school_level?.name || '—'}-{student.current_class_level?.name || '—'}</td>
                <td className="px-4 py-3 text-sm">
                  {activeAssignment?.classroom ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                      <DoorOpen className="w-3 h-3" />{activeAssignment.classroom_name} - {activeAssignment.classroom_code}
                    </span>
                  ) : <span className="text-xs text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => openViewModal(student, 'students')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium"
                  >
                    <UsersIcon className="w-3 h-3" />{student.parents_count || 0}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(student.status)}`}>
                    {t(`students.status.${student.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => openViewModal(student, 'students')} className="p-1.5 rounded-lg hover:bg-green-100" title={t('students.actions.view')}><Eye className="w-3.5 h-3.5 text-green-700" /></button>
                    <button onClick={() => openEditModal(student)} className="p-1.5 rounded-lg hover:bg-amber-50" title={t('students.actions.edit')}><Edit className="w-3.5 h-3.5 text-amber-600" /></button>
                    <button onClick={() => openAssignModal(student)} className="p-1.5 rounded-lg hover:bg-blue-50" title={t('students.actions.assignClassroom')}><DoorOpen className="w-3.5 h-3.5 text-blue-600" /></button>
                    <button onClick={() => { setSelectedItem(student); setShowDeleteModal(true); }} className="p-1.5 rounded-lg hover:bg-red-50" title={t('students.actions.delete')}><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ), [paginatedStudents, allAssignments, t, openViewModal, openEditModal, openAssignModal]);

  const renderParentsTable = useCallback(() => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100">
          <tr>
            {[t('students.table.fullName'), t('students.table.username'), t('students.table.phone'), t('students.table.email'), t('students.table.relationship'), t('students.table.students'), t('students.table.status'), t('students.table.actions')].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedParents.map(parent => (
            <tr key={parent.id} className="hover:bg-green-50/50 transition-colors">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{parent.full_name}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 font-mono text-xs">
                  <User className="w-3 h-3" />{parent.user?.username || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{parent.phone_number}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{parent.email}</td>
              <td className="px-4 py-3 text-sm">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs capitalize">
                  {t(`students.relationship.${parent.relationship_type}`)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                  <GraduationCap className="w-3 h-3" />{parent.students_count ?? 0}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(parent.status)}`}>
                  {t(`students.status.${parent.status}`)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  <button onClick={() => openViewModal(parent, 'parents')} className="p-1.5 rounded-lg hover:bg-green-100"><Eye className="w-3.5 h-3.5 text-green-700" /></button>
                  <button onClick={() => openEditModal(parent)} className="p-1.5 rounded-lg hover:bg-amber-50"><Edit className="w-3.5 h-3.5 text-amber-600" /></button>
                  <button onClick={() => { setSelectedItem(parent); setShowDeleteModal(true); }} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ), [paginatedParents, t, openViewModal, openEditModal]);

  const renderAssignmentsTable = useCallback(() => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-green-50 dark:bg-green-900/20 border-b border-green-100">
          <tr>
            {[t('students.table.studentName'), t('students.table.rollNumber'), t('students.table.classroom'), t('students.table.academicYear'), t('students.table.schoolLevel'), t('students.table.classLevel'), t('students.table.term'), t('students.table.status'), t('students.table.actions')].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedAssignments.map(assignment => (
            <tr key={assignment.id} className="hover:bg-green-50/50 transition-colors">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{assignment.student_name}</td>
              <td className="px-4 py-3 text-sm font-mono text-green-700">{assignment.student_roll_number}</td>
              <td className="px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                  <DoorOpen className="w-3 h-3" />{assignment.classroom_code} - {assignment.classroom_name}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{assignment.academic_year_name}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{assignment.school_level_name}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{assignment.class_level_name}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{assignment.term_name || '—'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(assignment.status)}`}>
                  {t(`students.status.${assignment.status}`)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  {assignment.status === 'active' && (
                    <button onClick={() => { setSelectedAssignment(assignment); setShowUnassignModal(true); }} className="p-1.5 rounded-lg hover:bg-red-50" title={t('students.actions.unassign')}>
                      <DoorOpen className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ), [paginatedAssignments, t]);

  // ── Pagination Component ───────────────────────────────────
  const Pagination = React.memo(({ currentPage, totalPages, onPageChange }) => (
    <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100 px-4 pb-3">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>{t('students.pagination.showing')}</span>
        <select
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
          className="px-2 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-green-700"
        >
          {[5, 10, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>{t('students.pagination.perPage')}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className="px-2 py-1 text-xs border rounded-lg disabled:opacity-40">{t('students.pagination.first')}</button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 border rounded-lg disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm px-3">{t('students.pagination.page')} {currentPage} {t('students.pagination.of')} {totalPages || 1}</span>
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="p-1.5 border rounded-lg disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage >= totalPages} className="px-2 py-1 text-xs border rounded-lg disabled:opacity-40">{t('students.pagination.last')}</button>
      </div>
    </div>
  ));

  // ── Tabs Configuration ─────────────────────────────────────
  const tabs = [
    { id: 'students', label: t('students.tabs.students'), icon: GraduationCap, count: filteredStudents.length },
    { id: 'parents', label: t('students.tabs.parents'), icon: Shield, count: filteredParents.length },
    { id: 'classrooms', label: t('students.tabs.classrooms'), icon: DoorOpen, count: filteredAssignments.length },
    { id: 'reports', label: t('students.tabs.reports'), icon: BarChart3 },
  ];

  const getCurrentTabLabel = useCallback(() => tabs.find(tab => tab.id === activeTab)?.label || '', [activeTab, tabs]);

  // ── Main Render ────────────────────────────────────────────
  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="space-y-5 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('students.stats.totalStudents'), value: stats.total_students, color: 'from-green-700 to-green-900' },
            { label: t('students.stats.activeStudents'), value: stats.active_students, color: 'from-green-500 to-green-700' },
            { label: t('students.stats.totalParents'), value: stats.total_parents, color: 'from-amber-500 to-amber-700' },
            { label: t('students.stats.totalAssignments'), value: stats.total_assignments, color: 'from-blue-500 to-blue-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white shadow-lg`}>
              <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t('students.title')}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{t('students.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-white dark:bg-gray-800 border rounded-xl shadow-sm">
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
            </button>
            {activeTab === 'reports' && (
              <button onClick={handleGenerateReport} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="w-4 h-4" /> {t('students.actions.generateReport')}
              </button>
            )}
            {activeTab !== 'reports' && (
              <button onClick={() => { setNewItem({}); setShowAddModal(true); }} className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl flex items-center gap-2 text-sm font-medium">
                <Plus className="w-4 h-4" /> {`${t('students.actions.addNew')} ${getCurrentTabLabel()}`}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-1.5 flex gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchTerm('');
                  setFilters({});
                  setStudentsPage(1);
                  setParentsPage(1);
                  setAssignmentsPage(1);
                }}
                className={`px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 rounded-xl whitespace-nowrap flex-1 justify-center
                  ${isActive ? 'bg-green-700 text-white shadow-md' : 'text-gray-500 hover:text-green-700 hover:bg-green-50'}`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-200'}`}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters & Search */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('students.actions.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl bg-white dark:bg-gray-700 text-gray-900 focus:ring-2 focus:ring-green-700 outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-3 py-2 text-sm border rounded-xl bg-white">
                <option value="">{t('students.filters.allStatus')}</option>
                <option value="active">{t('students.status.active')}</option>
                <option value="inactive">{t('students.status.inactive')}</option>
                <option value="transferred">{t('students.status.transferred')}</option>
                <option value="graduated">{t('students.status.graduated')}</option>
              </select>

              {activeTab === 'students' && (
                <>
                  <select value={filters.academic_year_id || ''} onChange={(e) => handleAcademicYearFilterChange(e.target.value)} className="px-3 py-2 text-sm border rounded-xl bg-white">
                    <option value="">{t('students.filters.allAcademicYears')}</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                  <select value={filters.school_level_id || ''} onChange={(e) => handleSchoolLevelFilterChange(e.target.value)} className="px-3 py-2 text-sm border rounded-xl bg-white">
                    <option value="">{t('students.filters.allSchoolLevels')}</option>
                    {schoolLevels.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={filters.class_level_id || ''} onChange={(e) => setFilters({ ...filters, class_level_id: e.target.value })} className="px-3 py-2 text-sm border rounded-xl bg-white">
                    <option value="">{t('students.filters.allClassLevels')}</option>
                    {filteredClassLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </>
              )}

              {activeTab === 'parents' && (
                <select value={filters.relationship_type || ''} onChange={(e) => setFilters({ ...filters, relationship_type: e.target.value })} className="px-3 py-2 text-sm border rounded-xl bg-white">
                  <option value="">{t('students.filters.allRelationships')}</option>
                  <option value="father">{t('students.relationship.father')}</option>
                  <option value="mother">{t('students.relationship.mother')}</option>
                  <option value="guardian">{t('students.relationship.guardian')}</option>
                  <option value="other">{t('students.relationship.other')}</option>
                </select>
              )}

              {activeTab === 'classrooms' && (
                <>
                  <select value={filters.academic_year_id || ''} onChange={(e) => handleAcademicYearFilterChange(e.target.value)} className="px-3 py-2 text-sm border rounded-xl bg-white">
                    <option value="">{t('students.filters.allAcademicYears')}</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                  <select value={filters.school_level_id || ''} onChange={(e) => handleSchoolLevelFilterChange(e.target.value)} className="px-3 py-2 text-sm border rounded-xl bg-white">
                    <option value="">{t('students.filters.allSchoolLevels')}</option>
                    {schoolLevels.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={filters.class_level_id || ''} onChange={(e) => setFilters({ ...filters, class_level_id: e.target.value })} className="px-3 py-2 text-sm border rounded-xl bg-white">
                    <option value="">{t('students.filters.allClassLevels')}</option>
                    {filteredClassLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={filters.classroom_id || ''} onChange={(e) => setFilters({ ...filters, classroom_id: e.target.value })} className="px-3 py-2 text-sm border rounded-xl bg-white">
                    <option value="">{t('students.filters.allClassrooms')}</option>
                    {allClassrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </>
              )}

              <button
                onClick={() => { setFilters({}); setSearchTerm(''); setFilteredClassLevels(classLevels); setFilteredTerms(terms); }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center gap-1.5 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" /> {t('students.actions.reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-20 text-center">
            <Spinner />
            <p className="mt-4 text-gray-500">{t('students.messages.loading')}</p>
          </div>
        ) : activeTab === 'reports' ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-green-700" />
            </div>
            <h3 className="text-lg font-bold mb-2">{t('students.reports.clickToGenerate')}</h3>
            <button onClick={handleGenerateReport} className="px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl inline-flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> {t('students.actions.generateReport')}
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden">
            {activeTab === 'students' && renderStudentsTable()}
            {activeTab === 'parents' && renderParentsTable()}
            {activeTab === 'classrooms' && renderAssignmentsTable()}

            {activeTab === 'students' && filteredStudents.length > 0 && <Pagination currentPage={studentsPage} totalPages={totalStudentsPages} onPageChange={setStudentsPage} />}
            {activeTab === 'parents' && filteredParents.length > 0 && <Pagination currentPage={parentsPage} totalPages={totalParentsPages} onPageChange={setParentsPage} />}
            {activeTab === 'classrooms' && filteredAssignments.length > 0 && <Pagination currentPage={assignmentsPage} totalPages={totalAssignmentsPages} onPageChange={setAssignmentsPage} />}

            {((activeTab === 'students' && filteredStudents.length === 0) ||
              (activeTab === 'parents' && filteredParents.length === 0) ||
              (activeTab === 'classrooms' && filteredAssignments.length === 0)) && (
                <div className="p-10 text-center">
                  <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">{t('students.messages.noData')}</p>
                </div>
              )}
          </div>
        )}

        {/* ── Modals ─────────────────────────────────────────── */}



        {/* ── Modals ─────────────────────────────────────────── */}

        {/* Summary Report Modal (for the Reports tab) */}
        {showReportModal && reportData && reportData.summary && !reportData.term_performances && renderReportModal()}

        {/* Academic Report Modal (for student full report) */}
        {showReportModal && reportData && reportData.term_performances && selectedStudentForPerformance && (
          <AcademicReportModal
            student={selectedStudentForPerformance}
            reportData={reportData}
            onClose={() => {
              setShowReportModal(false);
              setReportData(null);
              setSelectedStudentForPerformance(null);
            }}
            t={t}
          />
        )}

        {/* Performance Modal (simple performance view) */}
        {showPerformanceModal && (
          <ModalWrapper maxW="max-w-lg" onClose={() => { setShowPerformanceModal(false); setPerformanceData(null); }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{t('students.performance.title')}</h2>
              <button onClick={() => { setShowPerformanceModal(false); setPerformanceData(null); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {loadingPerformance ? (
              <div className="py-12 text-center"><Spinner /><p className="mt-2">{t('students.messages.loadingPerformance')}</p></div>
            ) : renderPerformanceContent()}
            <button onClick={() => setShowPerformanceModal(false)} className="w-full mt-4 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl">Close</button>
          </ModalWrapper>
        )}

        {/* View Modal */}
        {showViewModal && selectedItem && (
          <ModalWrapper maxW="max-w-2xl" onClose={() => { setShowViewModal(false); setStudentParents([]); setStudentTeachers(null); setParentStudents([]); }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{t('students.actions.viewDetails')}</h2>
              <button
                onClick={() => { setShowViewModal(false); setStudentParents([]); setStudentTeachers(null); setParentStudents([]); }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderViewModalContent()}
            <button
              onClick={() => { setShowViewModal(false); setStudentParents([]); setStudentTeachers(null); setParentStudents([]); }}
              className="w-full mt-4 py-2.5 bg-green-700 text-white rounded-xl"
            >
              Close
            </button>
          </ModalWrapper>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <ModalWrapper onClose={() => { setShowAddModal(false); setNewItem({}); }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{`${t('students.actions.add')} ${getCurrentTabLabel()}`}</h2>
              <button onClick={() => { setShowAddModal(false); setNewItem({}); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {activeTab === 'students' ? (
              <StudentForm
                item={newItem}
                onChange={handleNewItemChange}
                academicYears={academicYears}
                schoolLevels={schoolLevels}
                filteredClassLevels={filteredClassLevels}
                fetchClassLevelsBySchool={fetchClassLevelsBySchool}
                t={t}
              />
            ) : (
              <ParentForm
                item={newItem}
                onChange={handleNewItemChange}
                t={t}
              />
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={handleCreate} disabled={loading} className="flex-1 py-2.5 bg-green-700 text-white rounded-xl">{loading ? <Spinner /> : t('students.actions.create')}</button>
              <button onClick={() => { setShowAddModal(false); setNewItem({}); }} className="flex-1 py-2.5 bg-gray-100 rounded-xl">Cancel</button>
            </div>
          </ModalWrapper>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <ModalWrapper onClose={() => { setShowEditModal(false); setEditItem({}); }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{`${t('students.actions.edit')} ${getCurrentTabLabel()}`}</h2>
              <button onClick={() => { setShowEditModal(false); setEditItem({}); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {activeTab === 'students' ? (
              <StudentForm
                item={editItem}
                onChange={handleEditItemChange}
                academicYears={academicYears}
                schoolLevels={schoolLevels}
                filteredClassLevels={filteredClassLevels}
                fetchClassLevelsBySchool={fetchClassLevelsBySchool}
                t={t}
              />
            ) : (
              <ParentForm
                item={editItem}
                onChange={handleEditItemChange}
                t={t}
              />
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={handleUpdate} disabled={loading} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl">{loading ? <Spinner /> : t('students.actions.update')}</button>
              <button onClick={() => { setShowEditModal(false); setEditItem({}); }} className="flex-1 py-2.5 bg-gray-100 rounded-xl">Cancel</button>
            </div>
          </ModalWrapper>
        )}

        {/* Assign Classroom Modal */}
        {showAssignModal && (
          <ModalWrapper onClose={() => { setShowAssignModal(false); setAssignData({}); }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{t('students.actions.assignClassroom')}</h2>
              <button onClick={() => { setShowAssignModal(false); setAssignData({}); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Academic Year</label>
                <select
                  value={assignData.academic_year_id || ''}
                  onChange={(e) => { handleAssignDataChange('academic_year_id', e.target.value); fetchTermsByAcademicYear(e.target.value); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Term (Optional)</label>
                <select
                  value={assignData.term_id || ''}
                  onChange={(e) => handleAssignDataChange('term_id', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select Term</option>
                  {filteredTerms.map(term => <option key={term.id} value={term.id}>{term.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">School Level</label>
                <select
                  value={assignData.school_level_id || ''}
                  onChange={(e) => { handleAssignDataChange('school_level_id', e.target.value); fetchClassLevelsBySchool(e.target.value); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select</option>
                  {schoolLevels.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Class Level</label>
                <select
                  value={assignData.class_level_id || ''}
                  onChange={(e) => handleAssignDataChange('class_level_id', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select</option>
                  {filteredClassLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Classroom</label>
                <select
                  value={assignData.classroom_id || ''}
                  onChange={(e) => handleAssignDataChange('classroom_id', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select</option>
                  {allClassrooms
                    .filter(c => c.assigned_class_level?.id == assignData.class_level_id)
                    .map(c => <option key={c.id} value={c.id}>{c.name} (Capacity: {c.capacity})</option>)
                  }
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleAssignClassroom} disabled={loading} className="flex-1 py-2.5 bg-green-700 text-white rounded-xl">{loading ? <Spinner /> : 'Assign'}</button>
              <button onClick={() => { setShowAssignModal(false); setAssignData({}); }} className="flex-1 py-2.5 bg-gray-100 rounded-xl">Cancel</button>
            </div>
          </ModalWrapper>
        )}

        {/* Unassign Modal */}
        {showUnassignModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setShowUnassignModal(false); setSelectedAssignment(null); }}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-lg font-bold mb-2">{t('students.unassign.title')}</h2>
                <p className="text-gray-500 text-sm">{t('students.unassign.confirmation')}</p>
                <p className="text-sm font-semibold mt-3">{selectedAssignment.student_name} → {selectedAssignment.classroom?.name}</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleUnassignClassroom} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl">{loading ? <Spinner /> : t('students.actions.unassign')}</button>
                <button onClick={() => { setShowUnassignModal(false); setSelectedAssignment(null); }} className="flex-1 py-2.5 bg-gray-100 rounded-xl">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Link Parent Modal */}
        {showLinkModal && selectedItem && (
          <ModalWrapper onClose={() => { setShowLinkModal(false); setNewItem({}); }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{t('students.actions.addParent')}</h2>
              <button onClick={() => { setShowLinkModal(false); setNewItem({}); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">For: <span className="font-semibold">{selectedItem.full_name}</span></p>
            <ParentForm
              item={newItem}
              onChange={handleNewItemChange}
              t={t}
            />
            <div className="flex gap-3 mt-5">
              <button onClick={handleLinkParent} disabled={loading} className="flex-1 py-2.5 bg-green-700 text-white rounded-xl">{loading ? <Spinner /> : t('students.actions.linkParent')}</button>
              <button onClick={() => setShowLinkModal(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl">Cancel</button>
            </div>
          </ModalWrapper>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-lg font-bold mb-2">{t('students.delete.title')}</h2>
                <p className="text-gray-500 text-sm">{t('students.delete.confirmation')}</p>
                <p className="text-sm font-semibold mt-3">{selectedItem.full_name}</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleDelete} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl">{loading ? <Spinner /> : t('students.actions.delete')}</button>
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;