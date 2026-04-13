import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { StoreProvider, useStore } from './store'
import { Auth } from './components/Auth'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { Calendar } from './components/Calendar'
import { Kanban } from './components/Kanban'
import { ScriptEditor } from './components/ScriptEditor'
import { Expenses } from './components/Expenses'
import { Saved } from './components/Saved'
import { ContentBank } from './components/ContentBank'
import { BankItemEditor } from './components/BankItemEditor'
import { NoteEditor } from './components/NoteEditor'
import { Checklist } from './components/Checklist'
import { EditorQueue } from './components/EditorQueue'
import { EditorOutput } from './components/EditorOutput'
import { Deals } from './components/Deals'
import { Settings } from './components/Settings'

function AppContent() {
  const { user, authLoading, dataLoading } = useStore()

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
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/projects" element={<Kanban />} />
          <Route path="/projects/:id" element={<ScriptEditor />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/saved/:id" element={<NoteEditor />} />
          <Route path="/bank" element={<ContentBank />} />
          <Route path="/bank/:id" element={<BankItemEditor />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/queue" element={<EditorQueue />} />
          <Route path="/output" element={<EditorOutput />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  )
}
