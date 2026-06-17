import { useEffect, useState } from 'react'
import { Video, Plus, Trash2, ExternalLink, Edit2, X, Loader2, Calendar, Clock, Users, Link2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import adminApi from '../../services/adminApi'

interface Batch { _id: string; name: string; code?: string }
interface LiveClass {
  _id: string
  title: string
  batch: string
  startTime: string
  endTime: string
  meetingLink?: string
  description?: string
}

const EMPTY_FORM = { title: '', batchId: '', startTime: '', endTime: '', meetingLink: '', description: '' }

function GoogleConnectBanner({ onConnected }: { onConnected: () => void }) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    adminApi.get('/google/status').then(r => setConnected(r.data.connected)).catch(() => setConnected(false))
    // Handle redirect back from Google OAuth
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      toast.success('Google account connected!')
      setConnected(true)
      onConnected()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('google') === 'error') {
      toast.error('Google connection failed. Try again.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const connect = () => {
    const token = localStorage.getItem('admin_token')
    window.location.href = `http://localhost:5001/api/admin/google/auth?token=${token}`
  }

  const disconnect = async () => {
    setDisconnecting(true)
    await adminApi.delete('/google/disconnect')
    setConnected(false)
    toast.success('Google account disconnected')
    setDisconnecting(false)
  }

  if (connected === null) return null

  return (
    <div className={`flex items-center justify-between rounded-2xl px-5 py-3.5 border ${connected ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center gap-3">
        {connected
          ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          : <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
        }
        <div>
          <p className="text-sm font-semibold text-foreground">
            {connected ? 'Google Account Connected' : 'Connect Google Account'}
          </p>
          <p className="text-xs text-muted-foreground">
            {connected
              ? 'Auto-generate Google Meet links when scheduling classes'
              : 'Connect to auto-generate Google Meet links instantly'}
          </p>
        </div>
      </div>
      {connected ? (
        <Button variant="outline" size="sm" onClick={disconnect} disabled={disconnecting} className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-100">
          {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Disconnect'}
        </Button>
      ) : (
        <Button size="sm" onClick={connect} className="text-xs gap-1.5 bg-[#0d2b2b] text-white">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Connect Google
        </Button>
      )}
    </div>
  )
}

function toLocalDatetimeValue(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function classStatus(lc: LiveClass) {
  const now = Date.now()
  const start = new Date(lc.startTime).getTime()
  const end = new Date(lc.endTime).getTime()
  if (now >= start && now <= end) return 'live'
  if (now < start) return 'upcoming'
  return 'ended'
}

export default function AdminLiveClasses() {
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LiveClass | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterBatch, setFilterBatch] = useState('')
  const [googleConnected, setGoogleConnected] = useState(false)
  const [generatingMeet, setGeneratingMeet] = useState(false)

  const fetchClasses = async () => {
    const params = filterBatch ? `?batchId=${filterBatch}` : ''
    const res = await adminApi.get(`/live-classes${params}`)
    setClasses(res.data.classes || [])
  }

  useEffect(() => {
    Promise.all([
      adminApi.get('/sessions/batches'),
      adminApi.get('/live-classes'),
    ]).then(([bRes, cRes]) => {
      setBatches(bRes.data.batches || [])
      setClasses(cRes.data.classes || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { if (!loading) fetchClasses() }, [filterBatch])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (lc: LiveClass) => {
    setEditing(lc)
    setForm({
      title: lc.title,
      batchId: lc.batch,
      startTime: toLocalDatetimeValue(lc.startTime),
      endTime: toLocalDatetimeValue(lc.endTime),
      meetingLink: lc.meetingLink || '',
      description: lc.description || '',
    })
    setShowForm(true)
  }

  const generateMeetLink = async () => {
    if (!form.startTime) {
      toast.error('Enter start time first')
      return
    }
    // Auto-fix: default title if empty
    const title = form.title || 'HACA Live Class'
    // Auto-fix: if endTime missing or before startTime, set to 1 hour after start
    let endTime = form.endTime
    if (!endTime || new Date(endTime) <= new Date(form.startTime)) {
      const end = new Date(new Date(form.startTime).getTime() + 60 * 60 * 1000)
      endTime = end.toISOString().slice(0, 16)
      setForm(f => ({ ...f, title, endTime }))
    } else {
      setForm(f => ({ ...f, title }))
    }
    setGeneratingMeet(true)
    try {
      const res = await adminApi.post('/google/create-meet', { title, startTime: form.startTime, endTime })
      setForm(f => ({ ...f, meetingLink: res.data.meetLink }))
      toast.success('Google Meet link generated!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate Meet link')
    }
    setGeneratingMeet(false)
  }

  const handleSave = async () => {
    if (!form.title || !form.batchId || !form.startTime || !form.endTime) {
      toast.error('Title, batch, start time and end time are required')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await adminApi.patch(`/live-classes/${editing._id}`, {
          title: form.title, startTime: form.startTime, endTime: form.endTime,
          meetingLink: form.meetingLink, description: form.description,
        })
        toast.success('Class updated')
      } else {
        await adminApi.post('/live-classes', {
          batchId: form.batchId, title: form.title,
          startTime: form.startTime, endTime: form.endTime,
          meetingLink: form.meetingLink, description: form.description,
        })
        toast.success('Class scheduled')
      }
      setShowForm(false)
      fetchClasses()
    } catch {}
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this class?')) return
    await adminApi.delete(`/live-classes/${id}`)
    toast.success('Deleted')
    setClasses(prev => prev.filter(c => c._id !== id))
  }

  const getBatchName = (id: string) => batches.find(b => b._id === id)?.name || '—'

  const upcoming = classes.filter(c => classStatus(c) === 'upcoming')
  const live     = classes.filter(c => classStatus(c) === 'live')
  const ended    = classes.filter(c => classStatus(c) === 'ended')

  if (loading) return (
    <div className="flex items-center justify-center h-60">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Live Classes</h1>
          <p className="text-sm text-muted-foreground">Schedule and manage Google Meet sessions for students</p>
        </div>
        <Button onClick={openCreate} className="gap-2" style={{ background: '#0d2b2b' }}>
          <Plus className="h-4 w-4" /> Schedule Class
        </Button>
      </div>

      {/* Google Connect Banner */}
      <GoogleConnectBanner onConnected={() => setGoogleConnected(true)} />

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filterBatch}
          onChange={e => setFilterBatch(e.target.value)}
          className="h-9 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Batches</option>
          {batches.map(b => <option key={b._id} value={b._id}>{b.code ? `[${b.code}] ` : ''}{b.name}</option>)}
        </select>
        <span className="text-sm text-muted-foreground">{classes.length} class{classes.length !== 1 ? 'es' : ''}</span>
      </div>

      {/* Live now */}
      {live.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-red-600 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Live Now
          </h2>
          {live.map(lc => <ClassCard key={lc._id} lc={lc} batchName={getBatchName(lc.batch)} status="live" onEdit={openEdit} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">Upcoming</h2>
          {upcoming.map(lc => <ClassCard key={lc._id} lc={lc} batchName={getBatchName(lc.batch)} status="upcoming" onEdit={openEdit} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Ended */}
      {ended.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-muted-foreground">Past Classes</h2>
          {ended.map(lc => <ClassCard key={lc._id} lc={lc} batchName={getBatchName(lc.batch)} status="ended" onEdit={openEdit} onDelete={handleDelete} />)}
        </div>
      )}

      {classes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Video className="h-10 w-10 opacity-30" />
          <p className="font-semibold">No classes scheduled</p>
          <p className="text-sm">Click "Schedule Class" to create a live session</p>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-bold text-base">{editing ? 'Edit Class' : 'Schedule New Class'}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input placeholder="e.g. Python Fundamentals — Session 3" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              {!editing && (
                <div className="space-y-1.5">
                  <Label>Batch *</Label>
                  <select
                    value={form.batchId}
                    onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select batch...</option>
                    {batches.map(b => <option key={b._id} value={b._id}>{b.code ? `[${b.code}] ` : ''}{b.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Time *</Label>
                  <Input type="datetime-local" value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time *</Label>
                  <Input type="datetime-local" value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Google Meet Link</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={form.meetingLink}
                    onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateMeetLink}
                    disabled={generatingMeet}
                    className="shrink-0 gap-1.5 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                    title={googleConnected ? 'Auto-generate Meet link' : 'Connect Google first'}
                  >
                    {generatingMeet
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Link2 className="h-3.5 w-3.5" />
                    }
                    {generatingMeet ? 'Generating...' : 'Auto Generate'}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Click "Auto Generate" to create a Google Meet instantly, or paste a link manually.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <textarea
                  rows={2}
                  placeholder="What will be covered in this session..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} style={{ background: '#0d2b2b' }}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Schedule Class'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ClassCard({ lc, batchName, status, onEdit, onDelete }: {
  lc: LiveClass; batchName: string; status: string
  onEdit: (lc: LiveClass) => void; onDelete: (id: string) => void
}) {
  const start = new Date(lc.startTime)
  const end   = new Date(lc.endTime)
  const fmt = (d: Date) => d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`bg-white rounded-2xl border p-5 flex items-start gap-4 ${
      status === 'live' ? 'border-red-200 shadow-sm shadow-red-100' :
      status === 'upcoming' ? 'border-blue-200' : 'border-border opacity-70'
    }`}>
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
        status === 'live' ? 'bg-red-50' : status === 'upcoming' ? 'bg-blue-50' : 'bg-muted'
      }`}>
        <Video className={`h-5 w-5 ${
          status === 'live' ? 'text-red-500' : status === 'upcoming' ? 'text-blue-700' : 'text-muted-foreground'
        }`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-foreground">{lc.title}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{batchName}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmt(start)}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                {Math.round((end.getTime() - start.getTime()) / 60000)}m
              </span>
            </div>
            {lc.description && <p className="text-xs text-muted-foreground mt-1">{lc.description}</p>}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {status === 'live' && (
              <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
              </span>
            )}
            <button onClick={() => onEdit(lc)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(lc._id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {lc.meetingLink && (
          <div className="mt-3 flex items-center gap-2">
            <a href={lc.meetingLink} target="_blank" rel="noreferrer"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                status === 'live'
                  ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}>
              <ExternalLink className="h-3 w-3" />
              {status === 'live' ? 'Join Now' : 'Join Link'}
            </a>
            <span className="text-[11px] text-muted-foreground truncate max-w-xs">{lc.meetingLink}</span>
          </div>
        )}

        {!lc.meetingLink && (
          <p className="mt-2 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 inline-block">
            No meet link set — edit to add one
          </p>
        )}
      </div>
    </div>
  )
}
