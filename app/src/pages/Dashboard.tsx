import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, CalendarDays, CheckCircle, Flame, Clock,
  ChevronRight, PlayCircle, Bell, Award, Video, TrendingUp, Pin, Megaphone,
} from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import { Button } from '../components/ui/button'
import api from '../services/api'
import { formatDate } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import type { DashboardStats, Announcement, UpcomingDeadline } from '../types'

interface NextClass {
  _id: string; title: string; startTime: string; endTime: string
  meetingLink?: string; description?: string
}
interface DashboardData {
  stats: DashboardStats; announcements: Announcement[]
  deadlines: UpcomingDeadline[]; nextClass?: NextClass
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── Live class banner ────────────────────────────────────────────────────────
function LiveClassBanner({ nextClass }: { nextClass: NextClass }) {
  const now = Date.now()
  const start = new Date(nextClass.startTime).getTime()
  const end   = new Date(nextClass.endTime).getTime()
  const isLive = now >= start && now <= end
  const isSoon = !isLive && (start - now) < 15 * 60 * 1000
  const countdown = isLive ? null : Math.max(0, Math.ceil((start - now) / 60000))
  const duration  = Math.round((end - start) / 60000)
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`rounded-2xl overflow-hidden border ${
      isLive ? 'border-red-200' : isSoon ? 'border-amber-200' : 'border-teal-200'
    }`}>
      <div className={`px-4 py-2 flex items-center gap-2 text-xs font-bold text-white ${
        isLive ? 'bg-red-500' : isSoon ? 'bg-amber-500' : 'bg-[#0d9488]'
      }`}>
        {isLive
          ? <><span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE NOW</>
          : isSoon ? <><Clock className="h-3 w-3" /> Starting soon</>
          : <><Video className="h-3 w-3" /> Upcoming Class</>}
      </div>
      <div className={`px-5 py-4 flex items-center gap-4 flex-wrap ${
        isLive ? 'bg-red-50' : isSoon ? 'bg-amber-50' : 'bg-teal-50/60'
      }`}>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
          isLive ? 'bg-red-100' : isSoon ? 'bg-amber-100' : 'bg-teal-100'
        }`}>
          <Video className={`h-5 w-5 ${isLive ? 'text-red-600' : isSoon ? 'text-amber-600' : 'text-teal-700'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-base leading-tight">{nextClass.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtTime(nextClass.startTime)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{duration} min</span>
            {!isLive && countdown !== null && (
              <span className={`font-semibold ${isSoon ? 'text-amber-600' : 'text-teal-700'}`}>
                in {countdown < 60 ? `${countdown}m` : `${Math.round(countdown / 60)}h`}
              </span>
            )}
          </div>
        </div>
        {nextClass.meetingLink ? (
          <a href={nextClass.meetingLink} target="_blank" rel="noreferrer" className="shrink-0">
            <Button size="sm" className={`gap-1.5 font-semibold text-white ${
              isLive ? 'bg-red-500 hover:bg-red-600' : isSoon ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#0d9488] hover:bg-[#0b7c71]'
            }`}>
              <PlayCircle className="h-4 w-4" />
              {isLive ? 'Join Now' : 'Join Class'}
            </Button>
          </a>
        ) : (
          <span className="text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shrink-0">No link yet</span>
        )}
      </div>
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, gradient, iconColor }: {
  label: string; value: string | number; sub: string
  icon: React.ElementType; gradient: string; iconColor: string
}) {
  return (
    <div className={`relative rounded-2xl p-5 overflow-hidden border border-white/60 shadow-sm ${gradient}`}>
      {/* Watermark icon */}
      <Icon className={`absolute -right-3 -bottom-3 h-20 w-20 opacity-[0.08] ${iconColor}`} />
      <div className={`inline-flex h-9 w-9 rounded-xl items-center justify-center mb-3 ${iconColor} bg-white/50`}>
        <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
      </div>
      <p className="text-3xl font-extrabold text-slate-800 leading-none tracking-tight">{value}</p>
      <p className="text-[11px] font-semibold text-slate-500 mt-1 uppercase tracking-wide">{label}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-5 animate-fade-in">
      <Skeleton className="h-16 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  )

  const { stats, announcements = [], deadlines = [], nextClass } = data || {}
  const firstName = user?.name?.split(' ')[0] || 'Student'

  return (
    <div className="space-y-5 pb-8 animate-fade-up">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {greeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {(stats?.progressPercent ?? 0) > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full">
            <TrendingUp className="h-3.5 w-3.5" />
            {stats!.progressPercent}% course done
          </div>
        )}
      </div>

      {/* ── Pinned announcements (top of overview) ──────────────────────── */}
      {announcements.filter(a => a.isPinned).length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          {/* Accent header */}
          <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-teal-600 to-emerald-500">
            <div className="flex items-center gap-2 text-white">
              <Megaphone className="h-4 w-4" />
              <span className="text-sm font-bold tracking-tight">Announcements</span>
              <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
                {announcements.filter(a => a.isPinned).length} pinned
              </span>
            </div>
            <Link to="/announcements" className="text-xs font-semibold text-white/90 hover:text-white transition-colors flex items-center gap-0.5">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {/* Pinned items */}
          <div className="divide-y divide-slate-100">
            {announcements.filter(a => a.isPinned).slice(0, 3).map(a => (
              <div key={a._id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                  <Pin className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-800 leading-snug">{a.title}</p>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-full">Pinned</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: a.body }} />
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-500">{a.createdBy?.name}</span>
                    <span>·</span>
                    <span>{formatDate(a.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Live class banner ───────────────────────────────────────────── */}
      {nextClass && <LiveClassBanner nextClass={nextClass} />}

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Curriculum Mastery" value={`${stats?.progressPercent ?? 0}%`}
          sub={`${stats?.completedLessons ?? 0} of ${stats?.totalLessons ?? 0} sessions`}
          icon={BookOpen} gradient="bg-gradient-to-br from-teal-50 to-white" iconColor="text-teal-600"
        />
        <StatCard
          label="Attendance" value={`${stats?.attendancePercent ?? 0}%`}
          sub="All time"
          icon={CalendarDays} gradient="bg-gradient-to-br from-violet-50 to-white" iconColor="text-violet-600"
        />
        <StatCard
          label="Exams Passed" value={stats?.examsPassed ?? 0}
          sub="Module exams"
          icon={CheckCircle} gradient="bg-gradient-to-br from-emerald-50 to-white" iconColor="text-emerald-600"
        />
        <StatCard
          label="Day Streak" value={stats?.streakDays ?? 0}
          sub="consecutive days"
          icon={Flame} gradient="bg-gradient-to-br from-orange-50 to-white" iconColor="text-orange-500"
        />
      </div>

      {/* ── Main 2-col layout ───────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Left col */}
        <div className="lg:col-span-2 space-y-5">

          {/* Curriculum progress card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <h3 className="font-bold text-base text-slate-800 tracking-tight">Curriculum Progress</h3>
              <Link to="/courses" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors">
                View Modules <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="px-6 pb-5 flex items-center gap-6">
              {/* Ring */}
              <div className="relative h-24 w-24 shrink-0">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#f1f5f9" strokeWidth="9" />
                  <circle
                    cx="48" cy="48" r="40" fill="none"
                    stroke="url(#ring-grad)" strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - (stats?.progressPercent ?? 0) / 100)}`}
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0d9488" />
                      <stop offset="100%" stopColor="#2dd4bf" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-extrabold text-slate-800 tracking-tight">{stats?.progressPercent ?? 0}%</span>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-3xl font-extrabold text-slate-800 tracking-tight">
                  {stats?.completedLessons ?? 0}
                  <span className="text-lg font-normal text-slate-400 ml-1">/ {stats?.totalLessons ?? 0}</span>
                </p>
                <p className="text-sm text-slate-500 mt-0.5">Sessions completed</p>
                <div className="mt-3 h-1.5 w-full max-w-[200px] bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${stats?.progressPercent ?? 0}%`, background: 'linear-gradient(90deg, #0d9488, #2dd4bf)' }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 px-6 pb-5 pt-1 border-t border-slate-100">
              <Link to="/courses"
                className="flex items-center gap-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 hover:border-teal-200 border border-slate-200 p-3 transition-all group">
                <BookOpen className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-semibold text-slate-700">My Courses</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link to="/attendance"
                className="flex items-center gap-2.5 rounded-xl bg-slate-50 hover:bg-violet-50 hover:border-violet-200 border border-slate-200 p-3 transition-all group">
                <CalendarDays className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-slate-700">Attendance</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 tracking-tight">Announcements</h3>
              <Link to="/announcements" className="text-xs text-teal-600 font-semibold hover:text-teal-700 transition-colors">See All</Link>
            </div>
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2 text-slate-400">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">No announcements yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {announcements.slice(0, 6).map(a => (
                  <div key={a._id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/70 transition-colors">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      a.isPinned ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Bell className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-700 truncate">{a.title}</p>
                        {a.isPinned && (
                          <span className="shrink-0 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-full">
                            Pinned
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5" dangerouslySetInnerHTML={{ __html: a.body }} />
                      <p className="text-[10px] text-slate-400 mt-1">{formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-5">

          {/* Upcoming deadlines */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 tracking-tight">Upcoming Deadlines</h3>
              <Link to="/assignments" className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">See All</Link>
            </div>
            <div className="p-4 space-y-2">
              {deadlines.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-1.5 text-slate-400">
                  <CheckCircle className="h-7 w-7 opacity-30" />
                  <p className="text-sm">All clear! No deadlines.</p>
                </div>
              ) : deadlines.map(d => {
                const daysLeft = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000)
                const urgent = daysLeft <= 2
                return (
                  <Link key={d._id} to={d.type === 'assignment' ? '/assignments' : `/quizzes/${d._id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3 hover:border-teal-200 hover:bg-teal-50/40 transition-all group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{d.title}</p>
                      <p className="text-[11px] text-slate-400">{d.courseTitle}</p>
                    </div>
                    <div className={`shrink-0 ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      urgent ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {daysLeft <= 0 ? 'Today' : `${daysLeft}d`}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Quick access */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 tracking-tight">Quick Access</h3>
            </div>
            <div className="p-3 space-y-0.5">
              {[
                { icon: CheckCircle, label: 'Exam Results',  path: '/exams',        bg: 'bg-teal-100',   ic: 'text-teal-700'   },
                { icon: Award,       label: 'Certificates',  path: '/certificates', bg: 'bg-amber-100',  ic: 'text-amber-600'  },
                { icon: Clock,       label: 'Assignments',   path: '/assignments',  bg: 'bg-rose-100',   ic: 'text-rose-600'   },
                { icon: CalendarDays,label: 'Attendance',    path: '/attendance',   bg: 'bg-violet-100', ic: 'text-violet-600' },
              ].map(({ icon: Icon, label, path, bg, ic }) => (
                <Link key={path} to={path}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors group">
                  <div className={`h-8 w-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${ic}`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
