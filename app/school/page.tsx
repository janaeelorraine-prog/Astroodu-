'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import SchoolShell from '@/components/SchoolShell'
import type { Department, Course, Rung } from '@/lib/types'

// Seed so the school is never blank before the tables are seeded / read live.
const SEED_DEPTS: Department[] = [
  { id: 's-med', slug: 'mediumship', name: 'MEDIUMSHIP', tagline: 'the connect-skill', glyph: 'M', accent_color: '#a4133c', rung: 'BRANCH', is_sealed: false, unlock_note: null, is_root: false, sort_order: 1, created_at: '', updated_at: '' },
  { id: 's-div', slug: 'divination', name: 'DIVINATION', tagline: 'reading the road', glyph: 'D', accent_color: '#274690', rung: 'SEED', is_sealed: false, unlock_note: null, is_root: false, sort_order: 2, created_at: '', updated_at: '' },
  { id: 's-herb', slug: 'herbalism', name: 'HERBALISM', tagline: 'the green medicine', glyph: 'H', accent_color: '#2d5016', rung: 'SEED', is_sealed: false, unlock_note: null, is_root: false, sort_order: 3, created_at: '', updated_at: '' },
  { id: 's-root', slug: 'rootworker', name: 'ROOTWORKER', tagline: 'roots, oils, washes, workings', glyph: 'R', accent_color: '#6b4423', rung: null, is_sealed: true, unlock_note: 'Opens after Mediumship + Herbalism', is_root: false, sort_order: 4, created_at: '', updated_at: '' },
  { id: 's-aura', slug: 'aura-reader', name: 'AURA READER', tagline: 'the field, the colors, the currents', glyph: 'A', accent_color: '#7a3b8f', rung: null, is_sealed: true, unlock_note: 'Opens after Colors + Energy', is_root: false, sort_order: 5, created_at: '', updated_at: '' },
]
const SEED_ROOT: Department = { id: 's-rootfloor', slug: 'root-floor', name: 'THE ROOT FLOOR', tagline: 'Open to all — the ground every path stands on', glyph: '✦', accent_color: '#b8893b', rung: null, is_sealed: false, unlock_note: null, is_root: true, sort_order: 0, created_at: '', updated_at: '' }

const RUNG_INDEX: Record<Rung, number> = { SEED: 1, BRANCH: 2, CROWN: 3 }

export default function SchoolDashboard() {
  const { user } = useAuth()
  const [depts, setDepts] = useState<Department[]>([])
  const [rootCourses, setRootCourses] = useState<Course[]>([])
  const [live, setLive] = useState<'loading' | 'live' | 'fallback'>('loading')

  useEffect(() => {
    let active = true
    supabase
      .from('departments')
      .select('*')
      .order('sort_order')
      .then(async ({ data, error }) => {
        if (!active) return
        if (error || !data || data.length === 0) {
          setDepts([SEED_ROOT, ...SEED_DEPTS])
          setLive('fallback')
          return
        }
        setDepts(data as Department[])
        setLive('live')
        const rootDept = (data as Department[]).find((d) => d.is_root)
        if (rootDept) {
          const { data: cs } = await supabase
            .from('courses')
            .select('*')
            .eq('department_id', rootDept.id)
            .order('sort_order')
          if (active && cs) setRootCourses(cs as Course[])
        }
      })
    return () => {
      active = false
    }
  }, [])

  const list = depts.length ? depts : [SEED_ROOT, ...SEED_DEPTS]
  const rootFloor = list.find((d) => d.is_root)
  const departments = list.filter((d) => !d.is_root)

  const today = useMemo(
    () =>
      new Date()
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        .toUpperCase()
        .replace(/ /g, ' · '),
    []
  )

  return (
    <SchoolShell active="dashboard">
      <div className="fade-in">
        {/* header */}
        <div className="school-hd">
          <div>
            <div className="school-hd-welcome">
              WELCOME, <span>OSHAWALA</span>
            </div>
            <div className="school-hd-sub">The sky kept its word. Your path is lit where you left it.</div>
          </div>
          <div className="school-hd-date">{today}</div>
        </div>

        {/* Root Floor strip */}
        <div className="school-panel" style={{ marginTop: 28 }} id="root">
          <div className="school-corner-tl" />
          <div className="school-corner-br" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 14, letterSpacing: '0.2em', color: 'var(--sch-gold-light)' }}>
                THE ROOT FLOOR
              </div>
              <div style={{ fontSize: 14, color: 'rgba(245,240,225,.6)', fontStyle: 'italic', marginTop: 2 }}>
                {rootFloor?.tagline || 'Open to all — the ground every path stands on'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {rootCourses.length > 0
                ? rootCourses.map((c) => (
                    <Link key={c.id} href="/school/root-floor" className="school-chip">
                      {c.code || c.name}
                    </Link>
                  ))
                : ['Energy', 'Sound', 'Meditation', 'Symbols', 'Colors'].map((n, i) => (
                    <span key={n} className={'school-chip' + (i < 2 ? ' is-done' : '')}>
                      {n} {i < 2 ? '●' : i === 2 ? '◐' : '○'}
                    </span>
                  ))}
            </div>
          </div>
        </div>

        {/* department doors */}
        <div id="departments" style={{ marginTop: 30 }}>
          <div className="school-section-label">YOUR DEPARTMENTS</div>
          <div className="school-doors">
            {departments.map((d) => (
              <DoorCard key={d.id} dept={d} />
            ))}
          </div>
        </div>

        {/* lower row — grove + continue */}
        <div id="grove" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16, marginTop: 30 }} className="school-lower">
          <div style={{ border: '1px solid rgba(45,80,22,.8)', borderRadius: 4, background: 'linear-gradient(180deg,rgba(45,80,22,.22),rgba(10,10,26,.5))', padding: '22px 24px' }}>
            <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 14, letterSpacing: '0.2em', color: '#a9c98a' }}>THE OPEN GROVE</div>
            <div style={{ fontSize: 15, color: 'rgba(245,240,225,.75)', marginTop: 8, lineHeight: 1.55 }}>
              The communal floor — announcements, discussion, shared resources. Open to every enrolled student, whatever their path.
            </div>
            <span className="school-btn" style={{ marginTop: 14 }}>ENTER THE GROVE →</span>
          </div>
          <div id="hub" style={{ border: '1px solid rgba(184,137,59,.35)', borderRadius: 4, background: 'rgba(10,10,26,.6)', padding: '22px 24px' }}>
            <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 12, letterSpacing: '0.2em', color: 'rgba(184,137,59,.9)' }}>CONTINUE WHERE YOU LEFT OFF</div>
            {departments[0] ? (
              <Link href={`/school/${departments[0].slug}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 16, color: 'var(--sch-cream)', marginTop: 10 }}>{departments[0].name}</div>
                <div style={{ fontSize: 14, fontStyle: 'italic', color: 'rgba(245,240,225,.55)', marginTop: 4 }}>{departments[0].tagline} · pick up the climb</div>
              </Link>
            ) : (
              <div style={{ fontSize: 14, color: 'rgba(245,240,225,.55)', marginTop: 10 }}>Your climb awaits.</div>
            )}
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(184,137,59,.15)', marginTop: 14 }}>
              <div style={{ height: 4, width: '56%', borderRadius: 2, background: 'linear-gradient(90deg,#b8893b,#e8c987)' }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 26, fontSize: 11, letterSpacing: '0.14em', fontFamily: 'var(--font-cinzel), serif', color: live === 'live' ? '#7fb069' : live === 'fallback' ? '#e8c987' : '#8FB9C2' }}>
          {live === 'live'
            ? '◈ Departments reading live from the school'
            : live === 'fallback'
            ? '◈ Showing the seeded departments — sign in as keeper to add lessons'
            : '◈ Opening the doors…'}
        </div>
      </div>
    </SchoolShell>
  )
}

function DoorCard({ dept }: { dept: Department }) {
  const sealed = !!dept.is_sealed
  const accent = dept.accent_color || '#b8893b'
  const filled = dept.rung ? RUNG_INDEX[dept.rung] : 0

  const inner = (
    <>
      <div
        className={'school-medallion' + (sealed ? ' is-sealed' : '')}
        style={sealed ? undefined : { background: `radial-gradient(circle at 35% 30%, ${accent}, #10101f)` }}
      >
        {sealed ? '🔒' : dept.glyph || dept.name.charAt(0)}
      </div>
      <div className="school-door-name">{dept.name}</div>
      {sealed ? (
        <div className="school-door-seal-note">{dept.unlock_note || 'Sealed'}</div>
      ) : (
        <div className="school-door-tag">{dept.tagline}</div>
      )}
      <div className="school-rungs">
        <div style={{ background: filled >= 1 ? '#b8893b' : 'rgba(184,137,59,.15)' }} />
        <div style={{ width: '82%', margin: '0 auto', background: filled >= 2 ? 'rgba(184,137,59,.7)' : 'rgba(184,137,59,.15)' }} />
        <div style={{ width: '64%', margin: '0 auto', background: filled >= 3 ? 'rgba(184,137,59,.7)' : 'rgba(184,137,59,.15)' }} />
      </div>
      <div className="school-rung-label">{sealed ? 'SEALED' : dept.rung ? `${dept.rung} RUNG` : 'BEGIN'}</div>
    </>
  )

  if (sealed) return <div className="school-door is-sealed">{inner}</div>
  return (
    <Link href={`/school/${dept.slug}`} className="school-door is-active">
      {inner}
    </Link>
  )
}
