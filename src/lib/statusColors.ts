// Pure mapping: project status → visible label + CSS variable + accessibility label.
// Color is never the only signal — every consumer pairs the dot with a label.
import type { ProjectStatus } from '../types'

export interface StatusVisual {
  /** CSS value that resolves to the status color (references a --status-* token). */
  tokenVar: string
  /** Short lowercase label shown next to dots. */
  label: string
  /** Descriptive aria-label for screen readers. */
  ariaLabel: string
}

export const STATUS_VISUAL: Record<ProjectStatus, StatusVisual> = {
  idea:     { tokenVar: 'var(--status-idea)',     label: 'idea',     ariaLabel: 'status: idea' },
  scripted: { tokenVar: 'var(--status-scripted)', label: 'scripted', ariaLabel: 'status: scripted' },
  in_edit:  { tokenVar: 'var(--status-edit)',     label: 'in edit',  ariaLabel: 'status: in edit' },
  ready:    { tokenVar: 'var(--status-ready)',    label: 'ready',    ariaLabel: 'status: ready' },
  posted:   { tokenVar: 'var(--status-posted)',   label: 'posted',   ariaLabel: 'status: posted' },
}

/** Ordered for legends / visualizations. */
export const STATUS_ORDER: ProjectStatus[] = ['idea', 'scripted', 'in_edit', 'ready', 'posted']
