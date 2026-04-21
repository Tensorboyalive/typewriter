import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../lib/cn'

interface SelectOption {
  value: string
  label: string
  color?: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  compact?: boolean
}

export function Select({ value, onChange, options, placeholder, className = '', compact }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={
          compact
            ? 'mono inline-flex cursor-pointer items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.24em] text-muted transition-colors hover:text-ink'
            : 'mono flex w-full items-center justify-between gap-2 border-b border-ink/20 bg-transparent py-2 text-left text-[0.85rem] text-ink outline-none transition-colors focus:border-viral'
        }
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate">
            {selected.color && (
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: selected.color }}
              />
            )}
            <span className={compact ? 'uppercase tracking-[0.22em]' : ''}>
              {compact ? selected.label.toLowerCase() : selected.label}
            </span>
          </span>
        ) : (
          <span className="text-muted">{placeholder || 'select…'}</span>
        )}
        <ChevronDown
          size={compact ? 10 : 13}
          className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-1 max-h-56 overflow-auto rule-top rule-bottom border-ink/10 bg-paper shadow-[0_8px_24px_-12px_rgba(10,10,10,0.35)]',
            compact ? 'min-w-40' : 'right-0 min-w-full',
          )}
          role="listbox"
        >
          {options.map(o => {
            const selected = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={cn(
                  'flex w-full items-center gap-2 text-left transition-colors',
                  compact
                    ? 'mono px-3 py-2 text-[0.64rem] uppercase tracking-[0.22em]'
                    : 'text-[0.9rem] px-3 py-2',
                  selected ? 'bg-cream text-viral' : 'text-ink hover:bg-cream',
                )}
              >
                {o.color && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: o.color }}
                  />
                )}
                {compact ? o.label.toLowerCase() : o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
