import { useEffect, useState } from 'react'
import { Bell, Pin, Search, Calendar } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import api from '../services/api'
import { formatDate } from '../lib/utils'
import type { Announcement } from '../types'

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pinned'>('all')

  useEffect(() => {
    api.get('/announcements')
      .then(r => setAnnouncements(r.data.announcements || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = announcements.filter(a => {
    if (filter === 'pinned' && !a.isPinned) return false
    if (search) {
      const q = search.toLowerCase()
      return a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
    }
    return true
  })

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64 rounded-xl" />
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
    </div>
  )

  return (
    <div className="space-y-5 pb-8 animate-fade-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500 mt-0.5">{announcements.length} total · {announcements.filter(a => a.isPinned).length} pinned</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {(['all', 'pinned'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={filter === f ? { background: '#1a2744' } : {}}
            >
              {f === 'all' ? 'All' : '📌 Pinned'}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search announcements..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
          <Bell className="h-12 w-12 opacity-20" />
          <p className="text-sm">{search ? 'No results found' : 'No announcements yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, i) => (
            <div
              key={a._id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:border-blue-200 transition-all animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  a.isPinned ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'
                }`}>
                  {a.isPinned ? <Pin className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900 text-base">{a.title}</h3>
                    {a.isPinned && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        PINNED
                      </span>
                    )}
                  </div>

                  <div
                    className="text-sm text-gray-600 leading-relaxed line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: a.body }}
                  />

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(a.createdAt)}
                    </span>
                    {a.createdBy?.name && (
                      <span>by <span className="font-medium text-gray-500">{a.createdBy.name}</span></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
