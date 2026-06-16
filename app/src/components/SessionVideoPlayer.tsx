import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, PictureInPicture2, Settings, Gauge,
} from 'lucide-react'

interface Props {
  src: string
  onReady?: () => void
  onComplete?: () => void  // fired once when ≥80% watched
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

const QUALITIES = [
  { label: 'Auto', transform: '' },
  { label: '360p', transform: 'h_360,c_limit,q_auto' },
  { label: '480p', transform: 'h_480,c_limit,q_auto' },
  { label: '720p', transform: 'h_720,c_limit,q_auto' },
  { label: '1080p', transform: 'h_1080,c_limit,q_auto' },
]

function getQualityUrl(url: string, transform: string): string {
  if (!transform || !url.includes('cloudinary.com')) return url
  return url.replace('/upload/', `/upload/${transform}/`)
}

function isCloudinary(url: string): boolean {
  return url.includes('cloudinary.com')
}

function fmt(s: number) {
  if (!isFinite(s) || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function SessionVideoPlayer({ src, onReady, onComplete }: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef  = useRef<HTMLDivElement>(null)
  const hideTimer    = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [playing, setPlaying]           = useState(false)
  const [currentTime, setCurrentTime]   = useState(0)
  const [duration, setDuration]         = useState(0)
  const [volume, setVolume]             = useState(1)
  const [muted, setMuted]               = useState(false)
  const [fullscreen, setFullscreen]     = useState(false)
  const [speed, setSpeed]               = useState(1)
  const [showSpeed, setShowSpeed]       = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffered, setBuffered]         = useState(0)
  const [loading, setLoading]           = useState(true)
  const [quality, setQuality]           = useState(QUALITIES[0])
  const [showQuality, setShowQuality]   = useState(false)
  const [activeSrc, setActiveSrc]       = useState(src)
  const [loadError, setLoadError]       = useState(false)
  const seekAfterLoad                   = useRef<number | null>(null)
  const completeFired                   = useRef(false)

  // Auto-hide controls when playing
  const resetHide = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  useEffect(() => () => clearTimeout(hideTimer.current), [])

  // Show controls when paused
  useEffect(() => {
    if (!playing) {
      clearTimeout(hideTimer.current)
      setShowControls(true)
    }
  }, [playing])

  // Fullscreen change listener
  useEffect(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element }
    const h = () => setFullscreen(!!(document.fullscreenElement || doc.webkitFullscreenElement))
    document.addEventListener('fullscreenchange', h)
    document.addEventListener('webkitfullscreenchange', h)
    return () => {
      document.removeEventListener('fullscreenchange', h)
      document.removeEventListener('webkitfullscreenchange', h)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); v.paused ? v.play() : v.pause() }
      if (e.key === 'ArrowRight') { const t = Math.min(v.currentTime + 10, v.duration); v.currentTime = t; setCurrentTime(t); resetHide() }
      if (e.key === 'ArrowLeft')  { const t = Math.max(v.currentTime - 10, 0); v.currentTime = t; setCurrentTime(t); resetHide() }
      if (e.key === 'm') { v.muted = !v.muted; setMuted(v.muted) }
      if (e.key === 'f') toggleFullscreen()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    v.paused ? v.play() : v.pause()
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  const toggleFullscreen = async () => {
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
      if (!isFs) {
        const request = el.requestFullscreen?.bind(el) || el.webkitRequestFullscreen?.bind(el) || el.msRequestFullscreen?.bind(el)
        await request?.()
      } else {
        const exit = document.exitFullscreen?.bind(document) || doc.webkitExitFullscreen?.bind(doc) || doc.msExitFullscreen?.bind(doc)
        await exit?.()
      }
    } catch {
      // Fullscreen not supported on this browser — silently ignore, button stays usable
    }
  }

  const togglePiP = async () => {
    const v = videoRef.current
    if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch { /* browser may not support PiP */ }
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    const bar = progressRef.current
    if (!v || !bar || !v.duration) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.currentTime = ratio * v.duration
    resetHide()
  }

  const setSpeedVal = (s: number) => {
    const v = videoRef.current
    if (!v) return
    v.playbackRate = s
    setSpeed(s)
    setShowSpeed(false)
  }

  const changeQuality = (q: typeof QUALITIES[0]) => {
    const v = videoRef.current
    if (!v) return
    seekAfterLoad.current = v.currentTime
    const wasPlaying = !v.paused
    setQuality(q)
    setActiveSrc(getQualityUrl(src, q.transform))
    setShowQuality(false)
    // resume play after src change + seek settle
    if (wasPlaying) {
      v.addEventListener('canplay', function resume() {
        v.removeEventListener('canplay', resume)
        v.play().catch(() => {})
      }, { once: true })
    }
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    const val = parseFloat(e.target.value)
    v.volume = val
    v.muted = val === 0
    setVolume(val)
    setMuted(val === 0)
  }

  const played = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-2xl overflow-hidden"
      onMouseMove={() => playing && resetHide()}
      onTouchStart={() => { if (!showControls) { resetHide() } }}
    >
      {/* Video element */}
      {loadError ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm px-6 text-center">
          This video could not be loaded. Please check the source link.
        </div>
      ) : (
      <video
        ref={videoRef}
        src={activeSrc}
        className="w-full h-full"
        onClick={togglePlay}
        onError={() => setLoadError(true)}
        onPlay={() => { setPlaying(true); resetHide() }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const v = videoRef.current
          if (!v) return
          setCurrentTime(v.currentTime)
          if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1))
          if (!completeFired.current && v.duration > 0 && v.currentTime / v.duration >= 0.8) {
            completeFired.current = true
            onComplete?.()
          }
        }}
        onEnded={() => {
          if (!completeFired.current) { completeFired.current = true; onComplete?.() }
        }}
        onLoadedMetadata={() => {
          const v = videoRef.current
          if (!v) return
          setDuration(v.duration)
          if (seekAfterLoad.current !== null) {
            v.currentTime = seekAfterLoad.current
            seekAfterLoad.current = null
          }
          setLoading(false)
          onReady?.()
        }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
      />
      )}

      {/* Spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {/* Centre play button when paused — only covers top area, not controls */}
      {!playing && !loading && (
        <div
          className="absolute inset-x-0 top-0 bottom-20 flex items-center justify-center z-10 cursor-pointer"
          onClick={togglePlay}
        >
          <div className="h-20 w-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors">
            <Play className="h-9 w-9 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Speed popup */}
      {showSpeed && (
        <div
          className="absolute bottom-20 right-28 bg-[#0d2b2b] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-40"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider px-4 pt-3 pb-1">Speed</p>
          {SPEEDS.map(s => (
            <button key={s} onClick={() => setSpeedVal(s)}
              className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${
                speed === s ? 'bg-blue-600 text-white font-bold' : 'text-white/80 hover:bg-white/10'
              }`}>
              {s === 1 ? 'Normal' : `${s}x`}
            </button>
          ))}
        </div>
      )}

      {/* Quality popup */}
      {showQuality && (
        <div
          className="absolute bottom-20 right-4 bg-[#0d2b2b] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-40"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider px-4 pt-3 pb-1">Quality</p>
          {QUALITIES.map(q => (
            <button key={q.label} onClick={() => changeQuality(q)}
              className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-sm transition-colors gap-6 ${
                quality.label === q.label ? 'bg-blue-600 text-white font-bold' : 'text-white/80 hover:bg-white/10'
              }`}>
              <span>{q.label}</span>
              {!isCloudinary(src) && q.transform && (
                <span className="text-[10px] opacity-50">N/A</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Controls overlay — z-20 so it sits above the centre play button */}
      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 pointer-events-none z-20 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.9) 100%)' }}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className={`mx-4 mb-3 relative h-1 cursor-pointer group/prog ${showControls ? 'pointer-events-auto' : 'pointer-events-none'}`}
          onClick={seek}
          onMouseMove={e => { if (e.buttons === 1) seek(e) }}
        >
          {/* Track */}
          <div className="absolute inset-0 rounded-full bg-white/25 group-hover/prog:h-1.5 transition-all" />
          {/* Buffered */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/35 group-hover/prog:h-1.5 transition-all"
            style={{ width: `${bufferedPct}%` }}
          />
          {/* Played */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-blue-400 group-hover/prog:h-1.5 transition-all"
            style={{ width: `${played}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-white shadow-lg opacity-0 group-hover/prog:opacity-100 transition-opacity"
            style={{ left: `${played}%` }}
          />
        </div>

        {/* Button row */}
        <div className={`flex items-center gap-0.5 px-3 pb-4 ${showControls ? 'pointer-events-auto' : 'pointer-events-none'}`}>

          {/* Play/Pause */}
          <button
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors text-white"
            onClick={e => { e.stopPropagation(); togglePlay() }}
          >
            {playing
              ? <Pause className="h-5 w-5" fill="white" />
              : <Play className="h-5 w-5 ml-0.5" fill="white" />}
          </button>

          {/* Rewind 10s */}
          <button
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors text-white"
            onClick={e => {
              e.stopPropagation()
              const v = videoRef.current
              if (!v) return
              const t = Math.max(0, v.currentTime - 10)
              v.currentTime = t
              setCurrentTime(t)
              resetHide()
            }}
            title="Rewind 10s (←)"
          >
            <span className="relative flex items-center justify-center">
              <SkipBack className="h-5 w-5" />
              <span className="absolute text-[6px] font-black">10</span>
            </span>
          </button>

          {/* Forward 10s */}
          <button
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors text-white"
            onClick={e => {
              e.stopPropagation()
              const v = videoRef.current
              if (!v) return
              const t = Math.min(v.duration, v.currentTime + 10)
              v.currentTime = t
              setCurrentTime(t)
              resetHide()
            }}
            title="Forward 10s (→)"
          >
            <span className="relative flex items-center justify-center">
              <SkipForward className="h-5 w-5" />
              <span className="absolute text-[6px] font-black">10</span>
            </span>
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1 group/vol">
            <button
              className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors text-white"
              onClick={toggleMute}
            >
              {muted || volume === 0
                ? <VolumeX className="h-4.5 w-4.5" />
                : <Volume2 className="h-4.5 w-4.5" />}
            </button>
            <div className="overflow-hidden w-0 group-hover/vol:w-20 transition-all duration-200">
              <input
                type="range" min={0} max={1} step={0.02}
                value={muted ? 0 : volume}
                onChange={handleVolume}
                className="w-20 cursor-pointer"
                style={{ accentColor: '#2dd4bf' }}
              />
            </div>
          </div>

          {/* Time */}
          <span className="text-white/70 text-xs font-mono ml-1 shrink-0">
            {fmt(currentTime)} / {fmt(duration)}
          </span>

          <div className="flex-1" />

          {/* Speed */}
          <button
            className={`flex items-center gap-1.5 h-9 px-2.5 rounded-lg hover:bg-white/15 transition-colors text-xs font-bold shrink-0 ${showSpeed ? 'bg-white/15 text-blue-300' : 'text-white'}`}
            onClick={() => { setShowSpeed(p => !p); setShowQuality(false) }}
            title="Playback speed"
          >
            <Settings className="h-3.5 w-3.5 opacity-70" />
            {speed === 1 ? '1x' : `${speed}x`}
          </button>

          {/* Quality */}
          <button
            className={`flex items-center gap-1.5 h-9 px-2.5 rounded-lg hover:bg-white/15 transition-colors text-xs font-bold shrink-0 ${showQuality ? 'bg-white/15 text-blue-300' : 'text-white'}`}
            onClick={() => { setShowQuality(p => !p); setShowSpeed(false) }}
            title="Video quality"
          >
            <Gauge className="h-3.5 w-3.5 opacity-70" />
            {quality.label}
          </button>

          {/* PiP */}
          <button
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors text-white"
            onClick={togglePiP}
            title="Picture in Picture"
          >
            <PictureInPicture2 className="h-4.5 w-4.5" />
          </button>

          {/* Fullscreen */}
          <button
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors text-white"
            onClick={toggleFullscreen}
            title="Fullscreen (f)"
          >
            {fullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
