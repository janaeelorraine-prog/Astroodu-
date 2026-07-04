'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import SchoolShell from '@/components/SchoolShell'
import type { Department, Course, Lesson, Rung } from '@/lib/types'

const RUNGS: Rung[] = ['SEED', 'BRANCH', 'CROWN']

export default function DepartmentView({ params }: { params: { dept: string } }) {
  const { user } = useAuth()
  const [dept, setDept] = useState<Department | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)
  const [addLessonFor, setAddLessonFor] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: d } = await supabase.from('departments').select('*').eq('slug', params.dept).single()
    const department = (d as Department) ?? null
    setDept(department)
    if (department) {
      const { data: cs } = await supabase.from('courses').select('*').eq('department_id', department.id).order('sort_order')
      const courseList = (cs as Course[]) ?? []
      setCourses(courseList)
      if (courseList.length) {
        const { data: ls } = await supabase
          .from('lessons')
          .select('*')
          .in('course_id', courseList.map((c) => c.id))
          .order('sort_order')
        setLessons((ls as Lesson[]) ?? [])
      } else {
        setLessons([])
      }
    }
    setLoading(false)
  }, [params.dept])

  useEffect(() => {
    load()
  }, [load])

  const accent = dept?.accent_color || '#b8893b'

  async function addCourse(f: { code: string; name: string; subtitle: string; rung: Rung }) {
    if (!dept || !f.name) return
    setErr('')
    const { error } = await supabase.from('courses').insert({
      department_id: dept.id,
      code: f.code || null,
      name: f.name,
      subtitle: f.subtitle || null,
      rung: f.rung,
      sort_order: courses.length,
    })
    if (error) return setErr(error.message)
    setAddingCourse(false)
    load()
  }

  async function deleteCourse(id: string) {
    if (!window.confirm('Remove this course and all its lessons?')) return
    setErr('')
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (error) return setErr(error.message)
    load()
  }

  async function addLesson(courseId: string, f: { name: string; subtitle: string }) {
    if (!f.name) return
    setErr('')
    const count = lessons.filter((l) => l.course_id === courseId).length
    const { error } = await supabase.from('lessons').insert({
      course_id: courseId,
      name: f.name,
      subtitle: f.subtitle || null,
      sort_order: count,
    })
    if (error) return setErr(error.message)
    setAddLessonFor(null)
    load()
  }

  async function deleteLesson(id: string) {
    if (!window.confirm('Delete this lesson?')) return
    setErr('')
    const { error } = await supabase.from('lessons').delete().eq('id', id)
    if (error) return setErr(error.message)
    load()
  }

  return (
    <SchoolShell active="departments">
      <div className="fade-in">
        <Link href="/school" className="school-crumb">← THE SCHOOL</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 18 }}>
          <div
            className={'school-medallion' + (dept?.is_sealed ? ' is-sealed' : '')}
            style={dept?.is_sealed ? { width: 60, height: 60, fontSize: 22 } : { width: 60, height: 60, fontSize: 22, background: `radial-gradient(circle at 35% 30%, ${accent}, #10101f)` }}
          >
            {dept?.is_sealed ? '🔒' : dept?.glyph || (dept?.name?.charAt(0) ?? '…')}
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 30, letterSpacing: '0.1em', color: 'var(--sch-cream)', margin: 0 }}>
              {dept?.name || (loading ? '…' : 'Unknown department')}
            </h1>
            {dept?.tagline && <div style={{ fontStyle: 'italic', color: 'rgba(245,240,225,.6)', marginTop: 4 }}>{dept.tagline}</div>}
          </div>
        </div>

        {dept?.is_sealed && (
          <p style={{ marginTop: 16, color: 'rgba(184,137,59,.85)', fontStyle: 'italic' }}>
            {dept.unlock_note || 'This department is sealed for now.'}
          </p>
        )}

        {err && <p style={{ marginTop: 14, color: '#c56a5c' }}>{err}</p>}

        <div style={{ marginTop: 26, display: 'grid', gap: 18 }}>
          {courses.map((c) => {
            const courseLessons = lessons.filter((l) => l.course_id === c.id)
            return (
              <div key={c.id} className="school-panel" style={{ background: 'rgba(10,10,26,.5)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 17, letterSpacing: '0.08em', color: 'var(--sch-cream)' }}>
                      {c.code ? <span style={{ color: 'var(--sch-gold-light)' }}>{c.code} · </span> : null}
                      {c.name}
                    </div>
                    {c.subtitle && <div style={{ fontStyle: 'italic', color: 'rgba(245,240,225,.55)', fontSize: 14, marginTop: 2 }}>{c.subtitle}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {c.rung && <span className="school-rung-label" style={{ marginTop: 0 }}>{c.rung}</span>}
                    {user && (
                      <button onClick={() => deleteCourse(c.id)} className="school-btn is-danger" style={{ padding: '4px 12px', fontSize: 10 }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {courseLessons.length > 0 && (
                  <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 8 }}>
                    {courseLessons.map((l) => (
                      <li key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Link
                          href={`/school/lesson/${l.id}`}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: '#ffffff0a', borderRadius: 8, padding: '10px 14px', textDecoration: 'none' }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flex: 'none' }} />
                          <span style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--sch-cream)', fontSize: 15 }}>{l.name}</span>
                          {l.subtitle && <span style={{ fontStyle: 'italic', color: 'rgba(245,240,225,.5)', fontSize: 13 }}>{l.subtitle}</span>}
                          <span style={{ marginLeft: 'auto', color: 'rgba(245,240,225,.4)', fontSize: 12 }}>open →</span>
                        </Link>
                        {user && (
                          <button onClick={() => deleteLesson(l.id)} title="Delete lesson" style={{ background: 'transparent', border: 'none', color: '#c56a5c', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {courseLessons.length === 0 && <p style={{ color: 'rgba(245,240,225,.4)', fontStyle: 'italic', fontSize: 14, marginTop: 12 }}>No lessons yet.</p>}

                {user && (
                  addLessonFor === c.id ? (
                    <AddLessonForm onCancel={() => setAddLessonFor(null)} onSave={(f) => addLesson(c.id, f)} />
                  ) : (
                    <button onClick={() => { setAddLessonFor(c.id); setErr('') }} className="school-btn" style={{ marginTop: 14 }}>＋ Add lesson</button>
                  )
                )}
              </div>
            )
          })}

          {!loading && courses.length === 0 && !user && (
            <p style={{ color: 'rgba(245,240,225,.5)', fontStyle: 'italic', textAlign: 'center' }}>This department is still forming — no courses yet.</p>
          )}

          {user && dept && (
            addingCourse ? (
              <AddCourseForm onCancel={() => setAddingCourse(false)} onSave={addCourse} />
            ) : (
              <button onClick={() => { setAddingCourse(true); setErr('') }} className="school-btn is-solid" style={{ alignSelf: 'start' }}>＋ Add course</button>
            )
          )}
        </div>
      </div>
    </SchoolShell>
  )
}

function AddCourseForm({ onCancel, onSave }: { onCancel: () => void; onSave: (f: { code: string; name: string; subtitle: string; rung: Rung }) => void }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [rung, setRung] = useState<Rung>('SEED')
  return (
    <div className="school-panel" style={{ background: '#00000033', display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input placeholder="code (e.g. MED 201)" value={code} onChange={(e) => setCode(e.target.value)} className="school-field" style={{ width: 170 }} />
        <input placeholder="course name" value={name} onChange={(e) => setName(e.target.value)} className="school-field" style={{ flex: 1, minWidth: 180 }} />
        <select value={rung} onChange={(e) => setRung(e.target.value as Rung)} className="school-field" style={{ width: 130 }}>
          {RUNGS.map((r) => (<option key={r} value={r} style={{ background: '#0a0712' }}>{r}</option>))}
        </select>
      </div>
      <input placeholder="subtitle (optional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="school-field" />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => onSave({ code, name, subtitle, rung })} className="school-btn is-solid">Save course</button>
        <button onClick={onCancel} className="school-btn" style={{ border: 'none', opacity: 0.6 }}>cancel</button>
      </div>
    </div>
  )
}

function AddLessonForm({ onCancel, onSave }: { onCancel: () => void; onSave: (f: { name: string; subtitle: string }) => void }) {
  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  return (
    <div style={{ marginTop: 14, display: 'grid', gap: 10, border: '1px solid rgba(184,137,59,.4)', borderRadius: 8, padding: 14, background: '#00000033' }}>
      <input placeholder="lesson name" value={name} onChange={(e) => setName(e.target.value)} className="school-field" />
      <input placeholder="subtitle (optional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="school-field" />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => onSave({ name, subtitle })} className="school-btn is-solid">Save lesson</button>
        <button onClick={onCancel} className="school-btn" style={{ border: 'none', opacity: 0.6 }}>cancel</button>
      </div>
    </div>
  )
}
