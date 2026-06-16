// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  _id: string
  name: string
  email: string
  role: 'student'
  phone?: string
  avatar?: string
  batch?: string
  batchName?: string
  modeOfStudy?: 'Online' | 'Offline'
  fcmToken?: string
  createdAt: string
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  progressPercent: number
  attendancePercent: number
  examsPassed: number
  streakDays: number
  totalLessons: number
  completedLessons: number
}

export interface UpcomingDeadline {
  _id: string
  title: string
  type: 'assignment' | 'quiz'
  dueDate: string
  courseTitle: string
}

export interface Announcement {
  _id: string
  title: string
  body: string
  isPinned: boolean
  createdBy: { name: string }
  createdAt: string
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface AttendanceRecord {
  date: string
  status: AttendanceStatus
  remarks?: string
}

// ─── Exams ───────────────────────────────────────────────────────────────────

export interface ExamResult {
  _id: string
  module: string
  examName: string
  score: number
  totalMarks: number
  grade: string
  isPassed: boolean
  remarks?: string
  publishedAt: string
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export interface Lesson {
  _id: string
  title: string
  order: number
  type: 'pdf' | 'text' | 'link' | 'video'
  contentUrl?: string
  duration?: number
  description?: string
  isComplete?: boolean
  lastPosition?: number
}

export interface Module {
  _id: string
  title: string
  order: number
  isLocked: boolean
  lessons: Lesson[]
  completedCount?: number
  totalCount?: number
}

export interface Course {
  _id: string
  title: string
  description: string
  thumbnail?: string
  batch: string
  batchName: string
  totalLessons: number
  completedLessons: number
  progressPercent: number
  modules: Module[]
  publishedAt: string
}

// ─── Progress ────────────────────────────────────────────────────────────────

export interface ProgressPayload {
  lessonId: string
  courseId: string
}

export interface HeartbeatPayload {
  lessonId: string
  position: number
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export type QuestionType = 'mcq' | 'true_false' | 'short_answer'

export interface QuizOption {
  _id: string
  text: string
}

export interface QuizQuestion {
  _id: string
  text: string
  type: QuestionType
  options: QuizOption[]
  marks: number
}

export interface Quiz {
  _id: string
  title: string
  courseId: string
  lessonId?: string
  questions: QuizQuestion[]
  timeLimit: number
  maxAttempts: number
  shuffleOptions: boolean
  showExplanations: boolean
  attemptsUsed: number
}

export interface QuizAnswer {
  questionIndex: number
  selectedOptionId?: string
  textAnswer?: string
}

export interface QuizResult {
  score: number
  totalMarks: number
  isPassed: boolean
  percentage: number
  answers: {
    questionIndex: number
    isCorrect: boolean
    explanation?: string
    correctOptionId?: string
  }[]
}

export interface QuizAttempt {
  _id: string
  score: number
  totalMarks: number
  isPassed: boolean
  submittedAt: string
  timeTakenSeconds: number
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'late'

export interface Assignment {
  _id: string
  title: string
  description?: string
  dueDate: string
  totalMarks: number
  courseTitle?: string
  status: AssignmentStatus
  submission?: {
    _id: string
    fileUrl: string
    fileName: string
    fileSize: number
    submittedAt: string
    isLate: boolean
    score?: number
    feedback?: string
    gradedAt?: string
  }
}

// ─── Certificates ─────────────────────────────────────────────────────────────

export interface Certificate {
  _id: string
  certificateId: string
  courseTitle: string
  issuedAt: string
  pdfUrl: string
  verificationUrl: string
}

export interface CertificateVerification {
  isValid: boolean
  studentName: string
  courseTitle: string
  issuedAt: string
  certificateId: string
}

// ─── Discussion ───────────────────────────────────────────────────────────────

export interface Comment {
  _id: string
  body: string
  author: { _id: string; name: string; avatar?: string }
  isBestAnswer: boolean
  replies: Comment[]
  createdAt: string
}
