import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import LandingPage from './components/common/LandingPage';

// Admin Layout and Pages
import AdminLayout from './components/layout/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import FeeManagement from './pages/admin/FeeManagement';
import Reports from './pages/admin/Reports';
import AcademicsManagement from './pages/admin/AcademicsManagement';
import TeacherManagement from './pages/admin/TeacherManagement';
import StudentManagement from './pages/admin/StudentsManagement';
import AdminChatManagement from './pages/admin/ChatManagement';
import AcademicsRecordsManagement from './pages/admin/AcademicRecordsManagement';



// Teacher Layout and Pages (To be implemented)
import TeacherLayout from './components/layout/teacher/TeacherLayout';
import StudentsGrades from './pages/teacher/GradeUpload';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherProfile from './pages/teacher/TeacherProfile';
import TeacherAssignmentUpload from './pages/teacher/AssignmentUpload';
import TeacherAttendanceRecord from './pages/teacher/AttendanceRecord';

// Helper function to check if user is authenticated
const isAuthenticated = () => {
  const token = localStorage.getItem('access_token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    return false;
  }
  
  try {
    const userData = JSON.parse(user);
    const tokenExpiry = localStorage.getItem('token_expiry');
    
    if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
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

// Route Protection Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const isAuth = isAuthenticated();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!isAuth) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    if (user?.role === 'admin') return <Navigate to="/app/dashboard" replace />;
    if (user?.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    if (user?.role === 'student') return <Navigate to="/student/dashboard" replace />;
    if (user?.role === 'parent') return <Navigate to="/parent/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />

          {/* Admin Routes */}
          <Route 
            path="/app" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="fee-management" element={<FeeManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="academics" element={<AcademicsManagement />} />
            <Route path="teacher-management" element={<TeacherManagement />} />
            <Route path="student-management" element={<StudentManagement />} />
            <Route path="chat" element={<AdminChatManagement />} />
            <Route path="grade-approval" element={<AcademicsRecordsManagement />} />
            <Route path="profile" element={<div>Profile Page</div>} />
            <Route path="settings" element={<div>Settings Page</div>} />
            <Route path="notifications" element={<div>Notifications Page</div>} />
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Route>

          {/* Teacher Routes - To be implemented */}
          <Route 
            path="/teacher" 
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="grades" element={<StudentsGrades /> } />
            <Route path="profile" element={<TeacherProfile />} />
            <Route path="attendance" element={<TeacherAttendanceRecord />} />
            <Route path="assignments" element={<TeacherAssignmentUpload />} />
          </Route>

          {/* Student Routes - To be implemented */}
          <Route 
            path="/student" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <div>Student Layout Coming Soon</div>
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<div>Student Dashboard</div>} />
          </Route>

          {/* Parent Routes - To be implemented */}
          <Route 
            path="/parent" 
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <div>Parent Layout Coming Soon</div>
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<div>Parent Dashboard</div>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;