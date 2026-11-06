import React, { useState } from 'react';
import { useRouter } from '../../router.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { SchoolLogo } from '../layout/SchoolLogo.tsx';
import { 
  UserProfile, 
  SecondaryGrade, 
  SECONDARY_GRADES, 
  SECONDARY_SUBJECTS, 
  GRADE_SECTIONS_MAP,
  Exam,
  LiveLesson
} from '../../types/index.ts';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Search, 
  Plus, 
  Download, 
  RefreshCw, 
  UserCheck, 
  UserX, 
  LogOut, 
  Sun, 
  Moon, 
  Award, 
  Clock, 
  Check, 
  Copy, 
  Eye, 
  Filter,
  BarChart3,
  Calendar,
  AlertCircle,
  Video,
  Radio,
  Layers,
  ShieldCheck,
  CheckCheck,
  UserPlus,
  Phone,
  Mail,
  ShieldAlert
} from 'lucide-react';

export type DirectorDashboardTab = 
  | 'overview' 
  | 'requests' 
  | 'approved_students' 
  | 'rejected_students' 
  | 'teachers' 
  | 'classes' 
  | 'exams' 
  | 'live_learning' 
  | 'reports';

export const DirectorDashboard: React.FC = () => {
  const { navigate } = useRouter();
  const { 
    currentUser, 
    logout, 
    theme, 
    setTheme, 
    allUsers, 
    allExams, 
    allSubmissions, 
    liveLessons,
    isSyncing,
    lastSyncedAt,
    syncError,
    refreshData,
    registerTeacher,
    updateUser,
    toggleUserStatus,
    resetUserPassword,
    approveStudentRegistration,
    approveTeacherRegistration,
    toggleTeacherActivation,
    toggleResultsRelease
  } = useAuth();

  // Route protection
  React.useEffect(() => {
    if (!currentUser || (currentUser.role !== 'director' && currentUser.role !== 'super_admin' && currentUser.role !== 'admin')) {
      navigate('/director/login');
    }
  }, [currentUser, navigate]);

  const [activeTab, setActiveTab] = useState<DirectorDashboardTab>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Teacher filter & modal states
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<'all' | 'pending' | 'active' | 'inactive' | 'rejected'>('all');
  const [viewingTeacher, setViewingTeacher] = useState<UserProfile | null>(null);
  const [rejectingTeacherId, setRejectingTeacherId] = useState<string | null>(null);
  const [teacherRejectionReason, setTeacherRejectionReason] = useState<string>('');

  // Selected grade and section for "Classes and Grades" tab
  const [selectedClassGrade, setSelectedClassGrade] = useState<SecondaryGrade>('Grade 10');
  const [selectedClassSection, setSelectedClassSection] = useState<string>('Section 10A');

  // Teacher registration modal
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [newTeacherData, setNewTeacherData] = useState({
    name: '',
    username: '',
    email: '',
    assignedGrades: ['Grade 10'] as SecondaryGrade[],
    assignedSections: ['Section 10A'],
    assignedSubjects: ['Mathematics'],
    temporaryPassword: '',
  });

  // Edit teacher modal
  const [editingTeacher, setEditingTeacher] = useState<UserProfile | null>(null);

  // Student rejection reason modal
  const [rejectingStudentId, setRejectingStudentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Collections
  const teachersList = allUsers.filter((u) => u.role === 'teacher');
  const pendingTeachers = teachersList.filter(
    (t) => t.registrationStatus === 'pending_approval' || t.status === 'pending'
  );
  const activeTeachers = teachersList.filter(
    (t) => (t.registrationStatus === 'approved' || !t.registrationStatus) && t.status === 'active'
  );
  const inactiveTeachers = teachersList.filter(
    (t) => t.status === 'inactive' || t.status === 'suspended'
  );
  const rejectedTeachers = teachersList.filter(
    (t) => t.registrationStatus === 'rejected'
  );

  const studentsList = allUsers.filter((u) => u.role === 'student');
  const pendingRequests = studentsList.filter(
    (s) => s.registrationStatus === 'pending_approval' || s.status === 'pending'
  );
  const approvedStudentsList = studentsList.filter(
    (s) => s.registrationStatus === 'approved' || (s.status === 'active' && s.registrationStatus !== 'rejected')
  );
  const rejectedStudentsList = studentsList.filter(
    (s) => s.registrationStatus === 'rejected'
  );
  const publishedExamsList = allExams.filter((e) => e.status === 'published');
  
  const gradedSubs = allSubmissions.filter((s) => s.status === 'graded');
  const schoolAverage = gradedSubs.length > 0
    ? (gradedSubs.reduce((sum, s) => sum + (s.totalPossible > 0 ? (s.score / s.totalPossible) * 100 : 0), 0) / gradedSubs.length).toFixed(1)
    : '0.0';

  const activeLiveClassrooms = liveLessons.filter((l) => l.status === 'live');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegisterTeacher = async (e: React.FormEvent) => {
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

    setIsAddTeacherOpen(false);
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

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    await updateUser(editingTeacher.id, editingTeacher);
    setEditingTeacher(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectingStudentId) return;
    await approveStudentRegistration(rejectingStudentId, false, rejectionReason);
    setRejectingStudentId(null);
    setRejectionReason('');
  };

  const handleConfirmTeacherReject = async () => {
    if (!rejectingTeacherId) return;
    await approveTeacherRegistration(rejectingTeacherId, false, teacherRejectionReason);
    setRejectingTeacherId(null);
    setTeacherRejectionReason('');
  };

  const handleApproveAllPending = async () => {
    for (const req of pendingRequests) {
      await approveStudentRegistration(req.id, true);
    }
  };

  const exportSchoolReportCsv = () => {
    let csv = 'Student Name,Student ID,Grade,Section,Exam Title,Subject,Score,Total Possible,Percentage,Status,Submission Date\n';
    
    allSubmissions.forEach((sub) => {
      const pct = sub.totalPossible > 0 ? ((sub.score / sub.totalPossible) * 100).toFixed(1) : '0';
      csv += `"${sub.studentName}","${sub.studentId}","${sub.grade}","${sub.section}","${sub.examTitle}","${sub.subject}",${sub.score},${sub.totalPossible},${pct}%,"${sub.status}","${sub.submittedAt || sub.createdAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfe_school_performance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Date filter helper
  const matchesDateFilter = (isoDateString?: string) => {
    if (dateFilter === 'all' || !isoDateString) return true;
    const date = new Date(isoDateString).getTime();
    const now = Date.now();
    const diffHours = (now - date) / (1000 * 3600);
    if (dateFilter === 'today') return diffHours <= 24;
    if (dateFilter === '7days') return diffHours <= 24 * 7;
    if (dateFilter === '30days') return diffHours <= 24 * 30;
    return true;
  };

  // Filtered lists
  const filteredPendingRequests = pendingRequests.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGrade = gradeFilter === 'all' || s.grade === gradeFilter;
    const matchesSection = sectionFilter === 'all' || s.section === sectionFilter;
    const matchesDate = matchesDateFilter(s.createdAt);
    return matchesSearch && matchesGrade && matchesSection && matchesDate;
  });

  const filteredApprovedStudents = approvedStudentsList.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGrade = gradeFilter === 'all' || s.grade === gradeFilter;
    const matchesSection = sectionFilter === 'all' || s.section === sectionFilter;
    const matchesDate = matchesDateFilter(s.approvedAt || s.createdAt);
    return matchesSearch && matchesGrade && matchesSection && matchesDate;
  });

  const filteredRejectedStudents = rejectedStudentsList.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGrade = gradeFilter === 'all' || s.grade === gradeFilter;
    const matchesSection = sectionFilter === 'all' || s.section === sectionFilter;
    return matchesSearch && matchesGrade && matchesSection;
  });

  const filteredTeachers = teachersList.filter((t) => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.phone && t.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.assignedSubjects && t.assignedSubjects.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesSubject = subjectFilter === 'all' || (t.assignedSubjects && t.assignedSubjects.includes(subjectFilter));
    const matchesGrade = gradeFilter === 'all' || (t.assignedGrades && t.assignedGrades.includes(gradeFilter as SecondaryGrade));

    let matchesStatus = true;
    if (teacherStatusFilter === 'pending') {
      matchesStatus = t.registrationStatus === 'pending_approval' || t.status === 'pending';
    } else if (teacherStatusFilter === 'active') {
      matchesStatus = (t.registrationStatus === 'approved' || !t.registrationStatus) && t.status === 'active';
    } else if (teacherStatusFilter === 'inactive') {
      matchesStatus = t.status === 'inactive' || t.status === 'suspended';
    } else if (teacherStatusFilter === 'rejected') {
      matchesStatus = t.registrationStatus === 'rejected';
    }

    return matchesSearch && matchesSubject && matchesGrade && matchesStatus;
  });

  const filteredExams = allExams.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || e.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || e.grade === gradeFilter;
    const matchesSubject = subjectFilter === 'all' || e.subject === subjectFilter;
    return matchesSearch && matchesGrade && matchesSubject;
  });

  const filteredLiveLessons = liveLessons.filter((l) => {
    const matchesSearch = l.title.toLowerCase().includes(searchTerm.toLowerCase()) || l.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || l.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Director Header Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SchoolLogo size="md" lightText />
            <div className="hidden sm:block border-l border-slate-800 pl-3">
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                School Director Portal
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Grades 9–12 Academic Supervision</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real-Time Database Sync Button */}
            <button
              onClick={() => refreshData()}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              title="Synchronize live records with the school cloud database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
              {lastSyncedAt && (
                <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                  {lastSyncedAt}
                </span>
              )}
            </button>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-slate-800 bg-slate-850 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-white">{currentUser?.name || 'Abebe Bikila'}</div>
              <div className="text-[10px] text-amber-400 font-mono">School Director</div>
            </div>

            <button
              onClick={async () => {
                await logout();
                navigate('/director/login');
              }}
              className="px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-900/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
        {/* Sync error alert banner */}
        {syncError && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{syncError}</span>
            </div>
            <button
              onClick={() => refreshData()}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition-colors shrink-0"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold">Faculty</span>
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">{teachersList.length}</div>
            <div className="text-[10px] text-indigo-400 font-medium mt-1">Teaching Staff</div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold">Students</span>
              <GraduationCap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">{approvedStudentsList.length}</div>
            <div className="text-[10px] text-emerald-400 font-medium mt-1">Enrolled Grades 9–12</div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold">Requests</span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{pendingRequests.length}</div>
            <div className="text-[10px] text-amber-400 font-medium mt-1">Pending Approval</div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold">Live Classes</span>
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-rose-400">{activeLiveClassrooms.length}</div>
            <div className="text-[10px] text-rose-300 font-medium mt-1">Active Now</div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold">Exams</span>
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white">{publishedExamsList.length}</div>
            <div className="text-[10px] text-cyan-400 font-medium mt-1">Published</div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold">School Avg</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">{schoolAverage}%</div>
            <div className="text-[10px] text-purple-400 font-medium mt-1">Exam Average</div>
          </div>
        </div>

        {/* 9 Required Director Tabs */}
        <div className="flex items-center border-b border-slate-800 overflow-x-auto pb-1 gap-1.5 scrollbar-thin">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Student Registration Requests</span>
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('approved_students')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'approved_students'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Approved Students ({approvedStudentsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rejected_students')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rejected_students'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Rejected Registrations ({rejectedStudentsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'teachers'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Teacher Management ({teachersList.length})</span>
            {pendingTeachers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold">
                {pendingTeachers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'classes'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Classes and Grades</span>
          </button>

          <button
            onClick={() => setActiveTab('exams')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'exams'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Examination Overview ({allExams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('live_learning')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'live_learning'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span>Live Classrooms ({liveLessons.length})</span>
            {activeLiveClassrooms.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Reports and Analytics</span>
          </button>
        </div>

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 p-6 rounded-3xl border border-amber-500/30">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>SCHOOL FOR EXCELLENCE SECONDARY SCHOOL</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Official Director Administration Suite. Supervise secondary education across Grades 9, 10, 11, and 12. Review registration admissions, authorize teaching faculty, monitor real-time WebRTC live classes, and inspect examination integrity.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab('requests')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Review Pending ({pendingRequests.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('live_learning')}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Inspect Live Classrooms</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Pending Approvals Widget */}
            {pendingRequests.length > 0 && (
              <div className="bg-slate-900/90 rounded-2xl border border-amber-500/30 p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-white text-sm">Immediate Attention: Candidate Registration Approvals</h3>
                  </div>
                  <button
                    onClick={handleApproveAllPending}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Approve All ({pendingRequests.length})</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pendingRequests.slice(0, 6).map((req) => (
                    <div key={req.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white text-xs">{req.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: <span className="text-cyan-400 font-bold">{req.studentId || 'N/A'}</span> • {req.grade}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{req.section || 'Section A'}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => approveStudentRegistration(req.id, true)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                          title="Approve candidate"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectingStudentId(req.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-700/80 hover:bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                          title="Reject registration"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Live Classrooms Preview */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                  <h3 className="font-bold text-white text-sm">Active & Scheduled Live Learning Sessions</h3>
                </div>
                <button
                  onClick={() => setActiveTab('live_learning')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                >
                  View All Live Sessions →
                </button>
              </div>
              {liveLessons.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No live classrooms currently scheduled. Teachers can start interactive video classes from their portal.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {liveLessons.slice(0, 3).map((lesson) => (
                    <div key={lesson.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          lesson.status === 'live' 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' 
                            : 'bg-indigo-500/20 text-indigo-300'
                        }`}>
                          {lesson.status === 'live' ? '● LIVE CLASS' : 'SCHEDULED'}
                        </span>
                        <span className="text-[10px] text-slate-400">{lesson.grade}</span>
                      </div>
                      <div className="font-bold text-white text-xs line-clamp-1">{lesson.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>{lesson.teacherName}</span>
                        <span className="text-cyan-400 font-medium">{lesson.subject}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STUDENT REGISTRATION REQUESTS */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Pending Student Registration Requests ({pendingRequests.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review applicant details, verify official Student IDs, and authorize access to examinations.
                </p>
              </div>
              {pendingRequests.length > 0 && (
                <button
                  onClick={handleApproveAllPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Approve All ({pendingRequests.length})</span>
                </button>
              )}
            </div>

            {/* Filter controls */}
            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by student name, ID, or username..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500"
                />
              </div>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200"
              >
                <option value="all">All Grades</option>
                {SECONDARY_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200"
              >
                <option value="all">All Sections</option>
                <option value="Section 9A">Section 9A</option>
                <option value="Section 9B">Section 9B</option>
                <option value="Section 10A">Section 10A</option>
                <option value="Section 10B">Section 10B</option>
                <option value="Section 11A">Section 11A</option>
                <option value="Section 11B">Section 11B</option>
                <option value="Section 12A">Section 12A</option>
                <option value="Section 12B">Section 12B</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200"
              >
                <option value="all">All Registration Dates</option>
                <option value="today">Registered Today</option>
                <option value="7days">Past 7 Days</option>
                <option value="30days">Past 30 Days</option>
              </select>
            </div>

            {/* Requests Table */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Student Candidate</th>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">Grade & Section</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4 text-right">Director Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredPendingRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                          <div className="font-semibold text-slate-300">All Registration Requests Handled</div>
                          <p className="text-xs text-slate-500 mt-0.5">There are no pending student applications awaiting review.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPendingRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-850/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-amber-950/60 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-700/50">
                                {req.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{req.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">@{req.username}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                            {req.studentId || <span className="text-slate-500 italic">Not provided</span>}
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-200">{req.grade}</span>
                            <span className="text-[11px] text-slate-400 ml-1.5">({req.section || 'Section A'})</span>
                          </td>

                          <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                            {req.email}
                          </td>

                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => approveStudentRegistration(req.id, true)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>APPROVE STUDENT</span>
                              </button>
                              <button
                                onClick={() => setRejectingStudentId(req.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>REJECT STUDENT</span>
                              </button>
                            </div>
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

        {/* TAB 3: APPROVED STUDENTS */}
        {activeTab === 'approved_students' && (
          <div className="space-y-4">
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Approved Secondary School Students ({approvedStudentsList.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified candidates with active access to online examinations and live classrooms.
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search student name, ID, or username..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500"
                />
              </div>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200"
              >
                <option value="all">All Grades</option>
                {SECONDARY_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200"
              >
                <option value="all">All Sections</option>
                <option value="Section 9A">Section 9A</option>
                <option value="Section 9B">Section 9B</option>
                <option value="Section 10A">Section 10A</option>
                <option value="Section 10B">Section 10B</option>
                <option value="Section 11A">Section 11A</option>
                <option value="Section 11B">Section 11B</option>
                <option value="Section 12A">Section 12A</option>
                <option value="Section 12B">Section 12B</option>
              </select>
            </div>

            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Student Candidate</th>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">Grade & Section</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Approval Info</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredApprovedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <GraduationCap className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <div className="font-semibold text-slate-300">No approved students found</div>
                        </td>
                      </tr>
                    ) : (
                      filteredApprovedStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-850/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-700/50">
                                {s.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{s.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">@{s.username}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                            {s.studentId || 'N/A'}
                          </td>

                          <td className="py-3 px-4 text-slate-200">
                            <span className="font-semibold">{s.grade}</span> • {s.section || 'Section A'}
                          </td>

                          <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                            {s.email}
                          </td>

                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            <div>By: <span className="text-amber-400 font-medium">{s.approvedBy || 'Director Office'}</span></div>
                            <div className="text-[10px] text-slate-500">
                              {s.approvedAt ? new Date(s.approvedAt).toLocaleDateString() : 'Enrolled'}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              s.status === 'active' 
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                                : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                            }`}>
                              {s.status === 'active' ? 'Active' : 'Suspended'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => toggleUserStatus(s.id)}
                                className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                                  s.status === 'active'
                                    ? 'border-rose-800 text-rose-300 hover:bg-rose-950'
                                    : 'border-emerald-800 text-emerald-300 hover:bg-emerald-950'
                                }`}
                                title={s.status === 'active' ? 'Suspend student' : 'Reactivate student'}
                              >
                                {s.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={async () => {
                                  const newP = await resetUserPassword(s.id);
                                  copyToClipboard(newP, s.id);
                                }}
                                className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
                                title="Reset student password"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

        {/* TAB 4: REJECTED REGISTRATIONS */}
        {activeTab === 'rejected_students' && (
          <div className="space-y-4">
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Rejected Student Registration Archive ({rejectedStudentsList.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Records of denied student registrations with official notes. The Director can reverse a decision at any time.
              </p>
            </div>

            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">Grade & Section</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Official Rejection Note</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredRejectedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                          <div className="font-semibold text-slate-300">No Rejected Registrations</div>
                        </td>
                      </tr>
                    ) : (
                      filteredRejectedStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-850/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{s.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">@{s.username}</div>
                          </td>

                          <td className="py-3 px-4 font-mono text-cyan-400 font-bold">
                            {s.studentId || 'N/A'}
                          </td>

                          <td className="py-3 px-4 text-slate-300">
                            {s.grade} • {s.section}
                          </td>

                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                            {s.email}
                          </td>

                          <td className="py-3 px-4 text-rose-300 text-xs">
                            {s.rejectionReason || 'Registration details could not be verified.'}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => approveStudentRegistration(s.id, true)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-all"
                            >
                              Re-evaluate & Approve
                            </button>
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

        {/* TAB 5: TEACHER MANAGEMENT */}
        {activeTab === 'teachers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Academic Teaching Faculty ({teachersList.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Supervise teaching faculty for Grades 9–12. Review registration applications, authorize portal access, manage subject assignments, and activate/deactivate accounts.
                </p>
              </div>

              <button
                onClick={() => setIsAddTeacherOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Register Faculty Member</span>
              </button>
            </div>

            {/* Teacher Status Sub-Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setTeacherStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  teacherStatusFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                All Faculty ({teachersList.length})
              </button>

              <button
                onClick={() => setTeacherStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  teacherStatusFilter === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Pending Applications</span>
                {pendingTeachers.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold">
                    {pendingTeachers.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setTeacherStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  teacherStatusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active & Authorized ({activeTeachers.length})</span>
              </button>

              <button
                onClick={() => setTeacherStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  teacherStatusFilter === 'inactive'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <UserX className="w-3.5 h-3.5 text-slate-400" />
                <span>Deactivated / Suspended ({inactiveTeachers.length})</span>
              </button>

              <button
                onClick={() => setTeacherStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  teacherStatusFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Rejected Applications ({rejectedTeachers.length})</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search faculty by name, username, email, phone, or subject..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500"
                />
              </div>

              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200"
              >
                <option value="all">All Academic Subjects</option>
                {SECONDARY_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200"
              >
                <option value="all">All Assigned Grades</option>
                {SECONDARY_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Teachers Table */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Faculty Member</th>
                      <th className="py-3 px-4">Assigned Subjects</th>
                      <th className="py-3 px-4">Secondary Grades & Classes</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Temporary Key</th>
                      <th className="py-3 px-4 text-right">Director Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <div className="font-semibold text-slate-300">No teaching faculty found</div>
                          <p className="text-xs text-slate-500 mt-0.5">Adjust your search or status filter to see faculty records.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTeachers.map((t) => {
                        const isPending = t.registrationStatus === 'pending_approval' || t.status === 'pending';
                        const isRejected = t.registrationStatus === 'rejected';
                        const isInactive = t.status === 'inactive' || t.status === 'suspended';

                        return (
                          <tr key={t.id} className="hover:bg-slate-850/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                                  isPending
                                    ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                                    : isInactive
                                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                                    : isRejected
                                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                                    : 'bg-indigo-950 text-indigo-300 border-indigo-700/50'
                                }`}>
                                  {t.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-semibold text-white">{t.name}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">@{t.username}</div>
                                  {t.phone && (
                                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      <span>{t.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-semibold text-indigo-300">
                                {t.assignedSubjects?.[0] || 'General Science'}
                              </div>
                              {t.assignedSubjects && t.assignedSubjects.length > 1 && (
                                <div className="text-[10px] text-slate-400">
                                  +{t.assignedSubjects.length - 1} more: {t.assignedSubjects.slice(1).join(', ')}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-slate-300">
                              <div className="font-medium text-slate-200">
                                {t.assignedGrades?.join(', ') || 'Grades 9–10'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {t.assignedSections?.join(', ') || 'All Sections'}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Pending Review</span>
                                </span>
                              ) : isRejected ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800">
                                  <XCircle className="w-3 h-3" />
                                  <span>Rejected</span>
                                </span>
                              ) : isInactive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                  <UserX className="w-3 h-3" />
                                  <span>Deactivated</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Active & Authorized</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 font-mono text-[11px]">
                              {t.temporaryPassword ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="bg-amber-950 text-amber-200 border border-amber-800 px-1.5 py-0.5 rounded font-bold">
                                    {t.temporaryPassword}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(t.temporaryPassword!, t.id)}
                                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                                    title="Copy password"
                                  >
                                    {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">Encrypted</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Actions for pending teacher registration */}
                                {isPending ? (
                                  <>
                                    <button
                                      onClick={() => approveTeacherRegistration(t.id, true)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                                      title="Authorize teacher application"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>APPROVE</span>
                                    </button>
                                    <button
                                      onClick={() => setRejectingTeacherId(t.id)}
                                      className="px-2.5 py-1 rounded-lg bg-rose-700/80 hover:bg-rose-600 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition-all"
                                      title="Deny teacher application"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>REJECT</span>
                                    </button>
                                  </>
                                ) : isRejected ? (
                                  <button
                                    onClick={() => approveTeacherRegistration(t.id, true)}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-all"
                                    title="Re-evaluate and approve teacher"
                                  >
                                    Re-approve
                                  </button>
                                ) : (
                                  <>
                                    {/* Toggle Active / Inactive */}
                                    <button
                                      onClick={() => toggleTeacherActivation(t.id)}
                                      className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                        t.status === 'active'
                                          ? 'border-rose-800 text-rose-300 hover:bg-rose-950'
                                          : 'border-emerald-800 text-emerald-300 hover:bg-emerald-950'
                                      }`}
                                      title={t.status === 'active' ? 'Deactivate teacher account' : 'Reactivate teacher account'}
                                    >
                                      {t.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                    </button>

                                    {/* Reset Password */}
                                    <button
                                      onClick={async () => {
                                        const newP = await resetUserPassword(t.id);
                                        copyToClipboard(newP, t.id);
                                      }}
                                      className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
                                      title="Reset temporary password"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Edit Assignments */}
                                    <button
                                      onClick={() => setEditingTeacher(t)}
                                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  </>
                                )}

                                {/* View Details Modal Trigger */}
                                <button
                                  onClick={() => setViewingTeacher(t)}
                                  className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                                  title="View full faculty profile"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CLASSES AND GRADES */}
        {activeTab === 'classes' && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <span>Secondary School Classes and Grade Rosters (Grades 9–12)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Explore class rosters, student seat counts, and assigned teaching faculty by Grade and Section.
              </p>

              {/* Grade Selector Tabs */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-800">
                {SECONDARY_GRADES.map((grade) => {
                  const count = approvedStudentsList.filter((s) => s.grade === grade).length;
                  return (
                    <button
                      key={grade}
                      onClick={() => {
                        setSelectedClassGrade(grade);
                        const sections = GRADE_SECTIONS_MAP[grade] || [];
                        setSelectedClassSection(sections[0] || 'Section A');
                      }}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                        selectedClassGrade === grade
                          ? 'bg-cyan-500 text-slate-950 shadow-md'
                          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>{grade}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        selectedClassGrade === grade ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {count} Students
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Section Selector Tabs */}
              <div className="flex flex-wrap gap-2 mt-3">
                {(GRADE_SECTIONS_MAP[selectedClassGrade] || []).map((sec) => {
                  const secCount = approvedStudentsList.filter(
                    (s) => s.grade === selectedClassGrade && s.section === sec
                  ).length;
                  return (
                    <button
                      key={sec}
                      onClick={() => setSelectedClassSection(sec)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedClassSection === sec
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      {sec} ({secCount})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Class Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Students Roster */}
              <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                  <div className="font-bold text-white text-xs">
                    Roster: {selectedClassGrade} - {selectedClassSection}
                  </div>
                  <span className="text-[11px] text-cyan-400 font-mono">
                    {approvedStudentsList.filter((s) => s.grade === selectedClassGrade && s.section === selectedClassSection).length} Enrolled
                  </span>
                </div>

                <div className="divide-y divide-slate-800 max-h-[480px] overflow-y-auto">
                  {approvedStudentsList
                    .filter((s) => s.grade === selectedClassGrade && s.section === selectedClassSection)
                    .map((st) => (
                      <div key={st.id} className="p-3.5 flex items-center justify-between hover:bg-slate-850/50">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-xs">{st.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ID: <span className="text-cyan-400">{st.studentId || 'N/A'}</span> • {st.email}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-800 font-medium">
                          Active
                        </span>
                      </div>
                    ))}
                  {approvedStudentsList.filter((s) => s.grade === selectedClassGrade && s.section === selectedClassSection).length === 0 && (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No students currently assigned to {selectedClassGrade} - {selectedClassSection}.
                    </div>
                  )}
                </div>
              </div>

              {/* Right 1 Col: Assigned Teachers */}
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Assigned Faculty for {selectedClassGrade}</span>
                </h4>
                <div className="space-y-2.5">
                  {teachersList
                    .filter((t) => t.assignedGrades?.includes(selectedClassGrade))
                    .map((t) => (
                      <div key={t.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="font-bold text-white text-xs">{t.name}</div>
                        <div className="text-[11px] text-indigo-400 font-medium mt-0.5">
                          {t.assignedSubjects?.join(', ') || 'Faculty'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">
                          @{t.username} • {t.assignedSections?.join(', ')}
                        </div>
                      </div>
                    ))}
                  {teachersList.filter((t) => t.assignedGrades?.includes(selectedClassGrade)).length === 0 && (
                    <div className="text-xs text-slate-500 italic">No faculty assigned yet to this grade.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: EXAMINATION OVERVIEW */}
        {activeTab === 'exams' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Secondary School Examination Catalog ({allExams.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Supervise faculty examinations across Grades 9, 10, 11, and 12, check statuses, and manage results release.
                </p>
              </div>
            </div>

            {/* Filter controls */}
            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search exam title or teacher..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500"
                />
              </div>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200"
              >
                <option value="all">All Grades</option>
                {SECONDARY_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200"
              >
                <option value="all">All Academic Subjects</option>
                {SECONDARY_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* Exam Table */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Examination Title</th>
                      <th className="py-3 px-4">Subject & Grade</th>
                      <th className="py-3 px-4">Instructor</th>
                      <th className="py-3 px-4">Duration & Marks</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Results Released</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredExams.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <div className="font-semibold text-slate-300">No examinations found</div>
                        </td>
                      </tr>
                    ) : (
                      filteredExams.map((ex) => {
                        const subsCount = allSubmissions.filter((s) => s.examId === ex.id).length;
                        return (
                          <tr key={ex.id} className="hover:bg-slate-850/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{ex.title}</div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                Questions: {ex.questions?.length || 0} • Submissions: {subsCount}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-semibold text-indigo-300">{ex.subject}</span>
                              <div className="text-[11px] text-slate-400">{ex.grade}</div>
                            </td>

                            <td className="py-3 px-4 text-slate-300">
                              {ex.teacherName}
                            </td>

                            <td className="py-3 px-4 text-slate-300">
                              <div>{ex.durationMinutes} mins</div>
                              <div className="text-[11px] text-cyan-400 font-semibold">{ex.totalMarks} Marks</div>
                            </td>

                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                ex.status === 'published' 
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                                  : ex.status === 'scheduled'
                                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {ex.status}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                ex.resultsReleased 
                                  ? 'bg-emerald-500/20 text-emerald-300' 
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {ex.resultsReleased ? 'Yes (Visible)' : 'No (Hidden)'}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => toggleResultsRelease(ex.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                                  ex.resultsReleased
                                    ? 'border-amber-600/40 text-amber-300 hover:bg-amber-950'
                                    : 'border-emerald-600/40 text-emerald-300 hover:bg-emerald-950'
                                }`}
                              >
                                {ex.resultsReleased ? 'Hide Results' : 'Release Results'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: LIVE CLASSROOMS */}
        {activeTab === 'live_learning' && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Video className="w-5 h-5 text-rose-500" />
                  <span>Real-Time Live Learning Classrooms (WebRTC)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Active video audio classes across Grades 9–12. Real-time signaling on port 3000 WebSocket server.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-900 px-3 py-1.5 rounded-xl">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  {activeLiveClassrooms.length} Active Video Session{activeLiveClassrooms.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Filter controls */}
            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search live lesson title or instructor..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500"
                />
              </div>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200"
              >
                <option value="all">All Grades</option>
                {SECONDARY_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Live Classrooms Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLiveLessons.length === 0 ? (
                <div className="col-span-3 py-16 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
                  <Video className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <div className="font-semibold text-slate-300">No Live Classrooms Found</div>
                  <p className="text-xs text-slate-500 mt-0.5">Faculty members can launch live classes directly from their Teacher Dashboard.</p>
                </div>
              ) : (
                filteredLiveLessons.map((lesson) => (
                  <div key={lesson.id} className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 ${
                        lesson.status === 'live'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          : lesson.status === 'scheduled'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {lesson.status === 'live' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                        {lesson.status === 'live' ? 'Live Session' : lesson.status}
                      </span>

                      <span className="text-xs font-bold text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/50">
                        {lesson.grade}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm line-clamp-2">{lesson.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{lesson.description || 'Secondary school interactive curriculum session.'}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Instructor:</span>
                        <span className="font-semibold text-white">{lesson.teacherName}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Subject:</span>
                        <span className="font-semibold text-indigo-400">{lesson.subject}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Section:</span>
                        <span className="font-mono text-amber-300">{lesson.section || 'All Sections'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Started / Scheduled:</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {lesson.startedAt ? new Date(lesson.startedAt).toLocaleTimeString() : 'Immediate'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Active Participants: <strong className="text-white">{lesson.participants?.length || 1}</strong></span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 9: REPORTS AND ANALYTICS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <span>Secondary School Academic Performance & Examination Analytics</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  School-wide grade point metrics, subject mastery breakdowns, and exportable reports.
                </p>
              </div>

              <button
                onClick={exportSchoolReportCsv}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Export Authorized CSV</span>
              </button>
            </div>

            {/* Grade-by-grade Performance Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {SECONDARY_GRADES.map((grade) => {
                const gradeSubs = allSubmissions.filter((s) => s.grade === grade && s.status === 'graded');
                const avg = gradeSubs.length > 0
                  ? (gradeSubs.reduce((sum, s) => sum + (s.totalPossible > 0 ? (s.score / s.totalPossible) * 100 : 0), 0) / gradeSubs.length).toFixed(1)
                  : '0.0';
                const stCount = approvedStudentsList.filter((s) => s.grade === grade).length;
                const exCount = allExams.filter((e) => e.grade === grade).length;

                return (
                  <div key={grade} className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{grade}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {stCount} Students
                      </span>
                    </div>

                    <div className="text-3xl font-extrabold text-amber-400">{avg}%</div>
                    <div className="text-[11px] text-slate-400">Class Average Score</div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Exams: <strong className="text-slate-200">{exCount}</strong></span>
                      <span>Submissions: <strong className="text-slate-200">{gradeSubs.length}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subject Mastery Analysis */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4">
              <h4 className="font-bold text-white text-sm">Subject Mastery Performance</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {SECONDARY_SUBJECTS.map((sub) => {
                  const subSubs = allSubmissions.filter((s) => s.subject === sub && s.status === 'graded');
                  const subAvg = subSubs.length > 0
                    ? (subSubs.reduce((sum, s) => sum + (s.totalPossible > 0 ? (s.score / s.totalPossible) * 100 : 0), 0) / subSubs.length).toFixed(1)
                    : 'N/A';
                  return (
                    <div key={sub} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white text-xs">{sub}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{subSubs.length} assessments</div>
                      </div>
                      <div className="text-sm font-bold text-cyan-400">{subAvg}{subAvg !== 'N/A' ? '%' : ''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Register Teacher Modal */}
      {isAddTeacherOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="font-bold text-white text-sm">Register Secondary School Teacher</h3>
              <button onClick={() => setIsAddTeacherOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleRegisterTeacher} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Teacher Full Name *</label>
                <input
                  type="text"
                  required
                  value={newTeacherData.name}
                  onChange={(e) => setNewTeacherData({ ...newTeacherData, name: e.target.value })}
                  placeholder="e.g. Mr. Kassahun Tadesse"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">School Username *</label>
                <input
                  type="text"
                  required
                  value={newTeacherData.username}
                  onChange={(e) => setNewTeacherData({ ...newTeacherData, username: e.target.value })}
                  placeholder="e.g. kassahun.t"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Email Address (Optional)</label>
                <input
                  type="email"
                  value={newTeacherData.email}
                  onChange={(e) => setNewTeacherData({ ...newTeacherData, email: e.target.value })}
                  placeholder="kassahun@excellence.edu.et"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Primary Assigned Subject</label>
                <select
                  value={newTeacherData.assignedSubjects[0]}
                  onChange={(e) => setNewTeacherData({ ...newTeacherData, assignedSubjects: [e.target.value] })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white"
                >
                  {SECONDARY_SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Assigned Secondary Grade</label>
                <select
                  value={newTeacherData.assignedGrades[0]}
                  onChange={(e) => {
                    const g = e.target.value as SecondaryGrade;
                    setNewTeacherData({
                      ...newTeacherData,
                      assignedGrades: [g],
                      assignedSections: [GRADE_SECTIONS_MAP[g]?.[0] || 'Section 10A'],
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white"
                >
                  {SECONDARY_GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Temporary Password</label>
                <input
                  type="text"
                  value={newTeacherData.temporaryPassword}
                  onChange={(e) => setNewTeacherData({ ...newTeacherData, temporaryPassword: e.target.value })}
                  placeholder="Leave blank to auto-generate e.g. Sec@ABC-789"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
                >
                  Enroll Faculty Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="font-bold text-white text-sm">Edit Teacher Assignment</h3>
              <button onClick={() => setEditingTeacher(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateTeacher} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Teacher Name</label>
                <input
                  type="text"
                  value={editingTeacher.name}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Assigned Subject</label>
                <select
                  value={editingTeacher.assignedSubjects?.[0] || 'Mathematics'}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, assignedSubjects: [e.target.value] })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white"
                >
                  {SECONDARY_SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Assigned Secondary Grade</label>
                <select
                  value={editingTeacher.assignedGrades?.[0] || 'Grade 10'}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, assignedGrades: [e.target.value as SecondaryGrade] })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white"
                >
                  {SECONDARY_GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Student Reason Modal */}
      {rejectingStudentId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Reject Candidate Registration</h3>
            <p className="text-xs text-slate-400">
              Provide an official note for why this candidate registration was not approved. The applicant will see this explanation.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Student ID does not match official physical admission file or duplicate registration."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectingStudentId(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Teacher Reason Modal */}
      {rejectingTeacherId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-white text-sm">Deny Teacher Registration Application</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Provide an official statement explaining why this teaching candidate registration was not approved. The applicant will see this note upon attempting to sign in.
            </p>

            <textarea
              value={teacherRejectionReason}
              onChange={(e) => setTeacherRejectionReason(e.target.value)}
              placeholder="e.g. Teaching credentials or background could not be verified by the Director's Office."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setRejectingTeacherId(null);
                  setTeacherRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs cursor-pointer hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTeacherReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Teacher Details Modal */}
      {viewingTeacher && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Faculty Member Profile & Assignments</h3>
              </div>
              <button
                onClick={() => setViewingTeacher(null)}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-bold text-white">{viewingTeacher.name}</h4>
                  <div className="text-slate-400 font-mono mt-0.5">@{viewingTeacher.username}</div>
                </div>
                <div>
                  {viewingTeacher.registrationStatus === 'pending_approval' || viewingTeacher.status === 'pending' ? (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Pending Review
                    </span>
                  ) : viewingTeacher.registrationStatus === 'rejected' ? (
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800">
                      Rejected
                    </span>
                  ) : viewingTeacher.status === 'inactive' || viewingTeacher.status === 'suspended' ? (
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      Deactivated
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                      Active & Authorized
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Official Email</span>
                  <div className="text-slate-200 font-mono mt-0.5">{viewingTeacher.email || 'None provided'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Phone Contact</span>
                  <div className="text-slate-200 font-mono mt-0.5">{viewingTeacher.phone || 'None provided'}</div>
                </div>
              </div>

              {/* Academic Assignments */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Teaching Subjects</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingTeacher.assignedSubjects && viewingTeacher.assignedSubjects.length > 0 ? (
                      viewingTeacher.assignedSubjects.map((sub) => (
                        <span key={sub} className="px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-indigo-200 text-xs font-semibold">
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">No subjects assigned yet</span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Assigned Secondary Grades & Classes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingTeacher.assignedGrades && viewingTeacher.assignedGrades.length > 0 ? (
                      viewingTeacher.assignedGrades.map((g) => (
                        <span key={g} className="px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-800/60 text-cyan-200 text-xs font-semibold">
                          {g}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">No grades assigned yet</span>
                    )}
                  </div>
                  {viewingTeacher.assignedSections && viewingTeacher.assignedSections.length > 0 && (
                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      Assigned Sections: {viewingTeacher.assignedSections.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Status and Audit Details */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Authorization Audit</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>Applied: <span className="text-slate-200">{viewingTeacher.createdAt ? new Date(viewingTeacher.createdAt).toLocaleString() : 'N/A'}</span></div>
                  <div>Approved By: <span className="text-amber-400 font-medium">{viewingTeacher.approvedBy || 'Pending'}</span></div>
                  {viewingTeacher.approvedAt && (
                    <div className="sm:col-span-2">Approved Date: <span className="text-slate-200">{new Date(viewingTeacher.approvedAt).toLocaleString()}</span></div>
                  )}
                  {viewingTeacher.rejectionReason && (
                    <div className="sm:col-span-2 text-rose-300">
                      Rejection Reason: {viewingTeacher.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {viewingTeacher.status === 'active' ? (
                    <button
                      onClick={async () => {
                        await toggleTeacherActivation(viewingTeacher.id);
                        setViewingTeacher(null);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-rose-800 text-rose-300 hover:bg-rose-950 font-semibold cursor-pointer"
                    >
                      Deactivate Account
                    </button>
                  ) : viewingTeacher.status === 'inactive' ? (
                    <button
                      onClick={async () => {
                        await toggleTeacherActivation(viewingTeacher.id);
                        setViewingTeacher(null);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-emerald-800 text-emerald-300 hover:bg-emerald-950 font-semibold cursor-pointer"
                    >
                      Activate Account
                    </button>
                  ) : null}

                  <button
                    onClick={async () => {
                      const newP = await resetUserPassword(viewingTeacher.id);
                      copyToClipboard(newP, viewingTeacher.id);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium cursor-pointer"
                  >
                    Reset Password
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {viewingTeacher.registrationStatus === 'pending_approval' || viewingTeacher.status === 'pending' ? (
                    <>
                      <button
                        onClick={async () => {
                          await approveTeacherRegistration(viewingTeacher.id, true);
                          setViewingTeacher(null);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                      >
                        Authorize Faculty
                      </button>
                      <button
                        onClick={() => {
                          const id = viewingTeacher.id;
                          setViewingTeacher(null);
                          setRejectingTeacherId(id);
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                      >
                        Deny Application
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setViewingTeacher(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
