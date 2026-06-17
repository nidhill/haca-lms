import { useEffect, useState, useMemo } from 'react'
import { Search, Users, BookOpen, TrendingUp, Wifi, WifiOff, ChevronDown } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import type { AssignedBatch } from '../types'
import { cn } from '../lib/utils'

interface StudentRow {
  _id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  batch: string
  batchName: string
  modeOfStudy?: 'Online' | 'Offline'
  completedLessons: number
  totalLessons: number
  progressPercent: number
  lastLogin?: string
  joinedAt: string
}

export default function MyStudents() {
  const { user } = useAuth()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [batches, setBatches] = useState<AssignedBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterBatch, setFilterBatch] = useState('all')

  useEffect(() => {
    api.get('/students')
      .then(r => {
        setStudents(r.data.students || [])
        setBatches(r.data.batches || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return students.filter(s => {
      if (filterBatch !== 'all' && s.batch !== filterBatch) return false
      if (search) {
        const q = search.toLowerCase()
        return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      }
      return true
    })
  }, [students, search, filterBatch])

  const totalProgress = students.length
    ? Math.round(students.reduce((acc, s) => acc + s.progressPercent, 0) / students.length)
    : 0

  const activeCount = students.filter(s => {
    if (!s.lastLogin) return false
    return Date.now() - new Date(s.lastLogin).getTime() < 7 * 24 * 60 * 60 * 1000
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">My Students</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {user?.name} · {batches.map(b => b.name).join(', ') || 'No batches assigned'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Users className="h-4 w-4" /> Total Students
          </div>
          <p className="text-2xl font-bold">{students.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <TrendingUp className="h-4 w-4" /> Avg Progress
          </div>
          <p className="text-2xl font-bold text-primary">{totalProgress}%</p>
        </div>
        <div className="bg-white rounded-xl border p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <BookOpen className="h-4 w-4" /> Active This Week
          </div>
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {batches.length > 1 && (
          <div className="relative">
            <select
              value={filterBatch}
              onChange={e => setFilterBatch(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="all">All Batches</option>
              {batches.map(b => (
                <option key={String(b._id)} value={String(b._id)}>{b.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>

      {/* Student list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{students.length === 0 ? 'No students in your assigned batches' : 'No students match your search'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          {/* Table header */}
          <div className="grid text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 px-4 py-2.5 border-b"
            style={{ gridTemplateColumns: '1fr 140px 80px 140px 100px' }}>
            <span>Student</span>
            <span>Batch</span>
            <span>Mode</span>
            <span>Progress</span>
            <span>Last Active</span>
          </div>

          <div className="divide-y">
            {filtered.map(s => (
              <div key={s._id} className="grid items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                style={{ gridTemplateColumns: '1fr 140px 80px 140px 100px' }}>
                {/* Name + email */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {s.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>
                  </div>
                </div>

                {/* Batch */}
                <span className="text-xs text-muted-foreground truncate">{s.batchName}</span>

                {/* Mode */}
                <div className="flex items-center gap-1">
                  {s.modeOfStudy === 'Online'
                    ? <Wifi className="h-3 w-3 text-blue-500" />
                    : s.modeOfStudy === 'Offline'
                    ? <WifiOff className="h-3 w-3 text-orange-500" />
                    : null}
                  <span className="text-xs text-muted-foreground">{s.modeOfStudy || '—'}</span>
                </div>

                {/* Progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{s.completedLessons}/{s.totalLessons} lessons</span>
                    <span className={cn(
                      'font-semibold',
                      s.progressPercent >= 75 ? 'text-emerald-600'
                      : s.progressPercent >= 40 ? 'text-amber-600'
                      : 'text-red-500'
                    )}>{s.progressPercent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        s.progressPercent >= 75 ? 'bg-emerald-500'
                        : s.progressPercent >= 40 ? 'bg-amber-500'
                        : 'bg-red-400'
                      )}
                      style={{ width: `${s.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Last active */}
                <span className="text-[11px] text-muted-foreground">
                  {s.lastLogin
                    ? (() => {
                        const diff = Date.now() - new Date(s.lastLogin).getTime()
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                        if (days === 0) return 'Today'
                        if (days === 1) return 'Yesterday'
                        if (days < 7) return `${days}d ago`
                        if (days < 30) return `${Math.floor(days / 7)}w ago`
                        return `${Math.floor(days / 30)}mo ago`
                      })()
                    : 'Never'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Showing {filtered.length} of {students.length} students
      </p>
    </div>
  )
}
