import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const STUDENT_ONLY_PATHS = ['/dashboard', '/courses', '/assignments', '/attendance', '/exams', '/certificates', '/leaderboard', '/feedback']

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // SHO users can only access their allowed pages
  if (user.role === 'sho') {
    const isStudentOnly = STUDENT_ONLY_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))
    if (isStudentOnly) return <Navigate to="/students" replace />
  }

  return <>{children}</>
}
