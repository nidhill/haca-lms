import { useRef, useState, useCallback, useEffect } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { toast } from 'sonner'
import api from '../services/api'

interface VideoPlayerProps {
  lessonId: string
  courseId: string
  url: string
  startPosition?: number
  isComplete?: boolean
  onComplete?: () => void
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return match ? match[1] : null
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}

export function VideoPlayer({
  lessonId, courseId, url, startPosition = 0, isComplete: initialComplete = false, onComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [isComplete, setIsComplete] = useState(initialComplete)
  const [marking, setMarking] = useState(false)
  const completeFiredRef = useRef(false)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationRef = useRef(0)
  const currentTimeRef = useRef(0)

  const youtubeId = getYouTubeId(url)
  const isDirect = isDirectVideo(url)

  const markComplete = useCallback(async () => {
    if (isComplete || completeFiredRef.current || marking) return
    completeFiredRef.current = true
    setMarking(true)
    try {
      await api.post('/progress/mark-complete', { lessonId, courseId })
      setIsComplete(true)
      toast.success('Lesson marked as complete!')
      onComplete?.()
    } catch {
      completeFiredRef.current = false
    } finally {
      setMarking(false)
    }
  }, [isComplete, lessonId, courseId, marking, onComplete])

  const sendHeartbeat = useCallback((position: number) => {
    api.patch('/progress/heartbeat', { lessonId, position }).catch(() => {})
  }, [lessonId])

  // Heartbeat interval once ready
  useEffect(() => {
    if (!ready) return
    heartbeatRef.current = setInterval(() => {
      sendHeartbeat(currentTimeRef.current)
    }, 10000)
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (currentTimeRef.current > 0) sendHeartbeat(currentTimeRef.current)
    }
  }, [ready, sendHeartbeat])

  // YouTube postMessage API for progress tracking
  useEffect(() => {
    if (!youtubeId) return

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return
      let data: Record<string, unknown>
      try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data } catch { return }

      if (data.event === 'onReady') {
        setReady(true)
        if (startPosition > 0) {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'seekTo', args: [startPosition, true] }),
            '*'
          )
        }
      }
      if (data.event === 'infoDelivery' && data.info && typeof data.info === 'object') {
        const info = data.info as Record<string, unknown>
        const current = typeof info.currentTime === 'number' ? info.currentTime : 0
        const duration = typeof info.duration === 'number' ? info.duration : 0
        currentTimeRef.current = current
        if (duration > 0) durationRef.current = duration
        const played = duration > 0 ? current / duration : 0
        if (played >= 0.8 && !isComplete && !completeFiredRef.current) {
          markComplete()
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [youtubeId, startPosition, isComplete, markComplete])

  // HTML5 video progress
  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    currentTimeRef.current = video.currentTime
    const played = video.duration > 0 ? video.currentTime / video.duration : 0
    if (played >= 0.8 && !isComplete && !completeFiredRef.current) {
      markComplete()
    }
  }

  const handleVideoReady = () => {
    setReady(true)
    if (startPosition > 0 && videoRef.current) {
      videoRef.current.currentTime = startPosition
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
        )}

        {youtubeId ? (
          <iframe
            ref={iframeRef}
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&modestbranding=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setReady(true)}
          />
        ) : isDirect ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full"
            controls
            onLoadedMetadata={handleVideoReady}
            onTimeUpdate={handleTimeUpdate}
            src={url}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
            Unsupported video format
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle className="h-4 w-4" />
              Completed
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Auto-completes at 80% · Progress saved every 10s</p>
          )}
        </div>
        {!isComplete && (
          <Button
            size="sm"
            variant="outline"
            onClick={markComplete}
            disabled={marking}
          >
            {marking && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Mark as Complete
          </Button>
        )}
      </div>
    </div>
  )
}
