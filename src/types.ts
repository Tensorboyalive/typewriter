export type ContentType = 'reel' | 'story' | 'post' | 'carousel'
export type ProjectStatus = 'ideation' | 'scripting' | 'shoot' | 'editing' | 'posted'

export const STATUSES: { id: ProjectStatus; label: string }[] = [
  { id: 'ideation', label: 'Ideation' },
  { id: 'scripting', label: 'Scripting' },
  { id: 'shoot', label: 'Shoot' },
  { id: 'editing', label: 'Editing' },
  { id: 'posted', label: 'Posted' },
]

export const CONTENT_TYPES: { id: ContentType; label: string; color: string }[] = [
  { id: 'reel', label: 'Reel', color: '#8b5cf6' },
  { id: 'story', label: 'Story', color: '#f59e0b' },
  { id: 'post', label: 'Post', color: '#3b82f6' },
  { id: 'carousel', label: 'Carousel', color: '#10b981' },
]

export interface Project {
  id: string
  title: string
  type: ContentType
  status: ProjectStatus
  scheduledDate?: string
  script: string
  description: string
  createdAt: string
}

export interface Expense {
  id: string
  projectId?: string
  description: string
  amount: number
  category: string
  date: string
}

export const EXPENSE_CATEGORIES = [
  'Equipment',
  'Travel',
  'Talent',
  'Software',
  'Marketing',
  'Food',
  'Other',
]

export interface Income {
  id: string
  projectId?: string
  description: string
  amount: number
  source: string
  date: string
}

export interface TimerSession {
  id: string
  duration: number
  completedAt: string
}

export const INCOME_SOURCES = [
  'Brand Deal',
  'Collaboration',
  'Sponsorship',
  'Freelance',
  'Other',
]
