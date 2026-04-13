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
    <div className="flex items-center gap-3 bg-surface border border-line rounded-md px-3 py-2">
      {!started ? (
        <>
          <Clock size={14} className="text-ink-muted" />
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-12 text-sm text-ink bg-transparent border-none text-center focus:outline-none tabular-nums"
            min={1}
          />
          <span className="text-[10px] text-ink-muted uppercase tracking-wider">min</span>
          <button
            onClick={start}
            className="p-1.5 rounded bg-blueprint text-white hover:bg-blueprint-dark transition-colors"
          >
            <Play size={12} />
          </button>
        </>
      ) : (
        <>
          <div className="relative w-16 h-1.5 bg-canvas rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-blueprint rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-ink tabular-nums font-medium min-w-[3.5rem] text-center">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <button
            onClick={running ? () => setRunning(false) : start}
            className="p-1.5 rounded bg-blueprint text-white hover:bg-blueprint-dark transition-colors"
          >
            {running ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button
            onClick={reset}
            className="p-1.5 rounded text-ink-muted hover:text-danger transition-colors"
          >
            <RotateCcw size={12} />
          </button>
        </>
      )}
    </div>
  )
}
