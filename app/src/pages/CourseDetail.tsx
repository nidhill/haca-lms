import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Clock, BookOpen, PlayCircle, VideoOff, ChevronRight, Lock } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import api from '../services/api'

interface Session {
  _id: string
  topic: string
  status: 'completed' | 'pending' | 'cancelled'
  day: number
  sessionType?: string
  duration?: number
  recordingUrl?: string | null
  isWatched?: boolean
  isUnlocked?: boolean
}

interface ModuleDetail {
  title: string
  batchName: string
  totalLessons: number
  completedLessons: number
  progressPercent: number
  sessions: Session[]
}

const card = 'bg-white rounded-2xl border border-border'

export default function CourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [module, setModule] = useState<ModuleDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/courses/${courseId}`)
      .then((r) => setModule(r.data.module))
      .catch(() => navigate('/courses'))
      .finally(() => setLoading(false))
  }, [courseId])

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 rounded-2xl" />
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    </div>
  )

  if (!module) return null
  const sessions = module.sessions || []

  return (
    <div className="space-y-5 animate-fade-up pb-8">

      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/courses')}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{module.title}</h1>
          <p className="text-xs text-muted-foreground">{module.batchName}</p>
        </div>
      </div>

      {/* Stats banner */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d6b5c 0%, #0a5a4d 100%)' }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 90% 50%, rgba(255,255,255,0.3), transparent 60%)' }} />
        <div className="relative flex items-center justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-white/70">
                <BookOpen className="h-3.5 w-3.5" />
                {module.totalLessons} sessions
              </span>
              <span className="flex items-center gap-1.5 text-white/70">
                <CheckCircle className="h-3.5 w-3.5" />
                {module.completedLessons} completed
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${module.progressPercent}%` }} />
              </div>
              <p className="text-xs text-white/60">{module.progressPercent}% complete</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold">{module.progressPercent}%</p>
          </div>
        </div>
      </div>

      {/* Sessions list */}
      <div className={`${card} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-base text-foreground">Sessions</h2>
          <span className="text-xs text-muted-foreground">{sessions.length} total</span>
        </div>

        <div className="divide-y divide-border">
          {sessions.map((s) => {
            const isWatched  = !!s.isWatched
            const isUnlocked = s.isUnlocked !== false
            const hasRecording = !!s.recordingUrl

            return (
              <button key={s._id}
                onClick={() => isUnlocked && navigate(`/courses/${courseId}/sessions/${s._id}`)}
                disabled={!isUnlocked}
                className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors group ${
                  isUnlocked ? 'hover:bg-muted/30 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                {/* Day badge */}
                <div className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold border ${
                  isWatched
                    ? 'border-teal-200 bg-teal-50 text-teal-700'
                    : isUnlocked
                      ? 'bg-muted border-border text-muted-foreground'
                      : 'bg-muted/50 border-border text-muted-foreground/50'
                }`}>
                  {isWatched ? <CheckCircle className="h-4 w-4 text-teal-700" /> : (s.day ?? '—')}
                </div>

                {/* Topic */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate transition-colors ${
                    isUnlocked ? 'text-foreground group-hover:text-teal-700' : 'text-muted-foreground'
                  }`}>
                    {s.topic || 'Untitled Session'}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {s.sessionType && <span className="text-[10px] text-muted-foreground capitalize">{s.sessionType}</span>}
                    {s.duration && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />{s.duration}m
                      </span>
                    )}
                    {!isUnlocked && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Lock className="h-2.5 w-2.5" /> Complete previous to unlock
                      </span>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div className="shrink-0 flex items-center gap-2">
                  {hasRecording && isUnlocked ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                      <PlayCircle className="h-3 w-3" /> Recording
                    </span>
                  ) : !isUnlocked ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <VideoOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                  )}
                  {isWatched && <CheckCircle className="h-4 w-4 text-teal-700" />}
                  {isUnlocked && !isWatched && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </button>
            )
          })}
          {sessions.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No sessions found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
