import React, { useState } from 'react';
import { useRouter } from '../../router.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Exam, ExamSubmission, LiveLesson } from '../../types/index.ts';
import { ExamTaker } from './ExamTaker.tsx';
import { ChangePasswordModal } from '../auth/ChangePasswordModal.tsx';
import { SchoolLogo } from '../layout/SchoolLogo.tsx';
import { LiveClassroom } from '../classroom/LiveClassroom.tsx';
import { 
  GraduationCap, 
  Calendar, 
  Clock, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  FileText, 
  Eye, 
  Key,
  BookOpen,
  LogOut,
  Moon,
  Sun,
  School,
  Lock,
  Video,
  Radio,
  Users,
  Bell,
  Check,
  ChevronRight,
  Sparkles,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export type StudentExamSubTab = 'available' | 'upcoming' | 'active' | 'completed' | 'results';

export const StudentDashboard: React.FC = () => {
  const { navigate } = useRouter();
  const { 
    currentUser, 
    logout, 
    theme, 
    setTheme, 
    allExams, 
    allSubmissions,
    liveLessons,
    activeLiveLesson,
    setActiveLiveLesson,
    notifications,
    markNotificationRead
  } = useAuth();

  // Route protection
  React.useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') {
      navigate('/student/login');
    }
  }, [currentUser, navigate]);

  // Main navigation tabs: 'exams' or 'live_learning'
  const [mainTab, setMainTab] = useState<'exams' | 'live_learning'>('exams');
  // Exam sub-tabs: 'available' | 'upcoming' | 'active' | 'completed' | 'results'
  const [examSubTab, setExamSubTab] = useState<StudentExamSubTab>('available');

  const [takingExam, setTakingExam] = useState<Exam | null>(null);
  const [examInstructionModal, setExamInstructionModal] = useState<Exam | null>(null);
  const [viewingResult, setViewingResult] = useState<ExamSubmission | null>(null);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Student assigned exams (filter strictly by student's grade and section)
  const studentGrade = currentUser?.grade || 'Grade 10';
  const studentSection = currentUser?.section || 'Section 10A';

  // Submissions for this student
  const mySubmissions = allSubmissions.filter((s) => s.studentId === currentUser?.id);
  const completedExamIds = new Set(mySubmissions.map((s) => s.examId));

  // Eligible exams matching student's grade & section
  const eligibleExams = allExams.filter((e) => {
    if (e.grade !== studentGrade && e.grade !== ('All' as any)) return false;
    if (e.targetSections && !e.targetSections.includes('All') && !e.targetSections.includes(studentSection)) {
      return false;
    }
    return true;
  });

  // Categorized exams based on sub-tabs
  const availableExams = eligibleExams.filter((e) => e.status === 'published' && !completedExamIds.has(e.id));
  const upcomingExams = eligibleExams.filter((e) => e.status === 'scheduled' || (e.status === 'published' && new Date(e.scheduledDate || '').getTime() > Date.now()));
  const activeExams = eligibleExams.filter((e) => e.status === 'published' && !completedExamIds.has(e.id));
  const completedExams = eligibleExams.filter((e) => completedExamIds.has(e.id));

  // Live lessons matching student's grade
  const studentLiveLessons = liveLessons.filter((l) => {
    const matchesGrade = l.grade === studentGrade || (l.grade as any) === 'All';
    const matchesSection = !l.section || l.section === 'All' || l.section === studentSection;
    return matchesGrade && matchesSection;
  });

  const activeLiveLessonsCount = studentLiveLessons.filter((l) => l.status === 'live').length;

  // Student notifications
  const studentNotifications = notifications.filter(
    (n) => n.userId === currentUser?.id || n.userId === 'all_students' || n.userId === `grade:${studentGrade}`
  );
  const unreadNotificationsCount = studentNotifications.filter((n) => !n.read).length;

  const gradedSubmissions = mySubmissions.filter((s) => s.status === 'graded');
  const averageGrade =
    gradedSubmissions.length > 0
      ? (
          gradedSubmissions.reduce(
            (sum, s) => sum + (s.totalPossible > 0 ? (s.score / s.totalPossible) * 100 : 0),
            0
          ) / gradedSubmissions.length
        ).toFixed(1)
      : '0.0';

  // Live Classroom Fullscreen View
  if (activeLiveLesson) {
    return (
      <LiveClassroom
        lesson={activeLiveLesson}
        onLeave={() => setActiveLiveLesson(null)}
      />
    );
  }

  // Active Exam Taker Fullscreen View
  if (takingExam) {
    return (
      <ExamTaker
        exam={takingExam}
        onCancel={() => setTakingExam(null)}
        onFinish={(sub) => {
          setTakingExam(null);
          setViewingResult(sub);
          setExamSubTab('results');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Student Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SchoolLogo size="md" lightText />
            <div className="hidden sm:block border-l border-slate-700 pl-3">
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 uppercase tracking-wide">
                Candidate Portal
              </span>
              <p className="text-[11px] text-slate-400">
                {currentUser?.grade} • {currentUser?.section} • ID: {currentUser?.studentId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* In-app Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 text-xs">
                  <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      School Notifications ({studentNotifications.length})
                    </span>
                    <button
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
                    {studentNotifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500">No notifications yet.</div>
                    ) : (
                      studentNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationRead(notif.id)}
                          className={`p-3.5 hover:bg-slate-850 cursor-pointer transition-colors ${
                            !notif.read ? 'bg-amber-950/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{notif.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] mt-1">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            <button
              onClick={() => setChangePasswordModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Password</span>
            </button>

            <button
              onClick={async () => {
                await logout();
                navigate('/student/login');
              }}
              className="px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
        {/* Candidate Identity Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-2xl flex items-center justify-center shadow-md shadow-emerald-500/20">
              {currentUser?.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{currentUser?.name}</h2>
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-emerald-300 dark:border-emerald-800">
                  Approved Candidate
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>
                  Student ID: <strong className="text-slate-800 dark:text-slate-200 font-mono text-cyan-600 dark:text-cyan-400">{currentUser?.studentId}</strong>
                </span>
                <span>•</span>
                <span>
                  Secondary Grade: <strong className="text-slate-800 dark:text-slate-200">{currentUser?.grade}</strong>
                </span>
                <span>•</span>
                <span>
                  Class Section: <strong className="text-slate-800 dark:text-slate-200">{currentUser?.section}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Exams Completed</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{mySubmissions.length}</span>
            </div>
            <div className="bg-emerald-50/60 dark:bg-emerald-950/40 px-4 py-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="text-[10px] text-emerald-600 font-semibold uppercase block">Average Score</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{averageGrade}%</span>
            </div>
          </div>
        </div>

        {/* Screenshot 4: Prep Central / Smart Exam System Dashboard Suite */}
        <div className="bg-[#0e131f] text-slate-100 rounded-3xl border border-slate-800/80 p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Top Bar with Greeting & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span>⚡</span> Prep Central • Smart Exam System
              </div>
              <h2 className="text-2xl font-extrabold text-white">
                Hello {currentUser?.name?.split(' ')[0] || 'Student'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => alert('Tour guide: Check Available Examinations below to take tests, or Live Classrooms to join interactive video lectures with your teacher.')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Tour</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20 cursor-pointer"
                title="Refresh student records"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3 Overview Cards from Screenshot 4 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Exams Taken */}
            <div className="bg-[#141b2d] p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Exams Taken</span>
                <span className="text-3xl font-extrabold text-white">{mySubmissions.length}</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            {/* 2. Average Score */}
            <div className="bg-[#141b2d] p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Average Score</span>
                <span className="text-3xl font-extrabold text-white">{averageGrade}%</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* 3. Study Hours */}
            <div className="bg-[#141b2d] p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Study Hours</span>
                <span className="text-3xl font-extrabold text-white">
                  {mySubmissions.length > 0 ? (mySubmissions.length * 1.5).toFixed(1) : '14.2'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Activity & Quick Actions from Screenshot 4 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Activity (7 Cols) */}
            <div className="lg:col-span-7 bg-[#141b2d] p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Activity</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                    All Scopes
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                    All Risks
                  </span>
                </div>
              </div>

              {mySubmissions.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs">
                  No audit entries found. Start an examination below to record test activity.
                </div>
              ) : (
                <div className="space-y-2">
                  {mySubmissions.slice(0, 3).map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{sub.examTitle}</div>
                        <div className="text-[10px] text-slate-400">
                          {sub.subject} • Submitted on {new Date(sub.submittedAt || sub.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">
                        {sub.score} / {sub.totalPossible}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Quick Actions 2x2 Grid (5 Cols) */}
            <div className="lg:col-span-5 bg-[#141b2d] p-5 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Quick Actions</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setMainTab('exams');
                    setExamSubTab('available');
                  }}
                  className="p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-left flex flex-col justify-between space-y-2 transition-all cursor-pointer group hover:border-amber-500/40"
                >
                  <FileText className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Start New Exam</span>
                </button>

                <button
                  onClick={() => setMainTab('live_learning')}
                  className="p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-left flex flex-col justify-between space-y-2 transition-all cursor-pointer group hover:border-rose-500/40"
                >
                  <Video className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Live Classroom</span>
                </button>

                <button
                  onClick={() => setChangePasswordModalOpen(true)}
                  className="p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-left flex flex-col justify-between space-y-2 transition-all cursor-pointer group hover:border-blue-500/40"
                >
                  <Key className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Security & Pass</span>
                </button>

                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  className="p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-left flex flex-col justify-between space-y-2 transition-all cursor-pointer group hover:border-emerald-500/40"
                >
                  <Bell className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Notifications</span>
                </button>
              </div>
            </div>
          </div>

          {/* Performance Section from Screenshot 4 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Weekly Performance Line Chart */}
            <div className="bg-[#141b2d] p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Weekly Performance</span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                  Line ▾
                </span>
              </div>
              <div className="h-36 flex items-end justify-around pt-4 pb-2 border-b border-l border-slate-800">
                {[
                  { week: 'W1', score: '60%' },
                  { week: 'W2', score: '72%' },
                  { week: 'W3', score: '80%' },
                  { week: 'W4', score: '88%' },
                  { week: 'W5', score: '92%' },
                ].map((w) => (
                  <div key={w.week} className="flex flex-col items-center gap-1.5">
                    <div style={{ height: w.score }} className="w-2.5 bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-full shadow-md" />
                    <span className="text-[10px] text-slate-500">{w.week}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject Performance Bar Chart */}
            <div className="bg-[#141b2d] p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Subject Performance</span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                  Bar ▾
                </span>
              </div>
              <div className="h-36 flex items-end justify-around pt-4 pb-2 border-b border-l border-slate-800">
                {[
                  { subject: 'Math', pct: '85%' },
                  { subject: 'Chem', pct: '78%' },
                  { subject: 'Phys', pct: '90%' },
                  { subject: 'Bio', pct: '82%' },
                  { subject: 'Eng', pct: '94%' },
                ].map((s) => (
                  <div key={s.subject} className="flex flex-col items-center gap-1.5">
                    <div style={{ height: s.pct }} className="w-4 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-md shadow-md" />
                    <span className="text-[10px] text-slate-500">{s.subject}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Navigation Bar: Examination Center vs Live Learning Classrooms */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMainTab('exams')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                mainTab === 'exams'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Examination Center ({availableExams.length})</span>
            </button>

            <button
              onClick={() => setMainTab('live_learning')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                mainTab === 'live_learning'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Video className="w-4 h-4 text-rose-500" />
              <span>Live Learning Classrooms ({studentLiveLessons.length})</span>
              {activeLiveLessonsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-extrabold animate-pulse">
                  {activeLiveLessonsCount} LIVE
                </span>
              )}
            </button>
          </div>
        </div>

        {/* MAIN TAB 1: EXAMINATION CENTER */}
        {mainTab === 'exams' && (
          <div className="space-y-4">
            {/* Required 5 Examination Sub-Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setExamSubTab('available')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  examSubTab === 'available'
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                Available Examinations ({availableExams.length})
              </button>

              <button
                onClick={() => setExamSubTab('upcoming')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  examSubTab === 'upcoming'
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                Upcoming Examinations ({upcomingExams.length})
              </button>

              <button
                onClick={() => setExamSubTab('active')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  examSubTab === 'active'
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                Active Examinations ({activeExams.length})
              </button>

              <button
                onClick={() => setExamSubTab('completed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  examSubTab === 'completed'
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                Completed Examinations ({completedExams.length})
              </button>

              <button
                onClick={() => setExamSubTab('results')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  examSubTab === 'results'
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                Examination Results ({mySubmissions.length})
              </button>
            </div>

            {/* Sub-tab 1: Available Examinations & Active Examinations */}
            {(examSubTab === 'available' || examSubTab === 'active') && (
              <div>
                {availableExams.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
                    <School className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      No Available Examinations for {studentGrade}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      All assessments for your section have been completed or are scheduled for future testing periods.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableExams.map((exam) => (
                      <div
                        key={exam.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {exam.subject}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase">
                              Published & Ready
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                            {exam.title}
                          </h3>

                          <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Duration: <strong>{exam.durationMinutes} Minutes</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Award className="w-3.5 h-3.5 text-slate-400" />
                              <span>Total Marks: <strong>{exam.totalMarks} Marks</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>Instructor: {exam.teacherName}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => setExamInstructionModal(exam)}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start Examination</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Upcoming Examinations */}
            {examSubTab === 'upcoming' && (
              <div>
                {upcomingExams.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 text-xs">
                    No upcoming scheduled examinations at this moment.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcomingExams.map((exam) => (
                      <div
                        key={exam.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {exam.subject}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 border border-amber-200">
                            Scheduled
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{exam.title}</h4>
                        <div className="text-xs text-slate-500">
                          Scheduled: {exam.scheduledDate || 'Upcoming'} at {exam.startTime || '09:00'}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          Instructor: {exam.teacherName} • {exam.durationMinutes}m
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Completed Examinations */}
            {examSubTab === 'completed' && (
              <div>
                {completedExams.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 text-xs">
                    You have not completed any examinations yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedExams.map((exam) => {
                      const userSub = mySubmissions.find((s) => s.examId === exam.id);
                      return (
                        <div
                          key={exam.id}
                          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {exam.subject}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700">
                              Submitted
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{exam.title}</h4>
                          <div className="text-xs text-slate-500">
                            Instructor: {exam.teacherName} • Total Marks: {exam.totalMarks}
                          </div>
                          {userSub && (
                            <button
                              onClick={() => {
                                setViewingResult(userSub);
                                setExamSubTab('results');
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                            >
                              View Submission Details
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 4: Results */}
            {examSubTab === 'results' && (
              <div className="space-y-4">
                {mySubmissions.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 text-xs">
                    You have not submitted any examinations yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mySubmissions.map((sub) => {
                      const parentExam = allExams.find((e) => e.id === sub.examId);
                      const resultsReleased = parentExam?.resultsReleased ?? false;
                      const percentage =
                        sub.totalPossible > 0 ? ((sub.score / sub.totalPossible) * 100).toFixed(1) : '0';

                      return (
                        <div
                          key={sub.id}
                          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 space-y-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                                {sub.subject}
                              </span>
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{sub.examTitle}</h4>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Submitted: {new Date(sub.submittedAt || sub.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            {resultsReleased ? (
                              <div className="text-right">
                                <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                                  {sub.score} / {sub.totalPossible}
                                </div>
                                <div className="text-xs font-semibold text-emerald-600">{percentage}%</div>
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg">
                                Pending Release
                              </span>
                            )}
                          </div>

                          {resultsReleased ? (
                            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 text-xs space-y-1">
                              <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                                Teacher Feedback:
                              </div>
                              <p className="text-slate-700 dark:text-slate-300">
                                {sub.teacherFeedback || 'Answers evaluated successfully.'}
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                Your answers have been securely recorded. The teacher will release official scores and answer keys soon.
                              </span>
                            </div>
                          )}

                          {resultsReleased && (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => setViewingResult(sub)}
                                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Review Answer Breakdown</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MAIN TAB 2: LIVE LEARNING CLASSROOMS */}
        {mainTab === 'live_learning' && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-900 p-6 rounded-3xl border border-rose-500/30">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Real-Time Interactive Learning</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Live Video Classroom for {studentGrade} ({studentSection})
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Join live virtual classrooms conducted by your secondary school subject teachers. Use camera and microphone, raise your hand to ask verbal questions, and collaborate in real-time chat.
                  </p>
                </div>
              </div>
            </div>

            {studentLiveLessons.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
                <Video className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Live Lessons Currently Scheduled</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your teachers have not started any live classes for {studentGrade} at this moment. You will be automatically notified here as soon as a live classroom goes online.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentLiveLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1.5 ${
                            lesson.status === 'live'
                              ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/40 animate-pulse'
                              : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {lesson.status === 'live' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                          {lesson.status === 'live' ? '● LIVE CLASS' : lesson.status}
                        </span>

                        <span className="text-xs font-bold text-indigo-600 dark:text-cyan-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                          {lesson.grade}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">{lesson.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {lesson.description || 'Interactive curriculum lesson with faculty.'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Instructor:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{lesson.teacherName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Subject:</span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{lesson.subject}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Class Section:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">{lesson.section || 'All Sections'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      {lesson.status === 'live' ? (
                        <button
                          onClick={() => setActiveLiveLesson(lesson)}
                          className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer animate-pulse"
                        >
                          <Video className="w-4 h-4" />
                          <span>Join Live Class</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveLiveLesson(lesson)}
                          className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>Enter Waiting Room</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Pre-Exam Instructions Modal */}
      {examInstructionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{examInstructionModal.title}</h3>
                <p className="text-xs text-slate-500">
                  {examInstructionModal.subject} • {examInstructionModal.grade}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-white">Exam Instructions:</div>
                <p>{examInstructionModal.instructions}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                  <div className="text-[10px] text-emerald-600 font-semibold uppercase">Duration</div>
                  <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">
                    {examInstructionModal.durationMinutes} Minutes
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                  <div className="text-[10px] text-emerald-600 font-semibold uppercase">Total Marks</div>
                  <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">
                    {examInstructionModal.totalMarks} Marks
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
                <strong className="block text-amber-800 dark:text-amber-300 font-semibold">Candidate Security Rules:</strong>
                <p>
                  The countdown timer starts as soon as you click Begin Exam. If the time expires, your exam will be automatically submitted with all saved answers.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setExamInstructionModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = examInstructionModal;
                  setExamInstructionModal(null);
                  setTakingExam(target);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Acknowledge & Begin Exam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Result Detail Modal */}
      {viewingResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{viewingResult.examTitle}</h3>
                <p className="text-xs text-slate-500">
                  Candidate: {viewingResult.studentName} ({viewingResult.grade})
                </p>
              </div>
              <button onClick={() => setViewingResult(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Objective Score</div>
                  <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {viewingResult.objectiveScore} marks
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Manual Written Score</div>
                  <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                    {viewingResult.manualScore} marks
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] text-emerald-600 font-bold uppercase">Final Total Score</div>
                  <div className="text-lg font-bold font-mono text-emerald-800 dark:text-emerald-300 mt-0.5">
                    {viewingResult.score} / {viewingResult.totalPossible}
                  </div>
                </div>
              </div>

              {viewingResult.teacherFeedback && (
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200">
                  <span className="font-bold">Faculty Feedback:</span>
                  <p className="mt-1 text-slate-800 dark:text-slate-200">{viewingResult.teacherFeedback}</p>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Your Recorded Answers:</h4>
                {Object.entries(viewingResult.answers).map(([qId, val], idx) => (
                  <div key={qId} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">Question Item {idx + 1}:</div>
                    <div className="font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      {val || <span className="text-slate-400 italic">No answer submitted</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingResult(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </div>
  );
};
