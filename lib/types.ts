// Shared row types mirroring the Supabase schema.

export type World = {
  id: string
  slug: string
  name: string
  subtitle: string | null
  flag_color: string | null
  description: string | null
  sort_order: number | null
  is_center: boolean | null
  created_at: string
  updated_at: string
}

export type Page = {
  id: string
  world_id: string
  slug: string
  name: string
  subtitle: string | null
  body: string | null
  sort_order: number | null
  created_at: string
  updated_at: string
}

export type EntryKind =
  | 'gate'
  | 'odu'
  | 'throne'
  | 'spirit'
  | 'planet'
  | 'sign'
  | 'number'
  | 'reading_step'

export type Entry = {
  id: string
  page_id: string | null
  world_id: string | null
  kind: EntryKind
  name: string
  number: number | null
  element: string | null
  body: string | null
  data: Record<string, unknown> | null
  sort_order: number | null
  created_at: string
  updated_at: string
}

export type Connection = {
  id: string
  from_entry: string
  to_entry: string
  relation: string | null
  note: string | null
  created_at: string
}

// ─────────────────────────── The School ───────────────────────────
// Departments hold courses, courses hold lessons, lessons hold a lesson
// plan plus media (videos + pictures). Rungs mark the climb: SEED → BRANCH → CROWN.

export type Rung = 'SEED' | 'BRANCH' | 'CROWN'

export type Department = {
  id: string
  slug: string
  name: string
  tagline: string | null // e.g. "the connect-skill"
  glyph: string | null // single letter shown in the door medallion, e.g. "M"
  accent_color: string | null // door color, e.g. "#a4133c"
  rung: Rung | null // current standing in this department
  is_sealed: boolean | null // locked until prerequisites are met
  unlock_note: string | null // e.g. "opens after Mediumship + Herbalism"
  is_root: boolean | null // the Root Floor — foundation courses, open to all
  sort_order: number | null
  created_at: string
  updated_at: string
}

export type Course = {
  id: string
  department_id: string
  code: string | null // e.g. "MED 201"
  name: string
  subtitle: string | null
  description: string | null
  rung: Rung | null
  sort_order: number | null
  created_at: string
  updated_at: string
}

export type Lesson = {
  id: string
  course_id: string
  name: string
  subtitle: string | null
  plan: string | null // the lesson plan / teaching text
  sort_order: number | null
  created_at: string
  updated_at: string
}

export type MediaKind = 'video' | 'image'

export type LessonMedia = {
  id: string
  lesson_id: string
  kind: MediaKind
  url: string
  caption: string | null
  sort_order: number | null
  created_at: string
}
