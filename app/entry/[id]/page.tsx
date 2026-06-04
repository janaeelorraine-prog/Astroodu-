'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import type { World, Entry, Connection } from '@/lib/types'

type LinkedConn = { connection: Connection; other: Entry | null; direction: 'out' | 'in' }

const fieldStyle: CSSProperties = { background: '#00000044', border: '1px solid #C9982F55', borderRadius: 8, color: '#F6ECCB', padding: '7px 9px', fontSize: 14, width: '100%' }
const miniBtn: CSSProperties = { background: 'transparent', border: '1px solid #C9982F', borderRadius: 9999, color: '#F0D27A', padding: '4px 12px', cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em' }

export default function EntryView({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [worldsMap, setWorldsMap] = useState<Record<string, World>>({})
  const [conns, setConns] = useState<LinkedConn[]>([])
  const [allEntries, setAllEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [err, setErr] = useState('')

  const [fName, setFName] = useState('')
  const [fNumber, setFNumber] = useState('')
  const [fElement, setFElement] = useState('')
  const [fBody, setFBody] = useState('')

  const [connTarget, setConnTarget] = useState('')
  const [connRelation, setConnRelation] = useState('lands_on')

  const load = useCallback(async () => {
    const id = params.id
    const eRes = await supabase.from('entries').select('*').eq('id', id).single()
    const e = (eRes.data as Entry) ?? null
    setEntry(e)
    if (e) {
      setFName(e.name || '')
      setFNumber(e.number !== null && e.number !== undefined ? String(e.number) : '')
      setFElement(e.element || '')
      setFBody(e.body || '')
    }

    const wRes = await supabase.from('worlds').select('*')
    const wmap: Record<string, World> = {}
    ;((wRes.data as World[]) || []).forEach((w) => { wmap[w.id] = w })
    setWorldsMap(wmap)

    if (e) {
      const cRes = await supabase.from('connections').select('*').or('from_entry.eq.' + id + ',to_entry.eq.' + id)
      const list = (cRes.data as Connection[]) || []
      const otherIds = Array.from(new Set(list.map((c) => (c.from_entry === id ? c.to_entry : c.from_entry))))
      const byId: Record<string, Entry> = {}
      if (otherIds.length) {
        const oRes = await supabase.from('entries').select('*').in('id', otherIds)
        ;((oRes.data as Entry[]) || []).forEach((o) => { byId[o.id] = o })
      }
      setConns(list.map((c) => {
        const out = c.from_entry === id
        const otherId = out ? c.to_entry : c.from_entry
        return { connection: c, other: byId[otherId] || null, direction: out ? 'out' : 'in' }
      }))
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!user) return
    supabase.from('entries').select('id,name,world_id').order('name').then(({ data }) => {
      setAllEntries((data as Entry[]) || [])
    })
  }, [user])

  const world = entry && entry.world_id ? worldsMap[entry.world_id] : undefined
  const color = (world && world.flag_color) || '#C9982F'
  const data = entry && entry.data && typeof entry.data === 'object' ? (entry.data as Record<string, unknown>) : null
  const hasNum = entry && entry.number !== null && entry.number !== undefined

  async function saveEdit() {
    if (!entry) return
    setErr('')
    const patch: Record<string, unknown> = { name: fName, element: fElement || null, body: fBody || null }
    patch.number = fNumber === '' ? null : Number(fNumber)
    const { error } = await supabase.from('entries').update(patch).eq('id', entry.id)
    if (error) { setErr(error.message); return }
    setEditing(false)
    load()
  }

  async function deleteEntry() {
    if (!entry) return
    if (!window.confirm('Delete this entry and its connections?')) return
    await supabase.from('connections').delete().or('from_entry.eq.' + entry.id + ',to_entry.eq.' + entry.id)
    const { error } = await supabase.from('entries').delete().eq('id', entry.id)
    if (error) { setErr(error.message); return }
    if (world) router.replace('/world/' + world.slug)
    else router.replace('/')
  }

  async function addConnection() {
    if (!entry || !connTarget) return
    setErr('')
    const { error } = await supabase.from('connections').insert({ from_entry: entry.id, to_entry: connTarget, relation: connRelation || 'lands_on' })
    if (error) { setErr(error.message); return }
    setConnTarget('')
    load()
  }

  async function deleteConnection(cid: string) {
    setErr('')
    const { error } = await supabase.from('connections').delete().eq('id', cid)
    if (error) { setErr(error.message); return }
    load()
  }

  return (
    <div className="min-h-screen px-6 pt-10 pb-28 max-w-2xl mx-auto fade-in">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="sacred-line">← Temple</Link>
        {world && (<Link href={'/world/' + world.slug} className="sacred-line" style={{ color }}>{world.name} →</Link>)}
      </div>

      <header className="mt-8 text-center">
        <p className="text-[0.65rem] uppercase tracking-[0.3em]" style={{ color }}>{entry ? entry.kind : ''}</p>
        <h1 className="wordmark text-5xl mt-2" style={{ filter: 'drop-shadow(0 2px 12px ' + color + ')' }}>
          {(entry && entry.name) || (loading ? '…' : 'Lost entry')}
        </h1>
        <div className="mt-3 flex items-center justify-center gap-4 text-sm">
          {hasNum && (<span className="font-cinzel" style={{ color }}>№ {entry!.number}</span>)}
          {entry && entry.element && (<span className="italic text-cream/70">{entry.element}</span>)}
        </div>
      </header>

      {err && <p className="mt-4 text-center text-sm" style={{ color: '#C56A5C' }}>{err}</p>}

      {user && entry && (
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={() => { setEditing(!editing); setErr('') }} style={miniBtn}>{editing ? 'close edit' : '✎ Edit'}</button>
          <button onClick={deleteEntry} style={{ ...miniBtn, borderColor: '#C56A5C', color: '#C56A5C' }}>Delete</button>
        </div>
      )}

      {user && editing && entry && (
        <div className="mt-4 grid gap-2 rounded-xl p-4" style={{ border: '1px solid ' + color + '55', background: '#00000033' }}>
          <input placeholder="name" value={fName} onChange={(e) => setFName(e.target.value)} style={fieldStyle} />
          <div className="flex gap-2">
            <input placeholder="number" value={fNumber} onChange={(e) => setFNumber(e.target.value)} style={{ ...fieldStyle, width: 100 }} />
            <input placeholder="element" value={fElement} onChange={(e) => setFElement(e.target.value)} style={{ ...fieldStyle, flex: 1 }} />
          </div>
          <textarea placeholder="body" value={fBody} onChange={(e) => setFBody(e.target.value)} rows={6} style={fieldStyle} />
          <button onClick={saveEdit} style={miniBtn}>Save changes</button>
        </div>
      )}

      {entry && entry.body && !editing && (<p className="mt-6 text-cream/85 leading-relaxed whitespace-pre-line">{entry.body}</p>)}

      {data && Object.keys(data).length > 0 && !editing && (
        <dl className="mt-6 grid gap-2 rounded-xl px-5 py-4 border" style={{ borderColor: color + '44', background: color + '0a' }}>
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="flex gap-3 text-sm">
              <dt className="font-cinzel uppercase tracking-wider text-cream/50 min-w-[7rem]">{k}</dt>
              <dd className="text-cream/85">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
            </div>
          ))}
        </dl>
      )}

      <section className="mt-10">
        <h2 className="font-cinzel text-lg mb-3" style={{ color }}>Connections</h2>
        {conns.length === 0 && !loading && (<p className="text-cream/50 italic text-sm">Nothing connected yet.</p>)}
        <ul className="grid gap-2">
          {conns.map((lc) => {
            const o = lc.other
            const ow = o && o.world_id ? worldsMap[o.world_id] : undefined
            const oc = (ow && ow.flag_color) || '#C9982F'
            const rel = lc.connection.relation || 'links'
            return (
              <li key={lc.connection.id} className="flex items-center gap-2">
                {o ? (
                  <Link href={'/entry/' + o.id} className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2 transition hover:translate-x-1" style={{ background: '#ffffff0a' }}>
                    <span className="text-cream/40 text-[0.6rem] uppercase tracking-wider w-20 shrink-0">{(lc.direction === 'out' ? '→ ' : '← ') + rel}</span>
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: oc }} />
                    <span className="font-cinzel text-cream">{o.name}</span>
                    {ow && <span className="ml-auto text-xs italic shrink-0" style={{ color: oc }}>{ow.name}</span>}
                  </Link>
                ) : (
                  <span className="flex-1 text-cream/40 text-sm px-3">{rel} — (missing entry)</span>
                )}
                {user && (<button onClick={() => deleteConnection(lc.connection.id)} title="Unlink" style={{ background: 'transparent', border: 'none', color: '#C56A5C', cursor: 'pointer' }}>✕</button>)}
              </li>
            )
          })}
        </ul>

        {user && entry && (
          <div className="mt-4 grid gap-2 rounded-xl p-3" style={{ border: '1px solid ' + color + '55', background: '#00000033' }}>
            <p className="text-cream/60 text-xs uppercase tracking-wider">＋ Connect to another entry</p>
            <select value={connTarget} onChange={(e) => setConnTarget(e.target.value)} style={fieldStyle}>
              <option value="" style={{ background: '#0a0712' }}>— choose an entry —</option>
              {allEntries.filter((x) => x.id !== entry.id).map((x) => {
                const xw = x.world_id ? worldsMap[x.world_id] : undefined
                return (<option key={x.id} value={x.id} style={{ background: '#0a0712' }}>{x.name}{xw ? ' — ' + xw.name : ''}</option>)
              })}
            </select>
            <div className="flex gap-2">
              <input placeholder="relation (e.g. lands_on)" value={connRelation} onChange={(e) => setConnRelation(e.target.value)} style={{ ...fieldStyle, flex: 1 }} />
              <button onClick={addConnection} style={miniBtn}>Connect</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
