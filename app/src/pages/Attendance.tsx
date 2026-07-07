import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import api from '../services/api'
import type { AttendanceRecord, AttendanceStatus } from '../types'

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; dot: string; badge: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  present: { label: 'Present', dot: 'bg-green-500', badge: 'success' },
  absent: { label: 'Absent', dot: 'bg-red-500', badge: 'destructive' },
  late: { label: 'Late', dot: 'bg-yellow-500', badge: 'warning' },
  excused: { label: 'Excused', dot: 'bg-gray-400', badge: 'secondary' },
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function Attendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(new Date())

  useEffect(() => {
    api.get('/attendance')
      .then((r) => setRecords(r.data.records || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const recordMap = Object.fromEntries(
    records.map((r) => [r.date.slice(0, 10), r])
  )

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  // All-time stats (matches SHO app calculation)
  const allCounts = { present: 0, absent: 0, late: 0, excused: 0 }
  records.forEach((r) => { allCounts[r.status] = (allCounts[r.status] || 0) + 1 })
  const allTotal = records.length
  const overallPercent = allTotal > 0 ? Math.round(((allCounts.present + allCounts.late) / allTotal) * 100) : 0

  // Monthly stats for current calendar view
  const monthRecords = records.filter((r) => {
    const d = new Date(r.date)
    return d.getFullYear() === year && d.getMonth() === month
  })
  const counts = { present: 0, absent: 0, late: 0, excused: 0 }
  monthRecords.forEach((r) => counts[r.status]++)
  const total = monthRecords.length

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-sm text-muted-foreground">Read-only — marked by your SHO</p>
      </div>

      {/* Overall attendance — matches SHO app calculation */}
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-muted-foreground">Overall Attendance</p>
            <p className="text-3xl font-bold text-green-600">{overallPercent}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{allCounts.present + allCounts.late} attended</p>
            <p className="text-sm text-muted-foreground">out of {allTotal} days</p>
          </div>
        </CardContent>
      </Card>

      {/* Monthly breakdown for current calendar view */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {(Object.entries(counts) as [AttendanceStatus, number][]).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="p-4 text-center">
              <div className={`mx-auto mb-2 h-3 w-3 rounded-full ${STATUS_CONFIG[status].dot}`} />
              <p className="text-xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{STATUS_CONFIG[status].label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">this month</p>
            </CardContent>
          </Card>
        ))}
      </div>


      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {MONTH_NAMES[month]} {year}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const record = recordMap[dateStr]
              const isToday = dateStr === new Date().toISOString().slice(0, 10)

              return (
                <div
                  key={i}
                  className={`relative flex h-10 items-center justify-center rounded-md text-sm font-medium transition-colors
                    ${isToday ? 'ring-2 ring-primary' : ''}
                    ${record
                      ? record.status === 'present' ? 'bg-green-100 text-green-800'
                      : record.status === 'absent' ? 'bg-red-100 text-red-800'
                      : record.status === 'late' ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-600'
                    : 'hover:bg-muted'}`}
                  title={record ? `${STATUS_CONFIG[record.status].label}${record.remarks ? `: ${record.remarks}` : ''}` : ''}
                >
                  {day}
                  {record && (
                    <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${STATUS_CONFIG[record.status].dot}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG[AttendanceStatus]][]).map(([status, cfg]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-xs text-muted-foreground">{cfg.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {records.slice(-20).reverse().map((r) => (
            <div key={r.date} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm">{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
              <div className="flex items-center gap-2">
                {r.remarks && <span className="text-xs text-muted-foreground">{r.remarks}</span>}
                <Badge variant={STATUS_CONFIG[r.status].badge}>{STATUS_CONFIG[r.status].label}</Badge>
              </div>
            </div>
          ))}
          {records.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-6">No attendance records yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
