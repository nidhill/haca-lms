import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, CalendarDays, CheckCircle, Flame, Clock,
  ChevronRight, PlayCircle, Bell, Award, Video,
} from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import { Button } from '../components/ui/button'
import api from '../services/api'
import { formatDate } from '../lib/utils'
import type { DashboardStats, Announcement, UpcomingDeadline } from '../types'

interface NextClass {
  _id: string
  title: string
  startTime: string
  endTime: string
  meetingLink?: string
  description?: string
}

interface DashboardData {
  stats: DashboardStats
  announcements: Announcement[]
  deadlines: UpcomingDeadline[]
  continueLearning?: { courseId: string; lessonId: string; courseTitle: string; lessonTitle: string }
  nextClass?: NextClass
}

const METRICS = (stats: DashboardStats | undefined) => [
  {
    label: 'Curriculum Mastery',
    value: `${stats?.progressPercent ?? 0}%`,
    sub: `${stats?.completedLessons ?? 0} / ${stats?.totalLessons ?? 0} sessions`,
    icon: BookOpen,
    color: 'text-teal-700',
    bg: 'bg-teal-50',
  },
  {
    label: 'Attendance',
    value: `${stats?.attendancePercent ?? 0}%`,
    sub: 'This month',
    icon: CalendarDays,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    label: 'Exams Passed',
    value: stats?.examsPassed ?? 0,
    sub: 'Module exams',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    label: 'Day Streak',
    value: `${stats?.streakDays ?? 0}`,
    sub: 'consecutive days',
    icon: Flame,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
]

const card = 'bg-white rounded-2xl border border-border'

function LiveClassBanner({ nextClass }: { nextClass: NextClass }) {
  const now = Date.now()
  const start = new Date(nextClass.startTime).getTime()
  const end   = new Date(nextClass.endTime).getTime()
  const isLive    = now >= start && now <= end
  const isSoon    = !isLive && (start - now) < 15 * 60 * 1000
  const countdown = isLive ? null : Math.max(0, Math.ceil((start - now) / 60000))
  const duration  = Math.round((end - start) / 60000)

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      isLive ? 'border-red-200' : isSoon ? 'border-amber-200' : 'border-teal-200'
    }`}>
      {/* Top strip */}
      <div className={`px-5 py-2 flex items-center gap-2 text-xs font-bold text-white ${
        isLive ? 'bg-red-500' : isSoon ? 'bg-amber-500' : 'bg-[#0d6b5c]'
      }`}>
        {isLive
          ? <><span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE NOW</>
          : isSoon
          ? <><Clock className="h-3 w-3" /> Starting soon</>
          : <><Video className="h-3 w-3" /> Upcoming Class</>
        }
      </div>

      {/* Body */}
      <div className={`px-5 py-4 flex items-center gap-4 flex-wrap ${
        isLive ? 'bg-red-50' : isSoon ? 'bg-amber-50' : 'bg-teal-50'
      }`}>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
          isLive ? 'bg-red-100' : isSoon ? 'bg-amber-100' : 'bg-teal-100'
        }`}>
          <Video className={`h-5 w-5 ${isLive ? 'text-red-600' : isSoon ? 'text-amber-600' : 'text-teal-700'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-base leading-tight">{nextClass.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtTime(nextClass.startTime)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{duration} min</span>
            {!isLive && countdown !== null && (
              <span className={`font-semibold ${isSoon ? 'text-amber-600' : 'text-teal-700'}`}>
                in {countdown < 60 ? `${countdown}m` : `${Math.round(countdown/60)}h`}
              </span>
            )}
          </div>
          {nextClass.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{nextClass.description}</p>
          )}
        </div>

        {nextClass.meetingLink ? (
          <a href={nextClass.meetingLink} target="_blank" rel="noreferrer" className="shrink-0">
            <Button size="sm" className={`gap-1.5 font-semibold text-white ${
              isLive ? 'bg-red-500 hover:bg-red-600' : isSoon ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#0d6b5c] hover:bg-[#0a5a4d]'
            }`}>
              <PlayCircle className="h-4 w-4" />
              {isLive ? 'Join Now' : 'Join Class'}
            </Button>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground bg-white border border-border px-3 py-1.5 rounded-lg shrink-0">
            Link not set yet
          </span>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  )

  const { stats, announcements = [], deadlines = [], nextClass } = data || {}

  return (
    <div className="space-y-5 pb-8 animate-fade-up">

      {/* Live class card */}
      {nextClass && <LiveClassBanner nextClass={nextClass} />}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS(stats).map(({ label, value, sub, icon: Icon, color, bg }, i) => (
          <div key={i} className={`${card} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Main 2-col layout */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Left */}
        <div className="lg:col-span-2 space-y-5">

          {/* Curriculum progress */}
          <div className={`${card} p-6`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base text-foreground">Curriculum Progress</h3>
              <Link to="/courses" className="text-xs font-semibold text-teal-700 hover:text-teal-600 flex items-center gap-1 transition-colors">
                View Modules <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex items-center gap-6 mb-5">
              <div className="relative h-20 w-20 shrink-0">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke="#0d6b5c" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - (stats?.progressPercent ?? 0) / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-foreground">{stats?.progressPercent ?? 0}%</span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.completedLessons ?? 0} <span className="text-lg text-muted-foreground font-normal">/ {stats?.totalLessons ?? 0}</span></p>
                <p className="text-sm text-muted-foreground">Sessions completed</p>
                <div className="mt-2 h-1.5 w-48 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${stats?.progressPercent ?? 0}%`, background: '#0d6b5c' }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
              <Link to="/courses" className="flex items-center gap-2.5 rounded-xl bg-muted/50 hover:bg-muted p-3 transition-colors group border border-border">
                <BookOpen className="h-4 w-4 text-teal-700" />
                <span className="text-sm font-medium text-foreground">My Courses</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link to="/attendance" className="flex items-center gap-2.5 rounded-xl bg-muted/50 hover:bg-muted p-3 transition-colors group border border-border">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-foreground">Attendance</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>

          {/* Announcements */}
          <div className={card}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Announcements</h3>
              <span className="text-xs text-teal-700 font-semibold cursor-pointer hover:text-teal-600 transition-colors">See All</span>
            </div>
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">No announcements yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {announcements.slice(0, 6).map((a) => (
                  <div key={a._id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${a.isPinned ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-border bg-muted text-muted-foreground'}`}>
                      <Bell className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                        {a.isPinned && <span className="shrink-0 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-full">Pinned</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5" dangerouslySetInnerHTML={{ __html: a.body }} />
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-5">

          {/* Upcoming deadlines */}
          <div className={card}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Upcoming Deadlines</h3>
              <Link to="/assignments" className="text-xs font-semibold text-teal-700 hover:text-teal-600 transition-colors">See All</Link>
            </div>
            <div className="p-4 space-y-2">
              {deadlines.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-8">All clear! No deadlines.</p>
              ) : deadlines.map((d) => {
                const daysLeft = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000)
                const urgent = daysLeft <= 2
                return (
                  <Link key={d._id} to={d.type === 'assignment' ? '/assignments' : `/quizzes/${d._id}`}
                    className="flex items-center justify-between rounded-xl border border-border px-3.5 py-3 hover:border-teal-200 hover:bg-teal-50/50 transition-all group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{d.title}</p>
                      <p className="text-[11px] text-muted-foreground">{d.courseTitle}</p>
                    </div>
                    <div className={`shrink-0 ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgent ? 'bg-red-50 text-red-600 border-red-200' : 'bg-muted text-muted-foreground border-border'}`}>
                      {daysLeft <= 0 ? 'Today' : `${daysLeft}d`}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Quick access */}
          <div className={card}>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Quick Access</h3>
            </div>
            <div className="p-3 space-y-1">
              {[
                { icon: CheckCircle, label: 'Exam Results',  path: '/exams',        color: 'text-teal-700',   bg: 'bg-teal-50'   },
                { icon: Award,       label: 'Certificates',  path: '/certificates', color: 'text-amber-600',  bg: 'bg-amber-50'  },
                { icon: Clock,       label: 'Assignments',   path: '/assignments',  color: 'text-rose-600',   bg: 'bg-rose-50'   },
                { icon: CalendarDays,label: 'Attendance',    path: '/attendance',   color: 'text-blue-600',   bg: 'bg-blue-50'   },
              ].map(({ icon: Icon, label, path, color, bg }) => (
                <Link key={path} to={path}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors group">
                  <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <span className="text-sm font-medium flex-1 text-foreground">{label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
