import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, Clock, BookOpen,
  FileText, Link2, ChevronDown, ChevronRight, Lock,
  PlayCircle, FileQuestion, ClipboardList,
} from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import api from '../services/api'

interface Lesson {
  _id: string
  title: string
  order: number
  type: 'pdf' | 'text' | 'link'
  duration?: number
  isComplete: boolean
  lastPosition?: number
}

interface Module {
  _id: string
  title: string
  order: number
  isLocked: boolean
  completedCount: number
  totalCount: number
  lessons: Lesson[]
}

interface Course {
  _id: string
  title: string
  description?: string
  batchName: string
  totalLessons: number
  completedLessons: number
  progressPercent: number
  modules: Module[]
}

const LESSON_ICON: Record<string, React.ReactNode> = {
  video:       <PlayCircle    className="h-4 w-4 text-blue-500" />,
  pdf:         <FileText      className="h-4 w-4 text-red-500" />,
  quiz:        <FileQuestion  className="h-4 w-4 text-violet-500" />,
  link:        <Link2         className="h-4 w-4 text-emerald-500" />,
  text:        <BookOpen      className="h-4 w-4 text-amber-500" />,
  assignments: <ClipboardList className="h-4 w-4 text-orange-500" />,
}

export default function CourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())

  useEffect(() => {
    api.get(`/courses/${courseId}`)
      .then((r) => {
        const data: Course = r.data.course
        setCourse(data)
        // Auto-open first unlocked module that isn't complete
        if (data?.modules?.length) {
          const first = data.modules.find(m => !m.isLocked)
          if (first) setOpenModules(new Set([first._id]))
        }
      })
      .catch(() => navigate('/courses'))
      .finally(() => setLoading(false))
  }, [courseId])

  const toggleModule = (id: string) => {
    setOpenModules(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 rounded-2xl" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    </div>
  )

  if (!course) return null

  return (
    <div className="space-y-5 animate-fade-up pb-8">

      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/courses')}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{course.title}</h1>
          <p className="text-xs text-muted-foreground">{course.batchName}</p>
        </div>
      </div>

      {/* Stats banner */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)' }}>
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 90% 50%, rgba(255,255,255,0.3), transparent 60%)' }} />
        <div className="relative flex items-center justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-white/70">
                <BookOpen className="h-3.5 w-3.5" />
                {course.totalLessons} lessons
              </span>
              <span className="flex items-center gap-1.5 text-white/70">
                <CheckCircle className="h-3.5 w-3.5" />
                {course.completedLessons} completed
              </span>
              <span className="flex items-center gap-1.5 text-white/70">
                <BookOpen className="h-3.5 w-3.5" />
                {course.modules.length} modules
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${course.progressPercent}%` }} />
              </div>
              <p className="text-xs text-white/60">{course.progressPercent}% complete</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold">{course.progressPercent}%</p>
          </div>
        </div>
      </div>

      {/* Modules accordion */}
      <div className="space-y-3">
        {course.modules.map((mod, idx) => {
          const isOpen = openModules.has(mod._id)
          const modDone = mod.completedCount === mod.totalCount && mod.totalCount > 0
          const modPct = mod.totalCount ? Math.round((mod.completedCount / mod.totalCount) * 100) : 0

          return (
            <div key={mod._id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${
                mod.isLocked ? 'border-border opacity-60' : 'border-border hover:border-blue-200'
              }`}
            >
              {/* Module header */}
              <button
                onClick={() => !mod.isLocked && toggleModule(mod._id)}
                disabled={mod.isLocked}
                className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                  mod.isLocked ? 'cursor-not-allowed' : 'hover:bg-muted/30 cursor-pointer'
                }`}
              >
                {/* Module number */}
                <div className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                  modDone
                    ? 'bg-blue-50 border border-blue-200 text-blue-700'
                    : 'bg-muted border border-border text-muted-foreground'
                }`}>
                  {modDone ? <CheckCircle className="h-4 w-4 text-blue-600" /> : idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground truncate">{mod.title}</p>
                    {mod.isLocked && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                        <Lock className="h-2.5 w-2.5" /> Locked
                      </span>
                    )}
                    {modDone && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                        ✓ Done
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {mod.completedCount}/{mod.totalCount} lessons
                    </span>
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[80px]">
                      <div className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${modPct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{modPct}%</span>
                  </div>
                </div>

                <div className="shrink-0 text-muted-foreground">
                  {mod.isLocked
                    ? <Lock className="h-4 w-4" />
                    : isOpen
                      ? <ChevronDown className="h-4 w-4 transition-transform" />
                      : <ChevronRight className="h-4 w-4 transition-transform" />
                  }
                </div>
              </button>

              {/* Lessons list */}
              {isOpen && !mod.isLocked && (
                <div className="border-t border-border divide-y divide-border">
                  {mod.lessons.map((lesson) => (
                    <button
                      key={lesson._id}
                      onClick={() => navigate(`/courses/${courseId}/lessons/${lesson._id}`)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/30 transition-colors group"
                    >
                      {/* Type icon */}
                      <div className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center bg-muted/50">
                        {LESSON_ICON[lesson.type] ?? <BookOpen className="h-4 w-4 text-muted-foreground" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate transition-colors group-hover:text-blue-700 ${
                          lesson.isComplete ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground capitalize">{lesson.type}</span>
                          {lesson.duration && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />{lesson.duration}m
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {lesson.isComplete
                          ? <CheckCircle className="h-4 w-4 text-blue-600" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        }
                      </div>
                    </button>
                  ))}
                  {mod.lessons.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">No lessons yet.</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
