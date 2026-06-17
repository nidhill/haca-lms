import { CheckCircle2 } from 'lucide-react'
import { Button } from './ui/button'

interface PdfViewerProps {
  url: string
  isComplete?: boolean
  onMarkComplete?: () => void
}

export function PdfViewer({ url, isComplete, onMarkComplete }: PdfViewerProps) {
  // Use PUBLIC backend proxy to serve PDF with correct Content-Disposition: inline header
  const proxyUrl = `http://localhost:5050/api/pdf-proxy?url=${encodeURIComponent(url)}`

  return (
    <div className="w-full space-y-3">
      <iframe
        src={proxyUrl}
        className="w-full rounded-lg border border-slate-200 dark:border-white/10"
        style={{ height: '600px' }}
        title="PDF Viewer"
        allow="fullscreen"
      />
      <div className="flex justify-center">
        {onMarkComplete && (
          <Button
            size="sm"
            onClick={onMarkComplete}
            className={`gap-2 ${isComplete ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isComplete ? 'Completed' : 'Mark as Complete'}
          </Button>
        )}
      </div>
    </div>
  )
}
