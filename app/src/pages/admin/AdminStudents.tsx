import { useEffect, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { Skeleton } from '../../components/ui/skeleton'
import { Input } from '../../components/ui/input'
import adminApi from '../../services/adminApi'

interface Student {
  _id: string; name: string; email: string; phone?: string; batchName?: string
}

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.get('/sessions/batches').then(r => setBatches(r.data.batches || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedBatch) params.set('batch', selectedBatch)
    if (search) params.set('search', search)
    adminApi.get(`/students?${params}`)
      .then(r => setStudents(r.data.students || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedBatch, search])

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold">Students</h1>
        <p className="text-sm text-muted-foreground">{students.length} students found</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or email…" value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl" />
        </div>
        <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
          className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All Batches</option>
          {batches.map(b => <option key={String(b._id)} value={String(b._id)}>{b.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
            <Users className="h-8 w-8 opacity-30" />
            <p className="text-sm">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-medium text-muted-foreground bg-muted/30">
                  <th className="px-5 py-3 text-left">#</th>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Phone</th>
                  <th className="px-5 py-3 text-left">Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s, i) => (
                  <tr key={String(s._id)} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-5 py-3 font-semibold">{s.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{s.email}</td>
                    <td className="px-5 py-3 text-muted-foreground">{s.phone || '—'}</td>
                    <td className="px-5 py-3">
                      {s.batchName
                        ? <span className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{s.batchName}</span>
                        : <span className="text-muted-foreground">—</span>}
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
