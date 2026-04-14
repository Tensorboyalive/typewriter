import { useEffect, useRef, useState } from 'react'
import { Music, Play, Pause, Volume2, X, ChevronRight } from 'lucide-react'
import { STATIONS, type Station } from '../lib/stations'

// Replaces the prior YouTube IFrame approach — which was fragile (embed
// disabled, geo-blocks, CSP friction) — with a plain <audio> element pointed
// at free SomaFM MP3 streams. No iframe, no window.YT, no script injection.

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
  return { stationId: STATIONS[0].id, volume: 0.4 }
}

export function MusicPlayer() {
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stored = readStored()
  const [stationId, setStationId] = useState(stored.stationId)
  const [volume, setVolume] = useState<number>(() => {
    const v = stored.volume
    // Migrate old 0–100 storage if encountered
    return v > 1 ? Math.max(0, Math.min(1, v / 100)) : v
  })

  const audioRef = useRef<HTMLAudioElement>(null)
  const station: Station = STATIONS.find(s => s.id === stationId) ?? STATIONS[0]

  // Persist preferences
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stationId, volume } as StoredState))
  }, [stationId, volume])

  // Keep audio volume in sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // When station changes while playing, swap src and continue
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    setError(null)
    const wasPlaying = playing
    a.src = station.url
    if (wasPlaying) {
      a.play().catch(() => setError('Stream offline — try another'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId])

  const toggle = async () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      try {
        if (!a.src) a.src = station.url
        await a.play()
        setPlaying(true)
        setError(null)
      } catch {
        setError('Stream offline — try another')
        setPlaying(false)
      }
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => { setError('Stream offline — try another'); setPlaying(false) }}
      />

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
            <p className="text-sm font-medium text-ink truncate">{station.name}</p>
            <p className="text-[11px] text-ink-muted truncate">{station.vibe}</p>

            <div className="mt-3 flex items-center gap-2">
              <button onClick={toggle}
                className="p-2 rounded-full bg-blueprint text-white hover:bg-blueprint-dark transition-colors">
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex items-center gap-2 flex-1">
                <Volume2 size={14} className="text-ink-muted" />
                <input type="range" min={0} max={100} value={Math.round(volume * 100)}
                  onChange={e => setVolume(Number(e.target.value) / 100)}
                  className="flex-1 accent-[color:var(--color-blueprint)]" />
              </div>
            </div>

            {error && <p className="mt-2 text-[11px] text-ink-muted">{error}</p>}

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
                    <span className="truncate">{s.name}</span>
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
