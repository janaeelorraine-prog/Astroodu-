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
