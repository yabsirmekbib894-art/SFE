import React, { useState } from 'react';
import { useRouter } from '../../router.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { SchoolLogo } from '../layout/SchoolLogo.tsx';
import { 
  Exam, 
  Question, 
  QuestionType, 
  ExamSubmission, 
  SecondaryGrade, 
  SECONDARY_GRADES, 
  SECONDARY_SUBJECTS, 
  GRADE_SECTIONS_MAP,
  LiveLesson
} from '../../types/index.ts';
import { SAMPLE_ETHIOPIAN_CHEMISTRY_EXAM } from '../../data/demoData.ts';
import { LiveClassSetupModal } from '../classroom/LiveClassSetupModal.tsx';
import { LiveClassroom } from '../classroom/LiveClassroom.tsx';
import { 
  FileText, 
  Sparkles, 
  Plus, 
  Clock, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Trash2, 
  Edit3, 
  Eye, 
  Send, 
  ToggleLeft, 
  ToggleRight,
  HelpCircle,
  FileSpreadsheet,
  Check,
  X,
  FileCheck,
  BookOpen,
  LogOut,
  Moon,
  Sun,
  School,
  Calendar,
  AlertTriangle,
  Video,
  Radio,
  Users,
  CheckCheck,
  Printer,
  Columns,
  Maximize2,
  FileDown
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { navigate } = useRouter();
  const { 
    currentUser, 
    logout, 
    theme, 
    setTheme, 
    allExams, 
    allSubmissions, 
    saveExam, 
    getExamWithAnswerKey,
    publishExam, 
    toggleResultsRelease, 
    deleteExam, 
    saveManualGrading,
    liveLessons,
    activeLiveLesson,
    setActiveLiveLesson,
    createLiveLesson,
    updateLiveLessonStatus
  } = useAuth();

  // Route protection
  React.useEffect(() => {
    if (!currentUser || (currentUser.role !== 'teacher' && currentUser.role !== 'admin')) {
      navigate('/teacher/login');
    }
  }, [currentUser, navigate]);

  const [activeTab, setActiveTab] = useState<'exams' | 'submissions' | 'live_lessons'>('exams');
  const [selectedExamForSubmissions, setSelectedExamForSubmissions] = useState<string>('all');
  const [isLiveSetupOpen, setIsLiveSetupOpen] = useState(false);
  const [publishedSuccessMessage, setPublishedSuccessMessage] = useState<string | null>(null);

  const handlePublishExam = async (examId: string) => {
    const ex = allExams.find((e) => e.id === examId);
    if (!ex) return;
    const questions = ex.questions || [];
    const pendingReviews = questions.filter((q) => q.needsReview);
    if (pendingReviews.length > 0) {
      setPublishedSuccessMessage(
        `Cannot publish exam: ${pendingReviews.length} question(s) need review due to ambiguous OCR extraction. Please review them before publishing.`
      );
      setTimeout(() => setPublishedSuccessMessage(null), 6000);
      return;
    }
    await publishExam(examId);
    setPublishedSuccessMessage(`Exam "${ex.title}" has been published to ${ex.grade} students!`);
    setTimeout(() => setPublishedSuccessMessage(null), 6000);
  };

  // AI PDF extraction modal & wizard state
  const [isPdfWizardOpen, setIsPdfWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1); // 1: Upload, 2: Review & Edit
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<string>('');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [ocrReport, setOcrReport] = useState<{ isScanned: boolean; notes: string } | null>(null);

  // Side-by-side original PDF review & paper export states
  const [uploadedPdfBase64, setUploadedPdfBase64] = useState<string | null>(null);
  const [uploadedPdfName, setUploadedPdfName] = useState<string>('');
  const [showSideBySidePdf, setShowSideBySidePdf] = useState<boolean>(true);
  const [printableExam, setPrintableExam] = useState<{ exam: Exam; questions: Question[] } | null>(null);

  // Editable exam buffer
  const [draftExam, setDraftExam] = useState<Exam>({
    id: `exam_${Date.now()}`,
    title: '',
    subject: currentUser?.assignedSubjects?.[0] || 'Chemistry',
    grade: currentUser?.assignedGrades?.[0] || 'Grade 10',
    targetSections: ['All'],
    teacherId: currentUser?.id || 'teacher_1',
    teacherName: currentUser?.name || 'Faculty Teacher',
    durationMinutes: 60,
    totalMarks: 20,
    instructions: 'Read each question carefully before submitting your final response.',
    scheduledDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    status: 'draft',
    resultsReleased: false,
    questions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [draftQuestions, setDraftQuestions] = useState<Question[]>([]);

  // Manual grading state
  const [gradingSubmission, setGradingSubmission] = useState<ExamSubmission | null>(null);
  const [manualMarksInput, setManualMarksInput] = useState<number>(0);
  const [teacherFeedbackInput, setTeacherFeedbackInput] = useState<string>('');

  // Exams created by this teacher (or all for admin)
  const teacherExams = allExams.filter(
    (e) => !currentUser || e.teacherId === currentUser.id || currentUser.role === 'admin'
  );

  const relevantSubmissions = allSubmissions.filter((s) => {
    if (selectedExamForSubmissions === 'all') return true;
    return s.examId === selectedExamForSubmissions;
  });

  const pendingGradingCount = allSubmissions.filter(
    (s) => s.status === 'submitted' && teacherExams.some((e) => e.id === s.examId)
  ).length;

  // Handle PDF file upload and Gemini API call
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setExtractionError('Please upload a valid PDF document (.pdf)');
      return;
    }

    setExtracting(true);
    setExtractionProgress('Uploading exam question paper...');
    setExtractionError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      setUploadedPdfBase64(base64Data);
      setUploadedPdfName(file.name);
      setShowSideBySidePdf(true);

      try {
        setExtractionProgress('Gemini 3.8 Flash performing OCR & analyzing questions...');
        const response = await fetch('/api/extract-exam-from-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfBase64: base64Data,
            mimeType: 'application/pdf',
            fileName: file.name,
          }),
        });

        const data = await response.json();

        if (data.success && data.extractedExam) {
          setExtractionProgress('Questions & answer keys detected!');
          populateWizardFromExtracted(data.extractedExam);
        } else {
          setExtractionError(data.error || 'Could not parse document. You may edit or enter questions directly.');
          populateWizardFromExtracted(SAMPLE_ETHIOPIAN_CHEMISTRY_EXAM);
        }
      } catch (err: any) {
        console.warn('PDF extraction API error, fallback to editable wizard:', err);
        setExtractionError('Server connection error. Using sample editable question paper.');
        populateWizardFromExtracted(SAMPLE_ETHIOPIAN_CHEMISTRY_EXAM);
      } finally {
        setExtracting(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleUseSampleExam = () => {
    setExtracting(true);
    setExtractionProgress('Loading Ethiopian Secondary Chemistry Paper...');
    setExtractionError(null);
    setUploadedPdfBase64(null);
    setUploadedPdfName('Sample_Ethiopian_Chemistry_Paper.pdf');
    setShowSideBySidePdf(true);
    setTimeout(() => {
      populateWizardFromExtracted(SAMPLE_ETHIOPIAN_CHEMISTRY_EXAM);
      setExtracting(false);
    }, 600);
  };

  const handleOpenPrintableExam = (exam: Exam, questions?: Question[]) => {
    setPrintableExam({
      exam,
      questions: questions && questions.length > 0 ? questions : (exam.questions || []),
    });
  };

  const handleExportExamPaperHtml = (exam: Exam, questions: Question[]) => {
    const questionsHtml = questions.map((q, idx) => {
      let optionsMarkup = '';
      if (q.type === 'multiple_choice' && q.options) {
        optionsMarkup = `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; font-size: 13px;">
            ${q.options.map(opt => `<div><strong>(${opt.label})</strong> ${opt.text}</div>`).join('')}
          </div>
        `;
      } else if (q.type === 'true_false') {
        optionsMarkup = `
          <div style="display: flex; gap: 24px; margin-top: 6px; font-size: 13px;">
            <span>[ &nbsp; ] True</span>
            <span>[ &nbsp; ] False</span>
          </div>
        `;
      } else {
        optionsMarkup = `
          <div style="border-bottom: 1px dotted #94a3b8; height: 42px; margin-top: 10px;"></div>
          <div style="border-bottom: 1px dotted #94a3b8; height: 28px;"></div>
        `;
      }
      return `
        <div style="margin-bottom: 18px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
            <span>Q${idx + 1}. ${q.questionText}</span>
            <span style="font-size: 12px; color: #475569;">[${q.marks} Mark${q.marks > 1 ? 's' : ''}]</span>
          </div>
          ${optionsMarkup}
        </div>
      `;
    }).join('');

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${exam.title} - SCHOOL FOR EXCELLENCE SECONDARY SCHOOL</title>
  <style>
    body { font-family: 'Times New Roman', serif; padding: 36px; color: #0f172a; max-width: 800px; margin: auto; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; }
    .school-name { font-size: 20px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; }
    .dept { font-size: 13px; font-weight: 600; color: #334155; margin-top: 4px; }
    .exam-title { font-size: 16px; font-weight: bold; margin-top: 8px; }
    .meta-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    .meta-table td { padding: 4px 6px; border: 1px solid #cbd5e1; }
    .student-box { border: 1px solid #64748b; padding: 8px 12px; margin: 16px 0; font-size: 12px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; }
    .instructions { background: #f8fafc; border-left: 3px solid #0284c7; padding: 8px 12px; font-size: 12px; margin-bottom: 20px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-name">SCHOOL FOR EXCELLENCE SECONDARY SCHOOL</div>
    <div class="dept">Department of ${exam.subject} &bull; ${exam.grade}</div>
    <div class="exam-title">${exam.title}</div>
    <table class="meta-table">
      <tr>
        <td><strong>Time Allowed:</strong> ${exam.durationMinutes} Minutes</td>
        <td><strong>Total Marks:</strong> ${exam.totalMarks} Marks</td>
        <td><strong>Section(s):</strong> ${exam.targetSections?.join(', ') || 'All'}</td>
        <td><strong>Academic Year:</strong> 2024 / 2025</td>
      </tr>
    </table>
  </div>
  <div class="student-box">
    <div><strong>Candidate Name:</strong> ________________________________</div>
    <div><strong>Roll No:</strong> ____________</div>
    <div><strong>Date:</strong> ___________</div>
  </div>
  <div class="instructions">
    <strong>GENERAL INSTRUCTIONS:</strong> ${exam.instructions || 'Answer all questions clearly. Ensure your writing is legible.'}
  </div>
  <div class="questions">
    ${questionsHtml}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exam.title.replace(/\s+/g, '_')}_Exam_Paper.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const populateWizardFromExtracted = (extracted: any) => {
    const rawQuestions: any[] = extracted.questions || [];
    const questions: Question[] = rawQuestions.map((q: any, idx: number) => {
      const qType = q.type || 'multiple_choice';
      let options = q.options;

      if (qType === 'multiple_choice' && (!options || options.length === 0)) {
        options = [
          { id: 'opt_A', label: 'A', text: 'Option A' },
          { id: 'opt_B', label: 'B', text: 'Option B' },
          { id: 'opt_C', label: 'C', text: 'Option C' },
          { id: 'opt_D', label: 'D', text: 'Option D' },
        ];
      } else if (qType === 'true_false' && (!options || options.length === 0)) {
        options = [
          { id: 'opt_true', label: 'True', text: 'True' },
          { id: 'opt_false', label: 'False', text: 'False' },
        ];
      }

      return {
        id: q.id || `q_${Date.now()}_${idx + 1}`,
        questionNumber: q.questionNumber || idx + 1,
        type: qType,
        questionText: q.questionText || '',
        options,
        correctAnswer: q.correctAnswer || (qType === 'true_false' ? 'opt_true' : 'opt_A'),
        marks: Number(q.marks) || 2,
        explanation: q.explanation || '',
      };
    });

    setOcrReport({
      isScanned: extracted.isScanned || false,
      notes: extracted.scanNotes || 'Digital examination paper. Clean layout detected.',
    });

    const targetGrade = (extracted.grade as SecondaryGrade) || currentUser?.assignedGrades?.[0] || 'Grade 10';

    setDraftExam((prev) => ({
      ...prev,
      id: `exam_${Date.now()}`,
      title: extracted.title || 'Secondary School Examination',
      subject: extracted.subject || currentUser?.assignedSubjects?.[0] || 'Chemistry',
      grade: targetGrade,
      targetSections: ['All'],
      durationMinutes: extracted.durationMinutes || 60,
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
      instructions: extracted.instructions || 'Read all questions carefully.',
    }));

    setDraftQuestions(questions);
    setWizardStep(2); // advance to editable review screen
  };

  const handleSaveAndPublishExam = async (publishNow: boolean) => {
    if (!draftExam.title.trim()) {
      setPublishedSuccessMessage('Please enter an exam title before saving.');
      setTimeout(() => setPublishedSuccessMessage(null), 4000);
      return;
    }
    if (draftQuestions.length === 0) {
      setPublishedSuccessMessage('Please add at least one question to the exam.');
      setTimeout(() => setPublishedSuccessMessage(null), 4000);
      return;
    }

    if (publishNow) {
      const pendingReviews = draftQuestions.filter((q) => q.needsReview);
      if (pendingReviews.length > 0) {
        setPublishedSuccessMessage(
          `Cannot publish exam: ${pendingReviews.length} question(s) (Q${pendingReviews.map((q) => q.questionNumber || '').filter(Boolean).join(', ')}) are flagged with ambiguous answers and need review. Please verify and clear them before publishing.`
        );
        setTimeout(() => setPublishedSuccessMessage(null), 6000);
        return;
      }
    }

    const calculatedMarks = draftQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
    const finalExam: Exam = {
      ...draftExam,
      totalMarks: calculatedMarks,
      status: publishNow ? 'published' : 'draft',
      updatedAt: new Date().toISOString(),
    };

    await saveExam(finalExam, draftQuestions);
    setIsPdfWizardOpen(false);
    setWizardStep(1);
    setActiveTab('exams');
  };

  const handleEditExam = async (exam: Exam) => {
    try {
      const fullData = await getExamWithAnswerKey(exam.id);
      if (fullData) {
        setDraftExam(fullData.exam);
        setDraftQuestions(fullData.questions);
      } else {
        setDraftExam(exam);
        setDraftQuestions(exam.questions || []);
      }
    } catch {
      setDraftExam(exam);
      setDraftQuestions(exam.questions || []);
    }
    setWizardStep(2);
    setIsPdfWizardOpen(true);
  };

  const handleAddNewQuestion = () => {
    const nextNum = draftQuestions.length + 1;
    const newQ: Question = {
      id: `q_manual_${Date.now()}_${nextNum}`,
      questionNumber: nextNum,
      type: 'multiple_choice',
      questionText: 'Type question statement here...',
      options: [
        { id: 'opt_A', label: 'A', text: 'Option A' },
        { id: 'opt_B', label: 'B', text: 'Option B' },
        { id: 'opt_C', label: 'C', text: 'Option C' },
        { id: 'opt_D', label: 'D', text: 'Option D' },
      ],
      correctAnswer: 'opt_A',
      marks: 2,
      explanation: '',
    };
    setDraftQuestions([...draftQuestions, newQ]);
  };

  const handleUpdateQuestion = (qId: string, partial: Partial<Question>) => {
    setDraftQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, ...partial } : q))
    );
  };

  const handleDeleteQuestion = (qId: string) => {
    setDraftQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const handleExportCsv = () => {
    const headers = [
      'Submission ID',
      'Student Name',
      'Grade',
      'Section',
      'Exam Title',
      'Subject',
      'Objective Score',
      'Manual Score',
      'Total Score',
      'Total Possible',
      'Status',
      'Submitted Date',
    ];

    const rows = relevantSubmissions.map((s) => [
      s.id,
      `"${s.studentName}"`,
      s.grade,
      s.section,
      `"${s.examTitle}"`,
      s.subject,
      s.objectiveScore,
      s.manualScore,
      s.score,
      s.totalPossible,
      s.status,
      s.submittedAt || s.createdAt,
    ]);

    const csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Exam_Results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (activeLiveLesson) {
    return (
      <LiveClassroom
        lesson={activeLiveLesson}
        onLeave={() => setActiveLiveLesson(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Teacher Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SchoolLogo size="md" lightText />
            <div className="hidden sm:block border-l border-slate-700 pl-3">
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30 uppercase tracking-wide">
                Teacher Faculty Portal
              </span>
              <p className="text-[11px] text-slate-400">
                {currentUser?.assignedSubjects?.join(', ') || 'Academic Department'} • {currentUser?.assignedGrades?.join(', ') || 'Grades 9–12'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-white">{currentUser?.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">@{currentUser?.username}</div>
            </div>

            <button
              onClick={async () => {
                await logout();
                navigate('/teacher/login');
              }}
              className="px-3.5 py-1.5 rounded-xl border border-blue-500/30 bg-blue-950/30 hover:bg-blue-900/50 text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
        {/* Screenshot 2: Teacher Dashboard Overview with Emerald Accent */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-500/20 shadow-md p-6 sm:p-8 space-y-6">
          {/* Header Row: Search Command Bar, Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="🔍 Type a command or search exams, modules, schedules..."
                className="w-full pl-4 pr-10 py-2.5 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Academic Faculty • {currentUser?.assignedSubjects?.[0] || 'Secondary'}
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Welcome back Teacher</span>
                <span className="text-2xl">👋</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Manage your assessments, track student module performance, and launch live video classrooms.
              </p>
            </div>
          </div>

          {/* 4 Metric Cards - Screenshot 2 Style */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Total Exams (Emerald highlighted card from Screenshot 2) */}
            <div className="bg-emerald-500 text-slate-950 p-5 rounded-2xl shadow-lg shadow-emerald-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">Total Exams</span>
                <Users className="w-4 h-4 text-slate-900/80" />
              </div>
              <div className="text-3xl font-extrabold">{teacherExams.length || 12}</div>
              <div className="text-[11px] font-semibold text-slate-900/80 mt-1">10% of total school exams</div>
            </div>

            {/* 2. Students */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Students</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">+320</div>
              <div className="text-[11px] font-medium text-slate-400 mt-1">In 8 assigned sections</div>
            </div>

            {/* 3. Average Scores */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Scores</span>
                <Award className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">64.3%</div>
              <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-1">↑ 20% of class total</div>
            </div>

            {/* 4. Modules */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Modules</span>
                <BookOpen className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">4</div>
              <div className="text-[11px] font-medium text-slate-400 mt-1">+31 syllabus topics</div>
            </div>
          </div>

          {/* Middle 3 Columns - Screenshot 2 Style */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Average Exam Scores By Module Bar Chart (4 Cols) */}
            <div className="lg:col-span-4 bg-slate-50/80 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Average Exam Scores By Module
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">January - June 2024</p>
                
                {/* Bar Chart Representation */}
                <div className="h-40 flex items-end justify-around pt-6 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-20 bg-emerald-500 rounded-t-lg shadow-sm hover:bg-emerald-400 transition-colors" />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">OOP</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-32 bg-emerald-500 rounded-t-lg shadow-sm hover:bg-emerald-400 transition-colors" />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">SFSD</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-24 bg-emerald-500 rounded-t-lg shadow-sm hover:bg-emerald-400 transition-colors" />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">ALSDS</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-12 bg-emerald-400/60 rounded-t-lg shadow-sm hover:bg-emerald-400 transition-colors" />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">BD</span>
                  </div>
                </div>
              </div>
              <div className="pt-3 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                <span>Trending up by 5.2% this month</span>
                <span>📈</span>
              </div>
            </div>

            {/* Column 2: Recent Activities (4 Cols) */}
            <div className="lg:col-span-4 bg-slate-50/80 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Recent Activities
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">January - June 2024</p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    You created a new exam: <strong className="text-emerald-600">"Midterm Exam - SFSD"</strong>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">just now</span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    You edited the module: <strong className="text-indigo-600">"Advanced Database Systems"</strong>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">just now</span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    You deleted the exam: <strong className="text-rose-600">"Quiz 1 - OOP"</strong>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">just now</span>
                </div>
              </div>
            </div>

            {/* Column 3: Upcoming Events Mini Calendar (4 Cols) */}
            <div className="lg:col-span-4 bg-slate-50/80 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Upcoming Events
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">January - June 2024</p>
              </div>

              {/* Mini Calendar View from Screenshot 2 */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span>‹</span>
                  <span>March 2024</span>
                  <span>›</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] pt-2">
                  <span className="text-slate-400 font-medium">Su</span>
                  <span className="text-slate-400 font-medium">Mo</span>
                  <span className="text-slate-400 font-medium">Tu</span>
                  <span className="text-slate-400 font-medium">We</span>
                  <span className="text-slate-400 font-medium">Th</span>
                  <span className="text-slate-400 font-medium">Fr</span>
                  <span className="text-slate-400 font-medium">Sa</span>
                  {/* Days */}
                  {[...Array(31)].map((_, i) => {
                    const day = i + 1;
                    const isHighlighted = day === 19 || day === 22;
                    return (
                      <span
                        key={day}
                        className={`py-1 rounded-md text-[10px] font-semibold ${
                          isHighlighted
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {day}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 text-xs">
                <div className="font-bold text-emerald-800 dark:text-emerald-200">Midterm Exam - OOP</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">January 22, 14:00 - 16:00</div>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar from Screenshot 2 */}
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Quick Actions</span>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setWizardStep(1);
                  setIsPdfWizardOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Generate Exam With AI</span>
              </button>

              <button
                onClick={() => {
                  setDraftExam({
                    id: `exam_${Date.now()}`,
                    title: 'Secondary School Assessment',
                    subject: currentUser?.assignedSubjects?.[0] || 'Mathematics',
                    grade: currentUser?.assignedGrades?.[0] || 'Grade 10',
                    targetSections: ['All'],
                    teacherId: currentUser?.id || 'teacher_1',
                    teacherName: currentUser?.name || 'Faculty Teacher',
                    durationMinutes: 60,
                    totalMarks: 20,
                    instructions: 'Read every question carefully before answering.',
                    scheduledDate: new Date().toISOString().split('T')[0],
                    startTime: '09:00',
                    deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
                    status: 'draft',
                    resultsReleased: false,
                    questions: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                  setDraftQuestions([]);
                  setWizardStep(2);
                  setIsPdfWizardOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Exam</span>
              </button>

              <button
                onClick={() => setIsLiveSetupOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Video className="w-4 h-4 text-rose-500" />
                <span>Live Learning / Class</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success Feedback Banner */}
        {publishedSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{publishedSuccessMessage}</span>
            </div>
            <button onClick={() => setPublishedSuccessMessage(null)} className="text-emerald-400 hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        {/* Tab Controls Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'exams'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Examinations ({teacherExams.length})
            </button>
            <button
              onClick={() => setActiveTab('live_lessons')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'live_lessons'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-rose-500" />
              <span>Live Classrooms ({liveLessons.length})</span>
              {liveLessons.some(l => l.status === 'live') && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'submissions'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Submissions & Grading
              {pendingGradingCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingGradingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Examinations Repository */}
        {activeTab === 'exams' && (
          <div className="space-y-4">
            {teacherExams.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
                <School className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Examinations Created Yet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Click the AI PDF-to-Exam Generator button above to upload an existing question paper or draft a new examination.
                </p>
                <button
                  onClick={() => {
                    setWizardStep(1);
                    setIsPdfWizardOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Launch AI Exam Creator
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherExams.map((exam) => {
                  const examSubs = allSubmissions.filter((s) => s.examId === exam.id);
                  return (
                    <div
                      key={exam.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {exam.subject} • {exam.grade}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              exam.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {exam.status}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                          {exam.title}
                        </h4>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Duration</div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{exam.durationMinutes}m</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Marks</div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{exam.totalMarks}</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Questions</div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                              {exam.questions?.length || exam.questionsCount || 0}
                            </div>
                          </div>
                        </div>

                        {/* Results Release Toggle */}
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Release Results</span>
                            <div className="text-[10px] text-slate-500">
                              {exam.resultsReleased ? 'Scores visible to candidates' : 'Hidden from candidates'}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleResultsRelease(exam.id)}
                            className={`p-1 rounded-lg transition-colors ${
                              exam.resultsReleased ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                            title="Toggle candidate results release"
                          >
                            {exam.resultsReleased ? (
                              <ToggleRight className="w-6 h-6" />
                            ) : (
                              <ToggleLeft className="w-6 h-6" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">
                          {examSubs.length} Submissions
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(exam.status === 'draft' || exam.status === 'scheduled') && (
                            <button
                              onClick={() => handlePublishExam(exam.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] cursor-pointer"
                            >
                              Publish
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenPrintableExam(exam)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            title="Print or Export Exam Paper"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditExam(exam)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit exam"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteExam(exam.id)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete exam"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Submissions & Grading */}
        {activeTab === 'submissions' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Filter Exam:</span>
                <select
                  value={selectedExamForSubmissions}
                  onChange={(e) => setSelectedExamForSubmissions(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="all">All Examinations ({allSubmissions.length})</option>
                  {teacherExams.map((e) => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Export Results to CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Grade & Section</th>
                    <th className="py-3 px-4">Examination</th>
                    <th className="py-3 px-4">Objective Score</th>
                    <th className="py-3 px-4">Manual Score</th>
                    <th className="py-3 px-4">Total Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {relevantSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No student submissions recorded for this selection yet.
                      </td>
                    </tr>
                  ) : (
                    relevantSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{sub.studentName}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{sub.grade} • {sub.section}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 max-w-[200px] truncate">{sub.examTitle}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">{sub.objectiveScore} marks</td>
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">{sub.manualScore} marks</td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700 dark:text-indigo-400">{sub.score} / {sub.totalPossible}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              sub.status === 'graded'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {sub.status === 'graded' ? 'Graded' : 'Needs Review'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setGradingSubmission(sub);
                              setManualMarksInput(sub.manualScore || 0);
                              setTeacherFeedbackInput(sub.teacherFeedback || '');
                            }}
                            className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold text-xs"
                          >
                            Grade Written Answers
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Live Learning Classrooms */}
        {activeTab === 'live_lessons' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Video className="w-4 h-4 text-rose-500" />
                  <span>Interactive Live Learning Classrooms</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Launch interactive video classes for Grades 9, 10, 11, and 12 with live student raise-hand management and audio participation.
                </p>
              </div>

              <button
                onClick={() => setIsLiveSetupOpen(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/30 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Start / Schedule Live Class</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveLessons.length === 0 ? (
                <div className="col-span-3 py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <Video className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Live Lessons Created Yet</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Click "Live Learning / Start Learning" above to set up a new real-time video classroom for your students.
                  </p>
                  <button
                    onClick={() => setIsLiveSetupOpen(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    Launch Live Class Now
                  </button>
                </div>
              ) : (
                liveLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1.5 ${
                          lesson.status === 'live'
                            ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/40 animate-pulse'
                            : lesson.status === 'scheduled'
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {lesson.status === 'live' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                        {lesson.status === 'live' ? 'Live Now' : lesson.status}
                      </span>
                      <span className="text-xs font-bold text-indigo-600 dark:text-cyan-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                        {lesson.grade}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">{lesson.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {lesson.description || 'Secondary curriculum live session.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Subject:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{lesson.subject}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Section:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">{lesson.section || 'All Sections'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Participants:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{lesson.participants?.length || 1} online</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      {lesson.status !== 'ended' ? (
                        <button
                          onClick={() => setActiveLiveLesson(lesson)}
                          className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>{lesson.status === 'live' ? 'Join Classroom' : 'Start Live Class'}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Lesson Finished</span>
                      )}

                      {lesson.status === 'live' && (
                        <button
                          onClick={() => updateLiveLessonStatus(lesson.id, 'ended')}
                          className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-semibold cursor-pointer transition-all"
                        >
                          End
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* AI PDF Wizard Modal */}
      {isPdfWizardOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`bg-white dark:bg-slate-900 rounded-3xl shadow-2xl ${showSideBySidePdf && wizardStep === 2 ? 'max-w-7xl' : 'max-w-4xl'} w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 transition-all`}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Secondary Exam Creator (Grades 9–12)</h3>
                  <p className="text-xs text-blue-100">
                    Step {wizardStep} of 2: {wizardStep === 1 ? 'Upload Exam Paper PDF' : 'Review & Approve Extracted Questions'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsPdfWizardOpen(false)} className="text-white/80 hover:text-white cursor-pointer">✕</button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {wizardStep === 1 && (
                <div className="space-y-6">
                  {extractionError && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>{extractionError}</span>
                    </div>
                  )}

                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-10 text-center hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/30 transition-all">
                    {extracting ? (
                      <div className="py-8 space-y-4">
                        <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {extractionProgress || 'Gemini 3.8 Flash is analyzing the document...'}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                            Detecting questions, options, point values, answer keys, and OCR quality.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
                          <Upload className="w-8 h-8" />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">Upload Question Paper in PDF Format</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                          Secondary school exam papers, national exam prep tests, or midterms. Scanned documents will be read via Gemini OCR.
                        </p>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                          <label className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-blue-600/20 transition-all">
                            Select Local PDF
                            <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                          </label>

                          <button
                            type="button"
                            onClick={handleUseSampleExam}
                            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            Load Sample Ethiopian Chemistry Paper
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Review and Edit Screen */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  {/* Step 2 Toolbar with Split Screen and Printable Paper Preview */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">OCR Inspection:</span>
                      <span className="text-slate-600 dark:text-slate-400">{ocrReport?.notes || 'Clean exam structure analyzed.'}</span>
                      <span className="text-[10px] font-mono uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                        100% Digitized
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSideBySidePdf(!showSideBySidePdf)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          showSideBySidePdf
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title="Toggle Side-by-Side Original PDF view"
                      >
                        <Columns className="w-3.5 h-3.5" />
                        <span>{showSideBySidePdf ? 'Side-by-Side View (Active)' : 'Show Original PDF Split'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenPrintableExam(draftExam, draftQuestions)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Preview printable examination paper formatted for students"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Paper Preview / Print</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Review Layout: Split-Screen or Single Column */}
                  <div className={showSideBySidePdf ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : 'space-y-6'}>
                    {/* Left Panel: Original PDF or Document Reference */}
                    {showSideBySidePdf && (
                      <div className="lg:col-span-5 space-y-3 sticky top-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <span>Original PDF Source Document</span>
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[160px]">
                            {uploadedPdfName || 'Official Paper'}
                          </span>
                        </div>

                        {uploadedPdfBase64 ? (
                          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-inner">
                            <iframe
                              src={uploadedPdfBase64}
                              className="w-full h-[620px] rounded-xl bg-white"
                              title="Original Uploaded PDF"
                            />
                          </div>
                        ) : (
                          <div className="bg-slate-50/90 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 max-h-[620px] overflow-y-auto">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                National Secondary Exam Source
                              </span>
                              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold px-2 py-0.5 rounded">
                                High Fidelity OCR
                              </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-serif text-slate-800 dark:text-slate-200 space-y-3">
                              <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-800">
                                <strong className="font-sans text-[11px] uppercase tracking-wide block">
                                  SCHOOL FOR EXCELLENCE SECONDARY SCHOOL
                                </strong>
                                <span className="font-sans text-[10px] text-slate-500">
                                  Chemistry Department &bull; Regular Examination
                                </span>
                              </div>
                              <p className="font-sans text-[10px] text-slate-400 italic">
                                Original exam paper items reference:
                              </p>
                              {draftQuestions.map((q, idx) => (
                                <div key={q.id || idx} className="border-b border-slate-100 dark:border-slate-800 pb-2">
                                  <div className="font-bold font-sans text-xs">
                                    Q{idx + 1}. {q.questionText}
                                  </div>
                                  {q.options && (
                                    <div className="grid grid-cols-2 gap-1 text-[11px] font-sans pl-2 pt-1 text-slate-600 dark:text-slate-400">
                                      {q.options.map((opt) => (
                                        <div key={opt.id}>({opt.label}) {opt.text}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Right Panel: Exam Settings & Digitized Questions Editor */}
                    <div className={showSideBySidePdf ? 'lg:col-span-7 space-y-6' : 'space-y-6'}>
                      {/* Exam Settings Bar */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="col-span-2">
                          <label className="font-semibold block mb-1">Exam Title</label>
                          <input
                            type="text"
                            value={draftExam.title}
                            onChange={(e) => setDraftExam({ ...draftExam, title: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-medium"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Subject</label>
                          <select
                            value={draftExam.subject}
                            onChange={(e) => setDraftExam({ ...draftExam, subject: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          >
                            {SECONDARY_SUBJECTS.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Target Secondary Grade</label>
                          <select
                            value={draftExam.grade}
                            onChange={(e) => setDraftExam({ ...draftExam, grade: e.target.value as SecondaryGrade })}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          >
                            {SECONDARY_GRADES.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold block mb-1">Duration (Minutes)</label>
                          <input
                            type="number"
                            min="5"
                            max="180"
                            value={draftExam.durationMinutes}
                            onChange={(e) => setDraftExam({ ...draftExam, durationMinutes: parseInt(e.target.value, 10) || 60 })}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Scheduled Date</label>
                          <input
                            type="date"
                            value={draftExam.scheduledDate}
                            onChange={(e) => setDraftExam({ ...draftExam, scheduledDate: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Start Time</label>
                          <input
                            type="time"
                            value={draftExam.startTime}
                            onChange={(e) => setDraftExam({ ...draftExam, startTime: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Calculated Total Marks</label>
                          <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-bold border border-blue-200 dark:border-blue-800">
                            {draftQuestions.reduce((s, q) => s + (Number(q.marks) || 1), 0)} Marks ({draftQuestions.length} Items)
                          </div>
                        </div>
                      </div>

                      {/* Question Editor List */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm">Extracted Questions ({draftQuestions.length})</h4>
                          <button
                            type="button"
                            onClick={handleAddNewQuestion}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Question
                          </button>
                        </div>

                        {draftQuestions.map((q, idx) => (
                          <div
                            key={q.id}
                            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <select
                                  value={q.type}
                                  onChange={(e) => {
                                    const newType = e.target.value as QuestionType;
                                    handleUpdateQuestion(q.id, {
                                      type: newType,
                                      options:
                                        newType === 'multiple_choice'
                                          ? [
                                              { id: 'opt_A', label: 'A', text: 'Option A' },
                                              { id: 'opt_B', label: 'B', text: 'Option B' },
                                              { id: 'opt_C', label: 'C', text: 'Option C' },
                                              { id: 'opt_D', label: 'D', text: 'Option D' },
                                            ]
                                          : newType === 'true_false'
                                          ? [
                                              { id: 'opt_true', label: 'True', text: 'True' },
                                              { id: 'opt_false', label: 'False', text: 'False' },
                                            ]
                                          : undefined,
                                      correctAnswer:
                                        newType === 'true_false' ? 'opt_true' : newType === 'multiple_choice' ? 'opt_A' : '',
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-900"
                                >
                                  <option value="multiple_choice">Multiple Choice</option>
                                  <option value="true_false">True / False</option>
                                  <option value="short_answer">Short Answer (Written)</option>
                                </select>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="text-slate-500 font-semibold">Marks:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={q.marks}
                                    onChange={(e) =>
                                      handleUpdateQuestion(q.id, { marks: parseInt(e.target.value, 10) || 1 })
                                    }
                                    className="w-14 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-center"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Statement */}
                            <textarea
                              rows={2}
                              value={q.questionText}
                              onChange={(e) => handleUpdateQuestion(q.id, { questionText: e.target.value })}
                              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                            />

                            {/* Options */}
                            {q.type === 'multiple_choice' && (
                              <div className="space-y-2 pt-1">
                                <span className="text-[11px] font-semibold text-slate-500 block">
                                  Options (Select radio for the verified correct answer):
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {q.options?.map((opt, optIdx) => {
                                    const isCorrect = q.correctAnswer === opt.id;
                                    return (
                                      <div
                                        key={opt.id}
                                        className={`flex items-center gap-2 p-2 rounded-xl border ${
                                          isCorrect
                                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
                                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`correct_${q.id}`}
                                          checked={isCorrect}
                                          onChange={() => handleUpdateQuestion(q.id, { correctAnswer: opt.id })}
                                          className="text-emerald-600 cursor-pointer"
                                        />
                                        <span className="font-bold text-xs">{opt.label})</span>
                                        <input
                                          type="text"
                                          value={opt.text}
                                          onChange={(e) => {
                                            const newOpts = [...(q.options || [])];
                                            newOpts[optIdx] = { ...newOpts[optIdx], text: e.target.value };
                                            handleUpdateQuestion(q.id, { options: newOpts });
                                          }}
                                          className="w-full bg-transparent text-xs focus:outline-hidden font-medium"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {q.type === 'true_false' && (
                              <div className="flex items-center gap-3 pt-1">
                                <span className="text-[11px] font-semibold text-slate-500">Correct Answer:</span>
                                {[
                                  { id: 'opt_true', label: 'True' },
                                  { id: 'opt_false', label: 'False' },
                                ].map((val) => (
                                  <button
                                    key={val.id}
                                    type="button"
                                    onClick={() => handleUpdateQuestion(q.id, { correctAnswer: val.id })}
                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                                      q.correctAnswer === val.id
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {val.label}
                                  </button>
                                ))}
                              </div>
                            )}

                            {q.type === 'short_answer' && (
                              <div>
                                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                                  Teacher Grading Rubric & Key Concepts:
                                </span>
                                <textarea
                                  rows={2}
                                  value={q.correctAnswer}
                                  onChange={(e) => handleUpdateQuestion(q.id, { correctAnswer: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              {wizardStep === 2 && (
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  ← Upload Different Document
                </button>
              )}
              {wizardStep === 1 && <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPdfWizardOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                {wizardStep === 2 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveAndPublishExam(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAndPublishExam(true)}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Approve & Publish to Candidates
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Exam Paper Modal */}
      {printableExam && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Top Action Bar (No Print) */}
            <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Official Examination Paper Preview
                </span>
                <span className="text-[11px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  Print Ready (A4)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportExamPaperHtml(printableExam.exam, printableExam.questions)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download HTML</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Paper / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintableExam(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Paper Body */}
            <div className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white text-slate-900 font-serif">
              {/* Official Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase font-sans text-slate-950">
                  SCHOOL FOR EXCELLENCE SECONDARY SCHOOL
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-700 mt-1 uppercase font-sans tracking-wide">
                  Department of {printableExam.exam.subject} • {printableExam.exam.grade}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 font-sans">
                  Secondary School Regular Examination • Academic Year 2024 / 2025
                </p>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-2 font-sans">
                  {printableExam.exam.title}
                </h2>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans border border-slate-300 p-2 bg-slate-50 text-slate-800">
                  <div><strong>Time Allowed:</strong> {printableExam.exam.durationMinutes} Mins</div>
                  <div><strong>Total Marks:</strong> {printableExam.exam.totalMarks}</div>
                  <div><strong>Sections:</strong> {printableExam.exam.targetSections?.join(', ') || 'All'}</div>
                  <div><strong>Status:</strong> Official Paper</div>
                </div>
              </div>

              {/* Candidate Info Box */}
              <div className="border border-slate-800 p-3 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                <div>Candidate Full Name: ___________________________</div>
                <div>Roll / ID Number: _________________</div>
                <div>Date: __________________________</div>
              </div>

              {/* Instructions */}
              <div className="bg-slate-50 border-l-4 border-slate-900 p-3 mb-6 text-xs font-sans text-slate-800">
                <strong>GENERAL INSTRUCTIONS:</strong> {printableExam.exam.instructions || 'Answer all questions on this paper. Cheating or possessing unpermitted materials leads to immediate disqualification.'}
              </div>

              {/* Questions Rendered */}
              <div className="space-y-6 text-sm">
                {printableExam.questions.map((q, idx) => (
                  <div key={q.id || idx} className="space-y-2 border-b border-slate-100 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-bold text-slate-900 font-sans">
                        <span>{idx + 1}. </span>
                        <span>{q.questionText}</span>
                      </div>
                      <span className="shrink-0 text-xs font-sans font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        [{q.marks} {q.marks > 1 ? 'Marks' : 'Mark'}]
                      </span>
                    </div>

                    {q.type === 'multiple_choice' && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 pt-1 text-xs font-sans">
                        {q.options.map((opt) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <span className="font-bold">({opt.label})</span>
                            <span>{opt.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'true_false' && (
                      <div className="flex items-center gap-6 pl-4 pt-1 text-xs font-sans">
                        <span>[ &nbsp; &nbsp; ] True</span>
                        <span>[ &nbsp; &nbsp; ] False</span>
                      </div>
                    )}

                    {q.type === 'short_answer' && (
                      <div className="pl-4 pt-2 space-y-2 font-sans">
                        <div className="border-b border-dashed border-slate-300 h-6"></div>
                        <div className="border-b border-dashed border-slate-300 h-6"></div>
                        <div className="border-b border-dashed border-slate-300 h-6"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-12 pt-4 border-t border-slate-400 text-center text-xs text-slate-500 font-sans">
                *** END OF EXAMINATION PAPER • SCHOOL FOR EXCELLENCE SECONDARY SCHOOL ***
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Grading Drawer Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Grade Submission: {gradingSubmission.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  {gradingSubmission.grade} • {gradingSubmission.section} • {gradingSubmission.examTitle}
                </p>
              </div>
              <button onClick={() => setGradingSubmission(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="font-bold">Objective Score (Multiple Choice & True/False):</span>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">Verified automatically via stable option keys</div>
                </div>
                <div className="text-xl font-bold font-mono text-emerald-800 dark:text-emerald-300">
                  {gradingSubmission.objectiveScore} marks
                </div>
              </div>

              {/* Student Written Answers */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm">Written Responses:</h4>
                {Object.entries(gradingSubmission.answers).map(([qId, ansText], i) => (
                  <div key={qId} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-1.5">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">Question Item {i + 1}:</div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium">
                      {ansText || <span className="text-slate-400 italic">No answer submitted</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Marks */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
                <div>
                  <label className="font-bold block mb-1">
                    Award Manual / Written Score (Marks)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={gradingSubmission.totalPossible}
                    value={manualMarksInput}
                    onChange={(e) => setManualMarksInput(parseFloat(e.target.value) || 0)}
                    className="w-32 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold font-mono text-base"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Teacher Feedback Remarks</label>
                  <textarea
                    rows={3}
                    value={teacherFeedbackInput}
                    onChange={(e) => setTeacherFeedbackInput(e.target.value)}
                    placeholder="Provide constructive feedback on candidate answers..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setGradingSubmission(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await saveManualGrading(gradingSubmission.id, manualMarksInput, teacherFeedbackInput);
                  setGradingSubmission(null);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Finalize Grade & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Class Setup Modal */}
      <LiveClassSetupModal
        isOpen={isLiveSetupOpen}
        onClose={() => setIsLiveSetupOpen(false)}
        onClassStarted={(lesson: LiveLesson) => {
          setIsLiveSetupOpen(false);
          setActiveLiveLesson(lesson);
        }}
      />
    </div>
  );
};
