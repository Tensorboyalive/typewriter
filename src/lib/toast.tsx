import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type ToastVariant = 'error' | 'warning' | 'success'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

let nextId = 1

/**
 * Editorial toast — ink card + mono label eyebrow + viral accent stripe.
 * Per design.md §7.7 and §9: error tone is lowercase and specific, never "An error occurred".
 */
const VARIANT_LABEL: Record<ToastVariant, string> = {
  error: 'couldn\'t save',
  warning: 'heads up',
  success: 'saved',
}

const VARIANT_STRIPE: Record<ToastVariant, string> = {
  error: 'bg-danger',
  warning: 'bg-warning',
  success: 'bg-success',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, variant: ToastVariant = 'error') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 6000)
  }, [])

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-5 right-5 z-[9999] flex max-w-sm flex-col gap-2"
          aria-live="assertive"
          aria-atomic="false"
        >
          {toasts.map(t => (
            <div
              key={t.id}
              role="alert"
              className="toast-in flex items-stretch gap-0 overflow-hidden rounded-sm border border-ink/15 bg-paper shadow-[0_8px_24px_-12px_rgba(10,10,10,0.35)]"
            >
              <span
                aria-hidden="true"
                className={`w-[3px] flex-shrink-0 ${VARIANT_STRIPE[t.variant]}`}
              />
              <div className="flex flex-1 flex-col gap-1.5 px-4 py-3">
                <span className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">
                  {VARIANT_LABEL[t.variant]}
                </span>
                <span className="text-[0.9rem] leading-snug text-ink">
                  {t.message}
                </span>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="dismiss"
                className="mono self-start px-3 py-3 text-[0.85rem] leading-none text-muted hover:text-ink"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
