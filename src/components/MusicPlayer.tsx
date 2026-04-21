import { useEffect, useState } from 'react'
import { Music, Play, Pause, X, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import { STATIONS, stationEmbedUrl, type Station } from '../lib/stations'
import { cn } from '../lib/cn'

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
    setIframeKey(k => k + 1)
    setPlaying(true)
  }

  return (
    <>
      {/* Offscreen iframe — hidden audio source when expanded is closed or video hidden. */}
      {playing && !showVideo && (
        <iframe
          key={iframeKey}
          title={`music-${station.id}`}
          src={stationEmbedUrl(station)}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          onError={() => { setError('stream paused. try another station.'); setPlaying(false) }}
          style={{ position: 'fixed', left: '-9999px', top: 0, width: 320, height: 180, border: 0 }}
        />
      )}

      {/* Collapsed button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="open music player"
          title="music (press m to play/pause)"
          className="relative rounded-full border border-ink/15 bg-paper/80 p-2.5 text-muted transition-colors hover:border-viral hover:text-viral"
        >
          <Music size={14} />
          {playing && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-viral animate-pulse"
            />
          )}
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="animate-slide-in w-72 overflow-hidden rule-top rule-bottom border-ink/10 bg-paper shadow-[0_8px_24px_-12px_rgba(10,10,10,0.4)]">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Music size={12} className="text-viral" />
              <p className="mono text-[0.6rem] uppercase tracking-[0.28em] text-muted">
                {playing ? station.name.toLowerCase() : 'music'}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="close player"
              className="p-1 text-muted hover:text-ink"
            >
              <X size={13} />
            </button>
          </div>

          <div className="p-4">
            <p className="serif truncate text-[1rem] leading-tight text-ink">{station.name}</p>
            <p className="mono mt-1 truncate text-[0.58rem] uppercase tracking-[0.26em] text-muted">
              {station.vibe}
            </p>

            {playing && showVideo && (
              <div className="mt-3 overflow-hidden bg-ink">
                <iframe
                  key={iframeKey}
                  title={`music-video-${station.id}`}
                  src={stationEmbedUrl(station)}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  style={{ width: '100%', height: 144, border: 0, display: 'block' }}
                />
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={toggle}
                aria-label={playing ? 'pause' : 'play'}
                title="toggle (shortcut: m)"
                className="rounded-full bg-ink p-2.5 text-cream transition-colors hover:bg-viral hover:text-ink"
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                onClick={() => setShowVideo(v => !v)}
                aria-label={showVideo ? 'hide video' : 'show video'}
                title={showVideo ? 'hide video' : 'show video'}
                className="rounded-full border border-ink/15 p-2 text-muted transition-colors hover:border-viral hover:text-viral"
              >
                {showVideo ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
              <p className="mono ml-auto text-[0.56rem] uppercase tracking-[0.26em] text-muted/80">
                <kbd className="border border-ink/20 px-1 py-0.5 text-[0.55rem] text-muted">m</kbd> toggles
              </p>
            </div>

            {error && (
              <p role="alert" className="mono mt-3 text-[0.6rem] uppercase tracking-[0.24em] text-muted">
                {error}
              </p>
            )}

            <div className="mt-4 border-t border-ink/10 pt-4">
              <p className="mono mb-3 text-[0.58rem] uppercase tracking-[0.28em] text-muted">
                stations
              </p>
              <div className="max-h-48 space-y-0 overflow-auto divide-y divide-ink/5">
                {STATIONS.map(s => {
                  const active = s.id === stationId
                  return (
                    <button
                      key={s.id}
                      onClick={() => pickStation(s.id)}
                      className={cn(
                        'flex w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-cream',
                        active && 'bg-cream',
                      )}
                    >
                      <ChevronRight
                        size={11}
                        className={cn('shrink-0 text-viral', !active && 'opacity-0')}
                      />
                      <span className={cn(
                        'serif flex-1 truncate text-[0.9rem]',
                        active ? 'text-viral' : 'text-ink',
                      )}>
                        {s.name}
                      </span>
                      <span className="mono text-[0.54rem] uppercase tracking-[0.26em] text-muted">
                        {s.vibe}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
