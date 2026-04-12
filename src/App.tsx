import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider } from './store'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { Calendar } from './components/Calendar'
import { Kanban } from './components/Kanban'
import { ScriptEditor } from './components/ScriptEditor'
import { Expenses } from './components/Expenses'

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/projects" element={<Kanban />} />
            <Route path="/projects/:id" element={<ScriptEditor />} />
            <Route path="/expenses" element={<Expenses />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
