import React, { useState } from 'react';
import { useRouter, Link } from '../../router.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { 
  BookOpen, 
  Lock, 
  User, 
  ArrowLeft, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  FileCheck2,
  GraduationCap
} from 'lucide-react';
import { SchoolLogo } from '../layout/SchoolLogo.tsx';

export const TeacherLogin: React.FC = () => {
  const { navigate } = useRouter();
  const { loginPortal, currentUser } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (currentUser?.role === 'teacher') {
      navigate('/teacher/dashboard');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password.trim()) {
      setError('Please provide your teacher username or email and password.');
      return;
    }

    setLoading(true);
    const res = await loginPortal('teacher', identifier, password);
    setLoading(false);

    if (res.success) {
      navigate('/teacher/dashboard');
    } else {
      setError(res.message || 'Authentication failed. Please verify your teacher credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-blue-500">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal Selection
        </Link>

        <div className="flex items-center gap-3">
          <SchoolLogo size="lg" lightText />
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-700/80 space-y-6">
          <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-800/50 text-blue-300 text-xs flex items-start gap-2.5">
            <FileCheck2 className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
            <div>
              <span className="font-semibold block">Faculty Access</span>
              Teaching staff can create exams, upload PDF question papers for Gemini AI extraction, and evaluate student written answers.
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Teacher Username or School Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. teacher username"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter teacher password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  Sign In to Teacher Portal
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-700/60 text-center space-y-2">
            <p className="text-[11px] text-slate-400">
              New faculty member or applicant?{' '}
              <Link to="/teacher/register" className="font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer">
                Submit Teacher Application
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
