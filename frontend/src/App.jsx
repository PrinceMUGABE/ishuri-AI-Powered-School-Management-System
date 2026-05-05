import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
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

// ProtectedRoute: redirects to /login if not authenticated
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  const getDashboard = () => {
    switch (user?.role) {
      case 'student': return <StudentDashboard />;
      case 'teacher': return <TeacherDashboard />;
      case 'parent': return <ParentDashboard />;
      case 'admin': return <AdminDashboard />;
      default: return <Navigate to="/login" replace />;
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />

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

        <Route path="reports" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Reports />
          </ProtectedRoute>
        } />

        {/* Fallback inside /app */}
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Route>

      {/* Global fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <Toaster position="top-right" />
          <AppRoutes />
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;