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

/** Renders a dismissible banner when the initial data fetch failed. */
function FetchErrorBanner() {
  const { fetchError, retryFetch } = useStore()
  if (!fetchError) return null
  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        background: '#dc2626',
        color: '#fff',
        padding: '0.625rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.875rem',
        justifyContent: 'center',
      }}
    >
      <AlertTriangle size={16} />
      <span>{fetchError}</span>
      <button
        onClick={retryFetch}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff',
          borderRadius: '0.25rem',
          padding: '0.2rem 0.6rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontSize: '0.8rem',
          marginLeft: '0.5rem',
        }}
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </div>
  )
}

function AppContent() {
  const { user, authLoading, dataLoading } = useStore()
  const { showToast } = useToast()

  // Global handler: any unhandled promise rejection from store throws
  // bubbles to window. Catch and show a toast so errors never silently vanish.
  if (typeof window !== 'undefined') {
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const msg: string = event.reason instanceof Error
        ? event.reason.message
        : String(event.reason ?? 'Unknown error')
      console.error('[app] Unhandled rejection:', event.reason)
      showToast(`Save failed: ${msg}`)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <Loader2 size={24} className="text-blueprint animate-spin" />
      </div>
    )
  }

  if (!user) return <Auth />

  if (dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas gap-3">
        <Loader2 size={24} className="text-blueprint animate-spin" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">Loading your data...</p>
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
