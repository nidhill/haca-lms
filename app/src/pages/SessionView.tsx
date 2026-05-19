import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, CheckCircle, Clock, Calendar,
  PlayCircle, VideoOff, ChevronRight, Lock,
} from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import { toast } from 'sonner'
import api from '../services/api'
import SessionVideoPlayer from '../components/SessionVideoPlayer'

interface Session {
  _id: string
  topic: string
  status: 'completed' | 'pending' | 'cancelled'
  day: number
  sessionType?: string
  duration?: number
  conductedDate?: string
  notes?: string
  recordingUrl?: string | null
  module: string
  batchName: string
  isWatched: boolean
  isUnlocked: boolean
}

interface NavItem { _id: string; topic: string; day: number; isUnlocked?: boolean }

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return match ? match[1] : null
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes('cloudinary.com')
}

export default function SessionView() {
  const { courseId, sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [prev, setPrev] = useState<NavItem | null>(null)
  const [next, setNext] = useState<NavItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [videoReady, setVideoReady] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [marking, setMarking] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    setLoading(true)
    setVideoReady(false)
    api.get(`/courses/${courseId}/sessions/${sessionId}`)
      .then((r) => {
        setSession(r.data.session)
        setPrev(r.data.prev)
        setNext(r.data.next)
        setIsWatched(r.data.session.isWatched)
      })
      .catch(() => navigate(`/courses/${courseId}`))
      .finally(() => setLoading(false))
  }, [courseId, sessionId])

  const markComplete = async () => {
    if (isWatched || marking || !session) return
    setMarking(true)
    try {
      await api.post(`/courses/${courseId}/sessions/${sessionId}/complete`)
      setIsWatched(true)
      // unlock next in nav
      setNext(prev => prev ? { ...prev, isUnlocked: true } : prev)
      toast.success('Session marked as complete!')
    } catch {
      toast.error('Could not save progress')
    } finally {
      setMarking(false)
    }
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="aspect-video rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  )

  if (!session) return null

  // Block access to locked sessions
  if (!session.isUnlocked) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 animate-fade-up">
        <button onClick={() => navigate(`/courses/${courseId}`)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to {session.module}
        </button>
        <div className="rounded-2xl bg-[#0d1117] aspect-video flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-white/40" />
          </div>
          <p className="text-white/70 font-semibold text-base">Session Locked</p>
          <p className="text-white/30 text-sm max-w-xs leading-relaxed">
            Complete the previous session to unlock this one.
          </p>
          <button onClick={() => navigate(`/courses/${courseId}`)}
            className="mt-2 px-5 py-2.5 rounded-xl bg-white/10 text-white/70 text-sm font-medium hover:bg-white/20 transition-colors">
            Go back to module
          </button>
        </div>
      </div>
    )
  }

  const youtubeId = session.recordingUrl ? getYouTubeId(session.recordingUrl) : null
  const isDirect  = session.recordingUrl ? isDirectVideo(session.recordingUrl) : false
  const hasVideo  = !!(youtubeId || isDirect)

  return (
    <div className="space-y-5 animate-fade-up pb-8 max-w-4xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => navigate('/courses')} className="hover:text-foreground transition-colors">My Courses</button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button onClick={() => navigate(`/courses/${courseId}`)} className="hover:text-foreground transition-colors">{session.module}</button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate max-w-[200px]">Day {session.day}</span>
      </div>

      {/* Title row */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(`/courses/${courseId}`)}
          className="mt-0.5 h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">Day {session.day}</span>
            {session.sessionType && (
              <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">{session.sessionType}</span>
            )}
            {isWatched && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle className="h-3.5 w-3.5" /> Completed
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground mt-1">{session.topic}</h1>
          <p className="text-xs text-muted-foreground">{session.batchName} · {session.module}</p>
        </div>
      </div>

      {/* Video player */}
      {hasVideo ? (
        youtubeId ? (
          <div className="rounded-2xl overflow-hidden bg-black">
            <div className="relative aspect-video">
              {!videoReady && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black">
                  <div className="flex flex-col items-center gap-3">
                    <PlayCircle className="h-14 w-14 text-white/30" />
                    <p className="text-white/40 text-sm">Loading recording…</p>
                  </div>
                </div>
              )}
              <iframe ref={iframeRef}
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setVideoReady(true)}
              />
            </div>
          </div>
        ) : (
          <SessionVideoPlayer
            src={session.recordingUrl!}
            onReady={() => setVideoReady(true)}
            onComplete={markComplete}
          />
        )
      ) : (
        <div className="rounded-2xl overflow-hidden bg-[#0d1117]">
          <div className="relative aspect-video flex flex-col items-center justify-center gap-4">
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)' }}
            />
            <div className="relative flex flex-col items-center gap-3 text-center px-6">
              <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
                <VideoOff className="h-8 w-8 text-white/40" />
              </div>
              <p className="text-white/70 font-semibold text-base">Video not available</p>
              <p className="text-white/30 text-sm max-w-xs leading-relaxed">
                The recording for this session hasn't been uploaded yet.<br />
                Check back later or contact your mentor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Complete status bar */}
      <div className="bg-white rounded-2xl border border-border px-5 py-4 flex items-center gap-3">
        {isWatched ? (
          <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
            <CheckCircle className="h-5 w-5" />
            Session completed — next session unlocked!
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            {hasVideo && isDirect ? 'Watch 80% of the video to auto-complete this session' : 'Video recording not available — check back later'}
          </div>
        )}
      </div>

      {/* Session info card */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
        <h3 className="font-bold text-sm">Session Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {session.duration && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-medium">{session.duration} min</p>
              </div>
            </div>
          )}
          {session.conductedDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Conducted</p>
                <p className="font-medium">
                  {new Date(session.conductedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}
          {session.sessionType && (
            <div className="flex items-center gap-2 text-sm">
              <PlayCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{session.sessionType}</p>
              </div>
            </div>
          )}
        </div>
        {session.notes && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1">Session Notes</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{session.notes}</p>
          </div>
        )}
      </div>

      {/* Prev / Next navigation */}
      <div className="flex items-center justify-between gap-3">
        {prev ? (
          <button onClick={() => navigate(`/courses/${courseId}/sessions/${prev._id}`)}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 hover:bg-muted transition-colors text-left flex-1 max-w-xs">
            <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Previous</p>
              <p className="text-sm font-medium truncate">Day {prev.day} · {prev.topic}</p>
            </div>
          </button>
        ) : <div />}

        {next ? (
          next.isUnlocked || isWatched ? (
            <button onClick={() => navigate(`/courses/${courseId}/sessions/${next._id}`)}
              className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 hover:bg-teal-100 transition-colors text-right flex-1 max-w-xs ml-auto">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-teal-600 font-medium">Next Session</p>
                <p className="text-sm font-semibold text-teal-800 truncate">Day {next.day} · {next.topic}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-teal-600" />
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-right flex-1 max-w-xs ml-auto opacity-60 cursor-not-allowed">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground">Next Session</p>
                <p className="text-sm font-medium truncate text-muted-foreground">Day {next.day} · {next.topic}</p>
              </div>
              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          )
        ) : <div />}
      </div>
    </div>
  )
}
