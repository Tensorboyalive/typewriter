/**
 * useStagger — returns a style object with an animation-delay for list entries.
 * Caps the delay at index 9 so long lists don't feel sluggish. Pair with the
 * `stagger-in` CSS class in index.css.
 */
export function useStagger(index: number, stepMs = 30, cap = 9): { animationDelay: string } {
  const clamped = index > cap ? 0 : index
  return { animationDelay: `${clamped * stepMs}ms` }
}
