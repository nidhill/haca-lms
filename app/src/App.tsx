import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { useAuth } from './contexts/AuthContext'

function RoleHome() {
  const { user } = useAuth()
  return <Navigate to={user?.role === 'sho' ? '/students' : '/dashboard'} replace />
}

const Login = lazy(() => import('./pages/Login'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MyCourses = lazy(() => import('./pages/MyCourses'))
const CourseDetail = lazy(() => import('./pages/CourseDetail'))
const ExtraCourseDetail = lazy(() => import('./pages/ExtraCourseDetail'))
const LessonView = lazy(() => import('./pages/LessonView'))
const SessionView = lazy(() => import('./pages/SessionView'))
const Assignments = lazy(() => import('./pages/Assignments'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const Attendance = lazy(() => import('./pages/Attendance'))
const ExamResults = lazy(() => import('./pages/ExamResults'))
const Certificates = lazy(() => import('./pages/Certificates'))
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate'))
const Profile = lazy(() => import('./pages/Profile'))
const Announcements = lazy(() => import('./pages/Announcements'))
const LiveClasses = lazy(() => import('./pages/LiveClasses'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const MyFeedback = lazy(() => import('./pages/MyFeedback'))
const MyStudents = lazy(() => import('./pages/MyStudents'))

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify/:certId" element={<VerifyCertificate />} />

            {/* Protected */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<RoleHome />} />
              <Route path="/students" element={<MyStudents />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/courses" element={<MyCourses />} />
              <Route path="/extra-courses/:id" element={<ExtraCourseDetail />} />
              <Route path="/courses/:courseId" element={<CourseDetail />} />
              <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonView />} />
              <Route path="/courses/:courseId/sessions/:sessionId" element={<SessionView />} />
              <Route path="/assignments" element={<Assignments />} />
              <Route path="/quizzes/:quizId" element={<QuizPage />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/exams" element={<ExamResults />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/live-classes" element={<LiveClasses />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/feedback" element={<MyFeedback />} />
            </Route>

            {/* Admin removed — use SHO app at localhost:3000/lms-management */}
            <Route path="/admin/*" element={<Navigate to="/login" replace />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
