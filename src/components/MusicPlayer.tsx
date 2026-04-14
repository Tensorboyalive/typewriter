import { useEffect, useRef, useState } from 'react'
import { Music, Play, Pause, Volume2, X, ChevronRight } from 'lucide-react'
import { STATIONS, type Station } from '../lib/stations'

// ── YouTube IFrame API typing (minimal surface we use) ──────────────
type YTPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  setVolume: (v: number) => void
  loadVideoById: (id: string) => void
  loadPlaylist: (opts: { list: string; listType: string }) => void
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
    // fallthrough to default
  }
  return { stationId: STATIONS[0].id, volume: 40 }
}

// Load the YT IFrame API once, return a promise that resolves when ready.
let apiReady: Promise<void> | null = null
function loadYouTubeAPI(): Promise<void> {
  if (apiReady) return apiReady
  apiReady = new Promise<void>(resolve => {
    if (window.YT?.Player) return resolve()
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
    if (!existing) {
      const s = document.createElement('script')
      s.src = SCRIPT_SRC
      document.head.appendChild(s)
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
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

  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)

  const station: Station =
    STATIONS.find(s => s.id === stationId) ?? STATIONS[0]

  // Persist preferences
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ stationId, volume } as StoredState),
    )
  }, [stationId, volume])

  // Initialize the YT player on first open
  useEffect(() => {
    if (!open || playerRef.current) return
    let cancelled = false
    loadYouTubeAPI().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return
      playerRef.current = new window.YT.Player(hostRef.current, {
        width: '1',
        height: '1',
        videoId: station.videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          playsinline: 1,
          ...(station.playlistId
            ? { list: station.playlistId, listType: 'playlist' }
            : {}),
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            e.target.setVolume(volume)
            setReady(true)
          },
          onStateChange: (e: { data: number }) => {
            if (!window.YT) return
            setPlaying(e.data === window.YT.PlayerState.PLAYING)
          },
          onError: () => {
            setError('Station unavailable — try another.')
            setPlaying(false)
          },
        },
      })
    })
    return () => {
      cancelled = true
    }
    // We intentionally only init once per mount of the opened panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Keep player volume in sync
  useEffect(() => {
    if (ready && playerRef.current) playerRef.current.setVolume(volume)
  }, [volume, ready])

  // Swap station
  useEffect(() => {
    if (!ready || !playerRef.current) return
    setError(null)
    if (station.playlistId) {
      playerRef.current.loadPlaylist({
        list: station.playlistId,
        listType: 'playlist',
      })
    } else if (station.videoId) {
      playerRef.current.loadVideoById(station.videoId)
    }
    // loadVideoById autoplays, so reflect that
    setPlaying(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId, ready])

  const toggle = () => {
    if (!playerRef.current) return
    if (playing) playerRef.current.pauseVideo()
    else playerRef.current.playVideo()
  }

  return (
    <>
      {/* Hidden YT host — must be rendered, but visually offscreen */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div ref={hostRef} />
      </div>

      {/* Collapsed: just the button */}
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
              <p className="text-[11px] uppercase tracking-[0.15em] text-ink-secondary">
                Ambient
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close player"
              className="p-1 text-ink-muted hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-3">
            <p className="text-sm font-medium text-ink truncate">
              {station.label}
            </p>
            <p className="text-[11px] text-ink-muted truncate">{station.hint}</p>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={toggle}
                disabled={!ready}
                className="p-2 rounded-full bg-blueprint text-white hover:bg-blueprint-dark disabled:opacity-40 transition-colors"
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex items-center gap-2 flex-1">
                <Volume2 size={14} className="text-ink-muted" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="flex-1 accent-[color:var(--color-blueprint)]"
                />
              </div>
            </div>

            {error && (
              <p className="mt-2 text-[11px] text-danger">{error}</p>
            )}

            <div className="mt-3 pt-3 border-t border-line-light">
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-2">
                Stations
              </p>
              <div className="space-y-0.5 max-h-48 overflow-auto">
                {STATIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStationId(s.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[12px] transition-colors ${
                      s.id === stationId
                        ? 'bg-blueprint-light text-blueprint'
                        : 'text-ink-secondary hover:bg-canvas'
                    }`}
                  >
                    <ChevronRight
                      size={12}
                      className={
                        s.id === stationId ? 'opacity-100' : 'opacity-0'
                      }
                    />
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
