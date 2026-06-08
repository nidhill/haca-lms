import { useEffect, useRef, useState } from 'react'
import { Upload, FileText, CheckCircle, Clock, AlertCircle, Loader2, Download } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import { Skeleton } from '../components/ui/skeleton'
import { Separator } from '../components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { cn, formatDate, fileSize } from '../lib/utils'
import api from '../services/api'
import { toast } from 'sonner'
import type { Assignment, AssignmentStatus } from '../types'

const STATUS_CONFIG: Record<AssignmentStatus, { label: string; variant: 'secondary' | 'success' | 'info' | 'destructive' | 'warning'; icon: React.ElementType }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  submitted: { label: 'Submitted — Pending Grade', variant: 'info', icon: CheckCircle },
  graded: { label: 'Graded', variant: 'success', icon: CheckCircle },
  late: { label: 'Late', variant: 'warning', icon: AlertCircle },
}

const ALLOWED_TYPES = ['.pdf', '.docx', '.zip', '.png', '.jpg', '.jpeg']
const MAX_SIZE_MB = 50

export default function Assignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Assignment | null>(null)

  useEffect(() => {
    api.get('/assignments')
      .then((r) => setAssignments(r.data.assignments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleUploadSuccess = (assignmentId: string) => {
    setAssignments((prev) =>
      prev.map((a) => a._id === assignmentId ? { ...a, status: 'submitted' as AssignmentStatus } : a)
    )
    setSelected(null)
  }

  const pending = assignments.filter((a) => a.status === 'pending' || a.status === 'late')
  const submitted = assignments.filter((a) => a.status === 'submitted' || a.status === 'graded')

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assignments</h1>
        <p className="text-sm text-muted-foreground">{pending.length} pending · {submitted.length} submitted</p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pending</h2>
          {pending.map((a) => (
            <AssignmentCard key={a._id} assignment={a} onSubmit={() => setSelected(a)} />
          ))}
        </div>
      )}

      {/* Submitted / Graded */}
      {submitted.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Submitted</h2>
          {submitted.map((a) => (
            <AssignmentCard key={a._id} assignment={a} onSubmit={() => {}} />
          ))}
        </div>
      )}

      {assignments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No assignments yet</p>
          </CardContent>
        </Card>
      )}

      {/* Upload dialog */}
      {selected && (
        <UploadDialog
          assignment={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => handleUploadSuccess(selected._id)}
        />
      )}
    </div>
  )
}

function AssignmentCard({ assignment: a, onSubmit }: { assignment: Assignment; onSubmit: () => void }) {
  const cfg = STATUS_CONFIG[a.status]
  const Icon = cfg.icon
  const due = new Date(a.dueDate)
  const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{a.title}</h3>
              <Badge variant={cfg.variant as never} className="text-xs">
                <Icon className="mr-1 h-3 w-3" />
                {cfg.label}
              </Badge>
            </div>
            {a.courseTitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{a.courseTitle}</p>
            )}
            {a.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{a.description}</p>
            )}

            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>Due: {formatDate(a.dueDate)}</span>
              {(a.status === 'pending' || a.status === 'late') && (
                <span className={cn(daysLeft <= 1 ? 'text-red-600 font-medium' : daysLeft <= 3 ? 'text-orange-600' : '')}>
                  {daysLeft <= 0 ? 'Overdue' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                </span>
              )}
              <span>Max {a.totalMarks} marks</span>
            </div>

            {/* Graded result */}
            {a.status === 'graded' && a.submission && (
              <div className="mt-3 rounded-md bg-green-50 border border-green-200 p-3 space-y-1">
                <p className="text-sm font-medium text-green-800">
                  Score: {a.submission.score} / {a.totalMarks}
                  {' '}({Math.round(((a.submission.score ?? 0) / a.totalMarks) * 100)}%)
                </p>
                {a.submission.feedback && (
                  <p className="text-xs text-green-700">{a.submission.feedback}</p>
                )}
                <p className="text-xs text-muted-foreground">Graded {formatDate(a.submission.gradedAt!)}</p>
              </div>
            )}

            {/* Submitted info */}
            {a.status === 'submitted' && a.submission && (
              <p className="text-xs text-muted-foreground mt-2">
                Submitted {formatDate(a.submission.submittedAt)} · {a.submission.fileName}
              </p>
            )}
          </div>

          <div className="shrink-0 flex flex-col gap-2 items-end">
            {(a.status === 'pending' || a.status === 'late') && (
              <Button size="sm" onClick={onSubmit}>
                <Upload className="mr-2 h-3.5 w-3.5" />
                Upload
              </Button>
            )}
            {a.submission?.fileUrl && (
              <a href={a.submission.fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Download
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UploadDialog({ assignment, onClose, onSuccess }: {
  assignment: Assignment
  onClose: () => void
  onSuccess: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const f = e.target.files?.[0]
    if (!f) return

    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(ext)) {
      setError(`File type not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}`)
      return
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB} MB`)
      return
    }
    setFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)

    try {
      await api.post(`/assignments/${assignment._id}/submit`, form, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      toast.success('Assignment submitted successfully!')
      onSuccess()
    } catch {
      setUploading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <p className="font-medium text-sm">{assignment.title}</p>
            <p className="text-xs text-muted-foreground">Due {formatDate(assignment.dueDate)}</p>
          </div>

          <Separator />

          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">{file ? file.name : 'Click to select file'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {file ? fileSize(file.size) : `PDF, DOCX, ZIP, PNG · Max ${MAX_SIZE_MB} MB`}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleFileChange}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">{progress}% uploaded</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
