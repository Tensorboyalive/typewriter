import clsx, { type ClassValue } from 'clsx'

/**
 * Tiny className composer. Merges any mix of strings, arrays, booleans, and
 * conditionals into a single space-separated string.
 *
 * @example
 *   cn('mono text-ink', isActive && 'text-viral', { 'opacity-60': isDisabled })
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
