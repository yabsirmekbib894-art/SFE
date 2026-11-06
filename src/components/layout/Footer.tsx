import React from 'react';
import { Link } from '../../router.tsx';
import { SchoolLogo } from './SchoolLogo.tsx';
import { 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  Database, 
  GraduationCap, 
  BookOpen, 
  Briefcase, 
  UserPlus 
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: School Identity */}
          <div className="space-y-4 md:col-span-1">
            <SchoolLogo size="lg" lightText />
            <p className="text-slate-400 text-xs leading-relaxed mt-2">
              SCHOOL FOR EXCELLENCE SECONDARY SCHOOL delivers rigorous secondary education and secure digital assessments across Grades 9, 10, 11, and 12.
            </p>
            <div className="text-[11px] text-cyan-400 font-semibold tracking-wide">
              Motto: Excellence in Knowledge, Integrity in Assessment
            </div>
          </div>

          {/* Col 2: Four Portals */}
          <div>
            <div className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Assessment Portals
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/student/login" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Student Examination Portal</span>
                </Link>
              </li>
              <li>
                <Link to="/student/register" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>New Student Registration</span>
                </Link>
              </li>
              <li>
                <Link to="/teacher/login" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Teacher Exam Portal</span>
                </Link>
              </li>
              <li>
                <Link to="/director/login" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                  <span>School Director Portal</span>
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                  <span>Super Administrator Suite</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Academic Programs */}
          <div>
            <div className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Academic Structure
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>• Grade 9 General Secondary Program</li>
              <li>• Grade 10 National Assessment Prep</li>
              <li>• Grade 11 Natural Science & Social Science</li>
              <li>• Grade 12 Advanced Preparatory Streams</li>
              <li>• Computer-Based Examinations & Instant Grading</li>
            </ul>
          </div>

          {/* Col 4: Platform Security */}
          <div>
            <div className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              System & Security
            </div>
            <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
              <div className="flex items-center gap-2 text-slate-300">
                <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Role-Based Access Control (RBAC)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Cloud Firestore Encrypted Records</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Gemini 3.8 Flash PDF OCR Digitization</span>
              </div>
              <p className="pt-2 text-slate-500">
                Protected by strict database security rules. Answer keys and sensitive examination content remain encrypted prior to authorized release.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © 2026 SCHOOL FOR EXCELLENCE SECONDARY SCHOOL • Smart Exam System
          </div>
          <div className="flex items-center gap-4">
            <span>Grades 9, 10, 11 & 12 Infrastructure</span>
            <span aria-hidden="true">·</span>
            <span>All Rights Reserved</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
