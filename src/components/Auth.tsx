import { useState } from 'react'
import { Mail, ArrowRight, Loader2, Check } from 'lucide-react'
import { useStore } from '../store'

export function Auth() {
  const { signIn } = useStore()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setSending(true)
    setError('')

    const result = await signIn(email.trim())

    if (result.error) {
      setError(result.error)
      setSending(false)
    } else {
      setSent(true)
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-light tracking-wide text-ink">typewriter</h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-ink-muted mt-1.5">
            control tower
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-line rounded-lg p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <Check size={20} className="text-success" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-ink mb-1">Check your inbox</h2>
                <p className="text-[13px] text-ink-secondary leading-relaxed">
                  We sent a magic link to <span className="font-medium text-ink">{email}</span>.
                  Click it to sign in.
                </p>
              </div>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-[12px] text-blueprint hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input w-full pl-10"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-[12px] text-danger">{error}</p>
              )}

              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blueprint text-white text-sm font-medium rounded-md hover:bg-blueprint-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Send magic link
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-ink-muted mt-6 tracking-wide">
          Your data is stored securely in the cloud &middot; No password needed
        </p>
      </div>
    </div>
  )
}
