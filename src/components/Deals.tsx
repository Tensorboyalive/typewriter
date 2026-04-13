import { useState } from 'react'
import { Plus, X, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { DEAL_STAGES, DEAL_SOURCES, type DealStage, type DealSource, type InvoiceStatus } from '../types'

const INVOICE_STATUSES: { id: InvoiceStatus; label: string; color: string }[] = [
  { id: 'not_sent', label: 'Not Sent', color: '#94a3b8' },
  { id: 'sent', label: 'Sent', color: '#f59e0b' },
  { id: 'paid', label: 'Paid', color: '#10b981' },
]

export function Deals() {
  const { deals, addDeal, updateDeal, deleteDeal } = useStore()
  const [adding, setAdding] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Form state
  const [company, setCompany] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [source, setSource] = useState<DealSource>('inbound')
  const [value, setValue] = useState('')
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR')

  const toggleGroup = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const handleAdd = async () => {
    if (!company.trim() || !contactName.trim()) return
    await addDeal({
      company: company.trim(),
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim() || null,
      source,
      value_amount: parseFloat(value) || 0,
      value_currency: currency,
    })
    setCompany('')
    setContactName('')
    setContactEmail('')
    setValue('')
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this deal?')) return
    await deleteDeal(id)
  }

  const cycleStage = async (id: string, current: DealStage) => {
    const order = DEAL_STAGES.map(s => s.id)
    const nextIdx = (order.indexOf(current) + 1) % order.length
    await updateDeal(id, { stage: order[nextIdx] })
  }

  const cycleInvoice = async (id: string, current: InvoiceStatus) => {
    const order: InvoiceStatus[] = ['not_sent', 'sent', 'paid']
    const next = order[(order.indexOf(current) + 1) % order.length]
    await updateDeal(id, { invoice_status: next })
  }

  // Group by stage
  const grouped = DEAL_STAGES.map(s => ({
    ...s,
    items: deals.filter(d => d.stage === s.id),
  })).filter(g => g.items.length > 0)

  // Totals
  const totalValue = deals.filter(d => d.stage !== 'dead').reduce((sum, d) => sum + (d.value_currency === 'INR' ? d.value_amount : d.value_amount * 84), 0)
  const paidValue = deals.filter(d => d.invoice_status === 'paid').reduce((sum, d) => sum + (d.value_currency === 'INR' ? d.value_amount : d.value_amount * 84), 0)

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">Revenue</p>
          <h2 className="text-2xl font-light text-ink">Deals</h2>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors"
        >
          <Plus size={16} /> New Deal
        </button>
      </div>

      {/* Summary */}
      <div className="flex gap-6 mb-6">
        <div>
          <p className="text-xl font-light text-ink tabular-nums">₹{Math.round(totalValue).toLocaleString()}</p>
          <p className="text-[9px] uppercase tracking-wider text-ink-muted">Pipeline</p>
        </div>
        <div>
          <p className="text-xl font-light text-success tabular-nums">₹{Math.round(paidValue).toLocaleString()}</p>
          <p className="text-[9px] uppercase tracking-wider text-ink-muted">Collected</p>
        </div>
        <div>
          <p className="text-xl font-light text-ink tabular-nums">{deals.length}</p>
          <p className="text-[9px] uppercase tracking-wider text-ink-muted">Total Deals</p>
        </div>
      </div>

      {adding && (
        <div className="mb-6 bg-surface border border-line rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">New Deal</p>
            <button onClick={() => setAdding(false)} className="text-ink-muted hover:text-ink"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name..." autoFocus className="input" />
            <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Contact person..." className="input" />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Email (optional)" className="input" />
            <div className="flex gap-1">
              <input value={value} onChange={e => setValue(e.target.value)} placeholder="Amount" type="number" className="input flex-1" />
              <select value={currency} onChange={e => setCurrency(e.target.value as 'INR' | 'USD')} className="input w-20">
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
              </select>
            </div>
            <div className="flex gap-1 flex-wrap">
              {DEAL_SOURCES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSource(s.id)}
                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                    source === s.id ? 'border-blueprint bg-blueprint/10 text-blueprint' : 'border-line text-ink-secondary'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-1.5 bg-blueprint text-white rounded-md text-sm">Create Deal</button>
          </div>
        </div>
      )}

      {/* Grouped list by stage */}
      {grouped.map(group => {
        const isCollapsed = collapsed[group.id]
        return (
          <div key={group.id} className="mb-4">
            <button onClick={() => toggleGroup(group.id)} className="flex items-center gap-2 mb-2 group">
              {isCollapsed ? <ChevronRight size={14} className="text-ink-muted" /> : <ChevronDown size={14} className="text-ink-muted" />}
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">{group.label}</p>
              <span className="text-[10px] bg-canvas text-ink-muted px-1.5 py-0.5 rounded-full">{group.items.length}</span>
            </button>
            {!isCollapsed && (
              <div className="space-y-1.5">
                {group.items.map(deal => {
                  const inv = INVOICE_STATUSES.find(i => i.id === deal.invoice_status)
                  return (
                    <div key={deal.id} className="flex items-center gap-3 bg-surface border border-line rounded-md px-4 py-3 group/deal hover:shadow-sm transition-shadow">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink font-medium truncate">{deal.company}</p>
                        <p className="text-[10px] text-ink-muted">{deal.contact_name}{deal.contact_email ? ` · ${deal.contact_email}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-ink tabular-nums font-medium">
                          {deal.value_currency === 'INR' ? '₹' : '$'}{deal.value_amount.toLocaleString()}
                        </span>
                        <button
                          onClick={() => cycleStage(deal.id, deal.stage)}
                          className="text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize cursor-pointer hover:opacity-80"
                          style={{ borderColor: group.color, color: group.color }}
                        >
                          {deal.stage}
                        </button>
                        <button
                          onClick={() => cycleInvoice(deal.id, deal.invoice_status)}
                          className="text-[10px] px-2 py-0.5 rounded-full border font-medium cursor-pointer hover:opacity-80"
                          style={{ borderColor: inv?.color, color: inv?.color }}
                        >
                          {inv?.label}
                        </button>
                        <button
                          onClick={() => handleDelete(deal.id)}
                          className="p-1 rounded text-ink-muted hover:text-danger hover:bg-danger-light opacity-0 group-hover/deal:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {deals.length === 0 && !adding && (
        <div className="text-center py-20">
          <p className="text-ink-muted text-sm">No deals yet. Start tracking your brand partnerships above.</p>
        </div>
      )}
    </div>
  )
}
