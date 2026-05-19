import { ExternalLink } from 'lucide-react'
import { Button } from './ui/button'

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">PDF Document</p>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Open in new tab
          </Button>
        </a>
      </div>
      <div className="rounded-lg overflow-hidden border bg-muted" style={{ height: '70vh' }}>
        <iframe
          src={`${url}#toolbar=1&navpanes=1`}
          className="w-full h-full"
          title="PDF Viewer"
        />
      </div>
    </div>
  )
}
