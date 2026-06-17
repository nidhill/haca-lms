import { useEffect, useRef, useState, useCallback } from 'react'
import { Menu, Bell, Search, ChevronDown, Pin, CalendarDays, ClipboardList, Video, X, BookOpen, FileText } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar, AvatarFallback } from './ui/avatar'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import api from '../services/api'

const routeLabels: Record<string, string> = {
  '/dashboard':     'Overview',
  '/courses':       'My Courses',
  '/live-classes':  'Live Classes',
  '/announcements': 'Announcements',
  '/assignments':   'Assignments',
  '/attendance':    'Attendance',
  '/exams':         'Exam Results',
  '/leaderboard':   'Leaderboard',
  '/certificates':  'Certificates',
  '/profile':       'Profile',
}

const READ_KEY = 'lms_notif_read_ids'

interface Notif {
  id: string
  type: 'announcement' | 'deadline' | 'liveclass'
  title: string
  sub: string
  time: string
  link: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function NotifIcon({ type }: { type: Notif['type'] }) {
  if (type === 'announcement') return (
    <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
      <Pin className="h-3.5 w-3.5 text-blue-600" />
    </div>
  )
  if (type === 'deadline') return (
    <div className="h-8 w-8 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
      <ClipboardList className="h-3.5 w-3.5 text-rose-500" />
    </div>
  )
  return (
    <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
      <Video className="h-3.5 w-3.5 text-emerald-600" />
    </div>
  )
}

// ─── Search ──────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  type: 'course' | 'assignment' | 'announcement'
  title: string
  sub: string
  link: string
}

let searchCache: SearchResult[] | null = null
// Call this to bust cache if needed: searchCache = null

async function loadSearchData(): Promise<SearchResult[]> {
  if (searchCache) return searchCache
  const results: SearchResult[] = []
  const [coursesRes, assignRes, annRes] = await Promise.allSettled([
    api.get('/courses'),
    api.get('/assignments'),
    api.get('/announcements'),
  ])
  if (coursesRes.status === 'fulfilled') {
    const courses = coursesRes.value.data.courses || []
    courses.forEach((c: any) => {
      const cLink = `/courses/${encodeURIComponent(c.courseId || c._id)}`
      results.push({ id: `c_${c._id}`, type: 'course', title: c.title, sub: `${c.completedLessons}/${c.totalLessons} sessions`, link: cLink })
      ;(c.sessions || []).forEach((s: any) => {
        const sLink = `/courses/${encodeURIComponent(c.courseId || c._id)}/sessions/${encodeURIComponent(s._id)}`
        results.push({ id: `s_${s._id}`, type: 'course', title: s.topic || s.title, sub: c.title, link: sLink })
      })
    })
  }
  if (assignRes.status === 'fulfilled') {
    ;(assignRes.value.data.assignments || []).forEach((a: any) => {
      results.push({ id: `a_${a._id}`, type: 'assignment', title: a.title, sub: a.status, link: '/assignments' })
    })
  }
  if (annRes.status === 'fulfilled') {
    ;(annRes.value.data.announcements || []).forEach((a: any) => {
      results.push({ id: `n_${a._id}`, type: 'announcement', title: a.title, sub: 'Announcement', link: '/announcements' })
    })
  }
  searchCache = results
  return results
}

function SearchBox() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [allData, setAllData] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadSearchData().then(setAllData).catch(() => {}) }, [])

  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q) { setResults([]); setOpen(false); return }
    const matched = allData.filter(r =>
      r.title.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q)
    ).slice(0, 7)
    setResults(matched)
    setOpen(matched.length > 0)
    setActive(0)
  }, [query, allData])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const go = (r: SearchResult) => {
    navigate(r.link)
    setQuery('')
    setOpen(false)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && results[active]) go(results[active])
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }

  const iconFor = (type: SearchResult['type']) => {
    if (type === 'course') return <BookOpen className="h-3.5 w-3.5 text-blue-600" />
    if (type === 'assignment') return <ClipboardList className="h-3.5 w-3.5 text-rose-500" />
    return <FileText className="h-3.5 w-3.5 text-amber-500" />
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={onKey}
        onFocus={() => query && results.length && setOpen(true)}
        placeholder="Search courses, assignments..."
        className="w-full h-9 pl-9 pr-4 text-sm rounded-xl border border-gray-200 bg-[#f4f7fb] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all"
      />
      {query && (
        <button onClick={() => { setQuery(''); setOpen(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {open && (
        <div className="absolute top-11 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden animate-fade-up">
          {results.map((r, i) => (
            <button
              key={r.id}
              onMouseDown={() => go(r)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === active ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                r.type === 'course' ? 'bg-blue-50' : r.type === 'assignment' ? 'bg-rose-50' : 'bg-amber-50'
              }`}>
                {iconFor(r.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                <p className="text-[11px] text-gray-400 truncate capitalize">{r.sub}</p>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-[10px] text-gray-400">↑↓ navigate · Enter to open · Esc to close</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

interface NavbarProps { onMenuClick: () => void }

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')) }
    catch { return new Set() }
  })
  const panelRef = useRef<HTMLDivElement>(null)

  const initials = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'ST'
  const currentPage = routeLabels[location.pathname] || 'Overview'
  const unread = notifs.filter(n => !readIds.has(n.id)).length

  // Fetch notifications from existing APIs
  useEffect(() => {
    const items: Notif[] = []

    const fetchAll = async () => {
      try {
        const [annRes, assignRes, liveRes] = await Promise.allSettled([
          api.get('/announcements'),
          api.get('/assignments'),
          api.get('/live-classes'),
        ])

        // Announcements (last 5)
        if (annRes.status === 'fulfilled') {
          const anns = annRes.value.data.announcements || []
          anns.slice(0, 5).forEach((a: any) => {
            items.push({
              id: `ann_${a._id}`,
              type: 'announcement',
              title: a.title,
              sub: a.isPinned ? 'Pinned announcement' : 'New announcement',
              time: a.createdAt,
              link: '/announcements',
            })
          })
        }

        // Upcoming deadlines
        if (assignRes.status === 'fulfilled') {
          const assigns = assignRes.value.data.assignments || []
          assigns
            .filter((a: any) => a.status === 'pending' && new Date(a.dueDate) > new Date())
            .slice(0, 3)
            .forEach((a: any) => {
              const daysLeft = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000)
              items.push({
                id: `assign_${a._id}`,
                type: 'deadline',
                title: a.title,
                sub: daysLeft <= 1 ? 'Due today!' : `Due in ${daysLeft} days`,
                time: a.dueDate,
                link: '/assignments',
              })
            })
        }

        // Upcoming live classes
        if (liveRes.status === 'fulfilled') {
          const upcoming = liveRes.value.data.upcoming || []
          upcoming.slice(0, 3).forEach((c: any) => {
            const hoursLeft = Math.ceil((new Date(c.startTime).getTime() - Date.now()) / 3600000)
            items.push({
              id: `live_${c._id}`,
              type: 'liveclass',
              title: c.title,
              sub: hoursLeft <= 0 ? 'Live now!' : hoursLeft < 24 ? `Starts in ${hoursLeft}h` : `Upcoming class`,
              time: c.startTime,
              link: '/live-classes',
            })
          })
        }

        // Sort by time descending
        items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        setNotifs(items)
      } catch {}
    }

    fetchAll()
  }, [])

  // Close panel on outside click
  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  const markAllRead = () => {
    const all = new Set(notifs.map(n => n.id))
    setReadIds(all)
    localStorage.setItem(READ_KEY, JSON.stringify([...all]))
  }

  const markRead = (id: string) => {
    const next = new Set(readIds)
    next.add(id)
    setReadIds(next)
    localStorage.setItem(READ_KEY, JSON.stringify([...next]))
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white border-b border-gray-200 px-5 md:px-6 gap-4">

      {/* Left */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onMenuClick}>
          <Menu className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">{currentPage}</h1>
      </div>

      {/* Center: search */}
      <div className="hidden md:flex flex-1 max-w-sm mx-auto">
        <SearchBox />
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-2">

        {/* Bell with panel */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Bell className="h-4 w-4 text-gray-500" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 rounded-2xl bg-white border border-gray-200 shadow-xl z-50 overflow-hidden animate-fade-up">

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900">Notifications</span>
                  {unread > 0 && (
                    <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">
                      {unread} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2 text-gray-400">
                    <Bell className="h-8 w-8 opacity-20" />
                    <p className="text-xs">No notifications yet</p>
                  </div>
                ) : (
                  notifs.map(n => {
                    const isRead = readIds.has(n.id)
                    return (
                      <Link
                        key={n.id}
                        to={n.link}
                        onClick={() => { markRead(n.id); setNotifOpen(false) }}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                          !isRead ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <NotifIcon type={n.type} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-tight truncate ${!isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{n.sub}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-gray-400">{timeAgo(n.time)}</span>
                          {!isRead && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              {notifs.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-2.5">
                  <Link
                    to="/announcements"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    View all announcements →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/60 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[11px] font-bold text-white" style={{ background: '#1d4ed8' }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-foreground leading-none">{user?.name?.split(' ')[0]}</p>
                <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Student</p>
              </div>
              <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              {user?.batchName && (
                <span className="inline-block mt-1.5 text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                  {user.batchName}
                </span>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
