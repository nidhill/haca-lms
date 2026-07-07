import { useEffect, useState } from 'react'
import { MessageSquare, Star, TrendingUp, ShieldCheck, ExternalLink } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import api from '../services/api'

interface FeedbackItem {
  _id: string
  type: string
  comments?: string
  formLink?: string
  ratings?: {
    overall?: number
    communication?: number
    punctuality?: number
    understanding?: number
    participation?: number
  }
  strengths?: string[]
  areasOfImprovement?: string[]
  givenBy?: { name: string; role: string }
  createdAt: string
}

function StarRow({ label, value }: { label: string; value?: number }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
          />
        ))}
        <span className="text-xs font-semibold text-gray-600 ml-1">{value}/5</span>
      </div>
    </div>
  )
}

function scoreColor(score?: number) {
  if (!score) return 'bg-gray-100 text-gray-500'
  if (score >= 4) return 'bg-emerald-100 text-emerald-700'
  if (score >= 3) return 'bg-blue-100 text-blue-700'
  if (score >= 2) return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

function scoreLabel(score?: number) {
  if (!score) return '—'
  if (score >= 5) return 'Excellent'
  if (score >= 4) return 'Good'
  if (score >= 3) return 'Average'
  if (score >= 2) return 'Needs Improvement'
  return 'Critical'
}

export default function MyFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/feedback/my')
      .then(r => setItems(r.data.feedback || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  )

  return (
    <div className="space-y-5 pb-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Feedback</h1>
        <p className="text-sm text-gray-500 mt-0.5">Feedback and evaluations from your mentors</p>
      </div>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700">No feedback yet</p>
          <p className="text-sm text-gray-400 mt-1">Your mentor's feedback will appear here</p>
        </div>
      )}

      <div className="space-y-4">
        {items.map(item => (
          <div key={item._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-800">
                  {item.givenBy?.name || 'Mentor'}
                </span>
                <span className="text-xs text-gray-400 capitalize">({item.givenBy?.role})</span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Google Form type */}
              {item.type === 'google_form' && item.formLink && (
                <a
                  href={item.formLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">Open Feedback Form</span>
                </a>
              )}

              {/* Overall score pill */}
              {item.ratings?.overall && (
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${scoreColor(item.ratings.overall)}`}>
                    {scoreLabel(item.ratings.overall)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`h-4 w-4 ${i <= (item.ratings?.overall || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              {item.comments && (
                <p className="text-sm text-gray-700 leading-relaxed">{item.comments}</p>
              )}

              {/* Rating breakdown */}
              {item.ratings && Object.keys(item.ratings).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Rating Breakdown</p>
                  <StarRow label="Communication" value={item.ratings.communication} />
                  <StarRow label="Punctuality" value={item.ratings.punctuality} />
                  <StarRow label="Understanding" value={item.ratings.understanding} />
                  <StarRow label="Participation" value={item.ratings.participation} />
                </div>
              )}

              {/* Strengths */}
              {item.strengths && item.strengths.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <p className="text-xs font-semibold text-emerald-700">Strengths</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.strengths.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Areas of improvement */}
              {item.areasOfImprovement && item.areasOfImprovement.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-xs font-semibold text-amber-700">Areas to Improve</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.areasOfImprovement.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-xs text-amber-700 font-medium">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
