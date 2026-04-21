import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { StoreProvider, useStore } from './store'
import { ToastProvider, useToast } from './lib/toast'
import { Auth } from './components/Auth'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { Today } from './components/Today'
import { Calendar } from './components/Calendar'
import { Kanban } from './components/Kanban'
import { ScriptEditor } from './components/ScriptEditor'
import { Expenses } from './components/Expenses'
import { Saved } from './components/Saved'
import { NoteEditor } from './components/NoteEditor'
import { Checklist } from './components/Checklist'
import { EditorOutput } from './components/EditorOutput'
import { Settings } from './components/Settings'
import { AdminLock } from './components/AdminLock'

/** Renders a dismissible banner when the initial data fetch failed.
 *  Editorial style: ink bar with cream text + mono eyebrow + viral retry button. */
function FetchErrorBanner() {
  const { fetchError, retryFetch } = useStore()
  if (!fetchError) return null
  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[9000] flex items-center justify-center gap-3 bg-ink px-4 py-2.5 text-[0.85rem] text-cream"
    >
      <AlertTriangle size={14} className="text-viral" />
      <span className="mono text-[0.62rem] uppercase tracking-[0.28em] text-viral">fetch failed</span>
      <span className="truncate">{fetchError}</span>
      <button
        onClick={retryFetch}
        className="mono ml-2 inline-flex items-center gap-1.5 rounded-sm border border-cream/40 px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.22em] text-cream hover:border-viral hover:text-viral"
      >
        <RefreshCw size={11} />
        retry
      </button>
    </div>
  )
}

function AppContent() {
  const { user, authLoading, dataLoading } = useStore()
  const { showToast } = useToast()

  // Global safety net for unhandled rejections from the store layer.
  // Registered once per mount; previous impl reassigned on every render.
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const msg: string = event.reason instanceof Error
        ? event.reason.message
        : String(event.reason ?? 'Unknown error')
      console.error('[app] Unhandled rejection:', event.reason)
      showToast(`save failed: ${msg}`)
    }
    window.addEventListener('unhandledrejection', handler)
    return () => window.removeEventListener('unhandledrejection', handler)
  }, [showToast])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <Loader2 size={24} className="text-viral animate-spin" />
      </div>
    )
  }

  if (!user) return <Auth />

  if (dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas gap-3">
        <Loader2 size={24} className="text-viral animate-spin" />
        <p className="mono text-[0.68rem] uppercase tracking-[0.28em] text-muted">loading your data</p>
      </div>
    )
  }

  return (
    <>
      <FetchErrorBanner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/today" element={<Today />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/projects" element={<Kanban />} />
            <Route path="/projects/:id" element={<ScriptEditor />} />
            <Route path="/expenses" element={<AdminLock label="Expenses"><Expenses /></AdminLock>} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/saved/:id" element={<NoteEditor />} />
            <Route path="/checklist" element={<Checklist />} />
            <Route path="/output" element={<EditorOutput />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ToastProvider>
  )
}
