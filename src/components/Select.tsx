import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

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
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
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
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={compact
          ? 'flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-ink-muted hover:text-ink cursor-pointer transition-colors'
          : 'input w-full flex items-center justify-between gap-2 text-left'
        }
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate">
            {selected.color && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: selected.color }}
              />
            )}
            {selected.label}
          </span>
        ) : (
          <span className="text-ink-muted">{placeholder || 'Select...'}</span>
        )}
        <ChevronDown
          size={compact ? 10 : 14}
          className={`text-ink-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          className={`absolute z-50 top-full left-0 mt-1 bg-surface border border-line rounded-md shadow-lg max-h-48 overflow-auto ${
            compact ? 'min-w-32' : 'right-0'
          }`}
        >
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left flex items-center gap-2 transition-colors
                ${compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-sm'}
                ${o.value === value ? 'bg-blueprint-light text-blueprint' : 'text-ink hover:bg-canvas'}`}
            >
              {o.color && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: o.color }}
                />
              )}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
