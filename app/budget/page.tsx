'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import {
  loadEntries,
  saveEntries,
  makeEntry,
  totals,
  groupByMonth,
  formatMoney,
  formatDate,
  todayISO,
  type BudgetEntry,
  type BudgetKind,
} from '@/lib/budget'

const INCOME = '#6FA063' // forest green — money coming in
const EXPENSE = '#C56A5C' // clay red — money going out
const GOLD = '#C9982F'

const fieldStyle: CSSProperties = { background: '#00000044', border: '1px solid #C9982F55', borderRadius: 8, color: '#F6ECCB', padding: '9px 11px', fontSize: 15, width: '100%' }
const labelStyle: CSSProperties = { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F6ECCBaa', marginBottom: 4, fontFamily: 'var(--font-cinzel), serif' }
const miniBtn: CSSProperties = { background: 'transparent', border: '1px solid #C9982F', borderRadius: 9999, color: '#F0D27A', padding: '6px 16px', cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em', fontFamily: 'var(--font-cinzel), serif' }

export default function BudgetPage() {
  const [entries, setEntries] = useState<BudgetEntry[]>([])
  const [ready, setReady] = useState(false)
  const [kind, setKind] = useState<BudgetKind>('income')

  // Load once on mount (localStorage is client-only).
  useEffect(() => {
    setEntries(loadEntries())
    setReady(true)
  }, [])

  // Persist whenever the ledger changes (but not before the first load).
  useEffect(() => {
    if (ready) saveEntries(entries)
  }, [entries, ready])

  const sums = useMemo(() => totals(entries), [entries])
  const months = useMemo(() => groupByMonth(entries), [entries])

  function addEntry(e: BudgetEntry) {
    setEntries((prev) => [...prev, e])
  }

  function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((x) => x.id !== id))
  }

  return (
    <div className="min-h-screen px-6 pt-10 pb-28 max-w-3xl mx-auto fade-in">
      <Link href="/" className="sacred-line">← Iboru. Iboya. Ibosheshe.</Link>

      <header className="mt-8 text-center">
        <h1 className="wordmark text-5xl sm:text-6xl leading-none">The Ledger</h1>
        <p className="mt-3 text-cream/70 font-cinzel tracking-[0.25em] text-xs uppercase">
          Paydays &amp; Spending
        </p>
      </header>

      {/* Summary — paid in, spent, what remains */}
      <section className="mt-10 grid grid-cols-3 gap-3 sm:gap-4">
        <SummaryCard label="Paid In" value={sums.income} color={INCOME} />
        <SummaryCard label="Spent" value={sums.expense} color={EXPENSE} />
        <SummaryCard
          label="Balance"
          value={sums.balance}
          color={sums.balance < 0 ? EXPENSE : GOLD}
          emphasize
        />
      </section>

      {/* Add form */}
      <section className="mt-10">
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setKind('income')}
            style={{ ...miniBtn, borderColor: kind === 'income' ? INCOME : '#C9982F55', color: kind === 'income' ? INCOME : '#F6ECCB99', background: kind === 'income' ? INCOME + '18' : 'transparent' }}
          >
            ＋ I got paid
          </button>
          <button
            onClick={() => setKind('expense')}
            style={{ ...miniBtn, borderColor: kind === 'expense' ? EXPENSE : '#C9982F55', color: kind === 'expense' ? EXPENSE : '#F6ECCB99', background: kind === 'expense' ? EXPENSE + '18' : 'transparent' }}
          >
            － I spent
          </button>
        </div>
        <EntryForm kind={kind} onAdd={addEntry} />
      </section>

      {/* Ledger, grouped by month */}
      <section className="mt-12">
        {!ready ? (
          <p className="text-center text-cream/50 italic">Opening the ledger…</p>
        ) : entries.length === 0 ? (
          <p className="text-center text-cream/50 italic">
            Nothing recorded yet. Mark the day you got paid, or something you spent.
          </p>
        ) : (
          <div className="grid gap-8">
            {months.map((g) => (
              <div key={g.key}>
                <div className="flex items-baseline justify-between border-b pb-2 mb-3" style={{ borderColor: GOLD + '33' }}>
                  <h2 className="font-cinzel text-lg" style={{ color: GOLD }}>{g.label}</h2>
                  <span className="text-xs font-cinzel" style={{ color: g.totals.balance < 0 ? EXPENSE : INCOME }}>
                    {g.totals.balance >= 0 ? '+' : '−'}{formatMoney(Math.abs(g.totals.balance))}
                  </span>
                </div>
                <ul className="grid gap-2">
                  {g.entries.map((en) => (
                    <LedgerRow key={en.id} entry={en} onDelete={deleteEntry} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-14 text-center">
        <span className="text-[0.62rem] tracking-widest uppercase font-cinzel" style={{ color: '#8FB9C2' }}>
          ◈ Kept privately on this device
        </span>
      </footer>
    </div>
  )
}

function SummaryCard({ label, value, color, emphasize }: { label: string; value: number; color: string; emphasize?: boolean }) {
  return (
    <div
      className="rounded-2xl px-3 py-4 sm:px-4 text-center border"
      style={{ borderColor: color + (emphasize ? '88' : '44'), background: color + (emphasize ? '18' : '0d') }}
    >
      <div className="text-[0.6rem] sm:text-[0.65rem] tracking-widest uppercase font-cinzel text-cream/60">{label}</div>
      <div className="mt-1 font-cinzeld text-lg sm:text-2xl" style={{ color }}>
        {formatMoney(value)}
      </div>
    </div>
  )
}

function EntryForm({ kind, onAdd }: { kind: BudgetKind; onAdd: (e: BudgetEntry) => void }) {
  const [date, setDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')

  const color = kind === 'income' ? INCOME : EXPENSE
  const amountValid = amount !== '' && !Number.isNaN(Number(amount)) && Number(amount) > 0

  function submit() {
    setErr('')
    if (!amountValid) {
      setErr('Enter an amount greater than zero.')
      return
    }
    if (!date) {
      setErr('Choose a date.')
      return
    }
    onAdd(
      makeEntry({
        kind,
        date,
        amount: Number(amount),
        label: label || (kind === 'income' ? 'Payday' : 'Spending'),
        note,
      })
    )
    // Reset for the next entry, keeping the date for quick repeat logging.
    setAmount('')
    setLabel('')
    setNote('')
  }

  return (
    <div className="grid gap-3 rounded-2xl p-4 sm:p-5 border" style={{ borderColor: color + '55', background: '#00000033' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div style={labelStyle}>{kind === 'income' ? 'Day I got paid' : 'Day I spent'}</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
        </div>
        <div>
          <div style={labelStyle}>Amount</div>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            style={fieldStyle}
          />
        </div>
      </div>
      <div>
        <div style={labelStyle}>{kind === 'income' ? 'Source (optional)' : 'Spent on (optional)'}</div>
        <input
          placeholder={kind === 'income' ? 'Paycheck, tips, gift…' : 'Groceries, rent, gas…'}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          style={fieldStyle}
        />
      </div>
      <div>
        <div style={labelStyle}>Note (optional)</div>
        <input placeholder="anything to remember" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} style={fieldStyle} />
      </div>
      {err && <p className="text-sm" style={{ color: EXPENSE }}>{err}</p>}
      <button onClick={submit} style={{ ...miniBtn, borderColor: color, color, background: color + '14', justifySelf: 'start' }}>
        {kind === 'income' ? 'Record payday' : 'Record spending'}
      </button>
    </div>
  )
}

function LedgerRow({ entry, onDelete }: { entry: BudgetEntry; onDelete: (id: string) => void }) {
  const isIncome = entry.kind === 'income'
  const color = isIncome ? INCOME : EXPENSE
  return (
    <li className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: '#ffffff0a' }}>
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0 font-cinzel text-sm" style={{ background: color + '22', color, border: '1px solid ' + color + '66' }}>
        {isIncome ? '↑' : '↓'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-cinzel text-cream truncate">{entry.label}</div>
        <div className="text-xs text-cream/55">
          {formatDate(entry.date)}
          {entry.note ? ' · ' + entry.note : ''}
        </div>
      </div>
      <span className="font-cinzeld text-base shrink-0" style={{ color }}>
        {isIncome ? '+' : '−'}{formatMoney(entry.amount)}
      </span>
      <button onClick={() => onDelete(entry.id)} title="Remove" style={{ background: 'transparent', border: 'none', color: '#C56A5C', cursor: 'pointer', fontSize: 14 }}>
        🗑
      </button>
    </li>
  )
}
