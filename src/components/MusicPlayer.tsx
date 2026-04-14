import { useEffect, useState } from 'react'
import { Music, Play, Pause, X, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import { STATIONS, stationEmbedUrl, type Station } from '../lib/stations'

// Iframe delegation: a plain <iframe> pointed at a YouTube Live embed URL.
// The iframe owns its origin's CORS/CSP, which is why this architecture
// sidesteps the issues we had with <audio> + SomaFM.
//
// Autoplay policy: YouTube embed autoplay only triggers when the iframe
// MOUNTS in response to a user gesture. Our flow satisfies this — click
// play → setPlaying(true) → iframe renders with autoplay=1.
//
// Volume: cross-origin iframes can't be controlled without the YT IFrame
// API (which caused the original bugs we're here to fix). The OS/tab
// volume is the only volume control — by design. No slider.
//
// Keyboard: press `M` to toggle play/pause.

const STORAGE_KEY = 'tw-music'

interface StoredState {
  stationId: string
  playing: boolean
}

function readStored(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        stationId: typeof parsed.stationId === 'string' ? parsed.stationId : STATIONS[0].id,
        // Never auto-resume playback — browsers block autoplay on load anyway.
        playing: false,
      }
    }
  } catch {
    // fallthrough
  }
  return { stationId: STATIONS[0].id, playing: false }
}

export function MusicPlayer() {
  const [open, setOpen] = useState(false)
  const stored = readStored()
  const [stationId, setStationId] = useState(stored.stationId)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showVideo, setShowVideo] = useState(false)
  // iframe key — bumped whenever we want to force remount (station change while playing)
  const [iframeKey, setIframeKey] = useState(0)

  const station: Station = STATIONS.find(s => s.id === stationId) ?? STATIONS[0]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stationId, playing } as StoredState))
  }, [stationId, playing])

  // Global keyboard shortcut: `M` toggles play/pause.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'm' && e.key !== 'M') return
      const tgt = e.target as HTMLElement | null
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return
      setPlaying(p => !p)
      setError(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const toggle = () => {
    setError(null)
    setPlaying(p => !p)
  }

  const pickStation = (id: string) => {
    if (id === stationId && playing) return
    setStationId(id)
    setError(null)
    // Force a fresh iframe mount so autoplay fires with the new URL.
    setIframeKey(k => k + 1)
    setPlaying(true)
  }

  return (
    <>
      {/* Iframe — audio source. Hidden offscreen by default; visible when expanded. */}
      {playing && !showVideo && (
        <iframe
          key={iframeKey}
          title={`music-${station.id}`}
          src={stationEmbedUrl(station.videoId)}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          onError={() => { setError('Stream paused. Try another station.'); setPlaying(false) }}
          style={{ position: 'fixed', left: '-9999px', top: 0, width: 320, height: 180, border: 0 }}
        />
      )}

      {/* Collapsed button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open music player"
          title="Music (press M to play/pause)"
          className="p-2 rounded-full bg-surface border border-line text-ink-secondary hover:text-ink hover:border-ink-muted transition-colors shadow-sm relative"
        >
          <Music size={16} />
          {playing && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blueprint animate-pulse" />
          )}
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="w-72 bg-surface border border-line rounded-xl shadow-lg animate-slide-in overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-line-light">
            <div className="flex items-center gap-2">
              <Music size={14} className="text-blueprint" />
              <p className="text-[11px] uppercase tracking-[0.15em] text-ink-secondary">
                {playing ? station.name : 'Music'}
              </p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close player"
              className="p-1 text-ink-muted hover:text-ink">
              <X size={14} />
            </button>
          </div>

          <div className="p-3">
            <p className="text-sm font-medium text-ink truncate">{station.name}</p>
            <p className="text-[11px] text-ink-muted truncate">{station.vibe}</p>

            {/* Visible video mode — inline iframe when expanded */}
            {playing && showVideo && (
              <div className="mt-3 rounded-lg overflow-hidden border border-line bg-black">
                <iframe
                  key={iframeKey}
                  title={`music-video-${station.id}`}
                  src={stationEmbedUrl(station.videoId)}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  style={{ width: '100%', height: 144, border: 0, display: 'block' }}
                />
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button onClick={toggle}
                title="Toggle (shortcut: M)"
                className="p-2 rounded-full bg-blueprint text-white hover:bg-blueprint-dark transition-colors">
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={() => setShowVideo(v => !v)}
                title={showVideo ? 'Hide video' : 'Show video'}
                className="p-2 rounded-full border border-line text-ink-secondary hover:text-ink hover:border-ink-muted transition-colors"
              >
                {showVideo ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <p className="text-[10px] text-ink-muted flex-1">
                <kbd className="px-1 py-0.5 border border-line rounded text-[9px]">M</kbd> toggles
              </p>
            </div>

            {error && <p className="mt-2 text-[11px] text-ink-muted">{error}</p>}

            <div className="mt-3 pt-3 border-t border-line-light">
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-2">Stations</p>
              <div className="space-y-0.5 max-h-48 overflow-auto">
                {STATIONS.map(s => (
                  <button key={s.id} onClick={() => pickStation(s.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[12px] transition-colors ${
                      s.id === stationId ? 'bg-blueprint-light text-blueprint' : 'text-ink-secondary hover:bg-canvas'
                    }`}>
                    <ChevronRight size={12}
                      className={s.id === stationId ? 'opacity-100' : 'opacity-0'} />
                    <span className="truncate flex-1">{s.name}</span>
                    <span className="text-[10px] text-ink-muted">{s.vibe}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
