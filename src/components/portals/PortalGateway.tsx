import React, { useState } from 'react';
import { useRouter, Link } from '../../router.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Header } from '../layout/Header.tsx';
import { Footer } from '../layout/Footer.tsx';
import { 
  GraduationCap, 
  BookOpen, 
  Briefcase, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Lock, 
  Clock, 
  Award, 
  FileCheck2, 
  UserPlus, 
  School, 
  X, 
  ShieldAlert, 
  ChevronRight,
  TrendingUp,
  Cpu
} from 'lucide-react';

export const PortalGateway: React.FC = () => {
  const { navigate } = useRouter();
  const { allUsers, allExams, allSubmissions, schoolSettings } = useAuth();
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  // Real statistics
  const totalStudents = allUsers.filter((u) => u.role === 'student').length;
  const totalTeachers = allUsers.filter((u) => u.role === 'teacher').length;
  const publishedExams = allExams.filter((e) => e.status === 'published').length;
  const totalSubmissions = allSubmissions.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header */}
      <Header onOpenAbout={() => setAboutModalOpen(true)} />

      {/* Hero Section with School for Excellence Secondary School Branding */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-900 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        {/* Subtle geometric light effect (Navy & Purple with Cyan accent) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-br from-indigo-600/10 via-purple-600/10 to-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          {/* Official School Eyebrow Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-inner">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold tracking-wider uppercase text-cyan-400">
              {schoolSettings.schoolName}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">Grades 9–12 Assessment Platform</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Smart Online Examination System
          </h1>

          {/* Short Required Description */}
          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            A secure digital examination platform for students, teachers, directors, and administrators across Grades 9–12.
          </p>

          {/* Quick Action Badges / Features */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Automated Objective Scoring
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Gemini 3.8 Flash PDF Question OCR
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-cyan-400" />
              Strict Role-Based Security
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              Auto-Submit Timed Tests
            </span>
          </div>
        </div>
      </section>

      {/* Main Body: Four Dedicated Portal Cards */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-12">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Select Your Designated School Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Independent, authenticated workspaces with role-enforced database permissions.
          </p>
        </div>

        {/* 4 Separate Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Student Examination Portal */}
          <div className="bg-slate-900/90 rounded-3xl border border-emerald-500/30 hover:border-emerald-500/70 p-6 flex flex-col justify-between shadow-xl shadow-black/40 hover:-translate-y-1 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>

              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                Candidates (Grades 9–12)
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Student Portal
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Log in with your Student ID or username. Take scheduled exams with countdown timer auto-submission, live answer autosave, and view released results.
              </p>

              <div className="mt-5 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Timed exams with auto-submit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>MCQ, True/False & Short Answer</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Question-level released scores</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800 space-y-2">
              <button
                onClick={() => navigate('/student/login')}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Student Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => navigate('/student/register')}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Student Registration</span>
              </button>
            </div>
          </div>

          {/* Card 2: Teacher Examination Portal */}
          <div className="bg-slate-900/90 rounded-3xl border border-indigo-500/30 hover:border-indigo-500/70 p-6 flex flex-col justify-between shadow-xl shadow-black/40 hover:-translate-y-1 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>

              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
                Academic Faculty
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Teacher Portal
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload secondary school exam papers in PDF format. Convert them into digital exams with Gemini 3.8 Flash, verify answer keys, and evaluate submissions.
              </p>

              <div className="mt-5 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>AI PDF Question Extraction & OCR</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Editable review screen & drafts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Manual grading & CSV export</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800 space-y-2">
              <button
                onClick={() => navigate('/teacher/login')}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Teacher Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => navigate('/teacher/register')}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Teacher Registration</span>
              </button>
            </div>
          </div>

          {/* Card 3: School Director Portal */}
          <div className="bg-slate-900/90 rounded-3xl border border-amber-500/30 hover:border-amber-500/70 p-6 flex flex-col justify-between shadow-xl shadow-black/40 hover:-translate-y-1 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Briefcase className="w-6 h-6" />
              </div>

              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                School Leadership
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Director Portal
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add and manage teachers, assign teachers to grades and subjects, review and approve new student registrations, and view school performance reports.
              </p>

              <div className="mt-5 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Register & assign teachers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Approve student registrations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>School-wide participation reports</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800">
              <button
                onClick={() => navigate('/director/login')}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Director Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 4: Administrator Portal (Super Admin) */}
          <div className="bg-slate-900/90 rounded-3xl border border-rose-500/30 hover:border-rose-500/70 p-6 flex flex-col justify-between shadow-xl shadow-black/40 hover:-translate-y-1 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 mb-1">
                Central Administration
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Administrator Portal
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Super Admin control suite. Provision and manage Director accounts, configure academic years, grades, and subjects, and inspect system audit logs.
              </p>

              <div className="mt-5 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Provision School Directors</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Configure grades & subjects</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Security audit logs & oversight</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800">
              <button
                onClick={() => navigate('/admin/login')}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Administrator Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Live School Performance Metrics Bar */}
        <section className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 rounded-3xl border border-slate-800 p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-1 text-center lg:text-left">
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Real School Infrastructure
              </div>
              <h3 className="text-xl font-bold text-white">
                Academic Operations & Examination Metrics
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                Continuous examination tracking across Grades 9, 10, 11, and 12 backed by Cloud Firestore.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full lg:w-auto">
              <div className="text-center p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-2xl font-black text-white">{totalStudents}</div>
                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Enrolled Students</div>
              </div>

              <div className="text-center p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-2xl font-black text-indigo-400">{totalTeachers}</div>
                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Teaching Faculty</div>
              </div>

              <div className="text-center p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-2xl font-black text-cyan-400">{publishedExams}</div>
                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Active Exams</div>
              </div>

              <div className="text-center p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-2xl font-black text-emerald-400">{totalSubmissions}</div>
                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Submissions Graded</div>
              </div>
            </div>
          </div>
        </section>

        {/* Secondary Education Coverage Grid (Grades 9-12) */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-xl font-bold text-white">
              Secondary Academic Stream Coverage
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Curriculum aligned assessments with stream-specific examinations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
              <div className="text-xs font-bold text-indigo-400 mb-1">Foundational Year</div>
              <h4 className="text-base font-bold text-white">Grade 9</h4>
              <p className="text-xs text-slate-400 mt-1">
                Sections 9A, 9B, 9C, 9D. General sciences, algebra, civics, and introductory ICT assessments.
              </p>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
              <div className="text-xs font-bold text-cyan-400 mb-1">Standardized Prep</div>
              <h4 className="text-base font-bold text-white">Grade 10</h4>
              <p className="text-xs text-slate-400 mt-1">
                Sections 10A, 10B, 10C, 10D. Comprehensive midterm & final exams preparing for senior specialization.
              </p>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
              <div className="text-xs font-bold text-purple-400 mb-1">Senior Streams</div>
              <h4 className="text-base font-bold text-white">Grade 11</h4>
              <p className="text-xs text-slate-400 mt-1">
                11-Natural A/B (Physics, Chemistry, Biology) & 11-Social A/B (Economics, History, Geography).
              </p>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
              <div className="text-xs font-bold text-amber-400 mb-1">College Preparatory</div>
              <h4 className="text-base font-bold text-white">Grade 12</h4>
              <p className="text-xs text-slate-400 mt-1">
                12-Natural A/B & 12-Social A/B. Advanced exit examination preparation and mock assessments.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* About School Modal */}
      {aboutModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 text-slate-200 relative shadow-2xl">
            <button
              onClick={() => setAboutModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-cyan-400">
                <School className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{schoolSettings.schoolName}</h3>
                <p className="text-xs text-cyan-400 font-semibold">{schoolSettings.motto}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <p>
                <strong className="text-white">SCHOOL FOR EXCELLENCE SECONDARY SCHOOL</strong> is a premier secondary learning institution committed to academic rigor, integrity in evaluations, and comprehensive STEM & Humanities education for Grades 9, 10, 11, and 12.
              </p>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-white">About the Smart Exam System:</div>
                <p className="text-slate-400">
                  Developed specifically for our secondary school, Smart Exam System enables teaching faculty to convert physical examination papers into digital tests through Gemini 3.8 Flash AI, validates student answers on secure servers, and enforces role-based separation between Candidates, Faculty, the School Director, and Central Administrators.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="font-bold text-white">School Director</div>
                  <div className="text-slate-400">{schoolSettings.directorName}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="font-bold text-white">Academic Year</div>
                  <div className="text-slate-400">{schoolSettings.academicYear}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="font-bold text-white">Administration Contact</div>
                  <div className="text-slate-400">{schoolSettings.contactEmail}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="font-bold text-white">Campus Location</div>
                  <div className="text-slate-400">{schoolSettings.address}</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setAboutModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer"
              >
                Close Information
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};
