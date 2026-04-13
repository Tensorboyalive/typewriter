import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Copy, Check, Search } from 'lucide-react'
import { useStore } from '../store'
import { BANK_PLATFORMS, type BankPlatform, type BankStatus } from '../types'

const STATUS_OPTIONS: { id: BankStatus; label: string; color: string }[] = [
  { id: 'draft', label: 'Draft', color: '#94a3b8' },
  { id: 'approved', label: 'Approved', color: '#3b82f6' },
  { id: 'scheduled', label: 'Scheduled', color: '#f59e0b' },
  { id: 'posted', label: 'Posted', color: '#10b981' },
]

export function ContentBank() {
  const navigate = useNavigate()
  const { bankItems, addBankItem, updateBankItem } = useStore()
  const [adding, setAdding] = useState(false)
  const [platform, setPlatform] = useState<BankPlatform>('linkedin')
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const [platformFilter, setPlatformFilter] = useState<BankPlatform | 'all'>('all')

  const filtered = bankItems.filter(b => {
    if (platformFilter !== 'all' && b.platform !== platformFilter) return false
    if (search && !b.content_text.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleAdd = async () => {
    if (!text.trim()) return
    const item = await addBankItem({ platform, content_text: text.trim() })
    setText('')
    setAdding(false)
    if (item) navigate(`/bank/${item.id}`)
  }

  const handleCopy = (e: React.MouseEvent, id: string, content: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const cycleStatus = async (e: React.MouseEvent, id: string, current: BankStatus) => {
    e.stopPropagation()
    const order: BankStatus[] = ['draft', 'approved', 'scheduled', 'posted']
    const next = order[(order.indexOf(current) + 1) % order.length]
    await updateBankItem(id, { status: next })
  }

  // Group by status
  const grouped = STATUS_OPTIONS.map(s => ({
    ...s,
    items: filtered.filter(b => b.status === s.id),
  })).filter(g => g.items.length > 0)

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">Library</p>
          <h2 className="text-2xl font-light text-ink">Content Bank</h2>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors"
        >
          <Plus size={16} /> Add Content
        </button>
      </div>

      {adding && (
        <div className="mb-6 bg-surface border border-line rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-3">New content piece</p>
          <div className="flex gap-2 mb-3 flex-wrap">
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted self-center mr-1">Platform</p>
            {BANK_PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  platform === p.id
                    ? 'border-transparent text-white'
                    : 'border-line text-ink-secondary hover:border-ink-muted'
                }`}
                style={platform === p.id ? { backgroundColor: p.color } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste or write content..."
            rows={3}
            className="input w-full mb-3 resize-none"
            autoFocus
          />
          <div className="flex items-center gap-3">
            <div className="flex-1" />
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink">
              Cancel
            </button>
            <button onClick={handleAdd} className="px-4 py-1.5 bg-blueprint text-white rounded-md text-sm">
              Create & Open
            </button>
          </div>
        </div>
      )}

      {/* Platform filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setPlatformFilter('all')}
          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
            platformFilter === 'all'
              ? 'border-blueprint bg-blueprint/10 text-blueprint'
              : 'border-line text-ink-secondary hover:border-ink-muted'
          }`}
        >
          All
        </button>
        {BANK_PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => setPlatformFilter(p.id)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              platformFilter === p.id
                ? 'border-transparent text-white'
                : 'border-line text-ink-secondary hover:border-ink-muted'
            }`}
            style={platformFilter === p.id ? { backgroundColor: p.color } : {}}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary counts */}
      <div className="flex gap-4 mb-6">
        {STATUS_OPTIONS.map(s => (
          <div key={s.id} className="text-center">
            <p className="text-xl font-light text-ink tabular-nums">
              {bankItems.filter(b => b.status === s.id).length}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-ink-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      {bankItems.length > 0 && (
        <div className="relative max-w-xs mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search content..."
            className="input w-full pl-9 text-sm"
          />
        </div>
      )}

      {/* Grouped list */}
      {grouped.map(group => (
        <div key={group.id} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">{group.label}</p>
            <span className="text-[10px] text-ink-muted">{group.items.length}</span>
          </div>
          <div className="space-y-1.5">
            {group.items.map(item => {
              const plat = BANK_PLATFORMS.find(p => p.id === item.platform)
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/bank/${item.id}`)}
                  className="flex items-center gap-3 bg-surface border border-line rounded-md px-4 py-3 cursor-pointer group hover:shadow-sm hover:border-blueprint/40 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate">{item.content_text}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: plat?.color }}
                    >
                      {plat?.label}
                    </span>
                    <button
                      onClick={e => cycleStatus(e, item.id, item.status as BankStatus)}
                      className="text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize cursor-pointer hover:opacity-80"
                      style={{
                        borderColor: group.color,
                        color: group.color,
                      }}
                    >
                      {item.status}
                    </button>
                    <button
                      onClick={e => handleCopy(e, item.id, item.content_text)}
                      className="p-1 rounded hover:bg-canvas text-ink-muted hover:text-blueprint opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copied === item.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {bankItems.length === 0 && !adding && (
        <div className="text-center py-20">
          <p className="text-ink-muted text-sm">No content yet. Add your first piece above.</p>
        </div>
      )}
    </div>
  )
}
