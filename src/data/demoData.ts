import { UserProfile, Exam, Question, SecondaryGrade, SchoolSettings, AuditLog } from '../types/index.ts';

// Official School Settings for School for Excellence Secondary School
export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: 'SCHOOL FOR EXCELLENCE SECONDARY SCHOOL',
  applicationName: 'Smart Exam System',
  motto: 'Excellence in Knowledge, Integrity in Assessment',
  academicYear: '2026/2027 Academic Year',
  directorName: 'Dr. Abebe Tefera',
  contactEmail: 'administration@excellence.edu.et',
  contactPhone: '+251 11 465 8900',
  address: 'Bole Sub-City, School for Excellence Campus, Addis Ababa',
  requireStudentApproval: true,
  allowStudentRegistration: true,
  updatedAt: new Date().toISOString(),
};

// Initial school Super Administrator account
export const DEFAULT_ADMIN: UserProfile = {
  id: 'admin_super',
  username: 'sfe',
  name: 'Super Administrator',
  email: 'sfe@smartexam.edu',
  role: 'super_admin',
  status: 'active',
  temporaryPassword: 'sfe2027',
  createdAt: '2026-09-01T08:00:00Z',
  updatedAt: new Date().toISOString(),
};

// Initial School Director account
export const DEFAULT_DIRECTOR: UserProfile = {
  id: 'director_abebe',
  username: 'director.abebe',
  name: 'Dr. Abebe Tefera',
  email: 'director@excellence.edu.et',
  role: 'director',
  status: 'active',
  temporaryPassword: 'Director@2026',
  phone: '+251 91 123 4567',
  createdAt: '2026-09-02T08:00:00Z',
  updatedAt: new Date().toISOString(),
};

// Initial Audit Logs
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_01',
    timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    action: 'SYSTEM_INITIALIZATION',
    actorId: 'admin_super',
    actorName: 'Super Administrator',
    actorRole: 'super_admin',
    targetType: 'school',
    details: 'Configured SCHOOL FOR EXCELLENCE SECONDARY SCHOOL examination system',
  },
  {
    id: 'log_02',
    timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    action: 'DIRECTOR_ACCOUNT_PROVISIONED',
    actorId: 'admin_super',
    actorName: 'Super Administrator',
    actorRole: 'super_admin',
    targetType: 'user',
    targetId: 'director_abebe',
    details: 'Provisioned School Director account for Dr. Abebe Tefera',
  },
];

// Optional sample exam paper for teacher testing when no local PDF is on hand
export const SAMPLE_ETHIOPIAN_CHEMISTRY_EXAM = {
  title: 'Grade 10 Chemistry Midterm Exam - Chemical Reactions & Equilibrium',
  subject: 'Chemistry',
  grade: 'Grade 10' as SecondaryGrade,
  durationMinutes: 45,
  totalMarks: 15,
  instructions: 'Periodic table provided. Answer all multiple choice and short answer questions.',
  isScanned: false,
  scanNotes: 'Digital examination paper. All chemical symbols, equations, and answer keys verified.',
  questions: [
    {
      id: 'q_sample_1',
      questionNumber: 1,
      type: 'multiple_choice' as const,
      questionText: 'According to Le Chatelier’s Principle, what effect will an increase in pressure have on the gas equilibrium system: N₂(g) + 3H₂(g) ⇌ 2NH₃(g)?',
      options: [
        { id: 'opt_A', label: 'A', text: 'Shifts equilibrium to the left (reactants side)' },
        { id: 'opt_B', label: 'B', text: 'Shifts equilibrium to the right (products side)' },
        { id: 'opt_C', label: 'C', text: 'No shift in equilibrium position occurs' },
        { id: 'opt_D', label: 'D', text: 'Decreases the reaction rate of both directions' },
      ],
      correctAnswer: 'opt_B',
      marks: 3,
      explanation: 'Increasing pressure favors the side with fewer gas moles (4 moles reactants vs 2 moles products).',
    },
    {
      id: 'q_sample_2',
      questionNumber: 2,
      type: 'multiple_choice' as const,
      questionText: 'What is the pH value of a 0.01 M hydrochloric acid (HCl) aqueous solution at standard temperature (25°C)?',
      options: [
        { id: 'opt_A', label: 'A', text: '1.0' },
        { id: 'opt_B', label: 'B', text: '2.0' },
        { id: 'opt_C', label: 'C', text: '7.0' },
        { id: 'opt_D', label: 'D', text: '12.0' },
      ],
      correctAnswer: 'opt_B',
      marks: 3,
      explanation: 'pH = -log[H+] = -log(10^-2) = 2.0.',
    },
    {
      id: 'q_sample_3',
      questionNumber: 3,
      type: 'true_false' as const,
      questionText: 'A catalyst increases the numerical value of the chemical equilibrium constant (Keq) of a reversible reaction.',
      options: [
        { id: 'opt_true', label: 'True', text: 'True' },
        { id: 'opt_false', label: 'False', text: 'False' },
      ],
      correctAnswer: 'opt_false',
      marks: 2,
      explanation: 'Catalysts lower the activation energy equally for forward and reverse reactions, reaching equilibrium faster without changing Keq.',
    },
    {
      id: 'q_sample_4',
      questionNumber: 4,
      type: 'short_answer' as const,
      questionText: 'Define an Arrhenius acid and state one chemical formula example of an Arrhenius acid in aqueous solution.',
      correctAnswer: 'An Arrhenius acid is a substance that dissociates in aqueous solution to yield hydrogen ions (H+ or H3O+). Examples include HCl(aq), HNO3(aq), or H2SO4(aq).',
      marks: 4,
      explanation: 'Award 2 marks for definition of producing H+/H3O+ in water, and 2 marks for correct formula and aqueous state.',
    },
    {
      id: 'q_sample_5',
      questionNumber: 5,
      type: 'true_false' as const,
      questionText: 'Pure water at 25°C is amphoteric, meaning it can act as both an acid and a base.',
      options: [
        { id: 'opt_true', label: 'True', text: 'True' },
        { id: 'opt_false', label: 'False', text: 'False' },
      ],
      correctAnswer: 'opt_true',
      marks: 3,
      explanation: 'Water can accept a proton to form H3O+ or donate a proton to form OH-, demonstrating autoionization and amphoteric nature.',
    },
  ],
};
