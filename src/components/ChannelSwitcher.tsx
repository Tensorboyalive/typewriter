import { useState } from 'react'
import { ChevronDown, Plus, Trash2, X, Pencil, Check } from 'lucide-react'
import { useStore } from '../store'

export function ChannelSwitcher({ canManage = true }: { canManage?: boolean }) {
  const { channels, activeChannel, switchChannel, addChannel, deleteChannel, updateChannel } = useStore()
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
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-ink hover:bg-canvas transition-colors">
        <div className="text-left min-w-0">
          <p className="font-medium truncate">{activeChannel.name}</p>
          {activeChannel.handle && <p className="text-[10px] text-ink-muted truncate">{activeChannel.handle}</p>}
        </div>
        <ChevronDown size={14} className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setShowAdd(false); setEditingId(null) }} />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface border border-line rounded-md shadow-lg overflow-hidden">
            {channels.map(ch => (
              <div key={ch.id}
                className={`flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                  ch.id === activeChannel.id ? 'bg-blueprint-light text-blueprint' : 'text-ink hover:bg-canvas'
                }`}>
                {editingId === ch.id ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="input text-sm flex-1 py-0.5 px-1.5"
                      autoFocus onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }} />
                    <button onClick={saveEdit} className="p-0.5 text-success hover:opacity-70"><Check size={14} /></button>
                    <button onClick={() => setEditingId(null)} className="p-0.5 text-ink-muted hover:text-ink"><X size={12} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { switchChannel(ch.id); setOpen(false) }}>
                      <p className="truncate font-medium">{ch.name}</p>
                      {ch.niche && <p className="text-[10px] text-ink-muted truncate">{ch.niche}</p>}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-0.5">
                        <button onClick={(e) => { e.stopPropagation(); startEdit(ch) }}
                          className="p-1 text-ink-muted hover:text-blueprint transition-colors opacity-0 group-hover:opacity-100">
                          <Pencil size={11} />
                        </button>
                        {channels.length > 1 && (
                          <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this channel? Projects in it will be lost.')) deleteChannel(ch.id) }}
                            className="p-1 text-ink-muted hover:text-danger transition-colors">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {!canManage ? null : !showAdd ? (
              <button onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blueprint hover:bg-blueprint-light transition-colors border-t border-line">
                <Plus size={14} /> New channel
              </button>
            ) : (
              <div className="p-3 border-t border-line space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted">New channel</span>
                  <button onClick={() => setShowAdd(false)} className="text-ink-muted hover:text-ink"><X size={12} /></button>
                </div>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Channel name" className="input w-full text-sm" autoFocus />
                <input value={handle} onChange={e => setHandle(e.target.value)} placeholder="@handle (optional)" className="input w-full text-sm" />
                <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Niche (optional)" className="input w-full text-sm" />
                <button onClick={handleAdd} disabled={!name.trim()}
                  className="w-full px-3 py-1.5 bg-blueprint text-white text-sm rounded-md hover:bg-blueprint-dark transition-colors disabled:opacity-50">
                  Create
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
