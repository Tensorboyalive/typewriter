import { useState } from 'react'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { Plus, Trash2, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react'
import { useStore } from '../store'
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '../types'
import { Select } from './Select'

export function Expenses() {
  const {
    expenses, income, projects, conversionRate,
    addExpense, deleteExpense, addIncome, deleteIncome, setConversionRate,
  } = useStore()

  const [formMode, setFormMode] = useState<'expense' | 'income' | null>(null)

  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0])
  const [expProjectId, setExpProjectId] = useState('')
  const [expDate, setExpDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [expCurrency, setExpCurrency] = useState<'INR' | 'USD'>('INR')

  const [incDesc, setIncDesc] = useState('')
  const [incAmount, setIncAmount] = useState('')
  const [incSource, setIncSource] = useState(INCOME_SOURCES[0])
  const [incProjectId, setIncProjectId] = useState('')
  const [incDate, setIncDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [incCurrency, setIncCurrency] = useState<'INR' | 'USD'>('INR')

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const monthExpenses = expenses.filter(e =>
    isWithinInterval(new Date(e.date), { start: monthStart, end: monthEnd }),
  )
  const monthIncome = income.filter(i =>
    isWithinInterval(new Date(i.date), { start: monthStart, end: monthEnd }),
  )

  const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalEarned = monthIncome.reduce((sum, i) => sum + i.amount, 0)
  const net = totalEarned - totalSpent

  const byCategory = EXPENSE_CATEGORIES.map(cat => ({
    category: cat,
    total: monthExpenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0),
  })).filter(c => c.total > 0)

  const handleAddExpense = () => {
    if (!expDesc.trim() || !expAmount) return
    const raw = parseFloat(expAmount)
    const amount = expCurrency === 'USD' ? raw * conversionRate : raw
    addExpense({
      description: expDesc.trim(),
      amount,
      category: expCategory,
      project_id: expProjectId || null,
      date: expDate,
    })
    setExpDesc('')
    setExpAmount('')
    setExpCurrency('INR')
    setFormMode(null)
  }

  const handleAddIncome = () => {
    if (!incDesc.trim() || !incAmount) return
    const raw = parseFloat(incAmount)
    const amount = incCurrency === 'USD' ? raw * conversionRate : raw
    addIncome({
      description: incDesc.trim(),
      amount,
      source: incSource,
      project_id: incProjectId || null,
      date: incDate,
    })
    setIncDesc('')
    setIncAmount('')
    setIncCurrency('INR')
    setFormMode(null)
  }

  type Entry = {
    id: string
    kind: 'expense' | 'income'
    description: string
    amount: number
    label: string
    project?: string
    date: string
  }

  const allEntries: Entry[] = [
    ...expenses.map(e => ({
      id: e.id,
      kind: 'expense' as const,
      description: e.description,
      amount: e.amount,
      label: e.category,
      project: projects.find(p => p.id === e.project_id)?.title,
      date: e.date,
    })),
    ...income.map(i => ({
      id: i.id,
      kind: 'income' as const,
      description: i.description,
      amount: i.amount,
      label: i.source,
      project: projects.find(p => p.id === i.project_id)?.title,
      date: i.date,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const projectOptions = [
    { value: '', label: 'No project' },
    ...projects.map(p => ({ value: p.id, label: p.title })),
  ]

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">
            Money
          </p>
          <h2 className="text-2xl font-light text-ink">
            {format(now, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFormMode(formMode === 'income' ? null : 'income')}
            className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-md text-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Income
          </button>
          <button
            onClick={() =>
              setFormMode(formMode === 'expense' ? null : 'expense')
            }
            className="flex items-center gap-2 px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors"
          >
            <Plus size={16} /> Expense
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-surface border border-line rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-success" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Earned
            </p>
          </div>
          <p className="text-2xl font-light text-success tabular-nums">
            ₹{totalEarned.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-surface border border-line rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-danger" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Spent
            </p>
          </div>
          <p className="text-2xl font-light text-danger tabular-nums">
            ₹{totalSpent.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-surface border border-line rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpDown size={14} className="text-ink-muted" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Net
            </p>
          </div>
          <p
            className={`text-2xl font-light tabular-nums ${net >= 0 ? 'text-success' : 'text-danger'}`}
          >
            {net >= 0 ? '+' : '-'}₹{Math.abs(net).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-surface border border-line rounded-lg p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-3">
            By Category
          </p>
          <div className="space-y-1.5">
            {byCategory.map(c => (
              <div key={c.category} className="flex justify-between text-sm">
                <span className="text-ink-secondary">{c.category}</span>
                <span className="text-ink tabular-nums">
                  ₹{c.total.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
            {byCategory.length === 0 && (
              <p className="text-[11px] text-ink-muted">No expenses yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Expense form */}
      {formMode === 'expense' && (
        <div className="bg-surface border border-line rounded-lg p-4 mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-3">
            New Expense
          </p>
          <div className="grid grid-cols-3 gap-3">
            <input
              value={expDesc}
              onChange={e => setExpDesc(e.target.value)}
              placeholder="Description..."
              className="input"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAddExpense()}
            />
            <div className="flex">
              <input
                value={expAmount}
                onChange={e => setExpAmount(e.target.value)}
                type="number"
                placeholder="Amount"
                className="input flex-1 rounded-r-none"
                onKeyDown={e => e.key === 'Enter' && handleAddExpense()}
              />
              <button
                type="button"
                onClick={() =>
                  setExpCurrency(c => (c === 'INR' ? 'USD' : 'INR'))
                }
                className="px-2.5 border border-l-0 border-line rounded-r-md bg-canvas text-[11px] font-medium text-ink-secondary hover:text-blueprint transition-colors whitespace-nowrap"
              >
                {expCurrency === 'INR' ? '₹' : '$'}
              </button>
            </div>
            <Select
              value={expCategory}
              onChange={setExpCategory}
              options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))}
            />
            <Select
              value={expProjectId}
              onChange={setExpProjectId}
              options={projectOptions}
              placeholder="No project"
            />
            <input
              value={expDate}
              onChange={e => setExpDate(e.target.value)}
              type="date"
              className="input"
            />
            <button
              onClick={handleAddExpense}
              className="px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Income form */}
      {formMode === 'income' && (
        <div className="bg-surface border border-line rounded-lg p-4 mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-success mb-3">
            New Income
          </p>
          <div className="grid grid-cols-3 gap-3">
            <input
              value={incDesc}
              onChange={e => setIncDesc(e.target.value)}
              placeholder="Description..."
              className="input"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAddIncome()}
            />
            <div className="flex">
              <input
                value={incAmount}
                onChange={e => setIncAmount(e.target.value)}
                type="number"
                placeholder="Amount"
                className="input flex-1 rounded-r-none"
                onKeyDown={e => e.key === 'Enter' && handleAddIncome()}
              />
              <button
                type="button"
                onClick={() =>
                  setIncCurrency(c => (c === 'INR' ? 'USD' : 'INR'))
                }
                className="px-2.5 border border-l-0 border-line rounded-r-md bg-canvas text-[11px] font-medium text-ink-secondary hover:text-blueprint transition-colors whitespace-nowrap"
              >
                {incCurrency === 'INR' ? '₹' : '$'}
              </button>
            </div>
            <Select
              value={incSource}
              onChange={setIncSource}
              options={INCOME_SOURCES.map(s => ({ value: s, label: s }))}
            />
            <Select
              value={incProjectId}
              onChange={setIncProjectId}
              options={projectOptions}
              placeholder="No project"
            />
            <input
              value={incDate}
              onChange={e => setIncDate(e.target.value)}
              type="date"
              className="input"
            />
            <button
              onClick={handleAddIncome}
              className="px-4 py-2 bg-success text-white rounded-md text-sm hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Combined ledger */}
      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left text-[10px] uppercase tracking-[0.2em] text-ink-muted p-3 font-medium w-8" />
              <th className="text-left text-[10px] uppercase tracking-[0.2em] text-ink-muted p-3 font-medium">
                Description
              </th>
              <th className="text-left text-[10px] uppercase tracking-[0.2em] text-ink-muted p-3 font-medium">
                Type
              </th>
              <th className="text-left text-[10px] uppercase tracking-[0.2em] text-ink-muted p-3 font-medium">
                Project
              </th>
              <th className="text-right text-[10px] uppercase tracking-[0.2em] text-ink-muted p-3 font-medium">
                Amount
              </th>
              <th className="text-right text-[10px] uppercase tracking-[0.2em] text-ink-muted p-3 font-medium">
                Date
              </th>
              <th className="p-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {allEntries.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-12 text-center text-ink-muted text-sm"
                >
                  No transactions yet
                </td>
              </tr>
            ) : (
              allEntries.map(entry => (
                <tr
                  key={entry.id}
                  className="border-b border-line-light hover:bg-canvas/50 transition-colors"
                >
                  <td className="p-3">
                    <span
                      className={`w-2 h-2 rounded-full inline-block ${
                        entry.kind === 'income' ? 'bg-success' : 'bg-danger'
                      }`}
                    />
                  </td>
                  <td className="p-3 text-sm text-ink">{entry.description}</td>
                  <td className="p-3 text-[11px] text-ink-secondary">
                    {entry.label}
                  </td>
                  <td className="p-3 text-[11px] text-ink-muted">
                    {entry.project || '\u2014'}
                  </td>
                  <td
                    className={`p-3 text-sm text-right tabular-nums ${
                      entry.kind === 'income' ? 'text-success' : 'text-ink'
                    }`}
                  >
                    {entry.kind === 'income' ? '+' : '-'}₹
                    {entry.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-[11px] text-ink-muted text-right">
                    {new Date(entry.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => {
                        if (!confirm('Delete this entry?')) return
                        entry.kind === 'expense'
                          ? deleteExpense(entry.id)
                          : deleteIncome(entry.id)
                      }}
                      className="text-ink-muted hover:text-danger transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Conversion rate setting */}
      <div className="mt-6 flex justify-end">
        <div className="bg-surface border border-line rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted">
              1 USD =
            </span>
            <input
              type="number"
              value={conversionRate}
              onChange={e =>
                setConversionRate(parseFloat(e.target.value) || 84)
              }
              className="w-16 text-sm text-ink bg-canvas border border-line rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-blueprint tabular-nums"
            />
            <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted">
              ₹
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
