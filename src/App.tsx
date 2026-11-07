import React from 'react';
import { RouterProvider, useRouter } from './router.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { PortalGateway } from './components/portals/PortalGateway.tsx';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { TeacherLogin } from './components/teacher/TeacherLogin.tsx';
import { TeacherRegister } from './components/teacher/TeacherRegister.tsx';
import { TeacherDashboard } from './components/teacher/TeacherDashboard.tsx';
import { StudentLogin } from './components/student/StudentLogin.tsx';
import { StudentRegister } from './components/student/StudentRegister.tsx';
import { StudentDashboard } from './components/student/StudentDashboard.tsx';
import { DirectorLogin } from './components/director/DirectorLogin.tsx';
import { DirectorDashboard } from './components/director/DirectorDashboard.tsx';

interface ProtectedRouteProps {
  allowedRoles: Array<'super_admin' | 'admin' | 'director' | 'teacher' | 'student'>;
  fallbackPath: string;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, fallbackPath, children }) => {
  const { currentUser, loading } = useAuth();
  const { navigate } = useRouter();

  React.useEffect(() => {
    if (!loading) {
      if (!currentUser || !allowedRoles.includes(currentUser.role as any)) {
        navigate(fallbackPath);
      }
    }
  }, [currentUser, loading, allowedRoles, fallbackPath, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-sm font-semibold tracking-wide">Validating Authorization...</div>
      </div>
    );
  }

  if (!currentUser || !allowedRoles.includes(currentUser.role as any)) {
    return null;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { path } = useRouter();
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-sm font-semibold tracking-wide">Smart Exam System</div>
        <p className="text-xs text-slate-400 mt-1">Connecting to school database & security services...</p>
      </div>
    );
  }

  // Exact path matching with strict role boundaries
  switch (path) {
    case '/admin/login':
      return <AdminLogin />;
    case '/admin/dashboard':
      return (
        <ProtectedRoute allowedRoles={['admin', 'super_admin']} fallbackPath="/admin/login">
          <AdminDashboard />
        </ProtectedRoute>
      );
    case '/director/login':
      return <DirectorLogin />;
    case '/director/dashboard':
      return (
        <ProtectedRoute allowedRoles={['director', 'admin', 'super_admin']} fallbackPath="/director/login">
          <DirectorDashboard />
        </ProtectedRoute>
      );
    case '/teacher/login':
      return <TeacherLogin />;
    case '/teacher/register':
      return <TeacherRegister />;
    case '/teacher/dashboard':
      return (
        <ProtectedRoute allowedRoles={['teacher', 'admin', 'super_admin']} fallbackPath="/teacher/login">
          <TeacherDashboard />
        </ProtectedRoute>
      );
    case '/student/register':
      return <StudentRegister />;
    case '/student/login':
      return <StudentLogin />;
    case '/student/dashboard':
      return (
        <ProtectedRoute allowedRoles={['student']} fallbackPath="/student/login">
          <StudentDashboard />
        </ProtectedRoute>
      );
    default:
      return <PortalGateway />;
  }
};

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </RouterProvider>
  );
}
