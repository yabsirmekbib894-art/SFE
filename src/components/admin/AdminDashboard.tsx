import React, { useState } from 'react';
import { useRouter } from '../../router.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { SchoolLogo } from '../layout/SchoolLogo.tsx';
import { 
  UserProfile, 
  SecondaryGrade, 
  SECONDARY_GRADES, 
  SECONDARY_SUBJECTS, 
  GRADE_SECTIONS_MAP 
} from '../../types/index.ts';
import { 
  Users, 
  Shield, 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  Search, 
  Plus, 
  Upload, 
  Key, 
  UserCheck, 
  UserX, 
  RefreshCw, 
  Download, 
  BookOpen, 
  Award,
  Copy,
  Check,
  LogOut,
  Moon,
  Sun,
  School,
  Database,
  AlertTriangle,
  Briefcase,
  Settings,
  History,
  Sliders,
  Building2,
  Lock,
  Mail,
  Phone,
  Save,
  CheckCircle2,
  XCircle,
  Filter
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { navigate } = useRouter();
  const { 
    currentUser, 
    logout, 
    theme, 
    setTheme,
    allUsers, 
    allExams, 
    allSubmissions, 
    auditLogs,
    schoolSettings,
    updateSchoolSettings,
    registerDirector,
    registerStudent, 
    registerTeacher, 
    updateUser, 
    toggleUserStatus, 
    resetUserPassword, 
    bulkImportStudents,
    seedInitialSchoolSetup
  } = useAuth();

  // Route protection: Allow super_admin or admin
  React.useEffect(() => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  const [activeTab, setActiveTab] = useState<'directors' | 'roster' | 'settings' | 'import' | 'passwords' | 'analytics' | 'audit'>('directors');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Director management state
  const [isAddDirectorOpen, setIsAddDirectorOpen] = useState(false);
  const [newDirectorData, setNewDirectorData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    temporaryPassword: '',
  });
  const [directorSuccessMsg, setDirectorSuccessMsg] = useState<string | null>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState(schoolSettings);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Audit search state
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilter, setAuditFilter] = useState<string>('all');

  // Register user modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userTypeToAdd, setUserTypeToAdd] = useState<'student' | 'teacher'>('student');
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    username: '',
    email: '',
    grade: 'Grade 10' as SecondaryGrade,
    section: 'Section 10A',
    studentId: '',
    temporaryPassword: '',
  });

  const [newTeacherData, setNewTeacherData] = useState({
    name: '',
    username: '',
    email: '',
    assignedGrades: ['Grade 10'] as SecondaryGrade[],
    assignedSections: ['Section 10A'],
    assignedSubjects: ['Mathematics'],
    temporaryPassword: '',
  });

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Bulk CSV state
  const [csvContent, setCsvContent] = useState('');
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Passwords batch state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Real KPI calculations
  const totalDirectors = allUsers.filter((u) => u.role === 'director').length;
  const totalStudents = allUsers.filter((u) => u.role === 'student').length;
  const totalTeachers = allUsers.filter((u) => u.role === 'teacher').length;
  const publishedExams = allExams.filter((e) => e.status === 'published').length;
  const completedSubmissions = allSubmissions.filter((s) => s.status === 'graded' || s.status === 'submitted');
  const averageScore =
    allSubmissions.filter((s) => s.status === 'graded').length > 0
      ? (
          allSubmissions
            .filter((s) => s.status === 'graded')
            .reduce((sum, s) => sum + (s.totalPossible > 0 ? (s.score / s.totalPossible) * 100 : 0), 0) /
          allSubmissions.filter((s) => s.status === 'graded').length
        ).toFixed(1)
      : '0.0';

  const directorsList = allUsers.filter((u) => u.role === 'director');

  const handleCreateDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirectorData.name || !newDirectorData.username || !newDirectorData.email) return;
    try {
      await registerDirector(newDirectorData);
      setDirectorSuccessMsg(`Director account for ${newDirectorData.name} created successfully!`);
      setNewDirectorData({ name: '', username: '', email: '', phone: '', temporaryPassword: '' });
      setIsAddDirectorOpen(false);
      setTimeout(() => setDirectorSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to create Director account');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSchoolSettings(settingsForm);
      setSettingsSuccessMsg('School information and security settings updated successfully.');
      setTimeout(() => setSettingsSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    }
  };

  // Filtered users: standard school roster displays secondary students and teachers
  const filteredUsers = allUsers.filter((u) => {
    if (u.role === 'admin' && roleFilter !== 'admin') {
      return false;
    }

    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.studentId && u.studentId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesGrade = gradeFilter === 'all' || u.grade === gradeFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesGrade && matchesStatus;
  });

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentData.name || !newStudentData.username) return;

    await registerStudent({
      name: newStudentData.name,
      username: newStudentData.username,
      email: newStudentData.email || undefined,
      grade: newStudentData.grade,
      section: newStudentData.section,
      studentId: newStudentData.studentId || undefined,
      temporaryPassword: newStudentData.temporaryPassword || undefined,
    });

    setIsAddUserOpen(false);
    setNewStudentData({
      name: '',
      username: '',
      email: '',
      grade: 'Grade 10',
      section: 'Section 10A',
      studentId: '',
      temporaryPassword: '',
    });
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherData.name || !newTeacherData.username) return;

    await registerTeacher({
      name: newTeacherData.name,
      username: newTeacherData.username,
      email: newTeacherData.email || undefined,
      assignedGrades: newTeacherData.assignedGrades,
      assignedSections: newTeacherData.assignedSections,
      assignedSubjects: newTeacherData.assignedSubjects,
      temporaryPassword: newTeacherData.temporaryPassword || undefined,
    });

    setIsAddUserOpen(false);
    setNewTeacherData({
      name: '',
      username: '',
      email: '',
      assignedGrades: ['Grade 10'],
      assignedSections: ['Section 10A'],
      assignedSubjects: ['Mathematics'],
      temporaryPassword: '',
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await updateUser(editingUser.id, editingUser);
    setEditingUser(null);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const parsed: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((item) => item.trim());
      if (row.length >= 2) {
        const item: any = {};
        headers.forEach((h, idx) => {
          item[h] = row[idx] || '';
        });
        parsed.push({
          name: item.name || item.fullname || `Student ${i}`,
          username: item.username || `student.${i}`,
          grade: item.grade || 'Grade 10',
          section: item.section || 'Section 10A',
          studentId: item.studentid || item.id || `SEC-${1000 + i}`,
          email: item.email || `${(item.username || `student.${i}`).toLowerCase()}@secondary.smartexam.edu`,
        });
      }
    }
    setCsvPreview(parsed);
  };

  const handleConfirmImport = async () => {
    if (csvPreview.length === 0) return;
    const count = await bulkImportStudents(csvPreview);
    setImportSuccessMessage(`Successfully enrolled ${count} students with auto-generated secure credentials!`);
    setCsvPreview([]);
    setCsvContent('');
    setTimeout(() => {
      setImportSuccessMessage(null);
      setActiveTab('roster');
    }, 2000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadSampleCsv = () => {
    const sample = `name,username,grade,section,studentid,email
Abebe Bikila,abebe.bikila,Grade 10,Section 10A,SEC-10-101,abebe@secondary.smartexam.edu
Tirunesh Dibaba,tirunesh.dibaba,Grade 10,Section 10A,SEC-10-102,tirunesh@secondary.smartexam.edu
Haile Gebrselassie,haile.gebre,Grade 11,11-Natural A,SEC-11-201,haile@secondary.smartexam.edu
Derartu Tulu,derartu.tulu,Grade 12,12-Social A,SEC-12-301,derartu@secondary.smartexam.edu`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'secondary_school_students_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Super Admin Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SchoolLogo size="md" lightText />
            <div className="hidden sm:block border-l border-slate-700 pl-3">
              <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/30 uppercase tracking-wide">
                Super Admin Suite
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-white">{currentUser?.name || 'Super Admin'}</div>
              <div className="text-[10px] text-rose-400 font-mono flex items-center justify-end gap-1">
                <Shield className="w-3 h-3" />
                Root Authority
              </div>
            </div>

            <button
              onClick={async () => {
                await logout();
                navigate('/admin/login');
              }}
              className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
        {/* Alerts / Feedback banners */}
        {directorSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{directorSuccessMsg}</span>
          </div>
        )}
        {settingsSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
            <span>{settingsSuccessMsg}</span>
          </div>
        )}

        {/* 6 KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-semibold">School Directors</span>
              <Briefcase className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalDirectors}</div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Faculty Leaders</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-semibold">Total Students</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalStudents}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Grades 9–12 Enrolled</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-semibold">Teaching Faculty</span>
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalTeachers}</div>
            <div className="text-[11px] text-blue-600 font-medium mt-0.5">Subject Teachers</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-semibold">Published Exams</span>
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{publishedExams}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Interactive Papers</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-semibold">Submissions</span>
              <CheckCircle className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{completedSubmissions.length}</div>
            <div className="text-[11px] text-teal-600 font-medium mt-0.5">Saved in Firestore</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-semibold">School Average</span>
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{averageScore}%</div>
            <div className="text-[11px] text-rose-500 font-medium mt-0.5">Assessment Mean</div>
          </div>
        </div>

        {/* Tab Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('directors')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'directors'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Directors ({totalDirectors})
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              School Users ({allUsers.filter((u) => u.role !== 'admin').length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              School Settings & Policies
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              System Audit Logs ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              CSV Bulk Import
            </button>
            <button
              onClick={() => setActiveTab('passwords')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'passwords'
                  ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              Temporary Passwords
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Analytics
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'directors' ? (
              <button
                onClick={() => setIsAddDirectorOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Provision School Director
              </button>
            ) : (
              <button
                onClick={() => setIsAddUserOpen(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Register Student / Teacher
              </button>
            )}
          </div>
        </div>

        {/* Tab 0: School Directors Management */}
        {activeTab === 'directors' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-500" />
                    School Directors & Executive Faculty
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Directors oversee teachers, manage candidate approval workflows, and monitor school-wide examination integrity.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddDirectorOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Provision Director
                </button>
              </div>

              {directorsList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No School Directors registered yet. Click &quot;Provision Director&quot; to create the first executive account.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {directorsList.map((director) => (
                    <div
                      key={director.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-sm">
                            {director.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              {director.name}
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                School Director
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              @{director.username}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            director.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {director.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{director.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{director.phone || 'Phone not set'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="text-[10px] text-slate-400">
                          ID: <span className="font-mono">{director.id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={async () => {
                              if (confirm(`Generate new secure temporary password for Director ${director.name}?`)) {
                                const newPass = await resetUserPassword(director.id);
                                alert(`Password reset for ${director.name}. New secure password: ${newPass}`);
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Key className="w-3 h-3" />
                            Reset Password
                          </button>
                          <button
                            onClick={async () => {
                              await toggleUserStatus(director.id);
                            }}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer ${
                              director.status === 'active'
                                ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                            }`}
                          >
                            {director.status === 'active' ? (
                              <>
                                <UserX className="w-3 h-3" />
                                Suspend
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" />
                                Activate
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: School Settings & Policies */}
        {activeTab === 'settings' && (
          <div className="space-y-5">
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      Official School Profile & Academic Year
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure institutional identity and curriculum year for Grades 9 through 12.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Save Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Official Secondary School Name
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.schoolName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, schoolName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      School Motto
                    </label>
                    <input
                      type="text"
                      value={settingsForm.motto}
                      onChange={(e) => setSettingsForm({ ...settingsForm, motto: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      value={settingsForm.academicYear}
                      onChange={(e) => setSettingsForm({ ...settingsForm, academicYear: e.target.value })}
                      placeholder="e.g. 2026/2027"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      School Principal / Director Name
                    </label>
                    <input
                      type="text"
                      value={settingsForm.directorName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, directorName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Institutional Contact Email
                    </label>
                    <input
                      type="email"
                      value={settingsForm.contactEmail}
                      onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Institutional Phone
                    </label>
                    <input
                      type="text"
                      value={settingsForm.contactPhone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Security & Access Policies */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Examination & Registration Security Policies
                </h3>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.requireStudentApproval}
                      onChange={(e) => setSettingsForm({ ...settingsForm, requireStudentApproval: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Require Director Approval for Online Student Self-Registrations
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        When enabled, candidate accounts remain in &quot;Pending Approval&quot; state until authorized by the School Director.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.allowStudentRegistration}
                      onChange={(e) => setSettingsForm({ ...settingsForm, allowStudentRegistration: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Allow Public Student Registration on Portal Gateway
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Students in Grades 9–12 can self-enroll online using their official secondary student ID.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Grades & Curriculum Config */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  Secondary School Curriculum Scope
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {SECONDARY_GRADES.map((grade) => (
                    <div
                      key={grade}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-900 dark:text-slate-200">{grade}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Tab: System Audit Logs */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-500" />
                    Security & System Audit Trail
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Immutable activity log recording user authentication, password resets, registration approvals, and exam modifications.
                  </p>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Total Logged Events: <span className="font-bold text-slate-900 dark:text-white font-mono">{auditLogs.length}</span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search audit trail by actor, action, or details..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <select
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Actor Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="director">Director</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="system">System</option>
                </select>
              </div>

              {/* Log Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Actor</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Target</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {auditLogs
                      .filter((log) => {
                        const matchesText =
                          log.actorName.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.details.toLowerCase().includes(auditSearch.toLowerCase());
                        const matchesRole = auditFilter === 'all' || log.actorRole === auditFilter;
                        return matchesText && matchesRole;
                      })
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-900 dark:text-white">{log.actorName}</div>
                            <span className="text-[10px] text-slate-500 font-mono uppercase">{log.actorRole}</span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="font-mono text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 capitalize whitespace-nowrap">
                            {log.targetType}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 font-sans max-w-md truncate">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: School Roster */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by student name, ID, username..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="admin">Administrators</option>
                </select>

                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <option value="all">All Secondary Grades</option>
                  {SECONDARY_GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* User Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">User Details</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Grade & Class / Subjects</th>
                      <th className="py-3 px-4">Student ID / Staff ID</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Temporary Pass</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <School className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <div className="font-semibold text-slate-600 dark:text-slate-300">No school accounts found</div>
                          <p className="text-xs text-slate-400 mt-0.5">Click Register Student / Teacher above to add candidates.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {u.role === 'admin' ? 'A' : u.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {u.role === 'admin' ? 'School Administrator' : u.name}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {u.role === 'admin' ? '••••••••' : `@${u.username}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.role === 'admin'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : u.role === 'teacher'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {u.role === 'student' ? (
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {u.grade || 'Grade 10'} • {u.section || 'Section A'}
                              </span>
                            ) : u.role === 'teacher' ? (
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {u.assignedSubjects?.join(', ') || 'Secondary Science'}
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  {u.assignedGrades?.join(', ')} ({u.assignedSections?.join(', ')})
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Secondary School Administration</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                            {u.studentId || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {u.status === 'active' ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {u.role === 'admin' ? (
                              <span className="text-slate-400 italic">Protected</span>
                            ) : u.temporaryPassword ? (
                              <div className="flex items-center gap-1.5">
                                <span className="bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded font-bold">
                                  {u.temporaryPassword}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(u.temporaryPassword!, u.id)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                                  title="Copy password"
                                >
                                  {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Permanent set</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {u.role === 'admin' ? (
                              <span className="text-[10px] text-slate-400 italic">Master Account</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => toggleUserStatus(u.id)}
                                  className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                    u.status === 'active'
                                      ? 'border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300'
                                      : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                                  }`}
                                  title={u.status === 'active' ? 'Suspend account' : 'Activate account'}
                                >
                                  {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={async () => {
                                    const newP = await resetUserPassword(u.id);
                                    copyToClipboard(newP, u.id);
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="Reset to temporary password"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingUser(u)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Bulk CSV Import */}
        {activeTab === 'import' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Bulk Secondary Student Import (Grades 9–12)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Import official student rosters from school administrative software using standard CSV files.
                </p>
              </div>
              <button
                onClick={downloadSampleCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample CSV
              </button>
            </div>

            {importSuccessMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {importSuccessMessage}
              </div>
            )}

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-rose-500 bg-slate-50/50 dark:bg-slate-800/20 transition-colors">
              <Upload className="w-10 h-10 text-rose-600 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Select Student List CSV</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                CSV format: <code className="text-rose-600">name, username, grade, section, studentid, email</code>
              </p>
              <label className="mt-4 inline-block px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                Browse CSV File
                <input type="file" accept=".csv" onChange={handleCsvFileUpload} className="hidden" />
              </label>
            </div>

            {csvPreview.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Previewing {csvPreview.length} Candidates to Enrol
                  </span>
                  <button
                    onClick={handleConfirmImport}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Enrol All & Generate Passwords
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Username</th>
                        <th className="p-2.5">Grade & Section</th>
                        <th className="p-2.5">Student ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 font-semibold text-slate-800 dark:text-white">{row.name}</td>
                          <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{row.username}</td>
                          <td className="p-2.5">{row.grade} • {row.section}</td>
                          <td className="p-2.5 font-mono">{row.studentId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Passwords Batch View */}
        {activeTab === 'passwords' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Student Temporary Passwords Roster</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Copy or print temporary passwords for distribution to candidates prior to examinations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allUsers
                .filter((u) => u.role === 'student')
                .map((student) => (
                  <div
                    key={student.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">{student.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {student.studentId} • {student.grade} ({student.section})
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {student.temporaryPassword ? (
                        <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950 px-2.5 py-1 rounded-lg">
                          {student.temporaryPassword}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Custom Password</span>
                      )}
                      <button
                        onClick={async () => {
                          const newPass = await resetUserPassword(student.id);
                          copyToClipboard(newPass, student.id);
                        }}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                        title="Generate fresh password"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tab 4: Analytics */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Enrollment by Secondary Grade</h4>
              <div className="space-y-3">
                {SECONDARY_GRADES.map((grade) => {
                  const count = allUsers.filter((u) => u.role === 'student' && u.grade === grade).length;
                  const pct = totalStudents > 0 ? ((count / totalStudents) * 100).toFixed(0) : '0';
                  return (
                    <div key={grade}>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-700 dark:text-slate-300">{grade}</span>
                        <span className="text-slate-900 dark:text-white">{count} Candidates ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div className="bg-rose-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Database & Security Integrity</h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                  <div className="font-bold">Role-Based Access Control (RBAC)</div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Strict portal boundaries ensure students cannot view answer keys, unpublished exams, or administrative functions.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                  <div className="font-bold">Firestore Enterprise Database</div>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-0.5 font-mono">
                    ID: ai-studio-smartexamsystem-5130d5bb-b12b-494f-8a7f-24643e161a8c
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Register User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">Register Account</span>
                <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setUserTypeToAdd('student')}
                    className={`px-2 py-0.5 rounded-md font-semibold ${userTypeToAdd === 'student' ? 'bg-white dark:bg-slate-900 shadow-xs text-rose-600' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserTypeToAdd('teacher')}
                    className={`px-2 py-0.5 rounded-md font-semibold ${userTypeToAdd === 'teacher' ? 'bg-white dark:bg-slate-900 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    Teacher
                  </button>
                </div>
              </div>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {userTypeToAdd === 'student' ? (
              <form onSubmit={handleCreateStudent} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Student Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStudentData.name}
                    onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                    placeholder="e.g. Almaz Bekele"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={newStudentData.username}
                      onChange={(e) => setNewStudentData({ ...newStudentData, username: e.target.value })}
                      placeholder="e.g. almaz.b"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Student ID</label>
                    <input
                      type="text"
                      value={newStudentData.studentId}
                      onChange={(e) => setNewStudentData({ ...newStudentData, studentId: e.target.value })}
                      placeholder="e.g. SEC-10-104"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Secondary Grade</label>
                    <select
                      value={newStudentData.grade}
                      onChange={(e) => {
                        const g = e.target.value as SecondaryGrade;
                        setNewStudentData({
                          ...newStudentData,
                          grade: g,
                          section: GRADE_SECTIONS_MAP[g][0],
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {SECONDARY_GRADES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Class Section</label>
                    <select
                      value={newStudentData.section}
                      onChange={(e) => setNewStudentData({ ...newStudentData, section: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {GRADE_SECTIONS_MAP[newStudentData.grade].map((sec) => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Temporary Password (Leave blank for auto-generate)</label>
                  <input
                    type="text"
                    value={newStudentData.temporaryPassword}
                    onChange={(e) => setNewStudentData({ ...newStudentData, temporaryPassword: e.target.value })}
                    placeholder="Auto-generated e.g. Sec@ABC-789"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddUserOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  >
                    Enrol Student
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateTeacher} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Teacher Full Name</label>
                  <input
                    type="text"
                    required
                    value={newTeacherData.name}
                    onChange={(e) => setNewTeacherData({ ...newTeacherData, name: e.target.value })}
                    placeholder="e.g. Mr. Kassahun Tadesse"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={newTeacherData.username}
                      onChange={(e) => setNewTeacherData({ ...newTeacherData, username: e.target.value })}
                      placeholder="e.g. teacher.kassahun"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">School Email (Optional)</label>
                    <input
                      type="email"
                      value={newTeacherData.email}
                      onChange={(e) => setNewTeacherData({ ...newTeacherData, email: e.target.value })}
                      placeholder="teacher@secondary.smartexam.edu"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Assigned Subject</label>
                  <select
                    value={newTeacherData.assignedSubjects[0]}
                    onChange={(e) => setNewTeacherData({ ...newTeacherData, assignedSubjects: [e.target.value] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {SECONDARY_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Assigned Secondary Grade</label>
                  <select
                    value={newTeacherData.assignedGrades[0]}
                    onChange={(e) => {
                      const g = e.target.value as SecondaryGrade;
                      setNewTeacherData({
                        ...newTeacherData,
                        assignedGrades: [g],
                        assignedSections: [GRADE_SECTIONS_MAP[g][0]],
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {SECONDARY_GRADES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddUserOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Register Teacher
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Provision Director Modal */}
      {isAddDirectorOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Provision School Director</h3>
              </div>
              <button 
                onClick={() => setIsAddDirectorOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDirector} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300">
                School Directors have institutional authority to approve student registrations, manage teaching staff, and view school-wide grade analytics.
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Director Full Name</label>
                <input
                  type="text"
                  required
                  value={newDirectorData.name}
                  onChange={(e) => setNewDirectorData({ ...newDirectorData, name: e.target.value })}
                  placeholder="e.g. Dr. Abebe Kebede"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Director Username</label>
                  <input
                    type="text"
                    required
                    value={newDirectorData.username}
                    onChange={(e) => setNewDirectorData({ ...newDirectorData, username: e.target.value })}
                    placeholder="e.g. director.abebe"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Contact Phone</label>
                  <input
                    type="text"
                    value={newDirectorData.phone}
                    onChange={(e) => setNewDirectorData({ ...newDirectorData, phone: e.target.value })}
                    placeholder="+251 911 234567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={newDirectorData.email}
                  onChange={(e) => setNewDirectorData({ ...newDirectorData, email: e.target.value })}
                  placeholder="director.abebe@secondary.smartexam.edu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Initial Password (or leave blank for auto-generate)
                </label>
                <input
                  type="text"
                  value={newDirectorData.temporaryPassword}
                  onChange={(e) => setNewDirectorData({ ...newDirectorData, temporaryPassword: e.target.value })}
                  placeholder="e.g. Director@2026 or leave blank"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDirectorOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold cursor-pointer"
                >
                  Provision Director Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Edit User: {editingUser.name}</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              {editingUser.role === 'student' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">Grade</label>
                    <select
                      value={editingUser.grade || 'Grade 10'}
                      onChange={(e) => setEditingUser({ ...editingUser, grade: e.target.value as SecondaryGrade })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {SECONDARY_GRADES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Section</label>
                    <input
                      type="text"
                      value={editingUser.section || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, section: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
