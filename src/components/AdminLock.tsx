import { useState, type ReactNode } from 'react'
import { Lock } from 'lucide-react'

// Simple app-level passcode gate. Both admins share one login, so this is a
// soft barrier on sensitive surfaces (Dashboard, Expenses) — NOT a security
// boundary. The real data is still protected by Supabase RLS.
const PASSCODE = '1613'
const STORAGE_KEY = 'tw-admin-unlock'

export const isUnlocked = () => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export const lockAdmin = () => localStorage.removeItem(STORAGE_KEY)

export function AdminLock({ children, label }: { children: ReactNode; label: string }) {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return <>{children}</>

  const submit = () => {
    if (input === PASSCODE) {
      localStorage.setItem(STORAGE_KEY, '1')
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
      setTimeout(() => setError(false), 800)
    }
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
