import { useEffect, useState, useMemo, useRef } from 'react'
import { PlayCircle, VideoOff, Check, ChevronDown, ChevronUp, Search, SlidersHorizontal, Upload, X, Loader2 } from 'lucide-react'
import { Skeleton } from '../../components/ui/skeleton'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { toast } from 'sonner'
import adminApi from '../../services/adminApi'

interface Batch { _id: string; name: string; code: string; mode: string; school: string }
interface Session {
  _id: string; topic: string; module: string; status: string
  curriculumDay: number; duration?: number; recordingUrl?: string | null
}

export default function AdminSessions() {
  const [allBatches, setAllBatches]   = useState<Batch[]>([])
  const [schools, setSchools]         = useState<string[]>([])
  const [filterSchool, setFilterSchool] = useState('All')
  const [filterMode, setFilterMode]   = useState('All')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [grouped, setGrouped]         = useState<Record<string, Session[]>>({})
  const [loadingBatches, setLoadingBatches] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [urlInput, setUrlInput]       = useState('')
  const [saving, setSaving]           = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  // Load batches once
  useEffect(() => {
    adminApi.get('/sessions/batches')
      .then(r => {
        const batches: Batch[] = r.data.batches || []
        setAllBatches(batches)
        setSchools(r.data.schools || [])
        if (batches.length > 0) setSelectedBatch(String(batches[0]._id))
      })
      .catch(() => toast.error('Failed to load batches'))
      .finally(() => setLoadingBatches(false))
  }, [])

  // Filtered batch list based on school + mode
  const filteredBatches = useMemo(() => allBatches.filter(b => {
    if (filterSchool !== 'All' && b.school !== filterSchool) return false
    if (filterMode   !== 'All' && b.mode  !== filterMode)   return false
    return true
  }), [allBatches, filterSchool, filterMode])

  // When filter changes, select first matching batch
  const handleFilterSchool = (val: string) => {
    setFilterSchool(val)
    const first = allBatches.find(b =>
      (val === 'All' || b.school === val) &&
      (filterMode === 'All' || b.mode === filterMode)
    )
    if (first) setSelectedBatch(String(first._id))
    else { setSelectedBatch(''); setGrouped({}) }
  }

  const handleFilterMode = (val: string) => {
    setFilterMode(val)
    const first = allBatches.find(b =>
      (filterSchool === 'All' || b.school === filterSchool) &&
      (val === 'All' || b.mode === val)
    )
    if (first) setSelectedBatch(String(first._id))
    else { setSelectedBatch(''); setGrouped({}) }
  }

  // Load sessions when batch changes
  useEffect(() => {
    if (!selectedBatch) return
    setLoadingSessions(true)
    setExpandedModule(null)
    setGrouped({})
    adminApi.get(`/sessions?batchId=${selectedBatch}`)
      .then(r => setGrouped(r.data.grouped || {}))
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setLoadingSessions(false))
  }, [selectedBatch])

  const saveRecording = async (sessionId: string) => {
    setSaving(true)
    try {
      await adminApi.patch(`/sessions/${sessionId}/recording`, { recordingUrl: urlInput.trim() || null })
      toast.success('Recording URL saved')
      setGrouped(prev => {
        const next = { ...prev }
        for (const mod in next) {
          next[mod] = next[mod].map(s =>
            s._id === sessionId ? { ...s, recordingUrl: urlInput.trim() || null } : s
          )
        }
        return next
      })
      setEditingId(null)
      setUrlInput('')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const uploadFile = async (_sessionId: string, file: File) => {
    setUploading(true)
    setUploadProgress(0)
    try {
      const formData = new FormData()
      formData.append('video', file)
      const res = await adminApi.post('/sessions/upload-recording', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      setUrlInput(res.data.url)
      toast.success('Video uploaded — click ✓ to save')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const modules = Object.keys(grouped).sort()
  const filteredModules = search
    ? modules.filter(m => {
        const q = search.toLowerCase()
        return m.toLowerCase().includes(q) ||
          (grouped[m] || []).some(s => s.topic?.toLowerCase().includes(q))
      })
    : modules

  const selectedBatchObj = allBatches.find(b => String(b._id) === selectedBatch)
  const totalSessions    = Object.values(grouped).reduce((a, s) => a + s.length, 0)
  const totalRecordings  = Object.values(grouped).flat().filter(s => s.recordingUrl).length

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold">Sessions</h1>
        <p className="text-sm text-muted-foreground">Add recording URLs to class sessions</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* School */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">School</label>
            <select value={filterSchool} onChange={e => handleFilterSchool(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="All">All Schools</option>
              {schools.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Mode */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Mode</label>
            <div className="flex gap-2 h-10">
              {['All', 'Online', 'Offline'].map(m => (
                <button key={m} onClick={() => handleFilterMode(m)}
                  className={`flex-1 rounded-xl text-sm font-medium border transition-colors ${
                    filterMode === m
                      ? 'bg-[#0d2b2b] text-white border-[#0d2b2b]'
                      : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Batch */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Batch {loadingBatches ? '(loading…)' : `(${filteredBatches.length})`}
            </label>
            <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={filteredBatches.length === 0 || loadingBatches}>
              {filteredBatches.length === 0
                ? <option>No batches found</option>
                : filteredBatches.map(b => (
                    <option key={String(b._id)} value={String(b._id)}>
                      [{b.code}] {b.name}
                    </option>
                  ))}
            </select>
          </div>
        </div>

        {/* Selected batch info strip */}
        {selectedBatchObj && (
          <div className="flex items-center gap-3 pt-1 flex-wrap border-t border-border/50">
            <span className="text-xs font-bold bg-[#0d2b2b] text-white px-2.5 py-1 rounded-lg">{selectedBatchObj.code}</span>
            <span className="text-sm font-semibold">{selectedBatchObj.name}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
              selectedBatchObj.mode === 'Online'
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-orange-50 text-orange-600 border-orange-200'
            }`}>{selectedBatchObj.mode}</span>
            <span className="text-xs text-muted-foreground">{selectedBatchObj.school}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {totalSessions} sessions · {totalRecordings} with recording
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search module or session topic…" value={search}
          onChange={e => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl" />
      </div>

      {/* Sessions */}
      {loadingSessions ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {!selectedBatch ? (
            <div className="bg-white rounded-2xl border border-border py-16 text-center text-muted-foreground">
              <p className="text-sm">Select a batch to view sessions</p>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border py-16 text-center text-muted-foreground">
              <p className="text-sm">No sessions found</p>
            </div>
          ) : filteredModules.map(mod => {
            const sessions = grouped[mod] || []
            const withRecording = sessions.filter(s => s.recordingUrl).length
            const isExpanded = expandedModule === mod

            return (
              <div key={mod} className="bg-white rounded-2xl border border-border overflow-hidden">
                <button onClick={() => setExpandedModule(isExpanded ? null : mod)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                      <PlayCircle className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-bold text-sm truncate">{mod}</p>
                      <p className="text-xs text-muted-foreground">{sessions.length} sessions · {withRecording} with recording</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {withRecording > 0 && (
                      <span className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                        {withRecording}/{sessions.length}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border divide-y divide-border">
                    {sessions.map(s => (
                      <div key={s._id} className="px-5 py-3.5">
                        <div className="flex items-start gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold border shrink-0 ${
                            s.status === 'completed'
                              ? 'bg-teal-50 border-teal-200 text-teal-700'
                              : 'bg-muted border-border text-muted-foreground'
                          }`}>
                            {s.curriculumDay}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold">{s.topic || 'Untitled'}</p>
                              {s.recordingUrl
                                ? <span className="flex items-center gap-1 text-[10px] text-teal-600 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-full font-medium">
                                    <PlayCircle className="h-2.5 w-2.5" /> Has Recording
                                  </span>
                                : <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                    <VideoOff className="h-2.5 w-2.5" /> No Recording
                                  </span>
                              }
                            </div>

                            {editingId === s._id ? (
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                                    placeholder="Paste YouTube URL or direct video link…"
                                    className="h-8 text-xs rounded-lg flex-1" autoFocus
                                    onKeyDown={e => e.key === 'Enter' && saveRecording(s._id)} />
                                  <Button size="sm" className="h-8 px-3 text-xs" onClick={() => saveRecording(s._id)} disabled={saving || uploading}>
                                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs"
                                    onClick={() => { setEditingId(null); setUrlInput(''); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(s._id, f) }} />
                                  <button onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg px-3 py-1.5 hover:border-primary/40 transition-colors disabled:opacity-50">
                                    {uploading
                                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading {uploadProgress}%</>
                                      : <><Upload className="h-3 w-3" /> Upload video file</>
                                    }
                                  </button>
                                  {uploading && (
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-teal-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-1">
                                {s.recordingUrl && (
                                  <p className="text-xs text-muted-foreground truncate max-w-xs">{s.recordingUrl}</p>
                                )}
                                <button
                                  onClick={() => { setEditingId(s._id); setUrlInput(s.recordingUrl || '') }}
                                  className="text-xs text-teal-600 hover:underline font-medium shrink-0">
                                  {s.recordingUrl ? 'Edit' : '+ Add recording'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
