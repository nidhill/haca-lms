import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Pin, Bell } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Skeleton } from '../../components/ui/skeleton'
import { toast } from 'sonner'
import adminApi from '../../services/adminApi'
import { formatDate } from '../../lib/utils'

interface Announcement {
  _id: string; title: string; body: string; isPinned: boolean; createdAt: string
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-base">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function AdminAnnouncements() {
  const [list, setList] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState({ title: '', body: '', isPinned: false })
  const [saving, setSaving] = useState(false)

  const load = () => {
    adminApi.get('/announcements')
      .then(r => setList(r.data.announcements || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm({ title: '', body: '', isPinned: false }); setShowModal(true) }
  const openEdit = (a: Announcement) => { setEditing(a); setForm({ title: a.title, body: a.body, isPinned: a.isPinned }); setShowModal(true) }

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and body are required'); return }
    setSaving(true)
    try {
      if (editing) {
        await adminApi.patch(`/announcements/${editing._id}`, form)
        toast.success('Announcement updated')
      } else {
        await adminApi.post('/announcements', form)
        toast.success('Announcement created')
      }
      setShowModal(false)
      load()
    } catch { } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    await adminApi.delete(`/announcements/${id}`)
    toast.success('Deleted')
    setList(prev => prev.filter(a => a._id !== id))
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground">{list.length} total</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New Announcement
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
            <Bell className="h-8 w-8 opacity-30" />
            <p className="text-sm">No announcements yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {list.map(a => (
              <div key={a._id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20">
                <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center border shrink-0 ${a.isPinned ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-muted border-border text-muted-foreground'}`}>
                  {a.isPinned ? <Pin className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{a.title}</p>
                    {a.isPinned && <span className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-full">Pinned</span>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.body}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDate(a.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(a)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(a._id)} className="h-8 w-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-muted-foreground hover:text-red-600 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Announcement' : 'New Announcement'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Body</Label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Announcement content…"
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} className="rounded" />
              <span className="text-sm font-medium">Pin this announcement</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
