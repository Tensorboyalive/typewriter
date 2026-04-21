import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Clock } from 'lucide-react'
import { useStore } from '../store'

export function Timer() {
  const { addSession } = useStore()
  const [duration, setDuration] = useState(25)
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const durationRef = useRef(duration)
  durationRef.current = duration

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(id)
          setRunning(false)
          setStarted(false)
          addSession({
            duration: durationRef.current * 60,
            completed_at: new Date().toISOString(),
          })
          if (Notification.permission === 'granted') {
            new Notification('Session Complete', {
              body: `${durationRef.current} min session done!`,
            })
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, addSession])

  const start = () => {
    if (!started) {
      setRemaining(duration * 60)
      setStarted(true)
    }
    setRunning(true)
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  const reset = () => {
    setRunning(false)
    setStarted(false)
    setRemaining(0)
  }

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const progress = started
    ? ((duration * 60 - remaining) / (duration * 60)) * 100
    : 0

  return (
    <div className="flex items-center gap-3 border border-ink/15 px-3 py-1.5">
      {!started ? (
        <>
          <Clock size={13} className="text-muted" />
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
            className="mono w-10 border-none bg-transparent text-center text-[0.85rem] text-ink outline-none tnum"
            min={1}
          />
          <span className="mono text-[0.58rem] uppercase tracking-[0.28em] text-muted">min</span>
          <button
            onClick={start}
            aria-label="start timer"
            className="rounded-full bg-ink p-1.5 text-cream transition-colors hover:bg-viral hover:text-ink"
          >
            <Play size={11} />
          </button>
        </>
      ) : (
        <>
          <div className="relative h-[3px] w-16 overflow-hidden bg-ink/10">
            <div
              className="absolute inset-y-0 left-0 bg-viral transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="mono min-w-[3.5rem] text-center text-[0.85rem] font-medium text-ink tnum">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <button
            onClick={running ? () => setRunning(false) : start}
            aria-label={running ? 'pause' : 'resume'}
            className="rounded-full bg-ink p-1.5 text-cream transition-colors hover:bg-viral hover:text-ink"
          >
            {running ? <Pause size={11} /> : <Play size={11} />}
          </button>
          <button
            onClick={reset}
            aria-label="reset"
            className="p-1 text-muted transition-colors hover:text-danger"
          >
            <RotateCcw size={11} />
          </button>
        </>
      )}
    </div>
  )
}
