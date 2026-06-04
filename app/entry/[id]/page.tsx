'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { World, Entry, Connection } from '@/lib/types'

type LinkedConn = { connection: Connection; other: Entry | null; direction: 'out' | 'in' }

export default function EntryView({ params }: { params: { id: string } }) {
  const [entry, setEntry] = useState<Entry | null>(null)
  const [worldsMap, setWorldsMap] = useState<Record<string, World>>({})
  const [conns, setConns] = useState<LinkedConn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const id = params.id
      const eRes = await supabase.from('entries').select('*').eq('id', id).single()
      if (!active) return
      setEntry((eRes.data as Entry) ?? null)

      const wRes = await supabase.from('worlds').select('*')
      const wmap: Record<string, World> = {}
      ;((wRes.data as World[]) || []).forEach((w) => { wmap[w.id] = w })
      if (active) setWorldsMap(wmap)

      if (eRes.data) {
        const cRes = await supabase.from('connections').select('*').or('from_entry.eq.' + id + ',to_entry.eq.' + id)
        const list = (cRes.data as Connection[]) || []
        const otherIds = Array.from(new Set(list.map((c) => (c.from_entry === id ? c.to_entry : c.from_entry))))
        const byId: Record<string, Entry> = {}
        if (otherIds.length) {
          const oRes = await supabase.from('entries').select('*').in('id', otherIds)
          ;((oRes.data as Entry[]) || []).forEach((o) => { byId[o.id] = o })
        }
        const linked: LinkedConn[] = list.map((c) => {
          const out = c.from_entry === id
          const otherId = out ? c.to_entry : c.from_entry
          return { connection: c, other: byId[otherId] || null, direction: out ? 'out' : 'in' }
        })
        if (active) setConns(linked)
      }
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [params.id])

  const world = entry && entry.world_id ? worldsMap[entry.world_id] : undefined
  const color = (world && world.flag_color) || '#C9982F'
  const data = entry && entry.data && typeof entry.data === 'object' ? (entry.data as Record<string, unknown>) : null
  const hasNum = entry && entry.number !== null && entry.number !== undefined

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

      {entry && entry.body && (<p className="mt-6 text-cream/85 leading-relaxed whitespace-pre-line">{entry.body}</p>)}

      {data && Object.keys(data).length > 0 && (
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
        {conns.length === 0 && !loading && (<p className="text-cream/50 italic text-sm">Nothing connected yet — connections are forged in edit mode.</p>)}
        <ul className="grid gap-2">
          {conns.map((lc) => {
            const o = lc.other
            const ow = o && o.world_id ? worldsMap[o.world_id] : undefined
            const oc = (ow && ow.flag_color) || '#C9982F'
            const rel = lc.connection.relation || 'links'
            return (
              <li key={lc.connection.id}>
                {o ? (
                  <Link href={'/entry/' + o.id} className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:translate-x-1" style={{ background: '#ffffff0a' }}>
                    <span className="text-cream/40 text-[0.6rem] uppercase tracking-wider w-20 shrink-0">{(lc.direction === 'out' ? '→ ' : '← ') + rel}</span>
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: oc }} />
                    <span className="font-cinzel text-cream">{o.name}</span>
                    {ow && <span className="ml-auto text-xs italic shrink-0" style={{ color: oc }}>{ow.name}</span>}
                  </Link>
                ) : (
                  <span className="text-cream/40 text-sm px-3">{rel} — (missing entry)</span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
