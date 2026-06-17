import { useEffect, useState } from 'react'
import { Users, MonitorPlay, FileText, Bell, TrendingUp } from 'lucide-react'
import { Skeleton } from '../../components/ui/skeleton'
import adminApi from '../../services/adminApi'
import { formatDate } from '../../lib/utils'

interface Stats {
  totalStudents: number
  totalSessions: number
  completedSessions: number
  sessionProgress: number
  totalExams: number
  totalAnnouncements: number
  totalBatches: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}')

  useEffect(() => {
    adminApi.get('/dashboard')
      .then(r => {
        setStats(r.data.stats)
        setAnnouncements(r.data.recentAnnouncements || [])
        setBatches(r.data.batches || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const METRICS = stats ? [
    { label: 'Total Students',   value: stats.totalStudents,   icon: Users,       bg: 'bg-blue-50',   color: 'text-blue-600'   },
    { label: 'Sessions',         value: stats.totalSessions,   icon: MonitorPlay, bg: 'bg-blue-50',   color: 'text-blue-600'   },
    { label: 'Exams Published',  value: stats.totalExams,      icon: FileText,    bg: 'bg-violet-50', color: 'text-violet-600' },
    { label: 'Announcements',    value: stats.totalAnnouncements, icon: Bell,     bg: 'bg-amber-50',  color: 'text-amber-600'  },
  ] : []

  if (loading) return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Here's what's happening in HACA LMS</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Session progress */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-bold text-base">Curriculum Progress</h3>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="relative h-20 w-20 shrink-0">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#1d4ed8" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - (stats?.sessionProgress ?? 0) / 100)}`}
                  className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{stats?.sessionProgress ?? 0}%</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.completedSessions} <span className="text-lg text-muted-foreground font-normal">/ {stats?.totalSessions}</span></p>
              <p className="text-sm text-muted-foreground">Sessions completed</p>
            </div>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-blue-600 transition-all duration-1000" style={{ width: `${stats?.sessionProgress ?? 0}%` }} />
          </div>
        </div>

        {/* Batches */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold text-base">Active Batches ({batches.length})</h3>
          </div>
          <div className="divide-y divide-border max-h-60 overflow-y-auto">
            {batches.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No batches found</p>
            ) : batches.map((b: any) => (
              <div key={String(b._id)} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-medium">{b.name}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{b.code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent announcements */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-bold text-base">Recent Announcements</h3>
        </div>
        <div className="divide-y divide-border">
          {announcements.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No announcements yet</p>
          ) : announcements.map((a: any) => (
            <div key={String(a._id)} className="flex items-start gap-3 px-5 py-3.5">
              <Bell className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
              </div>
              {a.isPinned && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full shrink-0">Pinned</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
