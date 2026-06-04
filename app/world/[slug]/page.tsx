'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import type { World, Page, Entry, EntryKind } from '@/lib/types'

const KINDS: EntryKind[] = ['gate', 'odu', 'throne', 'spirit', 'planet', 'sign', 'number', 'reading_step']

const fieldStyle: CSSProperties = { background: '#00000044', border: '1px solid #C9982F55', borderRadius: 8, color: '#F6ECCB', padding: '7px 9px', fontSize: 14, width: '100%' }
const miniBtn: CSSProperties = { background: 'transparent', border: '1px solid #C9982F', borderRadius: 9999, color: '#F0D27A', padding: '4px 12px', cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em' }

export default function WorldView({ params }: { params: { slug: string } }) {
  const { user } = useAuth()
  const [world, setWorld] = useState<World | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data: w } = await supabase.from('worlds').select('*').eq('slug', params.slug).single()
    setWorld((w as World) ?? null)
    if (w) {
      const wid = (w as World).id
      const [pRes, eRes] = await Promise.all([
        supabase.from('pages').select('*').eq('world_id', wid).order('sort_order'),
        supabase.from('entries').select('*').eq('world_id', wid).order('sort_order'),
      ])
      setPages((pRes.data as Page[]) ?? [])
      setEntries((eRes.data as Entry[]) ?? [])
    }
    setLoading(false)
  }, [params.slug])

  useEffect(() => {
    load()
  }, [load])

  const color = (world && world.flag_color) || '#C9982F'

  async function addEntry(form: { name: string; kind: EntryKind; number: string; element: string; body: string }, pageId: string | null) {
    if (!world || !form.name) return
    setErr('')
    const payload: Record<string, unknown> = {
      world_id: world.id,
      page_id: pageId,
      kind: form.kind,
      name: form.name,
      element: form.element || null,
      body: form.body || null,
    }
    if (form.number !== '') payload.number = Number(form.number)
    const { error } = await supabase.from('entries').insert(payload)
    if (error) {
      setErr(error.message)
      return
    }
    setAddingFor(null)
    load()
  }

  async function deleteEntry(id: string) {
    if (!window.confirm('Remove this entry from the temple?')) return
    setErr('')
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (error) {
      setErr(error.message)
      return
    }
    load()
  }

  return (
    <div className="min-h-screen px-6 pt-10 pb-28 max-w-3xl mx-auto fade-in">
      <Link href="/" className="sacred-line">← Iboru. Iboya. Ibosheshe.</Link>

      <header className="mt-8 text-center">
        <h1 className="wordmark text-5xl" style={{ filter: 'drop-shadow(0 2px 12px ' + color + ')' }}>
          {(world && world.name) || (loading ? '…' : 'Unknown world')}
        </h1>
        {world && world.subtitle && (<p className="mt-2 italic text-cream/70 text-lg">{world.subtitle}</p>)}
      </header>

      {world && world.description && (
        <p className="mt-6 text-center text-cream/85 leading-relaxed max-w-2xl mx-auto">{world.description}</p>
      )}

      {err && <p className="mt-4 text-center text-sm" style={{ color: '#C56A5C' }}>{err}</p>}

      <section className="mt-10 grid gap-6">
        {pages.map((p) => {
          const pageEntries = entries.filter((en) => en.page_id === p.id)
          return (
            <article key={p.id} className="rounded-2xl px-5 py-5 border" style={{ borderColor: color + '55', background: color + '0d' }}>
              <h2 className="font-cinzel text-xl" style={{ color }}>{p.name}</h2>
              {p.subtitle && <p className="italic text-cream/60 mb-1">{p.subtitle}</p>}
              {p.body && <p className="text-cream/80 text-sm leading-relaxed mt-2 whitespace-pre-line">{p.body}</p>}
              {pageEntries.length > 0 && (
                <ul className="mt-4 grid gap-2">
                  {pageEntries.map((en) => (<EntryRow key={en.id} entry={en} color={color} canEdit={!!user} onDelete={deleteEntry} />))}
                </ul>
              )}
              {user && (
                addingFor === p.id ? (
                  <AddEntryForm color={color} onCancel={() => setAddingFor(null)} onSave={(f) => addEntry(f, p.id)} />
                ) : (
                  <button onClick={() => { setAddingFor(p.id); setErr('') }} style={{ ...miniBtn, marginTop: 14 }}>＋ Add entry</button>
                )
              )}
            </article>
          )
        })}

        {(() => {
          const loose = entries.filter((en) => !en.page_id || !pages.some((pg) => pg.id === en.page_id))
          if (loose.length === 0 && !user) return null
          return (
            <article className="rounded-2xl px-5 py-5 border" style={{ borderColor: color + '55', background: color + '0d' }}>
              <h2 className="font-cinzel text-xl" style={{ color }}>Entries</h2>
              {loose.length > 0 && (
                <ul className="mt-4 grid gap-2">
                  {loose.map((en) => (<EntryRow key={en.id} entry={en} color={color} canEdit={!!user} onDelete={deleteEntry} />))}
                </ul>
              )}
              {user && (
                addingFor === '__world__' ? (
                  <AddEntryForm color={color} onCancel={() => setAddingFor(null)} onSave={(f) => addEntry(f, null)} />
                ) : (
                  <button onClick={() => { setAddingFor('__world__'); setErr('') }} style={{ ...miniBtn, marginTop: 14 }}>＋ Add entry</button>
                )
              )}
            </article>
          )
        })()}

        {!loading && pages.length === 0 && entries.length === 0 && !user && (
          <p className="text-center text-cream/50 italic">This world is still forming — no pages or entries yet.</p>
        )}
      </section>
    </div>
  )
}

function EntryRow({ entry, color, canEdit, onDelete }: { entry: Entry; color: string; canEdit: boolean; onDelete: (id: string) => void }) {
  const hasNum = entry.number !== null && entry.number !== undefined
  return (
    <li className="flex items-center gap-2">
      <Link href={'/entry/' + entry.id} className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2 transition hover:translate-x-1" style={{ background: '#ffffff0a' }}>
        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="font-cinzel text-cream">{entry.name}</span>
        {hasNum && <span className="text-xs font-cinzel" style={{ color }}>№ {entry.number}</span>}
        {entry.element && <span className="text-xs italic text-cream/60">{entry.element}</span>}
        <span className="ml-auto text-cream/30 text-[0.6rem] uppercase tracking-wider">{entry.kind}</span>
      </Link>
      {canEdit && (
        <button onClick={() => onDelete(entry.id)} title="Delete" style={{ background: 'transparent', border: 'none', color: '#C56A5C', cursor: 'pointer', fontSize: 14 }}>🗑</button>
      )}
    </li>
  )
}

function AddEntryForm({ color, onCancel, onSave }: { color: string; onCancel: () => void; onSave: (f: { name: string; kind: EntryKind; number: string; element: string; body: string }) => void }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<EntryKind>('odu')
  const [number, setNumber] = useState('')
  const [element, setElement] = useState('')
  const [body, setBody] = useState('')
  return (
    <div className="mt-4 grid gap-2 rounded-xl p-3" style={{ border: '1px solid ' + color + '55', background: '#00000033' }}>
      <input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} />
      <div className="flex gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as EntryKind)} style={{ ...fieldStyle, flex: 1 }}>
          {KINDS.map((k) => (<option key={k} value={k} style={{ background: '#0a0712' }}>{k}</option>))}
        </select>
        <input placeholder="number" value={number} onChange={(e) => setNumber(e.target.value)} style={{ ...fieldStyle, width: 90 }} />
        <input placeholder="element" value={element} onChange={(e) => setElement(e.target.value)} style={{ ...fieldStyle, width: 110 }} />
      </div>
      <textarea placeholder="body / teaching" value={body} onChange={(e) => setBody(e.target.value)} rows={3} style={fieldStyle} />
      <div className="flex gap-2">
        <button onClick={() => onSave({ name, kind, number, element, body })} style={miniBtn}>Save</button>
        <button onClick={onCancel} style={{ ...miniBtn, border: 'none', opacity: 0.6 }}>cancel</button>
      </div>
    </div>
  )
}
