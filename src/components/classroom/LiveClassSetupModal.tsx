import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { SecondaryGrade, SECONDARY_GRADES, SECONDARY_SUBJECTS, GRADE_SECTIONS_MAP, LiveLesson } from '../../types/index.ts';
import {
  Radio,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Calendar,
  Clock,
  BookOpen,
  Sparkles,
  X,
  Play
} from 'lucide-react';

interface LiveClassSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartClass?: (lesson: LiveLesson) => void;
  onClassStarted?: (lesson: LiveLesson) => void;
}

export const LiveClassSetupModal: React.FC<LiveClassSetupModalProps> = ({
  isOpen,
  onClose,
  onStartClass,
  onClassStarted,
}) => {
  const { currentUser, createLiveLesson } = useAuth();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(currentUser?.assignedSubjects?.[0] || 'Mathematics');
  const [grade, setGrade] = useState<SecondaryGrade>(currentUser?.assignedGrades?.[0] || 'Grade 10');
  const [targetSections, setTargetSections] = useState<string[]>([GRADE_SECTIONS_MAP['Grade 10'][0]]);
  const [description, setDescription] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState('10:00');

  // Pre-flight camera/mic preview test
  const [testVideo, setTestVideo] = useState(true);
  const [testAudio, setTestAudio] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize preview stream when modal opens
  useEffect(() => {
    if (!isOpen) {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
        setPreviewStream(null);
      }
      return;
    }

    let stream: MediaStream | null = null;
    async function startPreview() {
      try {
        setMediaWarning(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setPreviewStream(stream);
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        setMediaWarning(
          'Webcam or microphone could not be previewed. You can still launch the classroom and configure media permissions in-session.'
        );
      }
    }

    startPreview();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  // Update track enabled on preview toggles
  useEffect(() => {
    if (previewStream) {
      previewStream.getVideoTracks().forEach((t) => {
        t.enabled = testVideo;
      });
      previewStream.getAudioTracks().forEach((t) => {
        t.enabled = testAudio;
      });
    }
  }, [testVideo, testAudio, previewStream]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Stop pre-flight preview stream before entering classroom
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    }

    const newLesson = await createLiveLesson({
      title: title.trim(),
      subject,
      grade,
      targetSections,
      description: description.trim(),
      scheduledDate,
      scheduledStartTime: scheduledTime,
      status: isScheduled ? 'scheduled' : 'live',
      startedAt: isScheduled ? undefined : new Date().toISOString(),
    });

    if (onStartClass) onStartClass(newLesson);
    if (onClassStarted) onClassStarted(newLesson);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Setup Live Learning Classroom</h2>
              <p className="text-[11px] text-slate-400">SCHOOL FOR EXCELLENCE SECONDARY SCHOOL • Faculty Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {mediaWarning && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs">
              {mediaWarning}
            </div>
          )}

          {/* Lesson Title */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Live Lesson Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grade 10 Physics: Newton's Laws & Force Vectors"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Grade & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Target Secondary Grade</label>
              <select
                value={grade}
                onChange={(e) => {
                  const g = e.target.value as SecondaryGrade;
                  setGrade(g);
                  setTargetSections([GRADE_SECTIONS_MAP[g][0]]);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              >
                {SECONDARY_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Academic Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              >
                {SECONDARY_SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Allowed Class Sections */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Permitted Class Sections</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTargetSections(['All'])}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                  targetSections.includes('All')
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                All Sections of {grade}
              </button>
              {GRADE_SECTIONS_MAP[grade].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => {
                    if (targetSections.includes('All')) {
                      setTargetSections([sec]);
                    } else if (targetSections.includes(sec)) {
                      if (targetSections.length > 1) {
                        setTargetSections(targetSections.filter((s) => s !== sec));
                      }
                    } else {
                      setTargetSections([...targetSections, sec]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                    targetSections.includes(sec) && !targetSections.includes('All')
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Lesson Objectives / Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline topics, slide references, textbook chapters, or student materials needed..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          {/* Schedule vs Start Immediately */}
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-2">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="schedule_choice"
                  checked={!isScheduled}
                  onChange={() => setIsScheduled(false)}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="font-bold text-slate-200">Start Live Class Immediately</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="schedule_choice"
                  checked={isScheduled}
                  onChange={() => setIsScheduled(true)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-bold text-slate-200">Schedule for Later</span>
              </label>
            </div>

            {isScheduled && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Lesson Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pre-flight Camera & Microphone Test */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Pre-Flight Camera & Microphone Test
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTestAudio(!testAudio)}
                  className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    testAudio ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {testAudio ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span>{testAudio ? 'Mic Ready' : 'Mic Off'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTestVideo(!testVideo)}
                  className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    testVideo ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {testVideo ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  <span>{testVideo ? 'Cam Ready' : 'Cam Off'}</span>
                </button>
              </div>
            </div>

            {/* Video Preview Box */}
            <div className="h-32 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center relative">
              {testVideo && previewStream ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-slate-500 text-xs flex flex-col items-center gap-1">
                  <VideoOff className="w-5 h-5 text-slate-600" />
                  <span>Camera preview disabled</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] text-slate-300 font-mono">
                Hardware check OK
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer"
            >
              {isScheduled ? <Calendar className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isScheduled ? 'Schedule Live Class' : 'Start Live Class Now'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
