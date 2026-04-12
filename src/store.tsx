import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Project, Expense, Income, TimerSession } from './types'

interface StoreContextType {
  projects: Project[]
  expenses: Expense[]
  income: Income[]
  sessions: TimerSession[]
  conversionRate: number
  addProject: (p: Omit<Project, 'id' | 'createdAt'>) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  addExpense: (e: Omit<Expense, 'id'>) => void
  deleteExpense: (id: string) => void
  addIncome: (i: Omit<Income, 'id'>) => void
  deleteIncome: (id: string) => void
  addSession: (s: Omit<TimerSession, 'id'>) => void
  setConversionRate: (rate: number) => void
}

const StoreContext = createContext<StoreContextType>(null!)

function load<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => load('tw-projects', []))
  const [expenses, setExpenses] = useState<Expense[]>(() => load('tw-expenses', []))
  const [income, setIncome] = useState<Income[]>(() => load('tw-income', []))
  const [sessions, setSessions] = useState<TimerSession[]>(() => load('tw-sessions', []))
  const [conversionRate, setConversionRateState] = useState<number>(() => load('tw-conversion-rate', 84))

  useEffect(() => { localStorage.setItem('tw-projects', JSON.stringify(projects)) }, [projects])
  useEffect(() => { localStorage.setItem('tw-expenses', JSON.stringify(expenses)) }, [expenses])
  useEffect(() => { localStorage.setItem('tw-income', JSON.stringify(income)) }, [income])
  useEffect(() => { localStorage.setItem('tw-sessions', JSON.stringify(sessions)) }, [sessions])
  useEffect(() => { localStorage.setItem('tw-conversion-rate', JSON.stringify(conversionRate)) }, [conversionRate])

  const addProject = (p: Omit<Project, 'id' | 'createdAt'>) => {
    setProjects(prev => [
      ...prev,
      { ...p, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
    ])
  }

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
  }

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setExpenses(prev => prev.filter(e => e.projectId !== id))
    setIncome(prev => prev.filter(i => i.projectId !== id))
  }

  const addExpense = (e: Omit<Expense, 'id'>) => {
    setExpenses(prev => [...prev, { ...e, id: crypto.randomUUID() }])
  }

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const addIncome = (i: Omit<Income, 'id'>) => {
    setIncome(prev => [...prev, { ...i, id: crypto.randomUUID() }])
  }

  const deleteIncome = (id: string) => {
    setIncome(prev => prev.filter(i => i.id !== id))
  }

  const addSession = (s: Omit<TimerSession, 'id'>) => {
    setSessions(prev => [...prev, { ...s, id: crypto.randomUUID() }])
  }

  const setConversionRate = (rate: number) => {
    setConversionRateState(rate)
  }

  return (
    <StoreContext.Provider
      value={{
        projects, expenses, income, sessions, conversionRate,
        addProject, updateProject, deleteProject,
        addExpense, deleteExpense,
        addIncome, deleteIncome,
        addSession, setConversionRate,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
