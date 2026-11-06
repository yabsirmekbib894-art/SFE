import React, { useState } from 'react';
import { useRouter, Link } from '../../router.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { SchoolLogo } from './SchoolLogo.tsx';
import { 
  Sun, 
  Moon, 
  Menu, 
  X, 
  ArrowRight, 
  GraduationCap, 
  BookOpen, 
  Briefcase, 
  ShieldCheck, 
  UserPlus, 
  Info 
} from 'lucide-react';

interface HeaderProps {
  onOpenAbout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAbout }) => {
  const { navigate, path } = useRouter();
  const { currentUser, theme, setTheme } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getDashboardPath = () => {
    if (!currentUser) return '/';
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin') return '/admin/dashboard';
    if (currentUser.role === 'director') return '/director/dashboard';
    if (currentUser.role === 'teacher') return '/teacher/dashboard';
    return '/student/dashboard';
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <SchoolLogo size="md" lightText />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold">
          <Link
            to="/"
            className={`transition-colors py-1 ${
              path === '/' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-300 hover:text-white'
            }`}
          >
            Home
          </Link>

          {onOpenAbout && (
            <button
              onClick={onOpenAbout}
              className="text-slate-300 hover:text-white transition-colors py-1 cursor-pointer flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              About School
            </button>
          )}

          <Link
            to="/student/login"
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              path === '/student/login' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-300 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            Student Login
          </Link>

          <Link
            to="/teacher/login"
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              path === '/teacher/login' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            Teacher Login
          </Link>

          <Link
            to="/director/login"
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              path === '/director/login' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
            Director Login
          </Link>

          <Link
            to="/admin/login"
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              path === '/admin/login' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            Admin Login
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Status / Direct Registration */}
          {currentUser ? (
            <button
              onClick={() => navigate(getDashboardPath())}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-900/40 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>My Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              to="/student/register"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-950/30 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Student</span>
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-t border-slate-800 px-4 pt-3 pb-6 space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2">
            Navigation Portals
          </div>
          <div className="grid grid-cols-1 gap-1.5 text-xs font-semibold">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-slate-800 flex items-center gap-2"
            >
              <span>Home Overview</span>
            </Link>

            {onOpenAbout && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAbout();
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                <Info className="w-4 h-4 text-cyan-400" />
                <span>About School for Excellence</span>
              </button>
            )}

            <Link
              to="/student/login"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-slate-800 flex items-center gap-2.5 text-emerald-300"
            >
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>Student Examination Portal</span>
            </Link>

            <Link
              to="/student/register"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-slate-800 flex items-center gap-2.5 text-cyan-300"
            >
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <span>New Student Registration</span>
            </Link>

            <Link
              to="/teacher/login"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-slate-800 flex items-center gap-2.5 text-indigo-300"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Teacher Exam Portal</span>
            </Link>

            <Link
              to="/director/login"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-slate-800 flex items-center gap-2.5 text-amber-300"
            >
              <Briefcase className="w-4 h-4 text-amber-400" />
              <span>Director Portal</span>
            </Link>

            <Link
              to="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-slate-800 flex items-center gap-2.5 text-rose-300"
            >
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>Super Administrator Portal</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
