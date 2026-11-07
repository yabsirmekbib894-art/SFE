import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Exam, Question, ExamSubmission } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { auth } from '../../lib/firebase.ts';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  ShieldCheck, 
  ShieldAlert,
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface ExamTakerProps {
  exam: Exam;
  onFinish: (submission: ExamSubmission) => void;
  onCancel: () => void;
}

export const ExamTaker: React.FC<ExamTakerProps> = ({ exam, onFinish, onCancel }) => {
  const { currentUser, submitExamAnswers, theme } = useAuth();
  const [activeQuestions, setActiveQuestions] = useState<Question[]>(exam.questions || []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(exam.durationMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [autoSubmittedNotice, setAutoSubmittedNotice] = useState(false);
  const [securityWarnings, setSecurityWarnings] = useState<number>(0);
  const [securityBanner, setSecurityBanner] = useState<string | null>(null);

  const questions = activeQuestions;
  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).filter((k) => (answers[k] || '').trim().length > 0).length;

  // 1. Initialize server exam attempt on mount
  useEffect(() => {
    let isMounted = true;
    const initServerAttempt = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/exams/${exam.id}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (Array.isArray(data.questions) && data.questions.length > 0) {
              setActiveQuestions(data.questions);
            }
            if (data.deadline) {
              const deadlineTime = new Date(data.deadline).getTime();
              const remaining = Math.max(0, Math.floor((deadlineTime - Date.now()) / 1000));
              setTimeLeftSeconds(remaining);
            }
          }
        }
      } catch (err) {
        console.warn('Could not register attempt with server start endpoint:', err);
      }
    };

    initServerAttempt();
    return () => {
      isMounted = false;
    };
  }, [exam.id]);

  // 2. Anti-cheating listeners: tab switches and visibility changes
  useEffect(() => {
    const logSecurityEvent = async (eventType: string, details: string) => {
      setSecurityWarnings((prev) => {
        const next = prev + 1;
        setSecurityBanner(`Warning: Tab change detected! Incident #${next} recorded for academic integrity.`);
        setTimeout(() => setSecurityBanner(null), 5000);
        return next;
      });

      try {
        const token = await auth.currentUser?.getIdToken();
        await fetch(`/api/exams/${exam.id}/log-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            eventType,
            details,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.warn('Failed to log security event:', e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSecurityEvent('tab_hidden', 'Candidate switched away from examination tab');
      }
    };

    const handleWindowBlur = () => {
      logSecurityEvent('window_blur', 'Candidate clicked outside examination window');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [exam.id]);

  // Real-time countdown timer
  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  const handleAutoSubmit = async () => {
    if (isSubmitting) return;
    setAutoSubmittedNotice(true);
    await doSubmit(true);
  };

  const doSubmit = async (isAuto: boolean) => {
    setIsSubmitting(true);
    try {
      const sub = await submitExamAnswers(exam.id, answers, isAuto);
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {}
      onFinish(sub);
    } catch (err) {
      console.error('Submission error:', err);
      setIsSubmitting(false);
    }
  };

  const handleSelectAnswer = (qId: string, val: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: val,
    }));
  };

  const toggleFlag = (qId: string) => {
    setFlagged((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeLeftSeconds < 300;
  const isCriticalTime = timeLeftSeconds < 60;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Top Examination Security Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {exam.subject.charAt(0)}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-sm leading-tight max-w-sm sm:max-w-md truncate">
              {exam.title}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{exam.grade}</span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Candidate: {currentUser?.name}</span>
              <span>({currentUser?.studentId || 'ID Verified'})</span>
            </div>
          </div>
        </div>

        {/* Center Timer & Integrity Badge */}
        <div className="flex items-center gap-3">
          {securityWarnings > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Incidents: {securityWarnings}</span>
            </div>
          )}

          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold border transition-all ${
              isCriticalTime
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200 border-rose-300 animate-pulse'
                : isLowTime
                ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-300'
                : 'bg-slate-50 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Clock className={`w-4 h-4 ${isCriticalTime ? 'text-rose-600' : isLowTime ? 'text-amber-600' : 'text-slate-500'}`} />
            <span>{formatTime(timeLeftSeconds)}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Finish &</span> Submit
          </button>
        </div>
      </header>
      {securityBanner && (
        <div className="bg-amber-500 text-slate-900 font-bold px-4 py-2 text-center text-xs flex items-center justify-center gap-2 shadow-sm animate-bounce">
          <ShieldAlert className="w-4 h-4 text-slate-950" />
          <span>{securityBanner}</span>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center Question View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
          <div className="max-w-3xl w-full space-y-6">
            {currentQ ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
                {/* Question Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {currentQ.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                      {currentQ.marks} {currentQ.marks === 1 ? 'Mark' : 'Marks'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleFlag(currentQ.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                        flagged[currentQ.id]
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>{flagged[currentQ.id] ? 'Flagged' : 'Flag'}</span>
                    </button>
                  </div>
                </div>

                {/* Statement */}
                <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-white leading-relaxed">
                  {currentQ.questionText}
                </div>

                {/* Answer Options */}
                <div className="pt-2">
                  {/* Multiple Choice with Stable Option IDs */}
                  {currentQ.type === 'multiple_choice' && (
                    <div className="space-y-3">
                      {currentQ.options?.map((option) => {
                        const isSelected = answers[currentQ.id] === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelectAnswer(currentQ.id, option.id)}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3.5 ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {option.label}
                            </div>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {option.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False */}
                  {currentQ.type === 'true_false' && (
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'opt_true', label: 'True' },
                        { id: 'opt_false', label: 'False' },
                      ].map((item) => {
                        const isSelected = answers[currentQ.id] === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectAnswer(currentQ.id, item.id)}
                            className={`p-6 rounded-2xl border-2 text-center transition-all ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 shadow-xs font-bold'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold'
                            }`}
                          >
                            <span className="text-base">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer */}
                  {currentQ.type === 'short_answer' && (
                    <div className="space-y-2">
                      <textarea
                        rows={5}
                        value={answers[currentQ.id] || ''}
                        onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
                        placeholder="Write your explanation or answer in complete sentences..."
                        className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-600 focus:outline-hidden text-sm leading-relaxed"
                      />
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Teacher manual evaluation will score this response</span>
                        <span>{(answers[currentQ.id] || '').length} characters</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Real-time answer sync</span>
                  </div>

                  {currentIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      Review & Submit
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">No questions found in this paper.</div>
            )}
          </div>
        </main>

        {/* Right Sidebar: Question Palette */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 hidden md:flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-slate-800 dark:text-slate-200">Progress</span>
                <span className="text-emerald-600 font-mono">
                  {answeredCount} / {questions.length} answered
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${(answeredCount / (questions.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Question Palette
              </div>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = (answers[q.id] || '').trim().length > 0;
                  const isFlag = flagged[q.id];

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-all relative ${
                        isCurrent
                          ? 'ring-2 ring-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : isAnswered
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {idx + 1}
                      {isFlag && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-300" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200" />
                <span>Unanswered ({questions.length - answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>Flagged ({Object.values(flagged).filter(Boolean).length})</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            Finalize & Submit
          </button>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
              <HelpCircle className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Submit Examination?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You have answered <span className="font-bold text-slate-800 dark:text-slate-200">{answeredCount} of {questions.length} questions</span>.
              {answeredCount < questions.length && (
                <span className="text-amber-600 block mt-1 font-semibold">
                  Warning: You have {questions.length - answeredCount} unanswered questions!
                </span>
              )}
            </p>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Return to Exam
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => doSubmit(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Calculating Score...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Submit Notification */}
      {autoSubmittedNotice && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-3 border border-slate-200 dark:border-slate-800">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Time Limit Expired!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exam duration has ended. Your answers are being automatically submitted.
            </p>
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mt-2" />
          </div>
        </div>
      )}
    </div>
  );
};
