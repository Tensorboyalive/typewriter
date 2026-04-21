import { useState } from 'react'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { Plus, Trash2, TrendingUp, TrendingDown, ArrowUpDown, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { useStore } from '../store'
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '../types'
import { Select } from './Select'
import { Eyebrow } from './editorial/Eyebrow'
import { cn } from '../lib/cn'

export function Expenses() {
  const {
    expenses, income, conversionRate,
    addExpense, deleteExpense, addIncome, deleteIncome, setConversionRate,
  } = useStore()

  const [formMode, setFormMode] = useState<'expense' | 'income' | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0])
  const [expDate, setExpDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [expCurrency, setExpCurrency] = useState<'INR' | 'USD'>('INR')

  const [incDesc, setIncDesc] = useState('')
  const [incAmount, setIncAmount] = useState('')
  const [incSource, setIncSource] = useState(INCOME_SOURCES[0])
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
      project_id: null,
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
      project_id: null,
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
    date: string
  }

  const allEntries: Entry[] = [
    ...expenses.map(e => ({
      id: e.id, kind: 'expense' as const,
      description: e.description, amount: e.amount, label: e.category, date: e.date,
    })),
    ...income.map(i => ({
      id: i.id, kind: 'income' as const,
      description: i.description, amount: i.amount, label: i.source, date: i.date,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const dateInputCls = 'mono w-full bg-transparent border-b border-ink/20 py-2 pl-6 pr-2 text-[0.85rem] text-ink outline-none focus:border-viral tnum'

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-10 md:px-10 md:py-16">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>finances · {format(now, 'MMMM yyyy').toLowerCase()}</Eyebrow>
          <h1
            className="serif mt-6 leading-[0.95] tracking-[-0.02em] text-ink"
            style={{ fontSize: 'clamp(2.5rem, calc(1rem + 3vw), 4rem)' }}
          >
            the <span className="serif-italic">ledger.</span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFormMode(formMode === 'income' ? null : 'income')}
            className="mono inline-flex items-center gap-2 border border-ink/15 px-4 py-2.5 text-[0.65rem] uppercase tracking-[0.24em] text-success transition-colors hover:border-success"
          >
            <Plus size={12} strokeWidth={2} /> income
          </button>
          <button
            onClick={() => setFormMode(formMode === 'expense' ? null : 'expense')}
            className="mono inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
          >
            <Plus size={12} strokeWidth={2} /> expense
          </button>
        </div>
      </div>

      {/* Summary hairline grid: earned / spent / net / categories */}
      <div className="mt-10 grid grid-cols-1 gap-px rounded-sm border border-ink/10 bg-ink/10 md:grid-cols-4">
        <SummaryTile
          icon={<TrendingUp size={13} className="text-success" />}
          label="earned"
          value={`₹${totalEarned.toLocaleString('en-IN')}`}
          numeralColor="text-success"
        />
        <SummaryTile
          icon={<TrendingDown size={13} className="text-danger" />}
          label="spent"
          value={`₹${totalSpent.toLocaleString('en-IN')}`}
          numeralColor="text-danger"
        />
        <SummaryTile
          icon={<ArrowUpDown size={13} className="text-muted" />}
          label="net"
          value={`${net >= 0 ? '+' : '-'}₹${Math.abs(net).toLocaleString('en-IN')}`}
          numeralColor={net >= 0 ? 'text-success' : 'text-danger'}
        />
        <div className="bg-paper p-5">
          <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">by category</p>
          <div className="mt-3 space-y-1.5">
            {byCategory.map(c => (
              <div key={c.category} className="flex items-baseline justify-between">
                <span className="text-[0.82rem] text-ink">{c.category.toLowerCase()}</span>
                <span className="mono text-[0.72rem] text-ink tnum">
                  ₹{c.total.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
            {byCategory.length === 0 && (
              <p className="mono text-[0.6rem] uppercase tracking-[0.24em] text-muted">
                no expenses yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Expense form */}
      {formMode === 'expense' && (
        <div className="mt-8 rule-bottom border-ink/10 bg-paper/60 p-6">
          <Eyebrow>new expense</Eyebrow>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              value={expDesc}
              onChange={e => setExpDesc(e.target.value)}
              placeholder="description…"
              className="input-underline"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAddExpense()}
            />
            <div className="flex items-end gap-2 border-b border-ink/20 focus-within:border-viral">
              <input
                value={expAmount}
                onChange={e => setExpAmount(e.target.value)}
                type="number"
                placeholder="amount"
                className="mono min-w-0 flex-1 bg-transparent py-2 text-[0.95rem] text-ink outline-none tnum"
                onKeyDown={e => e.key === 'Enter' && handleAddExpense()}
              />
              <button
                type="button"
                onClick={() => setExpCurrency(c => (c === 'INR' ? 'USD' : 'INR'))}
                className="mono px-2 pb-2 text-[0.7rem] uppercase tracking-[0.22em] text-muted hover:text-viral"
              >
                {expCurrency === 'INR' ? '₹ inr' : '$ usd'}
              </button>
            </div>
            <Select
              value={expCategory}
              onChange={setExpCategory}
              options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))}
            />
            <div className="relative">
              <CalendarIcon size={13} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted" />
              <input value={expDate} onChange={e => setExpDate(e.target.value)} type="date" className={dateInputCls} />
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setFormMode(null)}
                className="mono text-[0.68rem] uppercase tracking-[0.24em] text-muted hover:text-ink"
              >
                cancel
              </button>
              <button
                onClick={handleAddExpense}
                className="mono inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
              >
                save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Income form */}
      {formMode === 'income' && (
        <div className="mt-8 rule-bottom border-ink/10 bg-paper/60 p-6">
          <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-success">new income</p>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              value={incDesc}
              onChange={e => setIncDesc(e.target.value)}
              placeholder="description…"
              className="input-underline"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAddIncome()}
            />
            <div className="flex items-end gap-2 border-b border-ink/20 focus-within:border-success">
              <input
                value={incAmount}
                onChange={e => setIncAmount(e.target.value)}
                type="number"
                placeholder="amount"
                className="mono min-w-0 flex-1 bg-transparent py-2 text-[0.95rem] text-ink outline-none tnum"
                onKeyDown={e => e.key === 'Enter' && handleAddIncome()}
              />
              <button
                type="button"
                onClick={() => setIncCurrency(c => (c === 'INR' ? 'USD' : 'INR'))}
                className="mono px-2 pb-2 text-[0.7rem] uppercase tracking-[0.22em] text-muted hover:text-success"
              >
                {incCurrency === 'INR' ? '₹ inr' : '$ usd'}
              </button>
            </div>
            <Select
              value={incSource}
              onChange={setIncSource}
              options={INCOME_SOURCES.map(s => ({ value: s, label: s }))}
            />
            <div className="relative">
              <CalendarIcon size={13} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted" />
              <input value={incDate} onChange={e => setIncDate(e.target.value)} type="date" className={dateInputCls} />
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setFormMode(null)}
                className="mono text-[0.68rem] uppercase tracking-[0.24em] text-muted hover:text-ink"
              >
                cancel
              </button>
              <button
                onClick={handleAddIncome}
                className="mono inline-flex items-center gap-2 rounded-full border border-success px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-success transition hover:bg-success hover:text-cream"
              >
                save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Combined ledger */}
      <div className="mt-10 rule-top rule-bottom overflow-x-auto border-ink/10">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              <th className="w-6 py-3 text-left" />
              <th className="mono px-2 py-3 text-left text-[0.6rem] uppercase tracking-[0.28em] text-muted">description</th>
              <th className="mono px-2 py-3 text-left text-[0.6rem] uppercase tracking-[0.28em] text-muted">type</th>
              <th className="mono px-2 py-3 text-right text-[0.6rem] uppercase tracking-[0.28em] text-muted">amount</th>
              <th className="mono px-2 py-3 text-right text-[0.6rem] uppercase tracking-[0.28em] text-muted">date</th>
              <th className="w-10 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {allEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="mono py-16 text-center text-[0.7rem] uppercase tracking-[0.26em] text-muted">
                  no transactions yet
                </td>
              </tr>
            ) : allEntries.map(entry => (
              <tr key={entry.id} className="group transition-colors hover:bg-paper/60">
                <td className="py-3 pr-1">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'inline-block h-1.5 w-1.5 rounded-full',
                      entry.kind === 'income' ? 'bg-success' : 'bg-danger',
                    )}
                  />
                </td>
                <td className="serif py-3 px-2 text-[0.98rem] text-ink">{entry.description}</td>
                <td className="mono px-2 py-3 text-[0.6rem] uppercase tracking-[0.24em] text-muted">
                  {entry.label.toLowerCase()}
                </td>
                <td className={cn(
                  'mono px-2 py-3 text-right text-[0.92rem] tnum',
                  entry.kind === 'income' ? 'text-success' : 'text-ink',
                )}>
                  {entry.kind === 'income' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                </td>
                <td className="mono px-2 py-3 text-right text-[0.6rem] uppercase tracking-[0.26em] text-muted tnum">
                  {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase()}
                </td>
                <td className="py-3 pl-1">
                  <button
                    onClick={async () => {
                      setDeletingId(entry.id)
                      try {
                        if (entry.kind === 'expense') await deleteExpense(entry.id)
                        else await deleteIncome(entry.id)
                        setDeletingId(null)
                      } catch { setDeletingId(null) }
                    }}
                    disabled={deletingId === entry.id}
                    aria-label="delete entry"
                    className="p-1 text-muted opacity-0 transition-all hover:text-danger group-hover:opacity-100 disabled:opacity-100"
                  >
                    {deletingId === entry.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Conversion rate */}
      <div className="mt-6 flex justify-end">
        <div className="rule-top rule-bottom border-ink/10 bg-paper/60 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="mono text-[0.58rem] uppercase tracking-[0.28em] text-muted">
              1 usd =
            </span>
            <input
              type="number"
              value={conversionRate}
              onChange={e => setConversionRate(parseFloat(e.target.value) || 84)}
              className="mono w-16 border-b border-ink/20 bg-transparent py-1 text-center text-[0.9rem] text-ink outline-none focus:border-viral tnum"
            />
            <span className="mono text-[0.58rem] uppercase tracking-[0.28em] text-muted">₹</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryTile({
  icon, label, value, numeralColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  numeralColor: string
}) {
  return (
    <div className="bg-paper p-5">
      <div className="flex items-center gap-2">
        {icon}
        <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">{label}</p>
      </div>
      <p className={cn('serif mt-3 text-[clamp(1.5rem,calc(1rem+1vw),2rem)] leading-none tracking-[-0.02em] tnum', numeralColor)}>
        {value}
      </p>
    </div>
  )
}
