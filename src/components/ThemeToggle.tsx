import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../lib/useTheme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'switch to light mode' : 'switch to dark mode'}
      title={theme === 'dark' ? 'light mode' : 'dark mode'}
      className="rounded-full border border-ink/15 bg-paper/80 p-2.5 text-muted transition-colors hover:border-viral hover:text-viral"
    >
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  )
}
