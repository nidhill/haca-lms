import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CheckCircle, Clock, ChevronRight, GraduationCap, Zap } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import api from '../services/api'

interface Module {
  _id: string
  title: string
  batchName: string
  totalLessons: number
  completedLessons: number
  progressPercent: number
  color: string
}

const TEAL_SHADES = [
  '#0d6b5c',
  '#0e7a6a',
  '#0f8070',
  '#116b5c',
  '#0a5a4d',
  '#138068',
  '#0c7060',
  '#0e6858',
]

function SectionHeader({ label, count, icon }: { label: string; count: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-bold text-foreground">{label}</span>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function ModuleCard({ course, index, onClick }: { course: Module; index: number; onClick: () => void }) {
  const isComplete = course.progressPercent === 100
  const inProgress = course.completedLessons > 0 && !isComplete
  const accent = TEAL_SHADES[index % TEAL_SHADES.length]

  return (
    <button
      onClick={onClick}
      className="text-left group animate-fade-up w-full"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="rounded-2xl bg-white border border-border overflow-hidden hover:border-teal-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full">
        {/* Top color bar */}
        <div className="h-1.5 w-full" style={{ background: accent }} />
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: accent }}>
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              isComplete
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : inProgress
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-muted text-muted-foreground border-border'
            }`}>
              {isComplete ? '✓ Done' : inProgress ? 'In Progress' : 'Not Started'}
            </span>
          </div>

          <h3 className="font-bold text-base leading-tight mb-1 text-foreground group-hover:text-teal-700 transition-colors">
            {course.title}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">{course.batchName}</p>

          <div className="space-y-1.5 mb-4">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${course.progressPercent}%`, background: accent }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
              <span>{course.completedLessons} completed</span>
              <span>{course.progressPercent}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {course.totalLessons} sessions
              </span>
              {isComplete && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle className="h-3 w-3" />
                  Complete
                </span>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </button>
  )
}

export default function MyCourses() {
  const [courses, setCourses] = useState<Module[]>([])
  const [batchName, setBatchName] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/courses')
      .then((r) => {
        setCourses(r.data.courses || [])
        setBatchName(r.data.batchName || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalSessions = courses.reduce((a, c) => a + c.totalLessons, 0)
  const completedSessions = courses.reduce((a, c) => a + c.completedLessons, 0)
  const overallPercent = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0

  const completed  = courses.filter(c => c.progressPercent === 100)
  const inProgress = courses.filter(c => c.completedLessons > 0 && c.progressPercent < 100)
  const notStarted = courses.filter(c => c.completedLessons === 0)

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
      </div>
    </div>
  )

  let cardIndex = 0

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Header banner */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d6b5c 0%, #0a5a4d 100%)' }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.3), transparent 60%)' }} />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-1">My Courses</p>
            <h1 className="text-2xl font-bold">{batchName || 'My Learning Path'}</h1>
            <p className="text-white/60 text-sm mt-1">{courses.length} modules · {totalSessions} total sessions</p>
          </div>
          <div className="shrink-0">
            <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-center min-w-[120px]">
              <p className="text-3xl font-bold">{overallPercent}%</p>
              <p className="text-white/60 text-xs mt-0.5">Overall Progress</p>
              <div className="mt-2 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${overallPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-semibold text-muted-foreground">No modules found</p>
          <p className="text-sm text-muted-foreground">Your curriculum will appear here once sessions are added.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {completed.length > 0 && (
            <div className="space-y-4">
              <SectionHeader label="Completed" count={completed.length} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((c) => <ModuleCard key={c._id} course={c} index={cardIndex++} onClick={() => navigate(`/courses/${encodeURIComponent(c._id)}`)} />)}
              </div>
            </div>
          )}
          {inProgress.length > 0 && (
            <div className="space-y-4">
              <SectionHeader label="In Progress" count={inProgress.length} icon={<Zap className="h-4 w-4 text-blue-600" />} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((c) => <ModuleCard key={c._id} course={c} index={cardIndex++} onClick={() => navigate(`/courses/${encodeURIComponent(c._id)}`)} />)}
              </div>
            </div>
          )}
          {notStarted.length > 0 && (
            <div className="space-y-4">
              <SectionHeader label="Not Started" count={notStarted.length} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {notStarted.map((c) => <ModuleCard key={c._id} course={c} index={cardIndex++} onClick={() => navigate(`/courses/${encodeURIComponent(c._id)}`)} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
