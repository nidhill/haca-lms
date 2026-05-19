import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'

const Login = lazy(() => import('./pages/Login'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MyCourses = lazy(() => import('./pages/MyCourses'))
const CourseDetail = lazy(() => import('./pages/CourseDetail'))
const LessonView = lazy(() => import('./pages/LessonView'))
const SessionView = lazy(() => import('./pages/SessionView'))
const Assignments = lazy(() => import('./pages/Assignments'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const Attendance = lazy(() => import('./pages/Attendance'))
const ExamResults = lazy(() => import('./pages/ExamResults'))
const Certificates = lazy(() => import('./pages/Certificates'))
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate'))
const Profile = lazy(() => import('./pages/Profile'))

// Admin
const AdminLogin        = lazy(() => import('./pages/admin/AdminLogin'))
const AdminLayout       = lazy(() => import('./components/admin/AdminLayout'))
const AdminDashboard    = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminSessions     = lazy(() => import('./pages/admin/AdminSessions'))
const AdminStudents     = lazy(() => import('./pages/admin/AdminStudents'))
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'))
const AdminLiveClasses   = lazy(() => import('./pages/admin/AdminLiveClasses'))

const SESSION_WRITE_ROLES = ['admin', 'ceo_haca', 'leadership', 'academic', 'ssho', 'pl', 'mentor']
function AdminRoleGuard({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}')
  if (!allowedRoles.includes(user.role)) return <Navigate to="/admin" replace />
  return <>{children}</>
}

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
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/courses" element={<MyCourses />} />
              <Route path="/courses/:courseId" element={<CourseDetail />} />
              <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonView />} />
              <Route path="/courses/:courseId/sessions/:sessionId" element={<SessionView />} />
              <Route path="/assignments" element={<Assignments />} />
              <Route path="/quizzes/:quizId" element={<QuizPage />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/exams" element={<ExamResults />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="sessions" element={<AdminRoleGuard allowedRoles={SESSION_WRITE_ROLES}><AdminSessions /></AdminRoleGuard>} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="live-classes" element={<AdminLiveClasses />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
