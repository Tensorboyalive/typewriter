import { useState } from 'react'
import { ChevronDown, Plus, X, Pencil, Check } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/cn'

export function ChannelSwitcher({ canManage = true }: { canManage?: boolean }) {
  const { channels, activeChannel, switchChannel, addChannel, updateChannel } = useStore()
  const [open, setOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [niche, setNiche] = useState('')

  const handleAdd = async () => {
    if (!name.trim()) return
    await addChannel({ name: name.trim(), handle: handle.trim(), niche: niche.trim() })
    setName('')
    setHandle('')
    setNiche('')
    setShowAdd(false)
    setOpen(false)
  }

  const startEdit = (ch: { id: string; name: string }) => {
    setEditingId(ch.id)
    setEditName(ch.name)
  }

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return
    await updateChannel(editingId, { name: editName.trim() })
    setEditingId(null)
  }

  if (!activeChannel) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left transition-colors hover:text-viral"
      >
        <div className="min-w-0">
          <p className="serif truncate text-[1.1rem] leading-tight text-ink">{activeChannel.name}</p>
          {activeChannel.handle && (
            <p className="mono truncate text-[0.58rem] uppercase tracking-[0.28em] text-muted">
              {activeChannel.handle}
            </p>
          )}
        </div>
        <ChevronDown size={13} className={cn('chev-toggle shrink-0 text-muted', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setOpen(false); setShowAdd(false); setEditingId(null) }}
          />
          <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rule-top rule-bottom border-ink/10 bg-paper shadow-[0_8px_24px_-12px_rgba(10,10,10,0.35)]">
            {channels.map(ch => {
              const active = ch.id === activeChannel.id
              return (
                <div
                  key={ch.id}
                  className={cn(
                    'flex items-center justify-between gap-2 border-b border-ink/5 px-3 py-2.5 transition-colors last:border-b-0',
                    active ? 'bg-cream' : 'hover:bg-cream',
                  )}
                >
                  {editingId === ch.id ? (
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="mono flex-1 border-b border-ink/20 bg-transparent py-1 text-[0.85rem] text-ink outline-none focus:border-viral"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      />
                      <button onClick={saveEdit} aria-label="save" className="p-1 text-success hover:opacity-70"><Check size={13} /></button>
                      <button onClick={() => setEditingId(null)} aria-label="cancel" className="p-1 text-muted hover:text-ink"><X size={12} /></button>
                    </div>
                  ) : (
                    <>
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => { switchChannel(ch.id); setOpen(false) }}
                      >
                        <p className={cn(
                          'serif truncate text-[0.98rem] leading-tight',
                          active ? 'text-viral' : 'text-ink',
                        )}>
                          {ch.name}
                        </p>
                        {ch.niche && (
                          <p className="mono mt-0.5 truncate text-[0.56rem] uppercase tracking-[0.26em] text-muted">
                            {ch.niche}
                          </p>
                        )}
                      </div>
                      {canManage && (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(ch) }}
                          aria-label={`rename ${ch.name}`}
                          className="p-1 text-muted transition-colors hover:text-viral"
                        >
                          <Pencil size={11} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            })}

            {canManage && (
              !showAdd ? (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mono flex w-full items-center gap-2 border-t border-ink/10 px-3 py-3 text-[0.62rem] uppercase tracking-[0.24em] text-viral transition-colors hover:bg-cream"
                >
                  <Plus size={12} /> new channel
                </button>
              ) : (
                <div className="space-y-3 border-t border-ink/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="mono text-[0.58rem] uppercase tracking-[0.28em] text-muted">new channel</span>
                    <button onClick={() => setShowAdd(false)} aria-label="cancel" className="text-muted hover:text-ink">
                      <X size={12} />
                    </button>
                  </div>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="channel name" className="input-underline" autoFocus />
                  <input value={handle} onChange={e => setHandle(e.target.value)} placeholder="@handle (optional)" className="input-underline" />
                  <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="niche (optional)" className="input-underline" />
                  <button
                    onClick={handleAdd}
                    disabled={!name.trim()}
                    className="mono inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[0.66rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink disabled:opacity-50"
                  >
                    create channel
                  </button>
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}
