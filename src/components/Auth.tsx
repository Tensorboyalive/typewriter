import { useState } from 'react'
import { ArrowRight, Loader2, Check } from 'lucide-react'
import { useStore } from '../store'
import { Eyebrow } from './editorial/Eyebrow'
import { HighlightChip } from './editorial/HighlightChip'

/**
 * Editorial landing moment. The Hero pattern from design.md §7.3 — mono
 * eyebrow, serif display title with HighlightChip, Inter lede, underline
 * input, ink CTA pill. No card boxes. One orange moment per screen.
 */
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
    <div className="relative min-h-screen overflow-hidden bg-cream text-ink">
      {/* Page-edge eyebrow, magazine-left */}
      <div className="pointer-events-none absolute left-6 top-6 hidden md:block">
        <span className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">
          issue 01 · your studio
        </span>
      </div>

      {/* Page-edge mono brand-mark, magazine-right */}
      <div className="pointer-events-none absolute right-6 top-6 hidden md:block">
        <span className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">
          typewriter<span className="text-viral">:</span>studio
        </span>
      </div>

      <main className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col justify-center px-6 py-24 md:px-10 lg:px-14">
        <div className="hero-rise">
          <Eyebrow>early access · control tower</Eyebrow>
        </div>

        <h1
          className="serif hero-rise mt-8 leading-[0.95] tracking-[-0.02em] text-ink"
          style={{ fontSize: 'clamp(3rem, calc(1rem + 5vw), 6.25rem)' }}
        >
          A quiet room for your<br />
          <HighlightChip variant="orange" hero>content</HighlightChip>, scripts,
          <br />
          and daily output.
        </h1>

        <p className="hero-rise hero-rise-delay mt-10 max-w-[56ch] text-[clamp(1.02rem,calc(0.94rem+0.35vw),1.28rem)] leading-[1.5] text-ink/80">
          Four channels. One login. One place where the whole pipeline actually
          lives instead of scattering across six tabs.
        </p>

        {/* Form card — paper surface, hairline edge, no big shadow */}
        <div className="hero-rise hero-rise-delay mt-14 max-w-xl rule-top rule-bottom border-ink/10 bg-paper/60 px-6 py-10 md:px-10 md:py-14">
          {sent ? (
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3">
                <span className="mono inline-flex h-8 w-8 items-center justify-center rounded-full bg-viral text-ink">
                  <Check size={14} strokeWidth={2.4} />
                </span>
                <span className="mono text-[0.68rem] uppercase tracking-[0.28em] text-viral">link sent</span>
              </div>
              <h2 className="serif text-[clamp(1.5rem,calc(1rem+1.5vw),2.3rem)] leading-[1.15] text-ink">
                hold tight. we sent a link to{' '}
                <span className="serif-italic">{email}</span>.
              </h2>
              <p className="text-[0.95rem] leading-[1.55] text-ink/75">
                Click the link to sign in. You can close this tab in the meantime.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mono text-[0.7rem] uppercase tracking-[0.24em] text-muted hover:text-viral"
              >
                use a different email →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label
                  htmlFor="auth-email"
                  className="mono block text-[0.68rem] uppercase tracking-[0.28em] text-muted"
                >
                  email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-underline mt-2"
                  autoFocus
                  required
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'auth-email-error' : undefined}
                />
              </div>

              {error && (
                <p id="auth-email-error" role="alert" className="text-[0.85rem] leading-snug text-danger">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="mono inline-flex items-center gap-3 rounded-full bg-ink px-7 py-4 text-[0.78rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink disabled:pointer-events-none disabled:opacity-40"
              >
                {sending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    sending
                  </>
                ) : (
                  <>
                    send the link
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mono mt-10 text-[0.62rem] uppercase tracking-[0.28em] text-muted">
          encrypted at rest · no password · one-click sign-in
        </p>
      </main>
    </div>
  )
}
