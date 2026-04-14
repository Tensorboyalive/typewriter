import { useState, useEffect, type ReactNode } from 'react'
import { Lock } from 'lucide-react'

// Simple app-level passcode gate. Both admins share one login, so this is a
// soft barrier on sensitive surfaces (Finances, Expenses) — NOT a security
// boundary. The real data is still protected by Supabase RLS.
const PASSCODE = '1613'
const STORAGE_KEY = 'tw-admin-unlock'
const EVT = 'tw-admin-unlock-change'

export const isUnlocked = () => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export const lockAdmin = () => {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(EVT))
}

export const unlockAdmin = () => {
  localStorage.setItem(STORAGE_KEY, '1')
  window.dispatchEvent(new Event(EVT))
}

// Subscribe to unlock/lock changes across components.
function useUnlockState() {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  useEffect(() => {
    const h = () => setUnlocked(isUnlocked())
    window.addEventListener(EVT, h)
    window.addEventListener('storage', h)
    return () => {
      window.removeEventListener(EVT, h)
      window.removeEventListener('storage', h)
    }
  }, [])
  return unlocked
}

export function AdminLock({ children, label, variant = 'page' }: {
  children: ReactNode
  label: string
  variant?: 'page' | 'inline'
}) {
  const unlocked = useUnlockState()
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return <>{children}</>

  const submit = () => {
    if (input === PASSCODE) {
      unlockAdmin()
    } else {
      setError(true)
      setInput('')
      setTimeout(() => setError(false), 800)
    }
  }

  if (variant === 'inline') {
    return (
      <div className="relative">
        <div className="pointer-events-none blur-md opacity-40 select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-surface border border-line rounded-lg shadow p-4 text-center">
            <div className="mx-auto w-8 h-8 rounded-full bg-blueprint-light flex items-center justify-center mb-2">
              <Lock size={14} className="text-blueprint" />
            </div>
            <p className="text-[12px] font-medium text-ink mb-0.5">{label} is locked</p>
            <p className="text-[10px] text-ink-muted mb-3">Owner passcode required</p>
            <input
              type="password"
              inputMode="numeric"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="••••"
              className={`w-full px-2 py-1.5 text-center tracking-[0.3em] bg-canvas border rounded text-sm ${
                error ? 'border-danger animate-pulse' : 'border-line focus:border-blueprint'
              }`}
            />
            <button onClick={submit}
              className="mt-2 w-full px-2 py-1.5 text-[12px] bg-blueprint text-white rounded hover:bg-blueprint-dark">
              Unlock
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div className="absolute inset-0 pointer-events-none blur-md opacity-40 select-none overflow-hidden">
        {children}
      </div>
      <div className="relative z-10 h-full flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-surface border border-line rounded-xl shadow-lg p-6 text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-blueprint-light flex items-center justify-center mb-3">
            <Lock size={16} className="text-blueprint" />
          </div>
          <p className="text-sm font-medium text-ink">Admin access required</p>
          <p className="text-[12px] text-ink-muted mt-1 mb-4">{label} is owner-only.</p>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="Passcode"
            className={`w-full px-3 py-2 text-center tracking-[0.4em] text-lg bg-canvas border rounded transition-colors ${
              error ? 'border-danger animate-pulse' : 'border-line focus:border-blueprint'
            }`}
          />
          <button
            onClick={submit}
            className="mt-3 w-full px-3 py-2 text-sm bg-blueprint text-white rounded hover:bg-blueprint-dark"
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  )
}
