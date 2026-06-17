import { useEffect, useState } from 'react'
import { Video, CalendarDays, Clock, PlayCircle, ExternalLink } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import api from '../services/api'

interface LiveClass {
  _id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  meetingLink?: string
  recordingLink?: string
  mentor?: { name: string }
}

interface LiveData {
  upcoming: LiveClass[]
  past: LiveClass[]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
function duration(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

function ClassCard({ cls, isPast }: { cls: LiveClass; isPast?: boolean }) {
  const now = Date.now()
  const start = new Date(cls.startTime).getTime()
  const end   = new Date(cls.endTime).getTime()
  const isLive = now >= start && now <= end

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
      isLive ? 'border-red-200' : isPast ? 'border-gray-200' : 'border-blue-100'
    }`}>
      {/* Status strip */}
      <div className={`h-1 w-full ${isLive ? 'bg-red-500' : isPast ? 'bg-gray-200' : 'bg-blue-500'}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
                </span>
              )}
              <h3 className="font-semibold text-gray-900 text-base leading-tight">{cls.title}</h3>
            </div>
            {cls.description && (
              <p className="text-sm text-gray-500 line-clamp-2">{cls.description}</p>
            )}
          </div>

          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isLive ? 'bg-red-50' : isPast ? 'bg-gray-50' : 'bg-blue-50'
          }`}>
            <Video className={`h-4 w-4 ${isLive ? 'text-red-500' : isPast ? 'text-gray-400' : 'text-blue-600'}`} />
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {fmtDate(cls.startTime)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {fmtTime(cls.startTime)} – {fmtTime(cls.endTime)}
            <span className="ml-1 text-gray-400">({duration(cls.startTime, cls.endTime)} min)</span>
          </span>
          {cls.mentor?.name && (
            <span className="font-medium text-gray-600">{cls.mentor.name}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!isPast && cls.meetingLink && (
            <a
              href={cls.meetingLink}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 ${
                isLive ? 'bg-red-500' : 'bg-blue-600'
              }`}
            >
              <PlayCircle className="h-4 w-4" />
              {isLive ? 'Join Now' : 'Join Class'}
            </a>
          )}
          {isPast && cls.recordingLink && (
            <a
              href={cls.recordingLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
            >
              <PlayCircle className="h-4 w-4" /> Watch Recording
            </a>
          )}
          {!isPast && !cls.meetingLink && (
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
              Meeting link not set yet
            </span>
          )}
          {isPast && !cls.recordingLink && (
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
              No recording available
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LiveClasses() {
  const [data, setData] = useState<LiveData>({ upcoming: [], past: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    api.get('/live-classes')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const items = tab === 'upcoming' ? data.upcoming : data.past

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
    </div>
  )

  return (
    <div className="space-y-5 pb-8 animate-fade-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Classes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data.upcoming.length} upcoming · {data.past.length} past
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {(['upcoming', 'past'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === t
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={tab === t ? { background: '#1a2744' } : {}}
            >
              {t}
              <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {t === 'upcoming' ? data.upcoming.length : data.past.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Classes */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
          <Video className="h-12 w-12 opacity-20" />
          <p className="text-sm">
            {tab === 'upcoming' ? 'No upcoming classes scheduled' : 'No past classes yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((cls, i) => (
            <div key={cls._id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <ClassCard cls={cls} isPast={tab === 'past'} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
