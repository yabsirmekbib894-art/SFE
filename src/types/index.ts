export type UserRole = 'super_admin' | 'director' | 'teacher' | 'student' | 'admin';

export type SecondaryGrade = 'Grade 9' | 'Grade 10' | 'Grade 11' | 'Grade 12';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  grade?: SecondaryGrade; // e.g. "Grade 9", "Grade 10", "Grade 11", "Grade 12"
  section?: string; // e.g. "Section 9A", "Section 10A", "11-Natural A", "12-Social B"
  studentId?: string; // e.g. "SEC-2026-901"
  assignedGrades?: SecondaryGrade[]; // for teachers/directors e.g. ["Grade 10", "Grade 11"]
  assignedSections?: string[]; // for teachers e.g. ["Section 10A", "11-Natural A"]
  assignedSubjects?: string[]; // for teachers e.g. ["Mathematics", "Physics"]
  status: 'active' | 'suspended' | 'pending' | 'inactive';
  registrationStatus?: 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  temporaryPassword?: string;
  mustChangePassword?: boolean;
  phone?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  targetType: 'user' | 'exam' | 'submission' | 'system' | 'school';
  targetId?: string;
  details: string;
}

export interface SchoolSettings {
  schoolName: string;
  applicationName: string;
  motto: string;
  academicYear: string;
  directorName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  requireStudentApproval: boolean;
  allowStudentRegistration: boolean;
  updatedAt: string;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface QuestionOption {
  id: string; // e.g. "opt_A", "opt_B", "opt_C", "opt_D"
  label: string; // e.g. "A", "B", "C", "D"
  text: string; // e.g. "Mitochondria"
}

export interface Question {
  id: string;
  questionNumber: number;
  type: QuestionType;
  questionText: string;
  options?: QuestionOption[]; // Stable options with unique IDs
  correctAnswer: string; // Option ID for MC (e.g. "opt_A"), "True"/"False" for TF, or grading rubric for short answer
  marks: number;
  explanation?: string;
}

export type ExamStatus = 'draft' | 'scheduled' | 'published' | 'closed' | 'completed' | 'archived';

export interface Exam {
  id: string;
  title: string;
  subject: string;
  grade: SecondaryGrade;
  targetSections: string[]; // e.g. ["Section 10A", "Section 10B"] or ["All"]
  teacherId: string;
  teacherName: string;
  durationMinutes: number;
  totalMarks: number;
  instructions: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  deadline: string; // YYYY-MM-DDTHH:mm:ss
  status: ExamStatus;
  publishedAt?: string;
  resultsReleased: boolean;
  questionsCount?: number;
  questions?: Question[];
  createdAt: string;
  updatedAt: string;
}

export type LiveLessonStatus = 'scheduled' | 'live' | 'ended';

export interface LiveLesson {
  id: string;
  title: string;
  subject: string;
  grade: SecondaryGrade;
  targetSections: string[]; // e.g. ["Section 10A"] or ["All"]
  teacherId: string;
  teacherName: string;
  description: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledStartTime: string; // HH:mm
  status: LiveLessonStatus;
  startedAt?: string;
  endedAt?: string;
  section?: string;
  attendanceCount: number;
  activeParticipantIds?: string[];
  participants?: ClassroomParticipant[];
  chatEnabled: boolean;
  announcements?: {
    id: string;
    text: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface LiveChatMessage {
  id: string;
  lessonId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  isQuestion: boolean;
  isAnswered?: boolean;
  answeredAt?: string;
  timestamp: string;
}

export interface RaisedHandRequest {
  id: string;
  lessonId: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'declined' | 'lowered';
}

export interface ClassroomParticipant {
  userId: string;
  name: string;
  role: UserRole;
  grade?: string;
  section?: string;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
  screenStreamId?: string;
  cameraStreamId?: string;
  cameraTrackId?: string;
  screenTrackId?: string;
  canSpeak: boolean; // True if approved by teacher
  hasHandRaised: boolean;
  joinedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string; // Specific user or 'all_students' or 'grade:Grade 10'
  title: string;
  message: string;
  type: 'registration_approved' | 'registration_rejected' | 'exam_published' | 'live_lesson_started' | 'speaking_granted' | 'announcement';
  read: boolean;
  link?: string;
  timestamp: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  examTitle: string;
  subject: string;
  studentId: string;
  studentName: string;
  grade: SecondaryGrade;
  section: string;
  startedAt: string;
  submittedAt?: string;
  answers: Record<string, string>; // questionId -> selectedOptionId or text
  score: number; // total earned marks
  objectiveScore: number;
  manualScore: number;
  totalPossible: number;
  status: 'in_progress' | 'submitted' | 'graded';
  isAutoSubmitted?: boolean;
  itemEvaluations?: Record<string, {
    earned: number;
    possible: number;
    isCorrect?: boolean | null;
    teacherNotes?: string;
  }>;
  teacherFeedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const SECONDARY_GRADES: SecondaryGrade[] = [
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

export const SECONDARY_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English Language',
  'History',
  'Geography',
  'Civics & Ethical Education',
  'Economics',
  'Information Technology (IT)',
];

export const GRADE_SECTIONS_MAP: Record<SecondaryGrade, string[]> = {
  'Grade 9': ['Section 9A', 'Section 9B', 'Section 9C', 'Section 9D'],
  'Grade 10': ['Section 10A', 'Section 10B', 'Section 10C', 'Section 10D'],
  'Grade 11': ['11-Natural A', '11-Natural B', '11-Social A', '11-Social B'],
  'Grade 12': ['12-Natural A', '12-Natural B', '12-Social A', '12-Social B'],
};
