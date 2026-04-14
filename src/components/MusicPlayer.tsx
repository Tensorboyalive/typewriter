import { useEffect, useRef, useState } from 'react'
import { Music, Play, Pause, Volume2, X, ChevronRight } from 'lucide-react'
import { STATIONS, type Station } from '../lib/stations'

// ── YouTube IFrame API types (minimal) ──────────────────────────────
type YTPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  setVolume: (v: number) => void
  loadVideoById: (id: string) => void
  cueVideoById: (id: string) => void
  destroy: () => void
}
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>,
      ) => YTPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

const SCRIPT_SRC = 'https://www.youtube.com/iframe_api'
const STORAGE_KEY = 'tw-music'

interface StoredState {
  stationId: string
  volume: number
}

function readStored(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fallthrough
  }
  return { stationId: STATIONS[0].id, volume: 40 }
}

// Load YT IFrame API once, resolve when ready. Chains with any pre-existing
// onYouTubeIframeAPIReady handler so multiple components could theoretically
// share it. The <script> is appended on first call only.
let apiReady: Promise<void> | null = null
function loadYouTubeAPI(): Promise<void> {
  if (apiReady) return apiReady
  apiReady = new Promise<void>(resolve => {
    if (window.YT?.Player) return resolve()
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const s = document.createElement('script')
      s.src = SCRIPT_SRC
      s.async = true
      document.head.appendChild(s)
    }
  })
  return apiReady
}

export function MusicPlayer() {
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stored = readStored()
  const [stationId, setStationId] = useState(stored.stationId)
  const [volume, setVolume] = useState(stored.volume)

  // Stable container div that React owns. We imperatively create a plain DOM
  // <div> inside it and hand THAT to YT.Player. YouTube replaces it with an
  // <iframe>; React never touches it again → no reconciliation crash.
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const initStartedRef = useRef(false)

  const station: Station = STATIONS.find(s => s.id === stationId) ?? STATIONS[0]

  // Persist preferences
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stationId, volume } as StoredState))
  }, [stationId, volume])

  // Initialize once on mount. React 18/19 StrictMode runs effects twice in dev,
  // so guard with a ref flag (not state) to skip the second run.
  useEffect(() => {
    if (initStartedRef.current || !mountRef.current) return
    initStartedRef.current = true

    // Create a fresh DOM node that YT.Player will replace. NOT a React ref.
    const target = document.createElement('div')
    target.id = `yt-host-${Math.random().toString(36).slice(2, 9)}`
    mountRef.current.appendChild(target)

    let cancelled = false
    loadYouTubeAPI().then(() => {
      if (cancelled || !window.YT) return
      try {
        playerRef.current = new window.YT.Player(target, {
          width: '200',
          height: '120',
          videoId: station.videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (e: { target: YTPlayer }) => {
              e.target.setVolume(volume)
              setReady(true)
            },
            onStateChange: (e: { data: number }) => {
              if (!window.YT) return
              if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true)
              else if (e.data === window.YT.PlayerState.PAUSED || e.data === window.YT.PlayerState.ENDED) setPlaying(false)
            },
            onError: (e: { data: number }) => {
              // 101/150 = embed disabled; 100 = not found; 2 = bad param; 5 = HTML5 error
              setError(`Station unavailable (code ${e.data}). Try another.`)
              setPlaying(false)
            },
          },
        })
      } catch (err) {
        setError('Could not initialize YouTube player.')
        console.error('[MusicPlayer] init error', err)
      }
    })

    return () => {
      cancelled = true
      try { playerRef.current?.destroy() } catch { /* ignore */ }
      playerRef.current = null
    }
    // Intentionally empty — init once, station changes are handled in another effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Volume sync
  useEffect(() => {
    if (ready && playerRef.current) playerRef.current.setVolume(volume)
  }, [volume, ready])

  // Station swap (after init)
  useEffect(() => {
    if (!ready || !playerRef.current) return
    setError(null)
    playerRef.current.loadVideoById(station.videoId ?? STATIONS[0].videoId!)
    // loadVideoById auto-plays once user has initiated playback in this tab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId, ready])

  const toggle = () => {
    const p = playerRef.current
    if (!p) return
    if (playing) p.pauseVideo()
    else p.playVideo()
  }

  return (
    <>
      {/* Hidden-but-not-invisible YT host. Positioned offscreen with tiny footprint
          rather than opacity:0 — some browsers refuse playback in 0-opacity iframes. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          width: 200,
          height: 120,
          pointerEvents: 'none',
        }}
      >
        <div ref={mountRef} />
      </div>

      {/* Collapsed button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open music player"
          title="Music"
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
              <p className="text-[11px] uppercase tracking-[0.15em] text-ink-secondary">Ambient</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close player"
              className="p-1 text-ink-muted hover:text-ink">
              <X size={14} />
            </button>
          </div>

          <div className="p-3">
            <p className="text-sm font-medium text-ink truncate">{station.label}</p>
            <p className="text-[11px] text-ink-muted truncate">{station.hint}</p>

            <div className="mt-3 flex items-center gap-2">
              <button onClick={toggle} disabled={!ready}
                className="p-2 rounded-full bg-blueprint text-white hover:bg-blueprint-dark disabled:opacity-40 transition-colors">
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex items-center gap-2 flex-1">
                <Volume2 size={14} className="text-ink-muted" />
                <input type="range" min={0} max={100} value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="flex-1 accent-[color:var(--color-blueprint)]" />
              </div>
            </div>

            {!ready && !error && (
              <p className="mt-2 text-[11px] text-ink-muted">Connecting to YouTube…</p>
            )}
            {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}

            <div className="mt-3 pt-3 border-t border-line-light">
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-2">Stations</p>
              <div className="space-y-0.5 max-h-48 overflow-auto">
                {STATIONS.map(s => (
                  <button key={s.id} onClick={() => setStationId(s.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[12px] transition-colors ${
                      s.id === stationId ? 'bg-blueprint-light text-blueprint' : 'text-ink-secondary hover:bg-canvas'
                    }`}>
                    <ChevronRight size={12}
                      className={s.id === stationId ? 'opacity-100' : 'opacity-0'} />
                    <span className="truncate">{s.label}</span>
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
