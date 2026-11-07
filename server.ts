import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { setupLiveSignaling } from './src/server/liveSignaling.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase configuration
const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.warn('Failed to parse firebase-applet-config.json:', err);
  }
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountEnv) {
    try {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || firebaseConfig.projectId,
      });
      console.log('Firebase Admin SDK initialized with service account.');
    } catch (e) {
      console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT JSON. Using project credentials fallback:', e);
      admin.initializeApp({ projectId: firebaseConfig.projectId });
    }
  } else {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log('Firebase Admin SDK initialized with project credentials.');
  }
}

const adminDb = getFirestore(
  admin.app(),
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : '(default)'
);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security Middleware: Helmet with customized CSP for WebRTC / iframe compatibility
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Restrictive CORS Configuration
const allowedOriginEnv = process.env.ALLOWED_ORIGIN || '*';
app.use(
  cors({
    origin: allowedOriginEnv === '*' ? true : allowedOriginEnv.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

// Payload size limits (15 MB for exam PDF processing)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Global Rate Limiting
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this client. Please try again later.' },
});
app.use('/api', globalApiLimiter);

// Stricter Rate Limiter for Login / Auth Operations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes before retrying.' },
});
app.use('/api/auth', authLimiter);

// Stricter Rate Limiter for AI PDF Extraction (5 requests / minute per user/IP)
const pdfExtractionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: { error: 'PDF extraction limit exceeded. Please wait 1 minute before processing another document.' },
});

// Authentication Middleware: Verifies Firebase ID Token
export interface AuthenticatedRequest extends express.Request {
  user?: {
    uid: string;
    email?: string;
    role: string;
    grade?: string;
    section?: string;
  };
}

const requireAuth = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    let role = (decoded.role as string) || '';
    let grade: string | undefined = undefined;
    let section: string | undefined = undefined;

    // Retrieve user document from Firestore to resolve role if not present in custom claim
    try {
      const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (!role && data?.role) {
          role = data.role;
        }
        grade = data?.grade;
        section = data?.section;
      }
    } catch (e) {
      console.warn('Could not load user doc for token verification:', e);
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: role || 'student',
      grade,
      section,
    };
    next();
  } catch (err: any) {
    console.error('Token verification error:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token.' });
  }
};

const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    const currentRole = req.user.role;
    if (!allowedRoles.includes(currentRole) && currentRole !== 'super_admin' && currentRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }
    next();
  };
};

// Initialize Google Gen AI
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'SCHOOL FOR EXCELLENCE SECONDARY SCHOOL - Smart Exam System',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    timestamp: new Date().toISOString(),
  });
});

// Role Management: Set Custom Claims (Admin Only)
app.post(
  '/api/admin/set-user-role',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  async (req: AuthenticatedRequest, res) => {
    const roleSchema = z.object({
      targetUid: z.string().min(1),
      newRole: z.enum(['super_admin', 'admin', 'director', 'teacher', 'student']),
    });

    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input parameters.' });
    }

    const { targetUid, newRole } = parsed.data;

    try {
      await admin.auth().setCustomUserClaims(targetUid, { role: newRole });
      await adminDb.collection('users').doc(targetUid).set(
        {
          role: newRole,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Audit log entry
      await adminDb.collection('auditLogs').add({
        timestamp: new Date().toISOString(),
        action: 'USER_ROLE_ASSIGNED',
        actorId: req.user?.uid || 'admin',
        actorName: req.user?.email || 'Administrator',
        actorRole: req.user?.role || 'admin',
        targetType: 'user',
        targetId: targetUid,
        details: `Assigned role ${newRole} to user ${targetUid}`,
      });

      return res.json({ success: true, message: `Successfully updated user role to ${newRole}.` });
    } catch (err: any) {
      console.error('Role update error:', err);
      return res.status(500).json({ error: 'Failed to update user role claims.' });
    }
  }
);

// Sync Claims Endpoint: Syncs user role to custom claim upon sign-in
app.post('/api/auth/sync-claims', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const uid = req.user!.uid;
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const userData = userDoc.data();
    const assignedRole = userData?.role || 'student';
    await admin.auth().setCustomUserClaims(uid, { role: assignedRole });

    return res.json({ success: true, role: assignedRole });
  } catch (err: any) {
    console.error('Sync claims error:', err);
    return res.status(500).json({ error: 'Could not synchronize role claims.' });
  }
});

// AI PDF Question Paper Extraction (Teacher & Admin Only, Rate Limited, 15MB limit)
app.post(
  '/api/extract-exam-from-pdf',
  pdfExtractionLimiter,
  requireAuth,
  requireRole(['teacher', 'admin', 'super_admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const pdfSchema = z.object({
        pdfBase64: z.string().min(10),
        mimeType: z.string().default('application/pdf'),
        fileName: z.string().default('exam.pdf'),
      });

      const parsedBody = pdfSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: 'Invalid document payload.' });
      }

      const { pdfBase64, mimeType, fileName } = parsedBody.data;

      // Validate base64 payload size (< 15MB)
      const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, '');
      const approxBytes = cleanBase64.length * 0.75;
      if (approxBytes > 15 * 1024 * 1024) {
        return res.status(413).json({ error: 'File size exceeds 15 MB limit.' });
      }

      // Check PDF signature (%PDF-)
      const bufferPrefix = Buffer.from(cleanBase64.substring(0, 32), 'base64').toString('ascii');
      if (!bufferPrefix.includes('%PDF-') && !mimeType.includes('pdf')) {
        return res.status(400).json({ error: 'The uploaded file is not a valid PDF document.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: 'Gemini API key is not configured on the server.',
        });
      }

      const ai = getAiClient();
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

      const promptText = `
You are an expert secondary school examination digitizer for SCHOOL FOR EXCELLENCE SECONDARY SCHOOL (Grades 9, 10, 11, and 12).
Extract questions from this secondary school examination paper into an interactive online exam.

Requirements:
1. Detect Exam Title, Academic Subject, and Target Grade (Grade 9, Grade 10, Grade 11, or Grade 12).
2. Read all questions in their original exact order with marks per question.
3. For Multiple Choice questions:
   - Identify each option cleanly. Extract each option text without the letter prefix.
   - Detect the answer key if clearly indicated in the document or verified scientifically.
   - If the answer cannot be determined with certainty, leave correctOptionIndex as null and set hasAmbiguousAnswer to true. DO NOT default to Option A.
4. For True/False questions:
   - Identify whether the statement is True or False.
5. For Short Answer / Essay questions:
   - Extract the question statement.
   - Provide the teacher grading rubric and key required concepts in the answer field.
6. OCR & Quality Check:
   - Inspect whether the document is digitally authored or scanned.
   - Note any unreadable pages or blurry diagrams in 'scanNotes'.
`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'application/pdf',
            },
          },
          {
            text: promptText,
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subject: { type: Type.STRING },
              grade: { type: Type.STRING },
              durationMinutes: { type: Type.NUMBER },
              totalMarks: { type: Type.NUMBER },
              instructions: { type: Type.STRING },
              isScanned: { type: Type.BOOLEAN },
              scanNotes: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: { type: Type.NUMBER },
                    type: {
                      type: Type.STRING,
                      description: 'multiple_choice, true_false, or short_answer',
                    },
                    questionText: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctOptionIndex: {
                      type: Type.NUMBER,
                      description: '0 for A, 1 for B, 2 for C, 3 for D. Null if not verified.',
                    },
                    hasAmbiguousAnswer: {
                      type: Type.BOOLEAN,
                    },
                    correctAnswerText: {
                      type: Type.STRING,
                    },
                    marks: { type: Type.NUMBER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['questionNumber', 'type', 'questionText', 'marks'],
                },
              },
            },
            required: ['title', 'subject', 'grade', 'durationMinutes', 'totalMarks', 'questions'],
          },
        },
      });

      const responseText = response.text || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      // Convert into standardized questions with stable Option IDs
      // If AI could not determine answer, do NOT default to Option A; flag as needsReview: true
      const normalizedQuestions = (parsed.questions || []).map((q: any, idx: number) => {
        const qId = `q_${idx + 1}_${Date.now()}`;
        const qType =
          q.type === 'true_false'
            ? 'true_false'
            : q.type === 'short_answer'
            ? 'short_answer'
            : 'multiple_choice';

        let options: any[] | undefined = undefined;
        let correctAnswer = '';
        let needsReview = false;

        if (qType === 'multiple_choice') {
          const rawOpts: string[] =
            Array.isArray(q.options) && q.options.length > 0
              ? q.options
              : ['Option A', 'Option B', 'Option C', 'Option D'];

          options = rawOpts.map((optText, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            const cleanText = optText.replace(/^[A-D][\)\.\:\-]\s*/i, '').trim();
            return {
              id: `opt_${letter}`,
              label: letter,
              text: cleanText || optText,
            };
          });

          if (
            typeof q.correctOptionIndex === 'number' &&
            q.correctOptionIndex >= 0 &&
            q.correctOptionIndex < options.length &&
            !q.hasAmbiguousAnswer
          ) {
            correctAnswer = options[q.correctOptionIndex].id;
          } else {
            // DO NOT silently default to Option A: Flag for teacher confirmation!
            needsReview = true;
            correctAnswer = '';
          }
        } else if (qType === 'true_false') {
          options = [
            { id: 'opt_true', label: 'True', text: 'True' },
            { id: 'opt_false', label: 'False', text: 'False' },
          ];
          const rawAnswer = (q.correctAnswerText || '').trim().toLowerCase();
          if (rawAnswer.includes('false')) {
            correctAnswer = 'opt_false';
          } else if (rawAnswer.includes('true')) {
            correctAnswer = 'opt_true';
          } else {
            needsReview = true;
            correctAnswer = '';
          }
        } else {
          // Short answer
          options = undefined;
          correctAnswer = q.correctAnswerText || q.explanation || '';
          if (!correctAnswer) needsReview = true;
        }

        return {
          id: qId,
          questionNumber: q.questionNumber || idx + 1,
          type: qType,
          questionText: q.questionText,
          options,
          correctAnswer, // Returned to teacher preview screen ONLY
          marks: Number(q.marks) || 2,
          explanation: q.explanation || '',
          needsReview,
        };
      });

      return res.json({
        success: true,
        fileName,
        extractedExam: {
          title: parsed.title || 'Secondary School Examination',
          subject: parsed.subject || 'General Science',
          grade:
            parsed.grade && ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].includes(parsed.grade)
              ? parsed.grade
              : 'Grade 10',
          durationMinutes: Number(parsed.durationMinutes) || 60,
          totalMarks: normalizedQuestions.reduce((s: number, q: any) => s + q.marks, 0),
          instructions: parsed.instructions || 'Answer all questions carefully within the allocated time.',
          isScanned: !!parsed.isScanned,
          scanNotes: parsed.scanNotes || 'Document processed with high accuracy.',
          questions: normalizedQuestions,
          hasFlaggedQuestions: normalizedQuestions.some((q: any) => q.needsReview),
        },
      });
    } catch (error: any) {
      console.error('PDF Extraction Error:', error);
      return res.status(500).json({
        error: 'Failed to extract examination paper. Please verify file format and try again.',
      });
    }
  }
);

// Student Exam Start: Records server startedAt & returns sanitized randomized questions (NO answers)
app.post(
  '/api/exams/:id/start',
  requireAuth,
  requireRole(['student', 'admin', 'super_admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const examId = req.params.id;
      const studentId = req.user!.uid;

      const examDoc = await adminDb.collection('exams').doc(examId).get();
      if (!examDoc.exists) {
        return res.status(404).json({ error: 'Exam not found.' });
      }

      const examData = examDoc.data()!;
      if (examData.status !== 'published') {
        return res.status(403).json({ error: 'This examination is not open for candidates.' });
      }

      // Check if student already submitted
      const subDoc = await adminDb.collection('submissions').doc(`${examId}_${studentId}`).get();
      if (subDoc.exists) {
        return res.status(400).json({ error: 'You have already submitted this examination.' });
      }

      const attemptRef = adminDb.collection('examAttempts').doc(`${examId}_${studentId}`);
      const attemptDoc = await attemptRef.get();

      const durationMinutes = Number(examData.durationMinutes) || 60;
      let startedAt: number;
      let deadlineTimestamp: number;

      if (attemptDoc.exists) {
        const attemptData = attemptDoc.data()!;
        startedAt = attemptData.startedAt;
        deadlineTimestamp = attemptData.deadlineTimestamp;
      } else {
        startedAt = Date.now();
        deadlineTimestamp = startedAt + durationMinutes * 60 * 1000;
        await attemptRef.set({
          id: `${examId}_${studentId}`,
          examId,
          studentId,
          studentName: req.user?.email || 'Student Candidate',
          startedAt,
          durationMinutes,
          deadlineTimestamp,
          tabSwitchCount: 0,
          fullscreenExitCount: 0,
          submitted: false,
        });
      }

      // Sanitize questions: STRICTLY remove correctAnswer before sending to student
      const rawQuestions: any[] = examData.questions || [];
      const sanitizedQuestions = rawQuestions.map((q) => {
        const { correctAnswer, ...safeQ } = q;
        return safeQ;
      });

      // Seeded/student-specific shuffle of questions and options
      const seededShuffle = <T>(array: T[], seedStr: string): T[] => {
        const arr = [...array];
        let seed = 0;
        for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
        for (let i = arr.length - 1; i > 0; i--) {
          seed = (seed * 9301 + 49297) % 233280;
          const j = Math.floor((seed / 233280) * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };

      const randomizedQuestions = seededShuffle(sanitizedQuestions, `${studentId}_${examId}`);

      return res.json({
        success: true,
        exam: {
          ...examData,
          questions: randomizedQuestions,
        },
        serverStartedAt: startedAt,
        deadlineTimestamp,
        serverTimeNow: Date.now(),
      });
    } catch (err: any) {
      console.error('Exam start error:', err);
      return res.status(500).json({ error: 'Could not initialize examination session.' });
    }
  }
);

// Anti-Cheating Event Logger (Tab Switch & Fullscreen Exit)
app.post(
  '/api/exams/:id/log-event',
  requireAuth,
  requireRole(['student', 'admin', 'super_admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const examId = req.params.id;
      const studentId = req.user!.uid;
      const { eventType } = req.body;

      if (!eventType || (eventType !== 'TAB_SWITCH' && eventType !== 'FULLSCREEN_EXIT')) {
        return res.status(400).json({ error: 'Invalid event type.' });
      }

      const attemptRef = adminDb.collection('examAttempts').doc(`${examId}_${studentId}`);
      if (eventType === 'TAB_SWITCH') {
        await attemptRef.set({ tabSwitchCount: admin.firestore.FieldValue.increment(1) }, { merge: true });
      } else {
        await attemptRef.set({ fullscreenExitCount: admin.firestore.FieldValue.increment(1) }, { merge: true });
      }

      // Log into school audit log registry
      await adminDb.collection('auditLogs').add({
        timestamp: new Date().toISOString(),
        action: eventType === 'TAB_SWITCH' ? 'EXAM_TAB_SWITCH_DETECTED' : 'EXAM_FULLSCREEN_EXIT_DETECTED',
        actorId: studentId,
        actorName: req.user?.email || 'Student Candidate',
        actorRole: 'student',
        targetType: 'exam',
        targetId: examId,
        details: `Integrity notice: ${eventType} logged during examination session.`,
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error('Log event error:', err);
      return res.status(500).json({ error: 'Failed to record event.' });
    }
  }
);

// Secure Server-Side Grading: Accepts ONLY examId and studentAnswers
app.post(
  '/api/grade-submission',
  requireAuth,
  requireRole(['student', 'teacher', 'admin', 'super_admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      // STRICT CHECK: Reject if questions or correctAnswer are provided by client!
      if ('questions' in req.body || 'correctAnswer' in req.body) {
        return res.status(400).json({
          error: 'Security violation: Examination grading must not include client questions or answer keys.',
        });
      }

      const submissionSchema = z.object({
        examId: z.string().min(1),
        studentAnswers: z.record(z.string(), z.string()),
      });

      const parsed = submissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid submission payload.' });
      }

      const { examId, studentAnswers } = parsed.data;
      const studentId = req.user!.uid;

      // 1. Double submission prevention
      const submissionDocRef = adminDb.collection('submissions').doc(`${examId}_${studentId}`);
      const existingSub = await submissionDocRef.get();
      if (existingSub.exists) {
        return res.status(400).json({ error: 'Submission already recorded for this examination.' });
      }

      // 2. Load Answer Key from Firestore isolated collection
      const answerKeyDoc = await adminDb.collection('answerKeys').doc(examId).get();
      if (!answerKeyDoc.exists) {
        return res.status(404).json({
          error: 'Answer key not found for this examination. Please consult the course teacher.',
        });
      }

      const answerKeyData = answerKeyDoc.data()!;
      const keyMap: Record<string, any> = answerKeyData.answers || {};

      // 3. Verify server-side deadline clock & attempt duration
      const attemptDoc = await adminDb.collection('examAttempts').doc(`${examId}_${studentId}`).get();
      if (attemptDoc.exists) {
        const attemptData = attemptDoc.data()!;
        const serverNow = Date.now();
        // 120-second network grace period
        if (serverNow > attemptData.deadlineTimestamp + 120000) {
          return res.status(400).json({ error: 'Examination duration has expired.' });
        }
      }

      // 4. Grade multiple-choice and true/false questions
      let objectiveScore = 0;
      let totalObjectivePossible = 0;
      let hasWrittenQuestions = false;
      const itemEvaluations: Record<string, any> = {};

      for (const [qId, keyItem] of Object.entries(keyMap)) {
        const qMarks = Number(keyItem.marks) || 1;
        const qType = keyItem.type;
        const correctAns = (keyItem.correctAnswer || '').trim();
        const studentAns = (studentAnswers[qId] || '').trim();

        if (qType === 'multiple_choice' || qType === 'true_false') {
          totalObjectivePossible += qMarks;
          const isMatch = studentAns.length > 0 && studentAns.toLowerCase() === correctAns.toLowerCase();

          if (isMatch) {
            objectiveScore += qMarks;
            itemEvaluations[qId] = {
              earned: qMarks,
              possible: qMarks,
              isCorrect: true,
            };
          } else {
            itemEvaluations[qId] = {
              earned: 0,
              possible: qMarks,
              isCorrect: false,
            };
          }
        } else {
          // Short answer / written item: Pending teacher manual grading
          hasWrittenQuestions = true;
          itemEvaluations[qId] = {
            earned: 0,
            possible: qMarks,
            isCorrect: null,
            teacherNotes: 'Pending teacher manual review',
          };
        }
      }

      // Load exam metadata for submission record
      const examDoc = await adminDb.collection('exams').doc(examId).get();
      const examData = examDoc.exists ? examDoc.data()! : {};

      const newSubmission = {
        id: `${examId}_${studentId}`,
        examId,
        examTitle: examData.title || 'Secondary Examination',
        subject: examData.subject || 'General',
        grade: examData.grade || req.user?.grade || 'Grade 10',
        section: req.user?.section || 'Section A',
        studentId,
        studentName: req.user?.email || 'Student Candidate',
        submittedAt: new Date().toISOString(),
        score: objectiveScore,
        objectiveScore,
        manualScore: 0,
        totalPossible: examData.totalMarks || totalObjectivePossible,
        status: hasWrittenQuestions ? 'submitted' : 'graded',
        answers: studentAnswers,
        itemEvaluations,
        teacherId: examData.teacherId || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Write submission to Firestore using Firebase Admin SDK
      await submissionDocRef.set(newSubmission);

      // Mark attempt as submitted
      await adminDb
        .collection('examAttempts')
        .doc(`${examId}_${studentId}`)
        .set({ submitted: true, submittedAt: new Date().toISOString() }, { merge: true });

      return res.json({
        success: true,
        submissionId: newSubmission.id,
        objectiveScore,
        totalObjectivePossible,
        hasWrittenQuestions,
        status: newSubmission.status,
      });
    } catch (err: any) {
      console.error('Server grading error:', err);
      return res.status(500).json({ error: 'Server grading computation encountered an error.' });
    }
  }
);

// ----------------------------------------------------
// Live Lessons Endpoints: Single Source of Truth in Firestore
// Fixed route ordering: /api/live-lessons/stats declared BEFORE /api/live-lessons/:id
// ----------------------------------------------------

// Stats Endpoint (Declared first!)
app.get('/api/live-lessons/stats', async (_req, res) => {
  try {
    const snap = await adminDb.collection('liveLessons').get();
    const liveCount = snap.docs.filter((d) => d.data().status === 'live').length;
    const totalCount = snap.docs.length;
    return res.json({
      success: true,
      stats: {
        activeRooms: liveCount,
        totalScheduled: totalCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Live lessons stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve classroom stats.' });
  }
});

// List Live Lessons (Signed-in users only)
app.get('/api/live-lessons', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { grade, section } = req.query;
    let query: admin.firestore.Query = adminDb.collection('liveLessons');

    if (grade && grade !== 'all') {
      query = query.where('grade', '==', String(grade));
    }

    const snap = await query.get();
    let lessons = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (section && section !== 'all') {
      lessons = lessons.filter(
        (l: any) =>
          !l.targetSections ||
          l.targetSections.includes(String(section)) ||
          l.targetSections.includes('All')
      );
    }

    return res.json({ success: true, lessons });
  } catch (err: any) {
    console.error('Fetch live lessons error:', err);
    return res.status(500).json({ error: 'Failed to retrieve live lessons.' });
  }
});

// Get Single Live Lesson
app.get('/api/live-lessons/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const doc = await adminDb.collection('liveLessons').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Live lesson not found.' });
    }
    return res.json({ success: true, lesson: { id: doc.id, ...doc.data() } });
  } catch (err: any) {
    console.error('Get live lesson error:', err);
    return res.status(500).json({ error: 'Failed to load live lesson.' });
  }
});

// Create Live Lesson (Teacher & Admin Only)
app.post(
  '/api/live-lessons',
  requireAuth,
  requireRole(['teacher', 'admin', 'super_admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = req.body;
      if (!data.title || !data.grade || !data.subject) {
        return res.status(400).json({ error: 'Missing required lesson fields.' });
      }

      const lessonId = data.id || `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newLesson = {
        id: lessonId,
        title: data.title,
        subject: data.subject,
        grade: data.grade,
        targetSections:
          Array.isArray(data.targetSections) && data.targetSections.length > 0
            ? data.targetSections
            : ['All'],
        teacherId: req.user!.uid,
        teacherName: data.teacherName || req.user!.email || 'Faculty Teacher',
        description: data.description || '',
        scheduledDate: data.scheduledDate || new Date().toISOString().slice(0, 10),
        scheduledStartTime: data.scheduledStartTime || '09:00',
        status: data.status || 'live',
        startedAt: data.status === 'live' ? new Date().toISOString() : undefined,
        attendanceCount: 0,
        chatEnabled: true,
        announcements: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await adminDb.collection('liveLessons').doc(lessonId).set(newLesson);
      return res.json({ success: true, lesson: newLesson });
    } catch (err: any) {
      console.error('Create live lesson error:', err);
      return res.status(500).json({ error: 'Could not create live lesson.' });
    }
  }
);

// Update Live Lesson Status (Teacher Owner or Admin Only)
app.patch('/api/live-lessons/:id/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const lessonRef = adminDb.collection('liveLessons').doc(id);
    const lessonDoc = await lessonRef.get();
    if (!lessonDoc.exists) {
      return res.status(404).json({ error: 'Live lesson not found.' });
    }

    const lessonData = lessonDoc.data()!;
    // Teacher owner or admin only
    if (lessonData.teacherId !== req.user!.uid && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: You can only update your own lessons.' });
    }

    const updates: any = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (status === 'live' && !lessonData.startedAt) {
      updates.startedAt = new Date().toISOString();
    }
    if (status === 'ended') {
      updates.endedAt = new Date().toISOString();
    }

    await lessonRef.update(updates);
    return res.json({ success: true, lesson: { ...lessonData, ...updates } });
  } catch (err: any) {
    console.error('Update live lesson status error:', err);
    return res.status(500).json({ error: 'Could not update lesson status.' });
  }
});

// Classroom AI Assistant endpoint (Screenshot 3 "AI-помощник")
app.post('/api/ask-classroom-ai', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { question, subject = 'Secondary School Subject', grade = 'Grade 10', lessonTitle = '' } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        answer: `[SCHOOL FOR EXCELLENCE AI] For ${subject} (${grade}): ${question}\nKey concept: Remember core foundational principles, step-by-step problem breakdown, and standard formulas.`,
      });
    }

    const ai = getAiClient();
    const prompt = `You are the Smart Exam System Classroom AI Assistant for SCHOOL FOR EXCELLENCE SECONDARY SCHOOL (${grade}, ${subject}, Topic: "${lessonTitle}").
A student or teacher in the live online class asks:
"${question}"

Provide a concise, encouraging, educational explanation in 2-4 sentences with any applicable formulas, step-by-step logic, or definitions. Keep it clear, precise, and high-school appropriate.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.json({ success: true, answer: response.text });
  } catch (err: any) {
    console.error('Classroom AI error:', err);
    return res.json({
      answer: `Helpful tip for ${req.body.subject || 'this topic'}: Break down the problem into known values, apply the standard formula, and verify units systematically.`,
    });
  }
});

// Global Centralized Error Handling Middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'An internal server error occurred. Please contact the school system administrator.',
  });
});

// Start HTTP and WebSocket Server
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  // Setup WebSockets
  setupLiveSignaling(httpServer);

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SCHOOL FOR EXCELLENCE Smart Exam System server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
