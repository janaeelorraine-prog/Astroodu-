'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { World } from '@/lib/types'

// Fallback so the Temple is never blank — mirrors the seeded worlds.
const SEED: World[] = [
  { id: 's-first', slug: 'first', name: 'AstroOdu', subtitle: 'The Center', flag_color: '#F0D27A', description: null, sort_order: 0, is_center: true, created_at: '', updated_at: '' },
  { id: 's-numbers', slug: 'numbers', name: 'Numbers', subtitle: null, flag_color: '#8FB9C2', description: null, sort_order: 1, is_center: false, created_at: '', updated_at: '' },
  { id: 's-creation', slug: 'creation', name: 'Creation', subtitle: null, flag_color: '#6FA063', description: null, sort_order: 2, is_center: false, created_at: '', updated_at: '' },
  { id: 's-wheel', slug: 'wheel', name: 'The Wheel', subtitle: null, flag_color: '#C9982F', description: null, sort_order: 3, is_center: false, created_at: '', updated_at: '' },
  { id: 's-spirit', slug: 'spirit', name: 'Spirit / Deities', subtitle: null, flag_color: '#C9A0D8', description: null, sort_order: 4, is_center: false, created_at: '', updated_at: '' },
  { id: 's-reading', slug: 'reading', name: 'Reading AstroOdu', subtitle: null, flag_color: '#C56A5C', description: null, sort_order: 5, is_center: false, created_at: '', updated_at: '' },
]

export default function Home() {
  const [worlds, setWorlds] = useState<World[]>([])
  const [live, setLive] = useState<'loading' | 'live' | 'fallback'>('loading')

  useEffect(() => {
    let active = true
    supabase
      .from('worlds')
      .select('*')
      .order('sort_order')
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data || data.length === 0) {
          setWorlds(SEED)
          setLive('fallback')
        } else {
          setWorlds(data as World[])
          setLive('live')
        }
      })
    return () => {
      active = false
    }
  }, [])

  const list = worlds.length ? worlds : SEED
  const center = list.find((w) => w.is_center) ?? list[0]
  const doorways = list.filter((w) => w.id !== center?.id)

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-6 pt-12 pb-24">
      <header className="text-center mb-2">
        <p className="sacred-line mb-5">Iboru. Iboya. Ibosheshe.</p>
        <h1 className="wordmark text-5xl sm:text-6xl md:text-7xl leading-none">
          AstroOdu
        </h1>
        <p className="mt-3 text-cream/70 font-cinzel tracking-[0.25em] text-xs uppercase">
          The Temple
        </p>
      </header>

      {/* The center orb — glowing iris / Wheel */}
      <div className="relative mt-10 mb-12 flex items-center justify-center">
        <CenterOrb world={center} />
      </div>

      {/* The five doorways, flagged in their colors */}
      <section className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8">
        {doorways.map((w) => (
          <Doorway key={w.id} world={w} />
        ))}
      </section>

      <footer className="mt-16 text-center">
        <span
          className="text-[0.62rem] tracking-widest uppercase font-cinzel"
          style={{ color: live === 'live' ? '#6FA063' : live === 'fallback' ? '#C9982F' : '#8FB9C2' }}
        >
          {live === 'live'
            ? '◈ Worlds reading live from the temple'
            : live === 'fallback'
            ? '◈ Showing seeded worlds — connect the key to read live'
            : '◈ Opening the gates…'}
        </span>
      </footer>
    </div>
  )
}

function CenterOrb({ world }: { world?: World }) {
  if (!world) return null
  const color = world.flag_color ?? '#F0D27A'
  return (
    <Link href={`/world/${world.slug}`} className="orb orb-iris block">
      <svg width="240" height="240" viewBox="0 0 240 240">
        <defs>
          <radialGradient id="iris" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff7df" />
            <stop offset="35%" stopColor={color} />
            <stop offset="75%" stopColor="#8a6516" />
            <stop offset="100%" stopColor="#0a0712" />
          </radialGradient>
        </defs>
        <circle className="orb-ring" cx="120" cy="120" r="112" fill="none" stroke={color} strokeWidth="1.4" strokeDasharray="3 9" opacity="0.7" />
        <circle cx="120" cy="120" r="92" fill="url(#iris)" />
        <circle cx="120" cy="120" r="34" fill="#0a0712" opacity="0.9" />
        <circle cx="120" cy="120" r="34" fill="none" stroke="#F0D27A" strokeWidth="1.5" opacity="0.8" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-cinzeld text-xl text-ink/90">{world.name}</span>
      </div>
    </Link>
  )
}

function Doorway({ world }: { world: World }) {
  const color = world.flag_color ?? '#C9982F'
  return (
    <Link
      href={`/world/${world.slug}`}
      className="doorway flex flex-col items-center text-center"
      style={{ ['--flag' as string]: color }}
    >
      <svg className="doorway-arch" width="96" height="120" viewBox="0 0 96 120">
        <path
          d="M12 118 V52 a36 36 0 0 1 72 0 V118"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
        />
        <path
          d="M20 118 V54 a28 28 0 0 1 56 0 V118"
          fill={color}
          opacity="0.12"
        />
        <circle cx="48" cy="50" r="6" fill={color} />
      </svg>
      <span className="mt-3 font-cinzel text-base" style={{ color }}>
        {world.name}
      </span>
      {world.subtitle && (
        <span className="text-cream/55 text-sm italic">{world.subtitle}</span>
      )}
    </Link>
  )
}
