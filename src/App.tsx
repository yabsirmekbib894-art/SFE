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

  // Exact path matching for separate portals
  switch (path) {
    case '/admin/login':
      return <AdminLogin />;
    case '/admin/dashboard':
      return <AdminDashboard />;
    case '/director/login':
      return <DirectorLogin />;
    case '/director/dashboard':
      return <DirectorDashboard />;
    case '/teacher/login':
      return <TeacherLogin />;
    case '/teacher/register':
      return <TeacherRegister />;
    case '/teacher/dashboard':
      return <TeacherDashboard />;
    case '/student/register':
      return <StudentRegister />;
    case '/student/login':
      return <StudentLogin />;
    case '/student/dashboard':
      return <StudentDashboard />;
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
