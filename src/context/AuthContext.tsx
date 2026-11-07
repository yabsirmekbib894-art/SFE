import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  updatePassword as firebaseUpdatePassword,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase.ts';
import { 
  UserProfile, 
  UserRole, 
  Exam, 
  ExamSubmission, 
  Question, 
  SecondaryGrade,
  SchoolSettings,
  AuditLog,
  LiveLesson,
  LiveLessonStatus,
  AppNotification
} from '../types/index.ts';
import { 
  DEFAULT_ADMIN, 
  DEFAULT_DIRECTOR, 
  DEFAULT_SCHOOL_SETTINGS, 
  INITIAL_AUDIT_LOGS 
} from '../data/demoData.ts';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  refreshData: () => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  language: 'en' | 'am';
  setLanguage: (lang: 'en' | 'am') => void;
  allUsers: UserProfile[];
  allExams: Exam[];
  allSubmissions: ExamSubmission[];
  auditLogs: AuditLog[];
  schoolSettings: SchoolSettings;
  updateSchoolSettings: (settings: Partial<SchoolSettings>) => Promise<void>;
  addAuditLog: (
    action: string, 
    targetType: AuditLog['targetType'], 
    details: string, 
    targetId?: string
  ) => Promise<void>;
  // Portal authentication
  loginPortal: (
    portalRole: UserRole, 
    identifier: string, 
    pass: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  changePassword: (newPass: string) => Promise<{ success: boolean; message?: string }>;
  // Student self-registration & approval
  registerStudentOnline: (data: {
    name: string;
    username: string;
    email: string;
    grade: SecondaryGrade;
    section: string;
    studentId: string;
    password: string;
  }) => Promise<{ success: boolean; message: string }>;
  approveStudentRegistration: (
    userId: string, 
    approve: boolean, 
    rejectionReason?: string
  ) => Promise<void>;
  // Teacher self-registration, approval & activation
  registerTeacherOnline: (data: {
    name: string;
    username: string;
    email: string;
    phone?: string;
    assignedSubjects: string[];
    assignedGrades: SecondaryGrade[];
    assignedSections: string[];
    password: string;
  }) => Promise<{ success: boolean; message: string }>;
  approveTeacherRegistration: (
    userId: string,
    approve: boolean,
    rejectionReason?: string
  ) => Promise<void>;
  toggleTeacherActivation: (userId: string) => Promise<void>;
  // Super Admin operations
  registerDirector: (data: {
    name: string;
    username: string;
    email: string;
    phone?: string;
    temporaryPassword?: string;
  }) => Promise<UserProfile>;
  // School user operations
  registerStudent: (data: {
    name: string;
    username: string;
    email?: string;
    grade: SecondaryGrade;
    section: string;
    studentId?: string;
    temporaryPassword?: string;
  }) => Promise<UserProfile>;
  registerTeacher: (data: {
    name: string;
    username: string;
    email?: string;
    assignedGrades: SecondaryGrade[];
    assignedSections: string[];
    assignedSubjects: string[];
    temporaryPassword?: string;
  }) => Promise<UserProfile>;
  updateUser: (userId: string, data: Partial<UserProfile>) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;
  resetUserPassword: (userId: string) => Promise<string>;
  bulkImportStudents: (students: any[]) => Promise<number>;
  seedInitialSchoolSetup: () => Promise<void>;
  // Teacher exam operations
  saveExam: (exam: Exam, questions: Question[]) => Promise<Exam>;
  getExamWithAnswerKey: (examId: string) => Promise<{ exam: Exam; questions: Question[] } | null>;
  publishExam: (examId: string) => Promise<void>;
  toggleResultsRelease: (examId: string) => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;
  saveManualGrading: (submissionId: string, manualScore: number, feedback: string) => Promise<void>;
  // Student operations
  submitExamAnswers: (
    examId: string, 
    answers: Record<string, string>, 
    isAuto: boolean
  ) => Promise<ExamSubmission>;
  // Live Learning & Video Classroom
  liveLessons: LiveLesson[];
  activeLiveLesson: LiveLesson | null;
  setActiveLiveLesson: (lesson: LiveLesson | null) => void;
  fetchLiveLessons: () => Promise<void>;
  createLiveLesson: (data: Partial<LiveLesson>) => Promise<LiveLesson>;
  updateLiveLessonStatus: (id: string, status: LiveLessonStatus) => Promise<void>;
  // In-app Notifications
  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
}

const DEFAULT_INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_welcome',
    userId: 'all_students',
    title: 'SCHOOL FOR EXCELLENCE SECONDARY SCHOOL',
    message: 'Welcome to the Smart Exam & Live Learning System for Grades 9, 10, 11, and 12.',
    type: 'announcement',
    read: false,
    timestamp: new Date().toISOString(),
  },
  {
    id: 'notif_live_math',
    userId: 'grade:Grade 10',
    title: 'Live Lesson: Mathematics (Quadratic Functions)',
    message: 'Mr. Kassahun Tadesse scheduled a Live Learning class for Grade 10 on Quadratic Modeling.',
    type: 'live_lesson_started',
    read: false,
    timestamp: new Date().toISOString(),
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'en' | 'am'>('en');

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<ExamSubmission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
  const [liveLessons, setLiveLessons] = useState<LiveLesson[]>([]);
  const [activeLiveLesson, setActiveLiveLesson] = useState<LiveLesson | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(DEFAULT_INITIAL_NOTIFICATIONS);

  // Initialize theme from storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('smartexam_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    const savedSettings = localStorage.getItem('smartexam_school_settings');
    if (savedSettings) {
      try { setSchoolSettings(JSON.parse(savedSettings)); } catch {}
    }

    const savedLogs = localStorage.getItem('smartexam_audit_logs');
    if (savedLogs) {
      try { setAuditLogs(JSON.parse(savedLogs)); } catch {}
    }
  }, []);

  const handleSetTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('smartexam_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Direct manual and initial database synchronization
  const refreshData = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const [usersSnap, examsSnap, subsSnap, auditSnap, settingsDoc] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'exams')),
        getDocs(collection(db, 'submissions')),
        getDocs(collection(db, 'auditLogs')),
        getDoc(doc(db, 'schoolSettings', 'config')),
      ]);

      const loadedUsers: UserProfile[] = [];
      usersSnap.forEach((d) => loadedUsers.push(d.data() as UserProfile));

      // Ensure default super admin and default director exist
      if (!loadedUsers.some((u) => u.username === 'sfe' || u.role === 'super_admin' || u.role === 'admin')) {
        loadedUsers.push(DEFAULT_ADMIN);
        try { await setDoc(doc(db, 'users', DEFAULT_ADMIN.id), DEFAULT_ADMIN); } catch {}
      }
      if (!loadedUsers.some((u) => u.role === 'director' || u.username === 'director.abebe')) {
        loadedUsers.push(DEFAULT_DIRECTOR);
        try { await setDoc(doc(db, 'users', DEFAULT_DIRECTOR.id), DEFAULT_DIRECTOR); } catch {}
      }
      setAllUsers(loadedUsers);
      localStorage.setItem('smartexam_real_users', JSON.stringify(loadedUsers));

      const loadedExams: Exam[] = [];
      examsSnap.forEach((d) => loadedExams.push(d.data() as Exam));
      setAllExams(loadedExams);
      localStorage.setItem('smartexam_real_exams', JSON.stringify(loadedExams));

      const loadedSubs: ExamSubmission[] = [];
      subsSnap.forEach((d) => loadedSubs.push(d.data() as ExamSubmission));
      setAllSubmissions(loadedSubs);
      localStorage.setItem('smartexam_real_subs', JSON.stringify(loadedSubs));

      const loadedLogs: AuditLog[] = [];
      auditSnap.forEach((d) => loadedLogs.push(d.data() as AuditLog));
      loadedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (loadedLogs.length > 0) {
        setAuditLogs(loadedLogs);
        localStorage.setItem('smartexam_audit_logs', JSON.stringify(loadedLogs));
      }

      if (settingsDoc.exists()) {
        const s = settingsDoc.data() as SchoolSettings;
        setSchoolSettings(s);
        localStorage.setItem('smartexam_school_settings', JSON.stringify(s));
      }

      await fetchLiveLessons();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncedAt(timeStr);
      setSyncError(null);
    } catch (err: any) {
      console.warn('refreshData error:', err);
      setSyncError(err?.message || 'Database sync encountered an issue.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Real-time Firestore sync & initial bootstrap
  useEffect(() => {
    // 1. LocalStorage cached real records
    const savedUsers = localStorage.getItem('smartexam_real_users');
    const savedExams = localStorage.getItem('smartexam_real_exams');
    const savedSubs = localStorage.getItem('smartexam_real_subs');

    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        const migrated = parsed.map((u: UserProfile) => {
          if (u.role === 'admin' || u.role === 'super_admin') {
            return { ...u, username: 'sfe', name: 'Super Administrator', email: 'sfe@smartexam.edu', temporaryPassword: 'sfe2027', role: 'super_admin' };
          }
          return u;
        });

        // Ensure default director is present
        if (!migrated.some((u: UserProfile) => u.role === 'director')) {
          migrated.push(DEFAULT_DIRECTOR);
        }

        setAllUsers(migrated);
      } catch {}
    } else {
      // Initialize with default super admin and default director
      setAllUsers([DEFAULT_ADMIN, DEFAULT_DIRECTOR]);
    }

    if (savedExams) {
      try { setAllExams(JSON.parse(savedExams)); } catch {}
    }
    if (savedSubs) {
      try { setAllSubmissions(JSON.parse(savedSubs)); } catch {}
    }

    // Restore active session user
    const lastSessionUserId = localStorage.getItem('smartexam_active_user_id');
    if (lastSessionUserId) {
      const activeList = savedUsers ? JSON.parse(savedUsers) : [DEFAULT_ADMIN, DEFAULT_DIRECTOR];
      const found = activeList.find((u: UserProfile) => u.id === lastSessionUserId);
      if (found) {
        if (found.role === 'admin' || found.role === 'super_admin') {
          found.username = 'sfe';
          found.name = 'Super Administrator';
          found.role = 'super_admin';
        }
        setCurrentUser(found);
      }
    }

    // 2. Firebase Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const profile = userDoc.data() as UserProfile;
            if (profile.role === 'admin' || profile.role === 'super_admin') {
              profile.username = 'sfe';
              profile.name = 'Super Administrator';
              profile.role = 'super_admin';
            }
            setCurrentUser(profile);
          } else if (fbUser.email === 'yabsirmekbib894@gmail.com') {
            const adminProfile: UserProfile = {
              id: fbUser.uid,
              username: 'sfe',
              name: 'Super Administrator',
              email: fbUser.email,
              role: 'super_admin',
              status: 'active',
              temporaryPassword: 'sfe2027',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            try {
              await setDoc(doc(db, 'users', fbUser.uid), adminProfile);
            } catch {}
            setCurrentUser(adminProfile);
          }
        } catch (e) {
          console.warn('Firestore user fetch:', e);
        }
      }
      setLoading(false);
    });

    // 3. Firestore snapshot listeners for live real database records
    try {
      const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const loaded: UserProfile[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as UserProfile));

        // Ensure DEFAULT_ADMIN and DEFAULT_DIRECTOR exist in real database
        if (!loaded.some((u) => u.username === 'sfe' || u.role === 'super_admin' || u.role === 'admin')) {
          loaded.push(DEFAULT_ADMIN);
          setDoc(doc(db, 'users', DEFAULT_ADMIN.id), DEFAULT_ADMIN).catch(() => {});
        }
        if (!loaded.some((u) => u.role === 'director' || u.username === 'director.abebe')) {
          loaded.push(DEFAULT_DIRECTOR);
          setDoc(doc(db, 'users', DEFAULT_DIRECTOR.id), DEFAULT_DIRECTOR).catch(() => {});
        }

        setAllUsers(loaded);
        localStorage.setItem('smartexam_real_users', JSON.stringify(loaded));
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncedAt(timeStr);
        setSyncError(null);
      }, (err) => {
        console.warn('Users listener fallback to cache:', err.message);
        setSyncError('Live database connection paused. Click "Sync with Database" to refresh.');
      });

      const unsubExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Exam[] = [];
          snapshot.forEach((d) => loaded.push(d.data() as Exam));
          setAllExams(loaded);
          localStorage.setItem('smartexam_real_exams', JSON.stringify(loaded));
        }
      }, (err) => console.warn('Exams listener fallback to cache:', err.message));

      const unsubSubs = onSnapshot(collection(db, 'submissions'), (snapshot) => {
        if (!snapshot.empty) {
          const loaded: ExamSubmission[] = [];
          snapshot.forEach((d) => loaded.push(d.data() as ExamSubmission));
          setAllSubmissions(loaded);
          localStorage.setItem('smartexam_real_subs', JSON.stringify(loaded));
        }
      }, (err) => console.warn('Submissions listener fallback to cache:', err.message));

      const unsubSettings = onSnapshot(doc(db, 'schoolSettings', 'config'), (snap) => {
        if (snap.exists()) {
          const s = snap.data() as SchoolSettings;
          setSchoolSettings(s);
          localStorage.setItem('smartexam_school_settings', JSON.stringify(s));
        }
      }, (err) => console.warn('Settings listener fallback to cache:', err.message));

      const unsubAudit = onSnapshot(collection(db, 'auditLogs'), (snapshot) => {
        if (!snapshot.empty) {
          const logs: AuditLog[] = [];
          snapshot.forEach((d) => logs.push(d.data() as AuditLog));
          logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAuditLogs(logs);
          localStorage.setItem('smartexam_audit_logs', JSON.stringify(logs));
        }
      }, (err) => console.warn('Audit logs listener fallback to cache:', err.message));

      return () => {
        unsubscribeAuth();
        unsubUsers();
        unsubExams();
        unsubSubs();
        unsubSettings();
        unsubAudit();
      };
    } catch {
      setLoading(false);
      return () => unsubscribeAuth();
    }
  }, []);

  // Update persistent cache on state changes
  useEffect(() => {
    if (allUsers.length > 0) {
      localStorage.setItem('smartexam_real_users', JSON.stringify(allUsers));
    }
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem('smartexam_real_exams', JSON.stringify(allExams));
  }, [allExams]);

  useEffect(() => {
    localStorage.setItem('smartexam_real_subs', JSON.stringify(allSubmissions));
  }, [allSubmissions]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('smartexam_active_user_id', currentUser.id);
    } else {
      localStorage.removeItem('smartexam_active_user_id');
    }
  }, [currentUser]);

  // Generate secure temporary password
  const generateTempPassword = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const nums = '23456789';
    let code = 'Sec@';
    for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
    code += '-';
    for (let i = 0; i < 3; i++) code += nums.charAt(Math.floor(Math.random() * nums.length));
    return code;
  };

  // Add audit log helper
  const addAuditLog = async (
    action: string, 
    targetType: AuditLog['targetType'], 
    details: string, 
    targetId?: string
  ) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      action,
      actorId: currentUser?.id || 'system',
      actorName: currentUser?.name || 'System Actor',
      actorRole: currentUser?.role || 'student',
      targetType,
      targetId,
      details,
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    localStorage.setItem('smartexam_audit_logs', JSON.stringify([newLog, ...auditLogs].slice(0, 200)));

    try {
      await setDoc(doc(db, 'auditLogs', newLog.id), newLog);
    } catch (e) {
      console.warn('Audit log write fallback:', e);
    }
  };

  // Update school settings
  const updateSchoolSettings = async (settings: Partial<SchoolSettings>) => {
    const updated = {
      ...schoolSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    setSchoolSettings(updated);
    localStorage.setItem('smartexam_school_settings', JSON.stringify(updated));
    try {
      await setDoc(doc(db, 'schoolSettings', 'config'), updated);
    } catch (e) {
      console.warn('Firestore settings write fallback:', e);
    }
    await addAuditLog('UPDATE_SCHOOL_SETTINGS', 'school', `Updated school configuration: ${updated.schoolName}`);
  };

  // Separate Portal Authentication with strict role boundaries
  const loginPortal = async (
    portalRole: UserRole, 
    identifier: string, 
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanId = identifier.trim().toLowerCase();

    // Find user in real database by username, studentId, or email (or name)
    let user = allUsers.find(
      (u) =>
        u.username.toLowerCase() === cleanId ||
        u.name.toLowerCase() === cleanId ||
        (u.studentId && u.studentId.toLowerCase() === cleanId) ||
        u.email.toLowerCase() === cleanId
    );

    // Fallback guarantee for default super admin and default director
    if (!user && (portalRole === 'admin' || portalRole === 'super_admin') && (cleanId === 'shcool' || cleanId === 'sfe' || cleanId === 'sfe@smartexam.edu' || cleanId === 'admin')) {
      user = DEFAULT_ADMIN;
    }
    if (!user && portalRole === 'director' && (cleanId === 'di1996t' || cleanId === 'director' || cleanId === 'director.abebe' || cleanId === 'director@excellence.edu.et')) {
      user = DEFAULT_DIRECTOR;
    }

    if (!user) {
      return { 
        success: false, 
        message: 'Account not found. Please verify your credentials or contact the school administration.' 
      };
    }

    // Role-based portal separation enforcement
    const isTargetAdmin = portalRole === 'super_admin' || portalRole === 'admin';
    const isUserAdmin = user.role === 'super_admin' || user.role === 'admin';

    if (isTargetAdmin) {
      if (!isUserAdmin) {
        return { 
          success: false, 
          message: 'Access Denied: Only authorized Super Administrators can enter the Administrator Control Portal.' 
        };
      }
    } else if (portalRole === 'director') {
      if (user.role !== 'director' && !isUserAdmin) {
        return { 
          success: false, 
          message: 'Access Denied: This portal is strictly reserved for the School Director.' 
        };
      }
    } else if (portalRole === 'teacher') {
      if (user.role !== 'teacher') {
        return { 
          success: false, 
          message: 'Access Denied: This is the Teacher Portal. Students and Directors must use their designated portals.' 
        };
      }
    } else if (portalRole === 'student') {
      if (user.role !== 'student') {
        return { 
          success: false, 
          message: 'Access Denied: Staff members cannot sign in through the Student Examination Portal.' 
        };
      }
    }

    // Check account status
    if (user.status === 'suspended') {
      return { 
        success: false, 
        message: 'Your account has been suspended by the school administration. Please consult the Director.' 
      };
    }

    if (user.status === 'inactive') {
      return {
        success: false,
        message: 'Your account has been deactivated by the school administration. Please consult the School Director.',
      };
    }

    if (user.role === 'student' && (user.registrationStatus === 'pending_approval' || user.status === 'pending')) {
      return {
        success: false,
        message: 'Your student account is pending approval by the School Director. You will be able to sign in once authorized.',
      };
    }

    if (user.role === 'student' && user.registrationStatus === 'rejected') {
      return {
        success: false,
        message: `Your student registration was not approved by the School Director.${user.rejectionReason ? ` Note: ${user.rejectionReason}` : ' Please consult the school office.'}`,
      };
    }

    if (user.role === 'teacher' && (user.registrationStatus === 'pending_approval' || user.status === 'pending')) {
      return {
        success: false,
        message: 'Your teacher registration application is pending review and authorization by the School Director. You will be able to access the Teacher Portal once authorized.',
      };
    }

    if (user.role === 'teacher' && user.registrationStatus === 'rejected') {
      return {
        success: false,
        message: `Your teacher registration application was not approved by the School Director.${user.rejectionReason ? ` Reason: ${user.rejectionReason}` : ' Please consult the school administration.'}`,
      };
    }

    // Password validation: Check Firebase Auth, stored temporary password, or role default
    let passwordMatches = false;

    try {
      await signInWithEmailAndPassword(auth, user.email, pass);
      passwordMatches = true;
    } catch {
      if (user.temporaryPassword && user.temporaryPassword === pass) {
        passwordMatches = true;
      } else if (isUserAdmin && (pass === '1996' || pass === 'sfe2027' || pass === 'Admin@2026')) {
        passwordMatches = true;
      } else if (user.role === 'director' && (pass === 'd2017t' || pass === 'Director@2026' || pass === 'director2026')) {
        passwordMatches = true;
      } else if (user.role === 'teacher' && pass === 'Teacher@2026') {
        passwordMatches = true;
      } else if (user.role === 'student' && pass === 'Student@2026') {
        passwordMatches = true;
      }
    }

    if (!passwordMatches) {
      return { 
        success: false, 
        message: 'Incorrect password. Please verify your credentials or use your school-issued temporary password.' 
      };
    }

    // Sync custom claims with server if auth session exists
    try {
      const fbToken = await auth.currentUser?.getIdToken();
      if (fbToken) {
        await fetch('/api/auth/sync-claims', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${fbToken}`,
          },
        });
      }
    } catch (claimErr) {
      console.warn('Claims sync notice:', claimErr);
    }

    const updatedUser = { ...user, lastLogin: new Date().toISOString() };
    setCurrentUser(updatedUser);
    await addAuditLog('USER_SIGN_IN', 'user', `Successful portal sign-in by ${updatedUser.name} (${updatedUser.role})`, updatedUser.id);
    return { success: true };
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
    if (currentUser) {
      await addAuditLog('USER_SIGN_OUT', 'user', `User signed out: ${currentUser.name}`, currentUser.id);
    }
    setCurrentUser(null);
  };

  const changePassword = async (newPass: string): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'No active session' };
    if (newPass.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long' };
    }

    if (firebaseUser) {
      try {
        await firebaseUpdatePassword(firebaseUser, newPass);
      } catch (e: any) {
        console.warn('Firebase auth password update:', e);
      }
    }

    // Update in local state and Firestore
    const updated = {
      ...currentUser,
      temporaryPassword: '',
      mustChangePassword: false,
      updatedAt: new Date().toISOString(),
    };

    setCurrentUser(updated);
    setAllUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));

    try {
      await updateDoc(doc(db, 'users', currentUser.id), {
        temporaryPassword: '',
        mustChangePassword: false,
        updatedAt: new Date().toISOString(),
      });
    } catch {}

    return { success: true, message: 'Password updated securely.' };
  };

  // Administrator: Register Student (Grades 9-12)
  const registerStudent = async (data: {
    name: string;
    username: string;
    email?: string;
    grade: SecondaryGrade;
    section: string;
    studentId?: string;
    temporaryPassword?: string;
  }): Promise<UserProfile> => {
    const studentId = data.studentId || `SEC-${data.grade.replace('Grade ', '')}-${Math.floor(100 + Math.random() * 900)}`;
    const tempPass = data.temporaryPassword || generateTempPassword();
    const cleanUsername = data.username.toLowerCase().trim();
    const id = `student_${cleanUsername}_${Date.now()}`;

    const newStudent: UserProfile = {
      id,
      name: data.name.trim(),
      username: cleanUsername,
      email: data.email || `${cleanUsername}@secondary.smartexam.edu`,
      role: 'student',
      grade: data.grade,
      section: data.section,
      studentId,
      status: 'active',
      temporaryPassword: tempPass,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAllUsers((prev) => [newStudent, ...prev]);

    try {
      await setDoc(doc(db, 'users', id), newStudent);
    } catch (e) {
      console.warn('Firestore student write:', e);
    }

    return newStudent;
  };

  // Administrator: Register Teacher
  const registerTeacher = async (data: {
    name: string;
    username: string;
    email?: string;
    assignedGrades: SecondaryGrade[];
    assignedSections: string[];
    assignedSubjects: string[];
    temporaryPassword?: string;
  }): Promise<UserProfile> => {
    const tempPass = data.temporaryPassword || generateTempPassword();
    const cleanUsername = data.username.toLowerCase().trim();
    const id = `teacher_${cleanUsername}_${Date.now()}`;

    const newTeacher: UserProfile = {
      id,
      name: data.name.trim(),
      username: cleanUsername,
      email: data.email || `${cleanUsername}@secondary.smartexam.edu`,
      role: 'teacher',
      assignedGrades: data.assignedGrades,
      assignedSections: data.assignedSections,
      assignedSubjects: data.assignedSubjects,
      status: 'active',
      temporaryPassword: tempPass,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAllUsers((prev) => [newTeacher, ...prev]);

    try {
      await setDoc(doc(db, 'users', id), newTeacher);
    } catch (e) {
      console.warn('Firestore teacher write:', e);
    }

    await addAuditLog('REGISTER_TEACHER', 'user', `Teacher registered: ${newTeacher.name} (@${newTeacher.username})`, id);
    return newTeacher;
  };

  // Super Admin: Register & Provision School Director
  const registerDirector = async (data: {
    name: string;
    username: string;
    email: string;
    phone?: string;
    temporaryPassword?: string;
  }): Promise<UserProfile> => {
    const tempPass = data.temporaryPassword || 'Director@2026';
    const cleanUsername = data.username.toLowerCase().trim();
    const id = `director_${cleanUsername}_${Date.now()}`;

    const newDirector: UserProfile = {
      id,
      name: data.name.trim(),
      username: cleanUsername,
      email: data.email.trim().toLowerCase(),
      role: 'director',
      phone: data.phone,
      status: 'active',
      temporaryPassword: tempPass,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAllUsers((prev) => [newDirector, ...prev]);

    try {
      await setDoc(doc(db, 'users', id), newDirector);
    } catch (e) {
      console.warn('Firestore director write:', e);
    }

    await addAuditLog(
      'PROVISION_DIRECTOR', 
      'user', 
      `Provisioned School Director account: ${newDirector.name} (@${newDirector.username})`, 
      id
    );

    return newDirector;
  };

  // Student Online Self-Registration
  const registerStudentOnline = async (data: {
    name: string;
    username: string;
    email: string;
    grade: SecondaryGrade;
    section: string;
    studentId: string;
    password: string;
  }): Promise<{ success: boolean; message: string }> => {
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanStudentId = data.studentId.trim().toUpperCase();
    const cleanEmail = data.email.trim().toLowerCase();

    // Check uniqueness
    const existsUsername = allUsers.some((u) => u.username.toLowerCase() === cleanUsername);
    if (existsUsername) {
      return { success: false, message: 'This username is already taken by another account.' };
    }

    const existsStudentId = allUsers.some((u) => u.studentId && u.studentId.toUpperCase() === cleanStudentId);
    if (existsStudentId) {
      return { success: false, message: 'This Student ID is already registered in the school database.' };
    }

    const existsEmail = allUsers.some((u) => u.email.toLowerCase() === cleanEmail);
    if (existsEmail) {
      return { success: false, message: 'This email address is already associated with an account.' };
    }

    const isPending = schoolSettings.requireStudentApproval;
    const id = `student_${cleanUsername}_${Date.now()}`;

    const newStudent: UserProfile = {
      id,
      name: data.name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      role: 'student', // Strictly enforced student role - cannot self-promote
      grade: data.grade,
      section: data.section,
      studentId: cleanStudentId,
      status: isPending ? 'pending' : 'active',
      registrationStatus: isPending ? 'pending_approval' : 'approved',
      temporaryPassword: data.password,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAllUsers((prev) => [newStudent, ...prev]);

    try {
      await setDoc(doc(db, 'users', id), newStudent);
    } catch (e) {
      console.warn('Firestore student self-reg write:', e);
    }

    await addAuditLog(
      'STUDENT_ONLINE_REGISTRATION', 
      'user', 
      `Candidate registered: ${newStudent.name} (${newStudent.studentId}, ${newStudent.grade} ${newStudent.section})${isPending ? ' - Pending Director approval' : ''}`, 
      id
    );

    // Notify Director of new registration request
    await addNotification({
      userId: 'role:director',
      title: 'New Student Registration Request',
      message: `${newStudent.name} (${newStudent.studentId}, ${newStudent.grade} ${newStudent.section}) submitted an online registration. Review under Student Registration Requests.`,
      type: 'announcement',
      link: '/director/dashboard',
    });

    return { 
      success: true, 
      message: isPending 
        ? 'Registration submitted successfully! Your account is pending review by the School Director. You will be able to log in once approved.' 
        : 'Registration successful! You can now log in to the Student Examination Portal.' 
    };
  };

  // Director / Super Admin: Approve or Reject Student Registration
  const approveStudentRegistration = async (
    userId: string, 
    approve: boolean, 
    rejectionReason?: string
  ) => {
    const target = allUsers.find((u) => u.id === userId);
    if (!target) return;

    const updatedData: Partial<UserProfile> = approve
      ? {
          status: 'active',
          registrationStatus: 'approved',
          approvedBy: currentUser?.name || 'School Director',
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : {
          status: 'suspended',
          registrationStatus: 'rejected',
          rejectionReason: rejectionReason || 'Registration details could not be verified by School Director',
          updatedAt: new Date().toISOString(),
        };

    setAllUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updatedData } : u)));

    try {
      await updateDoc(doc(db, 'users', userId), updatedData);
    } catch {}

    await addAuditLog(
      approve ? 'APPROVE_STUDENT_REGISTRATION' : 'REJECT_STUDENT_REGISTRATION',
      'user',
      `${approve ? 'Approved' : 'Rejected'} candidate registration for ${target.name} (${target.studentId})`,
      userId
    );

    // Notify candidate
    if (approve) {
      await addNotification({
        userId: target.id,
        title: 'Registration Approved!',
        message: 'Your registration at SCHOOL FOR EXCELLENCE SECONDARY SCHOOL has been approved by the School Director. You can now access your dashboard and examinations.',
        type: 'registration_approved',
        link: '/student/login',
      });
    } else {
      await addNotification({
        userId: target.id,
        title: 'Registration Update',
        message: `Your registration request was not approved. Reason: ${rejectionReason || 'Credentials could not be verified by School Director.'}`,
        type: 'registration_rejected',
        link: '/student/login',
      });
    }
  };

  // Teacher Online Self-Registration
  const registerTeacherOnline = async (data: {
    name: string;
    username: string;
    email: string;
    phone?: string;
    assignedSubjects: string[];
    assignedGrades: SecondaryGrade[];
    assignedSections: string[];
    password: string;
  }): Promise<{ success: boolean; message: string }> => {
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanEmail = data.email.trim().toLowerCase();

    // Check uniqueness
    const existsUsername = allUsers.some((u) => u.username.toLowerCase() === cleanUsername);
    if (existsUsername) {
      return { success: false, message: 'This username is already taken by another account.' };
    }

    const existsEmail = allUsers.some((u) => u.email.toLowerCase() === cleanEmail);
    if (existsEmail) {
      return { success: false, message: 'This email address is already associated with an account.' };
    }

    const id = `teacher_${cleanUsername}_${Date.now()}`;

    const newTeacher: UserProfile = {
      id,
      name: data.name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phone: data.phone?.trim() || undefined,
      role: 'teacher',
      assignedSubjects: data.assignedSubjects,
      assignedGrades: data.assignedGrades,
      assignedSections: data.assignedSections,
      status: 'pending',
      registrationStatus: 'pending_approval',
      temporaryPassword: data.password,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAllUsers((prev) => [newTeacher, ...prev]);

    try {
      await setDoc(doc(db, 'users', id), newTeacher);
    } catch (e) {
      console.warn('Firestore teacher online reg write:', e);
    }

    await addAuditLog(
      'TEACHER_ONLINE_REGISTRATION',
      'user',
      `Teacher candidate registered: ${newTeacher.name} (@${newTeacher.username}) for ${newTeacher.assignedSubjects?.join(', ') || 'General Science'} - Pending Director authorization`,
      id
    );

    // Notify Director of new teacher application
    await addNotification({
      userId: 'role:director',
      title: 'New Teacher Registration Application',
      message: `${newTeacher.name} (@${newTeacher.username}) applied to teach ${newTeacher.assignedSubjects?.join(', ') || 'General Science'} (${newTeacher.assignedGrades?.join(', ') || 'Grades 9–12'}). Review in Teacher Management.`,
      type: 'announcement',
      link: '/director/dashboard',
    });

    return {
      success: true,
      message: 'Teacher registration application submitted successfully! Your application is pending review and authorization by the School Director. You will be able to access the Teacher Portal once authorized.',
    };
  };

  // Director / Super Admin: Approve or Reject Teacher Registration
  const approveTeacherRegistration = async (
    userId: string,
    approve: boolean,
    rejectionReason?: string
  ) => {
    const target = allUsers.find((u) => u.id === userId);
    if (!target) return;

    const updatedData: Partial<UserProfile> = approve
      ? {
          status: 'active',
          registrationStatus: 'approved',
          approvedBy: currentUser?.name || 'School Director',
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : {
          status: 'suspended',
          registrationStatus: 'rejected',
          rejectionReason: rejectionReason || 'Application details could not be verified by School Director',
          updatedAt: new Date().toISOString(),
        };

    setAllUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updatedData } : u)));

    try {
      await updateDoc(doc(db, 'users', userId), updatedData);
    } catch {}

    await addAuditLog(
      approve ? 'APPROVE_TEACHER_REGISTRATION' : 'REJECT_TEACHER_REGISTRATION',
      'user',
      `${approve ? 'Approved' : 'Rejected'} teacher registration application for ${target.name} (@${target.username})`,
      userId
    );

    if (approve) {
      await addNotification({
        userId: target.id,
        title: 'Teacher Application Approved!',
        message: 'Your teaching faculty application at SCHOOL FOR EXCELLENCE SECONDARY SCHOOL has been approved by the School Director. You can now access the Teacher Portal.',
        type: 'registration_approved',
        link: '/teacher/login',
      });
    } else {
      await addNotification({
        userId: target.id,
        title: 'Teacher Application Update',
        message: `Your teaching faculty application was not approved. Reason: ${rejectionReason || 'Credentials could not be verified.'}`,
        type: 'registration_rejected',
        link: '/teacher/login',
      });
    }
  };

  // Director: Toggle Teacher Active / Inactive Status
  const toggleTeacherActivation = async (userId: string) => {
    const teacher = allUsers.find((u) => u.id === userId);
    if (!teacher) return;
    const newStatus: 'active' | 'inactive' = teacher.status === 'active' ? 'inactive' : 'active';
    await updateUser(userId, { status: newStatus });
    await addAuditLog(
      newStatus === 'active' ? 'ACTIVATE_TEACHER' : 'DEACTIVATE_TEACHER',
      'user',
      `${newStatus === 'active' ? 'Activated' : 'Deactivated'} teacher account for ${teacher.name} (@${teacher.username})`,
      userId
    );
  };

  const updateUser = async (userId: string, data: Partial<UserProfile>) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...data, updatedAt: new Date().toISOString() } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, ...data } : null));
    }
    try {
      await updateDoc(doc(db, 'users', userId), { ...data, updatedAt: new Date().toISOString() });
    } catch {}
  };

  const toggleUserStatus = async (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return;
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    await updateUser(userId, { status: newStatus });
  };

  const resetUserPassword = async (userId: string): Promise<string> => {
    const newTemp = generateTempPassword();
    await updateUser(userId, { temporaryPassword: newTemp, mustChangePassword: true });
    return newTemp;
  };

  const bulkImportStudents = async (students: any[]): Promise<number> => {
    let count = 0;
    const newStudents: UserProfile[] = [];

    for (const row of students) {
      if (!row.name || !row.username) continue;
      const cleanUsername = row.username.toLowerCase().trim();
      const grade = (row.grade as SecondaryGrade) || 'Grade 10';
      const section = row.section || 'Section A';
      const studentId = row.studentId || `SEC-${grade.replace('Grade ', '')}-${Math.floor(100 + Math.random() * 900)}`;
      const tempPass = generateTempPassword();

      const profile: UserProfile = {
        id: `student_${cleanUsername}_${Date.now()}_${count}`,
        name: row.name.trim(),
        username: cleanUsername,
        email: row.email || `${cleanUsername}@secondary.smartexam.edu`,
        role: 'student',
        grade,
        section,
        studentId,
        status: 'active',
        temporaryPassword: tempPass,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      newStudents.push(profile);
      count++;
    }

    setAllUsers((prev) => [...newStudents, ...prev]);

    for (const s of newStudents) {
      try {
        await setDoc(doc(db, 'users', s.id), s);
      } catch {}
    }

    return count;
  };

  // Clean initial school setup seeding (Grade 9-12 classes & default admin)
  const seedInitialSchoolSetup = async () => {
    const adminUser = DEFAULT_ADMIN;
    setAllUsers([adminUser]);
    try {
      await setDoc(doc(db, 'users', adminUser.id), adminUser);
    } catch {}
  };

  // Teacher: Save & Publish Exam (Separates answer keys into secure answerKeys collection)
  const saveExam = async (examData: Exam, rawQuestions: Question[]): Promise<Exam> => {
    const calculatedTotalMarks = rawQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

    // 1. Separate answer key items for answerKeys collection
    const answerKeyItems = rawQuestions.map((q) => ({
      questionId: q.id,
      correctAnswer: q.correctAnswer || '',
      marks: Number(q.marks) || 1,
      type: q.type,
    }));

    // 2. Strip correctAnswer from questions saved in exams collection so students never receive answers
    const sanitizedQuestions = rawQuestions.map((q) => {
      const { correctAnswer: _discard, ...sanitized } = q;
      return sanitized as Question;
    });

    const updatedExam: Exam = {
      ...examData,
      totalMarks: calculatedTotalMarks,
      questionsCount: rawQuestions.length,
      questions: sanitizedQuestions,
      updatedAt: new Date().toISOString(),
    };

    setAllExams((prev) => {
      const exists = prev.some((e) => e.id === updatedExam.id);
      if (exists) {
        return prev.map((e) => (e.id === updatedExam.id ? updatedExam : e));
      }
      return [updatedExam, ...prev];
    });

    try {
      await setDoc(doc(db, 'exams', updatedExam.id), updatedExam);
    } catch (e) {
      console.warn('Firestore exam write:', e);
    }

    try {
      await setDoc(doc(db, 'answerKeys', updatedExam.id), {
        examId: updatedExam.id,
        authorTeacherId: currentUser?.id || updatedExam.teacherId,
        answers: answerKeyItems,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firestore answerKey write:', e);
    }

    return updatedExam;
  };

  // Fetch full exam with answer key (for teachers/admins editing or reviewing exams)
  const getExamWithAnswerKey = async (examId: string): Promise<{ exam: Exam; questions: Question[] } | null> => {
    const exam = allExams.find((e) => e.id === examId);
    if (!exam) return null;
    try {
      const akDoc = await getDoc(doc(db, 'answerKeys', examId));
      if (akDoc.exists()) {
        const akData = akDoc.data();
        const answersMap: Record<string, string> = {};
        if (Array.isArray(akData.answers)) {
          akData.answers.forEach((a: any) => {
            answersMap[a.questionId] = a.correctAnswer;
          });
        }
        const mergedQuestions = (exam.questions || []).map((q) => ({
          ...q,
          correctAnswer: answersMap[q.id] || q.correctAnswer || '',
        }));
        return { exam, questions: mergedQuestions };
      }
    } catch (e) {
      console.warn('Error fetching answer key:', e);
    }
    return { exam, questions: exam.questions || [] };
  };

  const publishExam = async (examId: string) => {
    const exam = allExams.find((e) => e.id === examId);
    if (!exam) return;

    const now = new Date().toISOString();
    const updatedExam: Exam = {
      ...exam,
      status: 'published',
      publishedAt: now,
      updatedAt: now,
    };

    setAllExams((prev) => prev.map((e) => (e.id === examId ? updatedExam : e)));
    try {
      await updateDoc(doc(db, 'exams', examId), {
        status: 'published',
        publishedAt: now,
        updatedAt: now,
      });
    } catch {}

    await addAuditLog(
      'EXAM_PUBLISHED',
      'exam',
      `Teacher published ${exam.title} (${exam.subject}) for ${exam.grade}`,
      examId
    );

    // Send persistent in-app notification to all students in that grade
    await addNotification({
      userId: `grade:${exam.grade}`,
      title: 'New Examination Published',
      message: `The ${exam.subject} exam "${exam.title}" is now published and active for ${exam.grade}. You can access it under Available Examinations.`,
      type: 'exam_published',
      link: '/student/dashboard',
    });
  };

  const toggleResultsRelease = async (examId: string) => {
    const exam = allExams.find((e) => e.id === examId);
    if (!exam) return;
    const newReleased = !exam.resultsReleased;

    setAllExams((prev) =>
      prev.map((e) => (e.id === examId ? { ...e, resultsReleased: newReleased, updatedAt: new Date().toISOString() } : e))
    );

    try {
      await updateDoc(doc(db, 'exams', examId), { resultsReleased: newReleased, updatedAt: new Date().toISOString() });
    } catch {}
  };

  const deleteExam = async (examId: string) => {
    setAllExams((prev) => prev.filter((e) => e.id !== examId));
    try {
      await deleteDoc(doc(db, 'exams', examId));
    } catch {}
  };

  const saveManualGrading = async (submissionId: string, manualScore: number, feedback: string) => {
    setAllSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id === submissionId) {
          const totalScore = (sub.objectiveScore || 0) + manualScore;
          return {
            ...sub,
            manualScore,
            score: totalScore,
            status: 'graded',
            teacherFeedback: feedback,
            gradedBy: currentUser?.name || 'Teacher',
            gradedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        return sub;
      })
    );

    try {
      await updateDoc(doc(db, 'submissions', submissionId), {
        manualScore,
        status: 'graded',
        teacherFeedback: feedback,
        gradedBy: currentUser?.name || 'Teacher',
        gradedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch {}
  };

  // Student: Submit Exam Answers with Server-Side Grading
  const submitExamAnswers = async (
    examId: string, 
    answers: Record<string, string>, 
    isAuto: boolean
  ): Promise<ExamSubmission> => {
    const exam = allExams.find((e) => e.id === examId);
    if (!exam) throw new Error('Exam not found');

    let token = '';
    if (auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken();
      } catch {}
    }

    // Call server-side grading API to compute score securely
    let gradingResult: any = {
      objectiveScore: 0,
      status: 'submitted',
      itemEvaluations: {},
    };

    try {
      const resp = await fetch('/api/grade-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          examId,
          studentAnswers: answers,
        }),
      });

      if (resp.ok) {
        gradingResult = await resp.json();
      } else {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server-side grading failed');
      }
    } catch (e: any) {
      console.warn('Server grading error:', e);
      throw e;
    }

    const subId = `sub_${exam.id}_${currentUser?.id || 'candidate'}_${Date.now()}`;
    const newSubmission: ExamSubmission = {
      id: subId,
      examId: exam.id,
      examTitle: exam.title,
      subject: exam.subject,
      studentId: currentUser?.id || 'unknown',
      studentName: currentUser?.name || 'Student',
      grade: currentUser?.grade || exam.grade,
      section: currentUser?.section || 'Section A',
      startedAt: new Date(Date.now() - exam.durationMinutes * 60 * 1000).toISOString(),
      submittedAt: new Date().toISOString(),
      answers,
      score: gradingResult.objectiveScore,
      objectiveScore: gradingResult.objectiveScore,
      manualScore: 0,
      totalPossible: exam.totalMarks,
      status: gradingResult.status,
      isAutoSubmitted: isAuto,
      itemEvaluations: gradingResult.itemEvaluations,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAllSubmissions((prev) => [
      newSubmission,
      ...prev.filter((s) => s.examId !== examId || s.studentId !== currentUser?.id),
    ]);

    try {
      await setDoc(doc(db, 'submissions', subId), newSubmission);
    } catch (e) {
      console.warn('Firestore submission write:', e);
    }

    return newSubmission;
  };


  // Live Learning & Real-Time Classroom Functions
  const fetchLiveLessons = async () => {
    try {
      const res = await fetch('/api/live-lessons');
      const data = await res.json();
      if (data.success && Array.isArray(data.lessons)) {
        setLiveLessons(data.lessons);
      }
    } catch (e) {
      console.warn('Failed to fetch live lessons from server:', e);
    }
  };

  const createLiveLesson = async (data: Partial<LiveLesson>): Promise<LiveLesson> => {
    const id = data.id || `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLesson: LiveLesson = {
      id,
      title: data.title || 'Secondary Live Classroom',
      subject: data.subject || 'Mathematics',
      grade: data.grade || 'Grade 10',
      targetSections: Array.isArray(data.targetSections) && data.targetSections.length > 0 ? data.targetSections : ['All'],
      teacherId: currentUser?.id || 'teacher_kassahun',
      teacherName: currentUser?.name || 'Mr. Kassahun Tadesse',
      description: data.description || '',
      scheduledDate: data.scheduledDate || new Date().toISOString().slice(0, 10),
      scheduledStartTime: data.scheduledStartTime || '10:00',
      status: data.status || 'live',
      startedAt: data.status === 'live' ? new Date().toISOString() : undefined,
      attendanceCount: 0,
      chatEnabled: true,
      announcements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setLiveLessons((prev) => [newLesson, ...prev.filter((l) => l.id !== id)]);

    try {
      await fetch('/api/live-lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLesson),
      });
    } catch {}

    try {
      await setDoc(doc(db, 'live_lessons', id), newLesson);
    } catch (e) {
      console.warn('Firestore live lesson write:', e);
    }

    await addAuditLog(
      'LIVE_LESSON_CREATED',
      'system',
      `Live classroom ${newLesson.status === 'live' ? 'started' : 'scheduled'}: ${newLesson.title} (${newLesson.grade} • ${newLesson.subject})`,
      id
    );

    // Notify students of this grade
    await addNotification({
      userId: `grade:${newLesson.grade}`,
      title: newLesson.status === 'live' ? 'Live Classroom Active Now!' : 'Upcoming Live Classroom Scheduled',
      message: `${newLesson.teacherName} ${newLesson.status === 'live' ? 'is conducting a live lesson' : 'scheduled a lesson'} on "${newLesson.title}". Join via Live Learning!`,
      type: 'live_lesson_started',
      link: '/student/dashboard',
    });

    return newLesson;
  };

  const updateLiveLessonStatus = async (id: string, status: LiveLessonStatus) => {
    setLiveLessons((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          return {
            ...l,
            status,
            startedAt: status === 'live' && !l.startedAt ? new Date().toISOString() : l.startedAt,
            endedAt: status === 'ended' ? new Date().toISOString() : l.endedAt,
            updatedAt: new Date().toISOString(),
          };
        }
        return l;
      })
    );

    if (activeLiveLesson?.id === id) {
      setActiveLiveLesson((prev) =>
        prev
          ? {
              ...prev,
              status,
              endedAt: status === 'ended' ? new Date().toISOString() : prev.endedAt,
              updatedAt: new Date().toISOString(),
            }
          : null
      );
    }

    try {
      await fetch(`/api/live-lessons/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {}

    try {
      await updateDoc(doc(db, 'live_lessons', id), {
        status,
        endedAt: status === 'ended' ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      });
    } catch {}

    await addAuditLog(
      'LIVE_LESSON_STATUS',
      'system',
      `Live lesson ${id} status updated to: ${status.toUpperCase()}`,
      id
    );
  };

  const addNotification = async (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...notif,
      read: false,
      timestamp: new Date().toISOString(),
    };

    setNotifications((prev) => [newNotif, ...prev]);

    try {
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
    } catch (e) {
      console.warn('Firestore notification write:', e);
    }
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch {}
  };

  // Initial fetch of live lessons on provider mount
  useEffect(() => {
    fetchLiveLessons();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        isSyncing,
        lastSyncedAt,
        syncError,
        refreshData,
        theme,
        setTheme: handleSetTheme,
        language,
        setLanguage,
        allUsers,
        allExams,
        allSubmissions,
        auditLogs,
        schoolSettings,
        updateSchoolSettings,
        addAuditLog,
        loginPortal,
        logout,
        changePassword,
        registerStudentOnline,
        approveStudentRegistration,
        registerTeacherOnline,
        approveTeacherRegistration,
        toggleTeacherActivation,
        registerDirector,
        registerStudent,
        registerTeacher,
        updateUser,
        toggleUserStatus,
        resetUserPassword,
        bulkImportStudents,
        seedInitialSchoolSetup,
        saveExam,
        getExamWithAnswerKey,
        publishExam,
        toggleResultsRelease,
        deleteExam,
        saveManualGrading,
        submitExamAnswers,
        liveLessons,
        activeLiveLesson,
        setActiveLiveLesson,
        fetchLiveLessons,
        createLiveLesson,
        updateLiveLessonStatus,
        notifications,
        addNotification,
        markNotificationRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
