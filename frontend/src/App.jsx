import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout/Layout';
import LandingPage from './components/common/LandingPage';

// Dashboard imports
import StudentDashboard from './pages/Dashboard/StudentDashboard';
import TeacherDashboard from './pages/Dashboard/TeacherDashboard';
import ParentDashboard from './pages/Dashboard/ParentDashboard';
import AdminDashboard from './pages/Dashboard/AdminDashboard';

// Student pages
import Grades from './pages/Student/Grades';
import Attendance from './pages/Student/Attendance';
import Assignments from './pages/Student/Assignments';
import DigitalID from './pages/Student/DigitalID';
import AcademicReport from './pages/Student/AcademicReport';

// Teacher pages
import GradeUpload from './pages/Teacher/GradeUpload';
import Timetable from './pages/Teacher/Timetable';
import AttendanceRecord from './pages/Teacher/AttendanceRecord';
import AssignmentUpload from './pages/Teacher/AssignmentUpload';

// Parent pages
import ChildProfile from './pages/Parent/ChildProfile';

// Communication
import LiveChat from './pages/Communication/LiveChat';

// Admin pages
import UserManagement from './pages/Admin/UserManagement';
import GradeApproval from './pages/Admin/GradeApproval';
import FeeManagement from './pages/Admin/FeeManagement';
import Reports from './pages/Admin/Reports';
import AcademicsManagement from './pages/admin/AcademicsManagement';
import TeacherManagement from './pages/admin/TeacherManagement';
import StudentManagement from './pages/admin/StudentsManagement';

// Helper function to check if user is authenticated from localStorage
const isAuthenticated = () => {
  const token = localStorage.getItem('access_token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    return false;
  }
  
  try {
    const userData = JSON.parse(user);
    const tokenExpiry = localStorage.getItem('token_expiry');
    
    // Check if token exists and is not expired
    if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
      // Token expired, clear storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('token_expiry');
      localStorage.removeItem('user_language');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

// Get user from localStorage
const getUser = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user from storage:', error);
    return null;
  }
};

// ProtectedRoute: redirects to root (/) if not authenticated
const ProtectedRoute = ({ children, allowedRoles }) => {
  const isAuth = isAuthenticated();
  const user = getUser();

  if (!isAuth) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to /');
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    console.log(`[ProtectedRoute] Role ${user?.role} not allowed, redirecting to /app/dashboard`);
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const user = getUser();

  const getDashboard = () => {
    switch (user?.role) {
      case 'student': return <StudentDashboard />;
      case 'teacher': return <TeacherDashboard />;
      case 'parent': return <ParentDashboard />;
      case 'admin': return <AdminDashboard />;
      default: return <Navigate to="/" replace />;
    }
  };

  return (
    <Routes>
      {/* Public Routes - Landing page at root */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />

      {/* Protected Routes under /app */}
      <Route path="/app" element={<Layout />}>

        <Route path="dashboard" element={
          <ProtectedRoute>
            {getDashboard()}
          </ProtectedRoute>
        } />

        <Route path="communications" element={
          <ProtectedRoute>
            <LiveChat />
          </ProtectedRoute>
        } />

        {/* Student Routes */}
        <Route path="grades" element={
          <ProtectedRoute allowedRoles={['student']}>
            <Grades />
          </ProtectedRoute>
        } />

        <Route path="attendance" element={
          <ProtectedRoute allowedRoles={['student']}>
            <Attendance />
          </ProtectedRoute>
        } />

        <Route path="assignments" element={
          <ProtectedRoute allowedRoles={['student']}>
            <Assignments />
          </ProtectedRoute>
        } />

        <Route path="digital-id" element={
          <ProtectedRoute allowedRoles={['student']}>
            <DigitalID />
          </ProtectedRoute>
        } />

        <Route path="academic-report" element={
          <ProtectedRoute allowedRoles={['student']}>
            <AcademicReport />
          </ProtectedRoute>
        } />

        {/* Teacher Routes */}
        <Route path="timetable" element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <Timetable />
          </ProtectedRoute>
        } />

        <Route path="grade-upload" element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <GradeUpload />
          </ProtectedRoute>
        } />

        <Route path="attendance-record" element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <AttendanceRecord />
          </ProtectedRoute>
        } />

        <Route path="assignment-upload" element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <AssignmentUpload />
          </ProtectedRoute>
        } />

        {/* Parent Routes */}
        <Route path="child-profile" element={
          <ProtectedRoute allowedRoles={['parent']}>
            <ChildProfile />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UserManagement />
          </ProtectedRoute>
        } />

        <Route path="grade-approval" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <GradeApproval />
          </ProtectedRoute>
        } />

        <Route path="fee-management" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <FeeManagement />
          </ProtectedRoute>
        } />

        <Route path="teacher-management" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <TeacherManagement />
          </ProtectedRoute>
        } />

        <Route path="student-management" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <StudentManagement />
          </ProtectedRoute>
        } />

        <Route path="reports" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Reports />
          </ProtectedRoute>
        } />

        <Route path="academics" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AcademicsManagement />
          </ProtectedRoute>
        } />

        {/* Fallback inside /app */}
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Route>

      {/* Global fallback - redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;