'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { World, Page } from '@/lib/types'

// Stage 5 will flesh this out (pages cards + entries + connections).
// For the live "hello" stage it confirms a world reads and its pages list.
export default function WorldView({ params }: { params: { slug: string } }) {
  const [world, setWorld] = useState<World | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: w } = await supabase
        .from('worlds')
        .select('*')
        .eq('slug', params.slug)
        .single()
      if (!active) return
      setWorld((w as World) ?? null)
      if (w) {
        const { data: p } = await supabase
          .from('pages')
          .select('*')
          .eq('world_id', (w as World).id)
          .order('sort_order')
        if (active) setPages((p as Page[]) ?? [])
      }
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [params.slug])

  const color = world?.flag_color ?? '#C9982F'

  return (
    <div className="min-h-screen px-6 pt-10 pb-24 max-w-3xl mx-auto">
      <Link href="/" className="sacred-line">
        ← Iboru. Iboya. Ibosheshe.
      </Link>

      <header className="mt-8 text-center">
        <h1 className="wordmark text-5xl" style={{ filter: `drop-shadow(0 2px 12px ${color})` }}>
          {world?.name ?? (loading ? '…' : 'Unknown world')}
        </h1>
        {world?.subtitle && (
          <p className="mt-2 italic text-cream/70 text-lg">{world.subtitle}</p>
        )}
      </header>

      {world?.description && (
        <p className="mt-6 text-center text-cream/85 leading-relaxed">
          {world.description}
        </p>
      )}

      <section className="mt-10 grid gap-4">
        {pages.map((p) => (
          <div
            key={p.id}
            className="rounded-xl px-5 py-4 border"
            style={{ borderColor: `${color}55`, background: `${color}0d` }}
          >
            <h2 className="font-cinzel text-lg" style={{ color }}>
              {p.name}
            </h2>
            {p.subtitle && <p className="italic text-cream/60">{p.subtitle}</p>}
          </div>
        ))}
        {!loading && pages.length === 0 && (
          <p className="text-center text-cream/50 italic">
            No pages yet in this world.
          </p>
        )}
      </section>
    </div>
  )
}
