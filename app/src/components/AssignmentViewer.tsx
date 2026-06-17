import { useState, useEffect } from 'react'
import { CheckCircle2, FileUp, Calendar, Award } from 'lucide-react'
import { Button } from './ui/button'
import api from '../services/api'

interface Assignment {
  _id: string
  title: string
  description?: string
  dueDate?: string
  totalMarks?: number
  instructions?: string
}

interface AssignmentViewerProps {
  assignmentId: string
  isComplete?: boolean
  onMarkComplete?: () => void
}

export function AssignmentViewer({ assignmentId, isComplete, onMarkComplete }: AssignmentViewerProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const r = await api.get(`/assignments/${assignmentId}`)
        setAssignment(r.data.assignment)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load assignment:', err)
        setLoading(false)
      }
    }
    if (assignmentId) fetchAssignment()
  }, [assignmentId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  const handleSubmit = async () => {
    if (!uploadedFile) return

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('assignmentId', assignmentId)

      await api.post(`/assignments/${assignmentId}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setSubmitted(true)
      setUploadedFile(null)
    } catch (err) {
      console.error('Failed to submit assignment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="aspect-video flex items-center justify-center bg-slate-900 text-white">
        <p>Loading assignment...</p>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="aspect-video flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
        <p>Assignment not found</p>
      </div>
    )
  }

  const dueDate = assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : null
  const isOverdue = dueDate && new Date(dueDate) < new Date()

  return (
    <div className="aspect-video flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 px-8 py-6 border-b border-slate-700 space-y-3">
        <h2 className="text-2xl font-bold">{assignment.title}</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {assignment.totalMarks && (
            <div className="flex items-center gap-2 text-amber-400">
              <Award className="h-4 w-4" />
              <span>{assignment.totalMarks} marks</span>
            </div>
          )}
          {dueDate && (
            <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
              <Calendar className="h-4 w-4" />
              <span>Due: {dueDate}</span>
              {isOverdue && <span className="ml-1">(Overdue)</span>}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
        {assignment.description && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-300">{assignment.description}</p>
          </div>
        )}

        {assignment.instructions && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Instructions</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{assignment.instructions}</p>
          </div>
        )}

        {!submitted && !isComplete && (
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-semibold mb-4">Submit Your Work</h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.zip"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center gap-3 cursor-pointer"
                >
                  <FileUp className="h-12 w-12 text-gray-400" />
                  <div>
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-400">PDF, DOC, DOCX, TXT, ZIP</p>
                  </div>
                </label>
              </div>

              {uploadedFile && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-300">
                    ✓ Selected: <span className="font-medium">{uploadedFile.name}</span>
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-center pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={!uploadedFile || submitting}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <FileUp className="h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Submit Assignment'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {submitted && (
          <div className="border-t border-slate-700 pt-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <div>
                <p className="font-semibold text-lg">Assignment Submitted!</p>
                <p className="text-sm text-gray-300 mt-1">Your submission has been received</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {onMarkComplete && (
        <div className="bg-slate-800 px-8 py-4 border-t border-slate-700 flex justify-center">
          <Button
            onClick={onMarkComplete}
            disabled={isComplete}
            className={`gap-2 ${isComplete ? 'bg-emerald-600/50' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            size="lg"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isComplete ? 'Completed' : 'Mark as Complete'}
          </Button>
        </div>
      )}
    </div>
  )
}
