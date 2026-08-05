// Local-first budget ledger.
//
// The Temple's Supabase project can sleep, and a personal budget is private
// financial data — so paydays and spending live in the browser's own storage.
// Everything here is pure/typed so the page component stays declarative.

export type BudgetKind = 'income' | 'expense'

export type BudgetEntry = {
  id: string
  kind: BudgetKind
  // The day it happened — the payday, or the day the money was spent (yyyy-mm-dd).
  date: string
  // Always stored as a positive number of dollars.
  amount: number
  // Source of income ("Paycheck", "Tips") or what was spent on ("Groceries").
  label: string
  note: string | null
  created_at: string
}

const STORAGE_KEY = 'astroodu.budget.v1'

// ---------- persistence ----------

export function loadEntries(): BudgetEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry)
  } catch {
    return []
  }
}

export function saveEntries(entries: BudgetEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage full or blocked — nothing more we can safely do.
  }
}

function isEntry(v: unknown): v is BudgetEntry {
  if (!v || typeof v !== 'object') return false
  const e = v as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    (e.kind === 'income' || e.kind === 'expense') &&
    typeof e.date === 'string' &&
    typeof e.amount === 'number'
  )
}

// ---------- creation ----------

// Small dependency-free id — good enough for local rows.
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'b-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36)
}

export function makeEntry(input: {
  kind: BudgetKind
  date: string
  amount: number
  label: string
  note?: string
}): BudgetEntry {
  return {
    id: newId(),
    kind: input.kind,
    date: input.date,
    amount: Math.abs(input.amount),
    label: input.label.trim(),
    note: input.note && input.note.trim() ? input.note.trim() : null,
    created_at: new Date().toISOString(),
  }
}

// ---------- derived summaries ----------

export type Totals = { income: number; expense: number; balance: number }

export function totals(entries: BudgetEntry[]): Totals {
  let income = 0
  let expense = 0
  for (const e of entries) {
    if (e.kind === 'income') income += e.amount
    else expense += e.amount
  }
  return { income, expense, balance: income - expense }
}

// Newest day first; within a day, newest entry first.
export function sortByDateDesc(entries: BudgetEntry[]): BudgetEntry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.created_at < b.created_at ? 1 : -1
  })
}

export type MonthGroup = { key: string; label: string; entries: BudgetEntry[]; totals: Totals }

// Group sorted entries by calendar month, newest month first.
export function groupByMonth(entries: BudgetEntry[]): MonthGroup[] {
  const sorted = sortByDateDesc(entries)
  const map = new Map<string, BudgetEntry[]>()
  for (const e of sorted) {
    const key = e.date.slice(0, 7) // yyyy-mm
    const arr = map.get(key)
    if (arr) arr.push(e)
    else map.set(key, [e])
  }
  return Array.from(map.entries()).map(([key, list]) => ({
    key,
    label: monthLabel(key),
    entries: list,
    totals: totals(list),
  }))
}

// ---------- formatting ----------

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(n: number): string {
  return money.format(n)
}

export function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// "yyyy-mm-dd" -> "Aug 5, 2026" without tripping over timezones.
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  const dt = new Date(y, m - 1, 1)
  return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
