import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Copy, Check } from 'lucide-react'
import { useStore } from '../store'
import { BANK_PLATFORMS, type BankPlatform, type BankStatus } from '../types'

const STATUS_OPTIONS: { id: BankStatus; label: string; color: string }[] = [
  { id: 'draft', label: 'Draft', color: '#94a3b8' },
  { id: 'approved', label: 'Approved', color: '#3b82f6' },
  { id: 'scheduled', label: 'Scheduled', color: '#f59e0b' },
  { id: 'posted', label: 'Posted', color: '#10b981' },
]

export function BankItemEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { bankItems, updateBankItem, deleteBankItem } = useStore()
  const [copied, setCopied] = useState(false)

  const item = bankItems.find(b => b.id === id)
  const [text, setText] = useState('')
  const [platform, setPlatform] = useState<BankPlatform>('linkedin')
  const [status, setStatus] = useState<BankStatus>('draft')
  const [schedDate, setSchedDate] = useState('')
  const [postedLink, setPostedLink] = useState('')

  useEffect(() => {
    if (item) {
      setText(item.content_text)
      setPlatform(item.platform)
      setStatus(item.status as BankStatus)
      setSchedDate(item.scheduled_date ?? '')
      setPostedLink(item.posted_link ?? '')
    }
  }, [item])

  if (!item) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/bank')} className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-4">
          <ArrowLeft size={16} /> Back to Content Bank
        </button>
        <p className="text-ink-muted">Item not found.</p>
      </div>
    )
  }

  const save = () => {
    updateBankItem(item.id, { content_text: text, platform, status, scheduled_date: schedDate || null, posted_link: postedLink || null })
  }

  const handleDelete = () => {
    if (confirm('Delete this content piece?')) {
      deleteBankItem(item.id)
      navigate('/bank')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => { save(); navigate('/bank') }} className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft size={16} /> Back to Content Bank
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="p-2 rounded-md text-ink-muted hover:text-blueprint hover:bg-blueprint-light transition-colors">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button onClick={handleDelete} className="p-2 rounded-md text-ink-muted hover:text-danger hover:bg-danger-light transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Platform pills */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {BANK_PLATFORMS.map(p => (
          <button key={p.id} onClick={() => { setPlatform(p.id); save() }}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${platform === p.id ? 'border-transparent text-white' : 'border-line text-ink-secondary'}`}
            style={platform === p.id ? { backgroundColor: p.color } : {}}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Status pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_OPTIONS.map(s => (
          <button key={s.id} onClick={() => { setStatus(s.id); updateBankItem(item.id, { status: s.id }) }}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${status === s.id ? 'border-transparent text-white' : 'border-line text-ink-secondary'}`}
            style={status === s.id ? { backgroundColor: s.color } : {}}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Schedule + Posted link — inline, transparent */}
      <div className="flex items-center gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted">Schedule</span>
          <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} onBlur={save}
            className="bg-transparent text-ink text-sm outline-none border-b border-line-light focus:border-blueprint py-0.5 transition-colors" />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted">Link</span>
          <input value={postedLink} onChange={e => setPostedLink(e.target.value)} onBlur={save}
            placeholder="https://..."
            className="bg-transparent text-ink text-sm outline-none border-b border-line-light focus:border-blueprint py-0.5 flex-1 transition-colors placeholder:text-ink-muted/40" />
        </div>
      </div>

      {/* Content — clean transparent textarea like NoteEditor */}
      <textarea value={text} onChange={e => setText(e.target.value)} onBlur={save}
        placeholder="Write your content..."
        rows={20}
        className="w-full text-sm text-ink bg-transparent outline-none resize-none leading-relaxed placeholder:text-ink-muted/50" />

      <p className="text-[10px] text-ink-muted mt-4">Auto-saved on blur &middot; {text.split(/\s+/).filter(Boolean).length} words</p>
    </div>
  )
}
