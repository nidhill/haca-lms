import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, TrendingUp, BookOpen } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import api from '../services/api'
import { formatDate } from '../lib/utils'

interface ExamResult {
  _id: string
  moduleName: string
  marks: number
  totalMarks: number
  percent: number
  grade: string
  isPassed: boolean
  examDate?: string
  publishedAt?: string
}

const GRADE_COLOR: Record<string, string> = {
  'A+': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'A':  'bg-emerald-50 text-emerald-600 border-emerald-200',
  'B':  'bg-blue-50 text-blue-600 border-blue-200',
  'C':  'bg-yellow-50 text-yellow-600 border-yellow-200',
  'D':  'bg-orange-50 text-orange-600 border-orange-200',
  'F':  'bg-red-50 text-red-600 border-red-200',
}

export default function ExamResults() {
  const [results, setResults] = useState<ExamResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/exams')
      .then((r) => setResults(r.data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const passed  = results.filter(r => r.isPassed).length
  const failed  = results.length - passed
  const avgPct  = results.length
    ? Math.round(results.reduce((acc, r) => acc + r.percent, 0) / results.length)
    : 0

  const chartData = [...results]
    .sort((a, b) => new Date(a.examDate || a.publishedAt || 0).getTime() - new Date(b.examDate || b.publishedAt || 0).getTime())
    .map(r => ({
      name: r.moduleName.length > 14 ? r.moduleName.slice(0, 14) + '…' : r.moduleName,
      score: r.percent,
    }))

  if (loading) return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-up pb-8">

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{passed}</p>
            <p className="text-sm text-muted-foreground">Exams Passed</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{failed}</p>
            <p className="text-sm text-muted-foreground">Not Passed</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{avgPct}%</p>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </div>
        </div>
      </div>

      {/* Score trend chart */}
      {chartData.length > 1 ? (
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-bold text-base">Score Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
              <Line
                type="monotone" dataKey="score"
                stroke="#0d9488" strokeWidth={2}
                dot={{ r: 4, fill: '#0d9488' }} activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : results.length === 1 ? (
        <div className="bg-white rounded-2xl border border-border p-8 flex flex-col items-center gap-3 text-muted-foreground">
          <TrendingUp className="h-8 w-8 opacity-40" />
          <p className="text-sm font-medium">Complete more exams to see your score trend</p>
          <p className="text-xs">Your progress will be tracked after your next exam.</p>
        </div>
      ) : null}

      {/* Results table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-bold text-base">All Exams</h3>
        </div>

        {results.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
            <BookOpen className="h-8 w-8 opacity-30" />
            <p className="text-sm">No exam results published yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground bg-muted/30">
                  <th className="px-5 py-3">Module</th>
                  <th className="px-5 py-3 text-right">Score</th>
                  <th className="px-5 py-3 text-center">Grade</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((r) => (
                  <tr key={String(r._id)} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 font-semibold">{r.moduleName}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold">{r.marks}/{r.totalMarks}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">({r.percent}%)</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center justify-center h-7 w-9 rounded-lg text-xs font-bold border ${GRADE_COLOR[r.grade] || GRADE_COLOR['F']}`}>
                        {r.grade}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        r.isPassed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {r.isPassed ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {r.isPassed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-muted-foreground">
                      {formatDate(r.examDate || r.publishedAt || '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
