import { useEffect, useState } from 'react'
import { Trophy, Medal, BookOpen, CalendarDays, Star, Search, X, Video, Monitor } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import api from '../services/api'

interface Ranking {
  _id: string
  name: string
  rank: number
  completed: number
  totalSessions: number
  progressPercent: number
  attendancePercent: number
  score: number
  presentationCount: number
  coCurrTotal: number
  isYou: boolean
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: '#FFD700' }}>
      <Trophy className="h-4 w-4 text-white" />
    </div>
  )
  if (rank === 2) return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-300">
      <Medal className="h-4 w-4 text-white" />
    </div>
  )
  if (rank === 3) return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: '#CD7F32' }}>
      <Medal className="h-4 w-4 text-white" />
    </div>
  )
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
      <span className="text-sm font-bold text-gray-500">#{rank}</span>
    </div>
  )
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const AVATAR_COLORS = [
  '#1d4ed8', '#7c3aed', '#059669', '#dc2626', '#d97706',
  '#0891b2', '#be185d', '#4338ca', '#047857', '#b45309',
]

export default function Leaderboard() {
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [loading, setLoading] = useState(true)
  const [myRank, setMyRank] = useState<Ranking | null>(null)
  const [search, setSearch] = useState('')
  const [displayCount, setDisplayCount] = useState(20)

  const filteredRankings = search.trim()
    ? rankings.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : rankings

  const displayed = filteredRankings.slice(0, displayCount)
  const hasMore = displayCount < filteredRankings.length

  useEffect(() => {
    api.get('/leaderboard')
      .then(r => {
        const list: Ranking[] = r.data.rankings || []
        setRankings(list)
        setMyRank(list.find(r => r.isYou) || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-2xl" />
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
    </div>
  )

  return (
    <div className="space-y-5 pb-8 animate-fade-up">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ranked by lesson progress (70%) + attendance (30%)</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setDisplayCount(20)
          }}
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button
            onClick={() => {
              setSearch('')
              setDisplayCount(20)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* My rank card */}
      {myRank && (
        <div
          className="rounded-2xl p-5 text-white shadow-md"
          style={{ background: 'linear-gradient(135deg, #1a2744 0%, #2563eb 100%)' }}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white font-bold text-lg">
                {getInitials(myRank.name)}
              </div>
              <div>
                <p className="font-bold text-white text-lg leading-none">Your Ranking</p>
                <p className="text-white/70 text-sm mt-0.5">{myRank.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 px-4 py-2 rounded-xl">
              <Star className="h-4 w-4 text-yellow-300" />
              <span className="font-bold text-white text-xl">#{myRank.rank}</span>
              <span className="text-white/60 text-sm">of {rankings.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mt-4">
            {[
              { label: 'Score', value: `${myRank.score}%` },
              { label: 'Videos', value: `${myRank.completed}/${myRank.totalSessions}` },
              { label: 'Attendance', value: `${myRank.attendancePercent}%` },
              { label: 'Presentations', value: `${myRank.presentationCount}` },
              { label: 'Co-Curriculum', value: `${myRank.coCurrTotal}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 rounded-xl px-2 py-2.5 text-center">
                <p className="text-white font-bold text-base leading-none">{value}</p>
                <p className="text-white/60 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rankings list */}
      <div className="space-y-2">
        {displayed.map((r, i) => (
          <div
            key={r._id}
            className={`flex items-center gap-4 rounded-2xl p-4 border shadow-sm transition-all animate-fade-up ${
              r.isYou
                ? 'bg-blue-50 border-blue-200'
                : r.rank <= 3
                ? 'bg-white border-gray-200 hover:border-gray-300'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <RankBadge rank={r.rank} />

            {/* Avatar */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold"
              style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
            >
              {getInitials(r.name)}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm truncate ${r.isYou ? 'text-blue-700' : 'text-gray-900'}`}>
                {r.name} {r.isYou && <span className="text-[10px] font-bold text-blue-500 ml-1">YOU</span>}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Video className="h-3 w-3" /> {r.completed}/{r.totalSessions}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <CalendarDays className="h-3 w-3" /> {r.attendancePercent}%
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Monitor className="h-3 w-3" /> {r.presentationCount} pres
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <BookOpen className="h-3 w-3" /> {r.coCurrTotal} co-curr
                </span>
              </div>
            </div>

            {/* Score bar + value */}
            <div className="shrink-0 text-right">
              <p className={`text-base font-bold ${r.rank === 1 ? 'text-yellow-500' : r.isYou ? 'text-blue-600' : 'text-gray-700'}`}>
                {r.score}%
              </p>
              <div className="mt-1 h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${r.score}%`,
                    background: r.rank === 1 ? '#f59e0b' : r.isYou ? '#2563eb' : '#94a3b8',
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        {filteredRankings.length === 0 && (
          <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
            <Trophy className="h-12 w-12 opacity-20" />
            <p className="text-sm">{search ? 'No matches found' : 'No rankings yet'}</p>
          </div>
        )}
      </div>

      {/* Load More button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setDisplayCount(prev => prev + 20)}
            className="px-6 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-medium text-sm hover:bg-blue-100 transition-colors"
          >
            Load More ({displayed.length} of {filteredRankings.length})
          </button>
        </div>
      )}
    </div>
  )
}
