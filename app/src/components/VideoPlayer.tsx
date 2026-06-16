import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  RotateCcw, RotateCw, CheckCircle, Loader2,
} from 'lucide-react'
import { Button } from './ui/button'
import { toast } from 'sonner'
import api from '../services/api'

interface VideoPlayerProps {
  lessonId: string
  courseId: string
  url: string
  poster?: string
  startPosition?: number
  isComplete?: boolean
  onComplete?: () => void
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v|avi|mkv)(\?|$)/i.test(url)
    || url.includes('res.cloudinary.com')
    || url.includes('/video/upload/')
}

function fmt(s: number): string {
  if (!s || isNaN(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

interface QualityOption { label: string; url: string }

function getQualityOptions(url: string): QualityOption[] {
  if (!url.includes('res.cloudinary.com')) return [{ label: 'Auto', url }]
  const idx = url.indexOf('/upload/')
  if (idx === -1) return [{ label: 'Auto', url }]
  const base = url.slice(0, idx + 8)          // …/upload/
  const rest = url.slice(idx + 8).replace(/^(q_[^/]+,?[^/]*\/)+/, '') // strip existing quality transforms
  return [
    { label: 'Auto',  url: `${base}${rest}` },
    { label: '1080p', url: `${base}q_auto:best/${rest}` },
    { label: '720p',  url: `${base}q_auto:good,w_1280,h_720/${rest}` },
    { label: '480p',  url: `${base}q_auto:low,w_854,h_480/${rest}` },
    { label: '360p',  url: `${base}q_auto:eco,w_640,h_360/${rest}` },
  ]
}

export function VideoPlayer({
  lessonId, courseId, url,
  poster,
  startPosition = 0,
  isComplete: initialComplete = false,
  onComplete,
}: VideoPlayerProps) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const progressRef   = useRef<HTMLDivElement>(null)
  const iframeRef     = useRef<HTMLIFrameElement>(null)
  const hideTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentTimeRef = useRef(0)
  const completeFired  = useRef(false)
  const dragging       = useRef(false)

  const [ready,           setReady]           = useState(false)
  const [isComplete,      setIsComplete]       = useState(initialComplete)
  const [marking,         setMarking]          = useState(false)
  const [loadError,       setLoadError]        = useState(false)
  const [playing,         setPlaying]          = useState(false)
  const [currentTime,     setCurrentTime]      = useState(0)
  const [duration,        setDuration]         = useState(0)
  const [buffered,        setBuffered]         = useState(0)
  const [volume,          setVolume]           = useState(1)
  const [muted,           setMuted]            = useState(false)
  const [ctrlVisible,     setCtrlVisible]      = useState(true)
  const [fullscreen,      setFullscreen]       = useState(false)
  const [speed,           setSpeed]            = useState(1)
  const [speedOpen,       setSpeedOpen]        = useState(false)
  const [volOpen,         setVolOpen]          = useState(false)
  const [skipFlash,       setSkipFlash]        = useState<'fwd' | 'bwd' | null>(null)
  const [hoverInfo,       setHoverInfo]        = useState<{ time: number; pct: number } | null>(null)
  const [qualityOpts]                          = useState<QualityOption[]>(() => getQualityOptions(url))
  const [quality,         setQuality]          = useState<QualityOption>(() => getQualityOptions(url)[0])
  const [qualityOpen,     setQualityOpen]      = useState(false)

  const youtubeId = getYouTubeId(url)
  const isDirect  = isDirectVideo(url)
  const progress  = duration > 0 ? (currentTime / duration) * 100 : 0

  // ── auto-hide controls ──────────────────────────────────────────────────────
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setCtrlVisible(false), 3000)
  }, [])

  const revealControls = useCallback(() => {
    setCtrlVisible(true)
    if (playing) scheduleHide()
  }, [playing, scheduleHide])

  useEffect(() => {
    if (!playing) {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setCtrlVisible(true)
    } else {
      scheduleHide()
    }
  }, [playing, scheduleHide])

  // ── global mouseup (progress drag) ─────────────────────────────────────────
  useEffect(() => {
    const up = () => { dragging.current = false }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  // ── fullscreen ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element }
    const fn = () => setFullscreen(!!(document.fullscreenElement || doc.webkitFullscreenElement))
    document.addEventListener('fullscreenchange', fn)
    document.addEventListener('webkitfullscreenchange', fn)
    return () => {
      document.removeEventListener('fullscreenchange', fn)
      document.removeEventListener('webkitfullscreenchange', fn)
    }
  }, [])

  // ── keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.code === 'Space')       { e.preventDefault(); togglePlay() }
      else if (e.code === 'ArrowRight') skip(10)
      else if (e.code === 'ArrowLeft')  skip(-10)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── heartbeat ───────────────────────────────────────────────────────────────
  const sendHeartbeat = useCallback((pos: number) => {
    api.patch('/progress/heartbeat', { lessonId, position: pos }).catch(() => {})
  }, [lessonId])

  useEffect(() => {
    if (!ready) return
    heartbeatRef.current = setInterval(() => sendHeartbeat(currentTimeRef.current), 10000)
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (currentTimeRef.current > 0) sendHeartbeat(currentTimeRef.current)
    }
  }, [ready, sendHeartbeat])

  // ── mark complete ───────────────────────────────────────────────────────────
  const markComplete = useCallback(async () => {
    if (isComplete || completeFired.current || marking) return
    completeFired.current = true
    setMarking(true)
    try {
      await api.post('/progress/mark-complete', { lessonId, courseId })
      setIsComplete(true)
      toast.success('Lesson marked as complete!')
      onComplete?.()
    } catch {
      completeFired.current = false
    } finally {
      setMarking(false)
    }
  }, [isComplete, lessonId, courseId, marking, onComplete])

  // ── video handlers ──────────────────────────────────────────────────────────
  const handleLoaded = () => {
    const v = videoRef.current; if (!v) return
    setReady(true)
    setDuration(v.duration)
    if (startPosition > 0) v.currentTime = startPosition
  }

  const handleTimeUpdate = () => {
    const v = videoRef.current; if (!v) return
    currentTimeRef.current = v.currentTime
    setCurrentTime(v.currentTime)
    if (v.buffered.length > 0)
      setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100)
    if (v.duration > 0 && !v.paused && v.currentTime / v.duration >= 0.8 && !isComplete && !completeFired.current)
      markComplete()
  }

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return
    v.paused ? v.play() : v.pause()
    revealControls()
  }

  const skip = (secs: number) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + secs))
    setSkipFlash(secs > 0 ? 'fwd' : 'bwd')
    setTimeout(() => setSkipFlash(null), 700)
    revealControls()
  }

  const changeSpeed = (s: number) => {
    if (videoRef.current) videoRef.current.playbackRate = s
    setSpeed(s); setSpeedOpen(false)
  }

  const changeQuality = (opt: QualityOption) => {
    const v = videoRef.current
    if (!v) return
    const savedTime = v.currentTime
    const wasPlaying = playing
    setQuality(opt)
    setQualityOpen(false)
    // Restore position + playback after new source loads
    v.addEventListener('loadedmetadata', () => {
      v.currentTime = savedTime
      if (wasPlaying) v.play()
    }, { once: true })
  }

  const handleVolume = (val: number) => {
    if (!videoRef.current) return
    videoRef.current.volume = val
    setVolume(val); setMuted(val === 0)
  }

  const toggleMute = () => {
    const v = videoRef.current; if (!v) return
    v.muted = !muted; setMuted(!muted)
  }

  const toggleFullscreen = () => {
    const el = containerRef.current as (HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void
      msRequestFullscreen?: () => Promise<void> | void
    }) | null
    const doc = document as Document & {
      webkitFullscreenElement?: Element
      webkitExitFullscreen?: () => Promise<void> | void
      msExitFullscreen?: () => Promise<void> | void
    }
    if (!el) return
    const isFs = document.fullscreenElement || doc.webkitFullscreenElement
    try {
      if (isFs) {
        const exit = document.exitFullscreen?.bind(document) || doc.webkitExitFullscreen?.bind(doc) || doc.msExitFullscreen?.bind(doc)
        const result = exit?.()
        if (result && typeof (result as Promise<void>).catch === 'function') (result as Promise<void>).catch(() => setFullscreen(false))
        setFullscreen(false)
      } else {
        const request = el.requestFullscreen?.bind(el) || el.webkitRequestFullscreen?.bind(el) || el.msRequestFullscreen?.bind(el)
        const result = request?.()
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch(() => toast.error('Fullscreen is not supported on this browser'))
        }
      }
    } catch {
      toast.error('Fullscreen is not supported on this browser')
    }
  }

  // ── progress bar ────────────────────────────────────────────────────────────
  const seekFrom = (clientX: number) => {
    const bar = progressRef.current; const v = videoRef.current
    if (!bar || !v) return
    const r = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    v.currentTime = ratio * v.duration
    setCurrentTime(ratio * v.duration)
  }

  const onProgressMove = (e: React.MouseEvent) => {
    const bar = progressRef.current; if (!bar) return
    const r = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    setHoverInfo({ time: pct * duration, pct: pct * 100 })
    if (dragging.current) seekFrom(e.clientX)
  }

  // ── YouTube postMessage ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!youtubeId) return
    const handle = (event: MessageEvent) => {
      if (!event.data) return
      let data: Record<string, unknown>
      try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data } catch { return }
      if (data.event === 'onReady') {
        setReady(true)
        if (startPosition > 0)
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'seekTo', args: [startPosition, true] }), '*')
      }
      if (data.event === 'infoDelivery' && data.info && typeof data.info === 'object') {
        const info = data.info as Record<string, unknown>
        const ct    = typeof info.currentTime === 'number' ? info.currentTime : 0
        const dur   = typeof info.duration    === 'number' ? info.duration    : 0
        const state = typeof info.playerState === 'number' ? info.playerState : -1
        currentTimeRef.current = ct
        // playerState 1 = playing; don't fire during seek/pause/load
        if (state === 1 && dur > 0 && ct / dur >= 0.8 && !isComplete && !completeFired.current) markComplete()
      }
    }
    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [youtubeId, startPosition, isComplete, markComplete])

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes skip-pop {
          0%   { opacity:0; transform:scale(.6) translateY(4px); }
          25%  { opacity:1; transform:scale(1.15) translateY(0); }
          65%  { opacity:1; transform:scale(1); }
          100% { opacity:0; transform:scale(.9); }
        }
        .skip-pop { animation: skip-pop .7s ease-out forwards; }
        @keyframes prog-grow {
          from { transform:scaleY(1); }
          to   { transform:scaleY(2.2); }
        }
        .prog-bar:hover .prog-track { transform:scaleY(2.2); }
        input[type=range].vol-slider {
          -webkit-appearance:none; appearance:none;
          height:3px; border-radius:9999px;
          background:rgba(255,255,255,.25);
          outline:none; cursor:pointer;
        }
        input[type=range].vol-slider::-webkit-slider-thumb {
          -webkit-appearance:none; appearance:none;
          width:12px; height:12px;
          border-radius:50%; background:#fff;
          cursor:pointer; transition:transform .15s;
        }
        input[type=range].vol-slider::-webkit-slider-thumb:hover { transform:scale(1.3); }
      `}</style>

      <div className="space-y-2.5">

        {/* ── Player shell ── */}
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-2xl bg-black select-none"
          style={{ aspectRatio: '16/9', cursor: ctrlVisible ? 'default' : 'none' }}
          onMouseMove={revealControls}
          onMouseLeave={() => playing && setCtrlVisible(false)}
        >

          {/* Loading */}
          {!ready && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#60a5fa] animate-spin" />
              </div>
            </div>
          )}

          {/* Skip flash */}
          {skipFlash && (
            <div
              key={Date.now()}
              className={`skip-pop absolute z-30 top-1/2 -translate-y-1/2 pointer-events-none
                flex flex-col items-center gap-1
                ${skipFlash === 'fwd' ? 'right-16' : 'left-16'}`}
            >
              <div className="bg-white/15 backdrop-blur-sm rounded-full p-3">
                {skipFlash === 'fwd'
                  ? <RotateCw  className="w-7 h-7 text-white" />
                  : <RotateCcw className="w-7 h-7 text-white" />}
              </div>
              <span className="text-white text-xs font-bold drop-shadow-lg">
                {skipFlash === 'fwd' ? '+10s' : '−10s'}
              </span>
            </div>
          )}

          {/* Video / YouTube */}
          {youtubeId ? (
            <iframe
              ref={iframeRef}
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&modestbranding=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setReady(true)}
            />
          ) : !loadError ? (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full"
              onLoadedMetadata={handleLoaded}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setCtrlVisible(true) }}
              onClick={togglePlay}
              onError={() => setLoadError(true)}
              src={isDirect ? quality.url : url}
              poster={poster}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm px-6 text-center">
              This video could not be loaded. Please check the source link.
            </div>
          )}

          {/* ── Controls overlay ── */}
          {!youtubeId && !loadError && (
            <div
              className="absolute inset-0 flex flex-col justify-end transition-opacity duration-300"
              style={{
                opacity: ctrlVisible ? 1 : 0,
                background: 'linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,.35) 35%, transparent 65%)',
                pointerEvents: ctrlVisible ? 'auto' : 'none',
              }}
            >
              {/* No centre click zone — video element handles onClick directly */}

              <div className="relative z-10 px-4 pb-4 pt-10 space-y-2.5">

                {/* ── Progress bar ── */}
                <div
                  ref={progressRef}
                  className="group relative flex items-center cursor-pointer"
                  style={{ height: '20px' }}
                  onMouseMove={onProgressMove}
                  onMouseLeave={() => setHoverInfo(null)}
                  onMouseDown={e => {
                    e.stopPropagation()
                    dragging.current = true
                    seekFrom(e.clientX)
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Track background */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full group-hover:h-1.5 transition-all duration-150"
                    style={{ background: 'rgba(255,255,255,.18)' }}>
                    {/* Buffered */}
                    <div className="absolute top-0 left-0 h-full rounded-full"
                      style={{ width: `${buffered}%`, background: 'rgba(255,255,255,.28)' }} />
                    {/* Played */}
                    <div className="absolute top-0 left-0 h-full rounded-full"
                      style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #60a5fa, #3b82f6)' }} />
                  </div>

                  {/* Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    style={{ left: `${progress}%` }}
                  />

                  {/* Hover tooltip */}
                  {hoverInfo && (
                    <div
                      className="absolute -top-8 -translate-x-1/2 bg-black/95 border border-white/10 text-white text-[10px] font-mono px-2 py-0.5 rounded pointer-events-none whitespace-nowrap shadow-xl"
                      style={{ left: `${hoverInfo.pct}%` }}
                    >
                      {fmt(hoverInfo.time)}
                    </div>
                  )}
                </div>

                {/* ── Control buttons ── */}
                <div className="flex items-center gap-1.5">

                  {/* Skip back */}
                  <button
                    onClick={() => skip(-10)}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
                    title="Back 10s (←)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Play/pause */}
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                  >
                    {playing
                      ? <Pause className="w-5 h-5 fill-white" />
                      : <Play  className="w-5 h-5 fill-white ml-0.5" />}
                  </button>

                  {/* Skip forward */}
                  <button
                    onClick={() => skip(10)}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
                    title="Forward 10s (→)"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Volume */}
                  <div
                    className="flex items-center gap-1.5 ml-0.5"
                    onMouseEnter={() => setVolOpen(true)}
                    onMouseLeave={() => setVolOpen(false)}
                  >
                    <button
                      onClick={toggleMute}
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
                    >
                      {muted || volume === 0
                        ? <VolumeX className="w-4 h-4" />
                        : <Volume2 className="w-4 h-4" />}
                    </button>
                    <div
                      className="overflow-hidden transition-all duration-200"
                      style={{ width: volOpen ? '72px' : '0px', opacity: volOpen ? 1 : 0 }}
                    >
                      <input
                        type="range"
                        min={0} max={1} step={0.02}
                        value={muted ? 0 : volume}
                        onChange={e => handleVolume(Number(e.target.value))}
                        className="vol-slider w-full block"
                        style={{
                          background: `linear-gradient(to right, #60a5fa ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,.25) ${(muted ? 0 : volume) * 100}%)`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <span className="text-white/60 text-xs font-mono ml-1 tabular-nums">
                    {fmt(currentTime)} <span className="text-white/30">/</span> {fmt(duration)}
                  </span>

                  <div className="flex-1" />

                  {/* Quality */}
                  {qualityOpts.length > 1 && (
                    <div className="relative">
                      <button
                        onClick={() => { setQualityOpen(v => !v); setSpeedOpen(false) }}
                        className="px-2.5 py-1 rounded-lg border border-white/20 text-white/80 hover:text-white hover:border-white/50 text-xs font-bold tracking-wide transition-all"
                        title="Video quality"
                      >
                        {quality.label === 'Auto' ? 'HD' : quality.label}
                      </button>
                      {qualityOpen && (
                        <div className="absolute bottom-10 right-0 bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-40 w-24">
                          <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 pt-2 pb-1">Quality</p>
                          {qualityOpts.map(opt => (
                            <button
                              key={opt.label}
                              onClick={() => changeQuality(opt)}
                              className={`w-full text-right px-3 py-2 text-xs transition-colors
                                ${opt.label === quality.label
                                  ? 'bg-[#60a5fa]/15 text-[#60a5fa] font-bold'
                                  : 'text-white/70 hover:bg-white/8 hover:text-white'}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Speed */}
                  <div className="relative">
                    <button
                      onClick={() => { setSpeedOpen(v => !v); setQualityOpen(false) }}
                      className="px-2.5 py-1 rounded-lg border border-white/20 text-white/80 hover:text-white hover:border-white/50 text-xs font-bold tracking-wide transition-all"
                    >
                      {speed === 1 ? '1×' : `${speed}×`}
                    </button>
                    {speedOpen && (
                      <div className="absolute bottom-10 right-0 bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-40 w-20">
                        {SPEEDS.map(s => (
                          <button
                            key={s}
                            onClick={() => changeSpeed(s)}
                            className={`w-full text-right px-3 py-2 text-xs transition-colors
                              ${s === speed
                                ? 'bg-[#60a5fa]/15 text-[#60a5fa] font-bold'
                                : 'text-white/70 hover:bg-white/8 hover:text-white'}`}
                          >
                            {s}×
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {fullscreen
                      ? <Minimize className="w-4 h-4" />
                      : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Below player ── */}
        <div className="flex items-center justify-between px-0.5">
          {isComplete ? (
            <div className="flex items-center gap-1.5 text-sm text-emerald-500 font-medium">
              <CheckCircle className="h-4 w-4" />
              Completed
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Auto-completes at 80% · Progress saved every 10s
            </p>
          )}
          {!isComplete && (
            <Button size="sm" variant="outline" onClick={markComplete} disabled={marking}>
              {marking && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Mark as Complete
            </Button>
          )}
        </div>

      </div>
    </>
  )
}
