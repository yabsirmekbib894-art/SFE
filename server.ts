import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { setupLiveSignaling } from './src/server/liveSignaling.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Generous payload limits for PDF file data
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Initialize Google Gen AI with telemetry
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
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Smart Exam System Secondary School API (Grades 9-12)',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// PDF Question Extraction with Gemini 3.8 Flash
app.post('/api/extract-exam-from-pdf', async (req, res) => {
  try {
    const { pdfBase64, mimeType = 'application/pdf', fileName = 'exam.pdf' } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Please check environment settings.',
      });
    }

    const ai = getAiClient();
    const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, '');

    const promptText = `
You are an expert secondary school examination digitizer for Grades 9, 10, 11, and 12.
Extract questions from this secondary school examination paper into an interactive online exam.

Requirements:
1. Detect Exam Title, Academic Subject (e.g. Mathematics, Physics, Chemistry, Biology, English Language, History, Geography, Civics, Economics, IT), and Target Grade (Grade 9, Grade 10, Grade 11, or Grade 12).
2. Read all questions in their original exact order. Maintain the original question numbers and points/marks per question.
3. For Multiple Choice questions:
   - Identify each option cleanly. Extract each option text without the letter prefix.
   - Detect the answer key if printed in the document or provide the verified scientifically correct answer.
4. For True/False questions:
   - Identify whether the statement is True or False.
5. For Short Answer / Essay questions:
   - Extract the question statement.
   - Provide the teacher grading rubric and key required concepts in the answer field.
6. OCR & Quality Check:
   - Inspect whether the document is digitally authored or scanned.
   - Note any unreadable pages, blurry diagrams, or damaged sections in 'scanNotes'.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || 'application/pdf',
          },
        },
        {
          text: promptText,
        },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Title of the exam paper' },
            subject: { type: Type.STRING, description: 'Academic subject name' },
            grade: { type: Type.STRING, description: 'Grade 9, Grade 10, Grade 11, or Grade 12' },
            durationMinutes: { type: Type.NUMBER, description: 'Recommended duration in minutes' },
            totalMarks: { type: Type.NUMBER, description: 'Total exam marks' },
            instructions: { type: Type.STRING, description: 'Instructions for candidates' },
            isScanned: { type: Type.BOOLEAN, description: 'True if scanned or photocopy' },
            scanNotes: { type: Type.STRING, description: 'Legibility notes or unreadable page reports' },
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
                    description: 'Raw option texts for multiple choice, e.g. ["Mitochondria", "Ribosome", ...]',
                  },
                  correctOptionIndex: {
                    type: Type.NUMBER,
                    description: '0 for A, 1 for B, 2 for C, 3 for D for multiple choice',
                  },
                  correctAnswerText: {
                    type: Type.STRING,
                    description: 'True or False for TF, or model answer/rubric for short answer',
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
    const normalizedQuestions = (parsed.questions || []).map((q: any, idx: number) => {
      const qId = `q_${idx + 1}_${Date.now()}`;
      const qType = q.type === 'true_false' ? 'true_false' : q.type === 'short_answer' ? 'short_answer' : 'multiple_choice';
      
      let options: any[] | undefined = undefined;
      let correctAnswer = '';

      if (qType === 'multiple_choice') {
        const rawOpts: string[] = Array.isArray(q.options) && q.options.length > 0 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'];
        options = rawOpts.map((optText, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          // Strip existing leading "A) " or "A. " if model included it
          const cleanText = optText.replace(/^[A-D][\)\.\:\-]\s*/i, '').trim();
          return {
            id: `opt_${letter}`,
            label: letter,
            text: cleanText || optText,
          };
        });

        const correctIdx = typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0 && q.correctOptionIndex < options.length
          ? q.correctOptionIndex
          : 0;
        correctAnswer = options[correctIdx].id;
      } else if (qType === 'true_false') {
        options = [
          { id: 'opt_true', label: 'True', text: 'True' },
          { id: 'opt_false', label: 'False', text: 'False' },
        ];
        const rawAnswer = (q.correctAnswerText || '').trim().toLowerCase();
        correctAnswer = rawAnswer.includes('false') ? 'opt_false' : 'opt_true';
      } else {
        // Short answer
        options = undefined;
        correctAnswer = q.correctAnswerText || q.explanation || 'Teacher manual evaluation required.';
      }

      return {
        id: qId,
        questionNumber: q.questionNumber || idx + 1,
        type: qType,
        questionText: q.questionText,
        options,
        correctAnswer,
        marks: Number(q.marks) || 2,
        explanation: q.explanation || '',
      };
    });

    return res.json({
      success: true,
      fileName,
      extractedExam: {
        title: parsed.title || 'Secondary School Examination',
        subject: parsed.subject || 'General Science',
        grade: parsed.grade && ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].includes(parsed.grade) ? parsed.grade : 'Grade 10',
        durationMinutes: Number(parsed.durationMinutes) || 60,
        totalMarks: normalizedQuestions.reduce((s: number, q: any) => s + q.marks, 0),
        instructions: parsed.instructions || 'Answer all questions carefully within the allocated time.',
        isScanned: !!parsed.isScanned,
        scanNotes: parsed.scanNotes || 'Document processed with high accuracy.',
        questions: normalizedQuestions,
      },
    });
  } catch (error: any) {
    console.error('PDF Extraction Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to extract questions from PDF.',
    });
  }
});

// Server-side Objective Grading & Submission Verification
app.post('/api/grade-submission', (req, res) => {
  try {
    const { questions, studentAnswers, deadline } = req.body;

    if (!Array.isArray(questions) || !studentAnswers) {
      return res.status(400).json({ error: 'Invalid grading payload.' });
    }

    let objectiveScore = 0;
    let totalObjectivePossible = 0;
    let hasWrittenQuestions = false;
    const itemEvaluations: Record<string, any> = {};

    for (const q of questions) {
      const qId = q.id;
      const studentAns = (studentAnswers[qId] || '').trim();
      const correctAns = (q.correctAnswer || '').trim();
      const qMarks = Number(q.marks) || 1;

      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        totalObjectivePossible += qMarks;

        // Compare stable option IDs (e.g. "opt_A" vs "opt_A" or "opt_true" vs "opt_true")
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
        // Short Answer questions: strictly require manual teacher evaluation
        hasWrittenQuestions = true;
        itemEvaluations[qId] = {
          earned: 0,
          possible: qMarks,
          isCorrect: null, // Pending teacher manual review
          teacherNotes: 'Pending teacher grading',
        };
      }
    }

    return res.json({
      success: true,
      objectiveScore,
      totalObjectivePossible,
      hasWrittenQuestions,
      itemEvaluations,
      status: hasWrittenQuestions ? 'submitted' : 'graded',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Grading computation failed' });
  }
});

// Live Lessons In-Memory Registry & REST Endpoints
interface ServerLiveLesson {
  id: string;
  title: string;
  subject: string;
  grade: string;
  targetSections: string[];
  teacherId: string;
  teacherName: string;
  description: string;
  scheduledDate: string;
  scheduledStartTime: string;
  status: 'scheduled' | 'live' | 'ended';
  startedAt?: string;
  endedAt?: string;
  attendanceCount: number;
  chatEnabled: boolean;
  announcements: Array<{ id: string; text: string; timestamp: string }>;
  createdAt: string;
  updatedAt: string;
}

const activeLessons: ServerLiveLesson[] = [
  {
    id: 'lesson_math_101',
    title: 'Grade 10 Mathematics: Quadratic Functions & Parabola Modeling',
    subject: 'Mathematics',
    grade: 'Grade 10',
    targetSections: ['Section 10A', 'Section 10B'],
    teacherId: 'teacher_kassahun',
    teacherName: 'Mr. Kassahun Tadesse',
    description: 'Interactive live session covering standard form, vertex discovery, and secondary school national exam practice questions.',
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledStartTime: '10:00',
    status: 'scheduled',
    attendanceCount: 0,
    chatEnabled: true,
    announcements: [
      {
        id: 'ann_init_1',
        text: 'Welcome students! Have your graphing notebooks and calculators ready.',
        timestamp: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

app.get('/api/live-lessons', (req, res) => {
  const { grade, section } = req.query;
  let list = activeLessons;
  if (grade && grade !== 'all') {
    list = list.filter((l) => l.grade === grade);
  }
  if (section && section !== 'all') {
    list = list.filter((l) => l.targetSections.includes(String(section)) || l.targetSections.includes('All'));
  }
  res.json({ success: true, lessons: list });
});

app.get('/api/live-lessons/:id', (req, res) => {
  const { id } = req.params;
  const lesson = activeLessons.find((l) => l.id === id);
  if (!lesson) {
    return res.status(404).json({ error: 'Live lesson not found.' });
  }
  res.json({ success: true, lesson });
});

app.post('/api/live-lessons', (req, res) => {
  const data = req.body;
  if (!data.title || !data.grade || !data.subject) {
    return res.status(400).json({ error: 'Missing required lesson fields.' });
  }
  const newLesson: ServerLiveLesson = {
    id: data.id || `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: data.title,
    subject: data.subject,
    grade: data.grade,
    targetSections: Array.isArray(data.targetSections) && data.targetSections.length > 0 ? data.targetSections : ['All'],
    teacherId: data.teacherId || 'teacher_current',
    teacherName: data.teacherName || 'Faculty Teacher',
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

  activeLessons.unshift(newLesson);
  res.json({ success: true, lesson: newLesson });
});

app.patch('/api/live-lessons/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const lesson = activeLessons.find((l) => l.id === id);
  if (!lesson) {
    return res.status(404).json({ error: 'Live lesson not found.' });
  }

  lesson.status = status;
  if (status === 'live' && !lesson.startedAt) {
    lesson.startedAt = new Date().toISOString();
  }
  if (status === 'ended') {
    lesson.endedAt = new Date().toISOString();
  }
  lesson.updatedAt = new Date().toISOString();
  res.json({ success: true, lesson });
});

// Vite middleware mounting in development, or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);
  const signaling = setupLiveSignaling(httpServer);

  app.get('/api/live-lessons/stats', (req, res) => {
    res.json({ success: true, stats: signaling.getActiveRoomStats() });
  });

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
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Exam System server running on http://0.0.0.0:${PORT} (HTTP & WebSockets enabled)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
