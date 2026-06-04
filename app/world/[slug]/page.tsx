'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { World, Page, Entry } from '@/lib/types'

export default function WorldView({ params }: { params: { slug: string } }) {
  const [world, setWorld] = useState<World | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: w } = await supabase.from('worlds').select('*').eq('slug', params.slug).single()
      if (!active) return
      setWorld((w as World) ?? null)
      if (w) {
        const wid = (w as World).id
        const [pRes, eRes] = await Promise.all([
          supabase.from('pages').select('*').eq('world_id', wid).order('sort_order'),
          supabase.from('entries').select('*').eq('world_id', wid).order('sort_order'),
        ])
        if (active) {
          setPages((pRes.data as Page[]) ?? [])
          setEntries((eRes.data as Entry[]) ?? [])
        }
      }
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [params.slug])

  const color = (world && world.flag_color) || '#C9982F'
  const looseEntries = entries.filter((en) => !en.page_id || !pages.some((pg) => pg.id === en.page_id))

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
                  {pageEntries.map((en) => (<EntryRow key={en.id} entry={en} color={color} />))}
                </ul>
              )}
            </article>
          )
        })}

        {looseEntries.length > 0 && (
          <article className="rounded-2xl px-5 py-5 border" style={{ borderColor: color + '55', background: color + '0d' }}>
            <h2 className="font-cinzel text-xl" style={{ color }}>Entries</h2>
            <ul className="mt-4 grid gap-2">
              {looseEntries.map((en) => (<EntryRow key={en.id} entry={en} color={color} />))}
            </ul>
          </article>
        )}

        {!loading && pages.length === 0 && entries.length === 0 && (
          <p className="text-center text-cream/50 italic">This world is still forming — no pages or entries yet.</p>
        )}
      </section>
    </div>
  )
}

function EntryRow({ entry, color }: { entry: Entry; color: string }) {
  const hasNum = entry.number !== null && entry.number !== undefined
  return (
    <li>
      <Link href={'/entry/' + entry.id} className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:translate-x-1" style={{ background: '#ffffff0a' }}>
        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="font-cinzel text-cream">{entry.name}</span>
        {hasNum && <span className="text-xs font-cinzel" style={{ color }}>№ {entry.number}</span>}
        {entry.element && <span className="text-xs italic text-cream/60">{entry.element}</span>}
        <span className="ml-auto text-cream/30 text-[0.6rem] uppercase tracking-wider">{entry.kind}</span>
      </Link>
    </li>
  )
}
