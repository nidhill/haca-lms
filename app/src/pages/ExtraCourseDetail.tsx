import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronUp, ChevronDown, Lock,
  CheckCircle2, Timer, Sparkles, FileText,
  ExternalLink, BookOpen, PlayCircle, FileQuestion,
  Link2, ClipboardList, File,
} from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import { VideoPlayer } from '../components/VideoPlayer'
import { PdfViewer } from '../components/PdfViewer'
import { QuizTaker } from '../components/QuizTaker'
import { AssignmentViewer } from '../components/AssignmentViewer'
import api from '../services/api'

interface Lesson {
  _id: string; title: string; type: string; contentUrl?: string
  thumbnail?: string; duration?: number; description?: string; isComplete: boolean
}
interface Module { _id: string; title: string; order: number; lessons: Lesson[] }
interface ExtraCourse {
  _id: string; title: string; category?: string; about?: string; link?: string; thumbnail?: string
  author?: { name?: string; bio?: string; avatar?: string; linkedin?: string }
  expiresInMonths?: number
  modules: Module[]; totalLessons: number; completedLessons: number; progressPercent: number
}

const fmtDur = (s?: number) => {
  if (!s) return ''
  const m = Math.floor(s / 60), sec = s % 60
  return m ? `${m}m ${sec ? sec + 's' : ''}`.trim() : `${sec}s`
}
const isVideoUrl = (u: string) => /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(u) || u.includes('/video/upload/')
const isYouTube = (u: string) => /youtu(be\.com|\.be)/i.test(u)

function LessonTypeIcon({ type, className = 'h-3.5 w-3.5' }: { type: string; className?: string }) {
  switch (type) {
    case 'video':       return <PlayCircle    className={`${className} text-blue-500`} />
    case 'pdf':         return <FileText      className={`${className} text-red-500`} />
    case 'quiz':        return <FileQuestion  className={`${className} text-violet-500`} />
    case 'link':        return <Link2         className={`${className} text-emerald-500`} />
    case 'text':        return <BookOpen      className={`${className} text-amber-500`} />
    case 'assignments': return <ClipboardList className={`${className} text-orange-500`} />
    default:            return <File          className={`${className} text-slate-400`} />
  }
}

function lessonTypeLabel(type: string) {
  const labels: Record<string, string> = {
    video: 'Video', pdf: 'PDF', quiz: 'Quiz',
    link: 'Resource', text: 'Reading', assignments: 'Assignment',
  }
  return labels[type] || 'Resource'
}

type TabId = 'about' | 'lessons'

export default function ExtraCourseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState<ExtraCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentId, setCurrentId] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<TabId>('about')

  useEffect(() => {
    api.get(`/extra-courses/${id}`)
      .then(r => {
        const c: ExtraCourse = r.data.course
        setCourse(c)
        const flat = c.modules.flatMap(m => m.lessons)
        const first = flat.find(l => !l.isComplete) || flat[0]
        setCurrentId(first?._id || '')
        const mod = c.modules.find(m => m.lessons.some(l => l._id === first?._id))
        setExpanded(new Set(mod ? [mod._id] : c.modules.slice(0, 1).map(m => m._id)))
      })
      .catch(() => navigate('/courses'))
      .finally(() => setLoading(false))
  }, [id])

  const flat = useMemo(() => course?.modules.flatMap(m => m.lessons) || [], [course])
  const current = flat.find(l => l._id === currentId) || null

  const isLocked = (lessonId: string) => {
    const idx = flat.findIndex(l => l._id === lessonId)
    return idx > 0 && !flat[idx - 1].isComplete
  }

  const markComplete = async (lessonId: string) => {
    try {
      // Save to backend
      await api.post(`/progress/mark-complete`, { courseId: course?._id, lessonId })

      // Update local state
      setCourse(prev => {
        if (!prev) return prev
        const modules = prev.modules.map(m => ({
          ...m, lessons: m.lessons.map(l => l._id === lessonId ? { ...l, isComplete: true } : l),
        }))
        const completedLessons = modules.flatMap(m => m.lessons).filter(l => l.isComplete).length
        const updatedCourse = { ...prev, modules, completedLessons, progressPercent: prev.totalLessons ? Math.round((completedLessons / prev.totalLessons) * 100) : 0 }

        // Auto-select next incomplete lesson
        const flatLessons = modules.flatMap(m => m.lessons)
        const nextLesson = flatLessons.find(l => !l.isComplete)
        if (nextLesson) {
          setCurrentId(nextLesson._id)
        }

        return updatedCourse
      })
    } catch (err) {
      console.error('Failed to mark lesson complete:', err)
    }
  }

  const toggleMod = (mid: string) =>
    setExpanded(p => { const n = new Set(p); n.has(mid) ? n.delete(mid) : n.add(mid); return n })

  if (loading) return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-0 h-full">
      <div className="space-y-0">
        <Skeleton className="aspect-video w-full rounded-none" />
        <div className="p-5 space-y-3"><Skeleton className="h-6 w-64" /><Skeleton className="h-4 w-48" /></div>
      </div>
      <Skeleton className="h-full rounded-none" />
    </div>
  )
  if (!course) return null

  const hasModules = course.modules?.length > 0 && flat.length > 0

  // ── Player ────────────────────────────────────────────────────────────────
  const PlayerArea = () => {
    const singleLink = course.link || ''
    const isValidUrl = (url: string) => url && (url.startsWith('http') || url.startsWith('/'))

    if (hasModules && current) {
      // type === 'video' is trusted as-is; VideoPlayer itself falls back gracefully if the URL turns out unplayable
      if (current.contentUrl && (current.type === 'video' || isVideoUrl(current.contentUrl) || isYouTube(current.contentUrl)))
        return <VideoPlayer key={current._id} lessonId={current._id} courseId={course._id} url={current.contentUrl} poster={current.thumbnail} isComplete={current.isComplete} onComplete={() => markComplete(current._id)} />
      if (current.type === 'pdf' && current.contentUrl) {
        return <PdfViewer url={current.contentUrl} isComplete={current.isComplete} onMarkComplete={() => markComplete(current._id)} />
      }
      if (current.type === 'text' && current.contentUrl)
        return (
          <div className="aspect-video overflow-y-auto bg-slate-900 text-white p-8 flex flex-col">
            <div className="prose prose-invert max-w-none flex-1">
              <p className="text-base leading-relaxed whitespace-pre-wrap">{current.contentUrl}</p>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <button
                onClick={() => markComplete(current._id)}
                disabled={current.isComplete}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  current.isComplete
                    ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {current.isComplete ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Completed
                  </>
                ) : (
                  'Mark as Complete'
                )}
              </button>
            </div>
          </div>
        )
      if (current.contentUrl && isValidUrl(current.contentUrl) && current.type === 'link')
        return (
          <div className="aspect-video flex flex-col items-center justify-center gap-3 bg-slate-900 text-white">
            <FileText className="h-12 w-12 opacity-50" />
            <a href={current.contentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium">
              Open resource <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )
      if (current.type === 'quiz' && current.contentUrl)
        return <QuizTaker quizId={current.contentUrl} isComplete={current.isComplete} onMarkComplete={() => markComplete(current._id)} />
      if (current.type === 'assignments' && current.contentUrl)
        return <AssignmentViewer assignmentId={current.contentUrl} isComplete={current.isComplete} onMarkComplete={() => markComplete(current._id)} />
    }
    if (singleLink && (isVideoUrl(singleLink) || isYouTube(singleLink)))
      return <VideoPlayer key={singleLink} lessonId={course._id} courseId={course._id} url={singleLink} poster={course.thumbnail} isComplete={false} onComplete={() => {}} />
    if (singleLink && isValidUrl(singleLink))
      return (
        <div className="aspect-video flex flex-col items-center justify-center gap-3 bg-slate-900 text-white">
          <FileText className="h-12 w-12 opacity-50" />
          <a href={singleLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium">
            Open resource <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )
    return (
      <div className="aspect-video flex flex-col items-center justify-center gap-3 bg-slate-900 text-white/50">
        <BookOpen className="h-14 w-14 opacity-30" /><p className="text-sm">Content coming soon</p>
      </div>
    )
  }

  return (
    <div className="-m-5 md:-m-6 flex flex-col lg:flex-row min-h-[calc(100vh-64px)] bg-white">

      {/* ── Left column: video + tabs + content ───────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-y-auto bg-white">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white sticky top-0 z-20">
          <button onClick={() => navigate('/courses')} className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-blue-600 transition-colors">
            <ChevronLeft className="h-5 w-5" /> {course.category || course.title}
          </button>
        </div>

        {/* Video */}
        <div className="bg-black w-full flex-shrink-0"><PlayerArea /></div>

        {/* Tabs */}
        <div className="border-b border-slate-200 px-0 bg-white sticky top-16 z-10">
          <div className="flex gap-0">
            <button onClick={() => setActiveTab('about')}
              className={`flex-1 py-3.5 px-5 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${
                activeTab === 'about'
                  ? 'border-blue-600 text-blue-700 bg-blue-50'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-slate-50'
              }`}>
              About
            </button>
            <button onClick={() => setActiveTab('lessons')}
              className={`flex-1 py-3.5 px-5 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${
                activeTab === 'lessons'
                  ? 'border-blue-600 text-blue-700 bg-blue-50'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-slate-50'
              }`}>
              Lessons
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6 space-y-6 flex-1">
          {activeTab === 'about' ? (
            <>
              {/* Current lesson title */}
              <div>
                <h1 className="text-xl font-bold text-foreground leading-snug">{current?.title || course.title}</h1>
                {course.expiresInMonths ? (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-full px-3 py-1">
                    <Timer className="h-3.5 w-3.5" /> Expires in {course.expiresInMonths} month{course.expiresInMonths === 1 ? '' : 's'}
                  </div>
                ) : null}
              </div>

              {/* Author */}
              {course.author?.name && (
                <div>
                  <h2 className="text-base font-bold text-foreground mb-3">Author</h2>
                  <div className="flex items-center gap-3 mb-3">
                    {course.author.avatar
                      ? <img src={course.author.avatar} className="h-10 w-10 rounded-full object-cover" alt={course.author.name} />
                      : <div className="h-10 w-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold">{course.author.name[0]}</div>}
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-sm">{course.author.name}</p>
                      {course.author.linkedin && (
                        <a href={course.author.linkedin} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                  {course.author.bio && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{course.author.bio}</p>}
                </div>
              )}

              {/* About */}
              {course.about && (
                <div>
                  <h2 className="text-base font-bold text-foreground mb-2">About This Course</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed italic whitespace-pre-line">{course.about}</p>
                </div>
              )}
            </>
          ) : (
            /* Lessons tab content */
            <>
              {!hasModules ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                  <Sparkles className="h-8 w-8 text-violet-400 opacity-60" />
                  <p className="text-sm text-muted-foreground">Lessons coming soon</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {course.modules.map((mod, mi) => {
                    const isOpen = expanded.has(mod._id)
                    const modDone = mod.lessons.filter(l => l.isComplete).length
                    return (
                      <div key={mod._id}>
                        <button onClick={() => toggleMod(mod._id)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left rounded-lg border border-slate-100">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground">{mod.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{modDone}/{mod.lessons.length} lessons</p>
                          </div>
                          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />}
                        </button>
                        {isOpen && (
                          <div className="mt-2 ml-4 border-l border-slate-200 pl-4 space-y-1">
                            {mod.lessons.map(l => {
                              const locked = isLocked(l._id)
                              const done = l.isComplete
                              return (
                                <button key={l._id} disabled={locked}
                                  onClick={() => !locked && setCurrentId(l._id)}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                                    locked
                                      ? 'text-slate-300 cursor-not-allowed'
                                      : done
                                      ? 'text-slate-700 hover:bg-slate-50'
                                      : 'text-slate-600 hover:bg-slate-50'
                                  }`}>
                                  {done ? <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0" /> :
                                   locked ? <Lock className="h-4 w-4 text-slate-300 shrink-0" /> :
                                   <div className="h-2 w-2 rounded-full bg-slate-400" />}
                                  <span className={done ? 'font-medium' : ''}>{l.title}</span>
                                  {l.duration && <span className="text-[11px] text-muted-foreground ml-auto shrink-0">{fmtDur(l.duration)}</span>}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Right column: Syllabus ────── */}
      {activeTab === 'lessons' && (
      <div className="w-full lg:w-[340px] lg:max-w-[340px] border-l border-slate-200 flex flex-col overflow-hidden flex-shrink-0 hidden lg:flex bg-white">

        {/* Progress header */}
        <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest opacity-80">Course Progress</span>
            <span className="text-xl font-extrabold">{course.progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${course.progressPercent}%` }} />
          </div>
          <p className="text-xs opacity-70 mt-2 font-medium">
            {course.completedLessons} of {course.totalLessons} lessons completed
          </p>
        </div>

        {/* Module list */}
        <div className="flex-1 overflow-y-auto py-3">
          {!hasModules ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-5">
              <Sparkles className="h-8 w-8 text-violet-400 opacity-60" />
              <p className="text-sm text-muted-foreground">Syllabus coming soon</p>
            </div>
          ) : course.modules.map((mod, mi) => {
            const isOpen = expanded.has(mod._id)
            const modDone = mod.lessons.filter(l => l.isComplete).length
            const modComplete = modDone === mod.lessons.length
            return (
              <div key={mod._id} className="mb-1">
                {/* Module header */}
                <button onClick={() => toggleMod(mod._id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    modComplete ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {modComplete ? '✓' : String(mi + 1).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 leading-snug truncate">{mod.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{modDone}/{mod.lessons.length} lessons</p>
                  </div>
                  <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </div>
                </button>

                {/* Lesson list */}
                {isOpen && (
                  <div className="px-3 pb-2">
                    {mod.lessons.map((l) => {
                      const locked = isLocked(l._id)
                      const active = l._id === currentId
                      const done = l.isComplete

                      return (
                        <button key={l._id} disabled={locked}
                          onClick={() => !locked && setCurrentId(l._id)}
                          className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-left transition-all mb-1 group ${
                            active
                              ? 'bg-blue-600 shadow-md shadow-blue-200'
                              : locked
                              ? 'cursor-not-allowed opacity-40'
                              : 'hover:bg-slate-100 cursor-pointer'
                          }`}>

                          {/* Type icon box */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            active ? 'bg-white/20' :
                            done ? 'bg-green-50' : 'bg-slate-100'
                          }`}>
                            {done && !active ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : locked ? (
                              <Lock className="h-3.5 w-3.5 text-slate-400" />
                            ) : (
                              <LessonTypeIcon type={l.type} className={`h-4 w-4 ${active ? 'text-white' : ''}`} />
                            )}
                          </div>

                          {/* Title + type */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-snug truncate ${
                              active ? 'text-white' :
                              done ? 'text-slate-500 line-through decoration-slate-300' :
                              'text-slate-800'
                            }`}>{l.title}</p>
                            <p className={`text-[11px] mt-0.5 ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                              {lessonTypeLabel(l.type)}{l.duration ? ` · ${fmtDur(l.duration)}` : ''}
                            </p>
                          </div>

                          {/* Playing indicator */}
                          {active && (
                            <div className="flex gap-0.5 items-end h-4 shrink-0">
                              {[3,5,4].map((h, i) => (
                                <div key={i} className="w-1 bg-white rounded-full animate-pulse" style={{ height: `${h*3}px`, animationDelay: `${i*150}ms` }} />
                              ))}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      )}
    </div>
  )
}
