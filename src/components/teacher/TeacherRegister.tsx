import React, { useState } from 'react';
import { useRouter, Link } from '../../router.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { SchoolLogo } from '../layout/SchoolLogo.tsx';
import { 
  SecondaryGrade, 
  SECONDARY_GRADES, 
  SECONDARY_SUBJECTS,
  GRADE_SECTIONS_MAP 
} from '../../types/index.ts';
import { 
  BookOpen, 
  Lock, 
  Mail, 
  User, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Phone,
  Sparkles,
  School,
  FileCheck2,
  Check
} from 'lucide-react';

export const TeacherRegister: React.FC = () => {
  const { navigate } = useRouter();
  const { registerTeacherOnline, allUsers } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    assignedSubjects: ['Mathematics'],
    assignedGrades: ['Grade 10'] as SecondaryGrade[],
    assignedSections: ['Section 10A'],
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
    setFormData((prev) => ({
      ...prev,
      name,
      username: prev.username ? prev.username : clean,
    }));
  };

  const handleToggleGrade = (grade: SecondaryGrade) => {
    setFormData((prev) => {
      const exists = prev.assignedGrades.includes(grade);
      let updatedGrades: SecondaryGrade[];
      if (exists) {
        if (prev.assignedGrades.length === 1) return prev; // Keep at least one
        updatedGrades = prev.assignedGrades.filter((g) => g !== grade);
      } else {
        updatedGrades = [...prev.assignedGrades, grade];
      }

      // Recompute available sections
      const allSections: string[] = [];
      updatedGrades.forEach((g) => {
        (GRADE_SECTIONS_MAP[g] || []).forEach((sec) => allSections.push(sec));
      });

      return {
        ...prev,
        assignedGrades: updatedGrades,
        assignedSections: [allSections[0] || 'Section 10A'],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!formData.name.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!formData.username.trim()) {
      setError('Please choose a school username.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please provide a valid official email address.');
      return;
    }
    if (formData.assignedGrades.length === 0) {
      setError('Please select at least one secondary school grade (Grades 9–12).');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify your typed password.');
      return;
    }

    // Check duplicate username or email
    const cleanUsername = formData.username.trim().toLowerCase();
    const cleanEmail = formData.email.trim().toLowerCase();
    if (allUsers.some((u) => u.username.toLowerCase() === cleanUsername)) {
      setError(`Username "${cleanUsername}" is already taken.`);
      return;
    }
    if (allUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      setError(`Email "${cleanEmail}" is already registered.`);
      return;
    }

    setLoading(true);
    const res = await registerTeacherOnline({
      name: formData.name,
      username: formData.username,
      email: formData.email,
      phone: formData.phone || undefined,
      assignedSubjects: formData.assignedSubjects,
      assignedGrades: formData.assignedGrades,
      assignedSections: formData.assignedSections,
      password: formData.password,
    });
    setLoading(false);

    if (res.success) {
      setSuccessMessage(res.message);
      setTimeout(() => {
        navigate('/teacher/login');
      }, 4000);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal Selection
        </Link>

        <div className="flex items-center gap-3">
          <SchoolLogo size="lg" lightText />
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800 space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/50 text-indigo-200 text-xs flex items-start gap-3">
            <BookOpen className="w-5 h-5 shrink-0 text-indigo-400 mt-0.5" />
            <div>
              <span className="font-bold block text-sm text-white">Teacher Registration Application</span>
              <p className="mt-0.5 text-indigo-200/90 leading-relaxed">
                Apply to teach at SCHOOL FOR EXCELLENCE SECONDARY SCHOOL for Grades 9, 10, 11, or 12. 
                Applications are reviewed and authorized by the School Director.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-200 block text-sm">Application Submitted!</span>
                <p className="mt-0.5">{successMessage}</p>
                <p className="text-[11px] text-emerald-400/80 mt-1">Redirecting to Teacher Portal login...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Legal Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="e.g. Dr. Abebech Worku"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Requested School Username *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs font-mono font-bold">@</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                    placeholder="e.g. abebech.w"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Official Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="abebech@excellence.edu.et"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+251 91 123 4567"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Primary Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Primary Teaching Subject *
              </label>
              <select
                value={formData.assignedSubjects[0]}
                onChange={(e) => setFormData({ ...formData, assignedSubjects: [e.target.value] })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                {SECONDARY_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* Target Grades (Grades 9–12) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Secondary Grades (Select all that apply) *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SECONDARY_GRADES.map((grade) => {
                  const isSelected = formData.assignedGrades.includes(grade);
                  return (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => handleToggleGrade(grade)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{grade}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    <span>Submit Teacher Application</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">Already registered as a teacher? </span>
            <Link to="/teacher/login" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer">
              Sign In to Teacher Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
