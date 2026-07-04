'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import SchoolShell from '@/components/SchoolShell'
import { videoEmbed } from '@/lib/media'
import type { Department, Course, Lesson, LessonMedia, MediaKind } from '@/lib/types'

export default function LessonView({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [dept, setDept] = useState<Department | null>(null)
  const [media, setMedia] = useState<LessonMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [editing, setEditing] = useState(false)
  const [fName, setFName] = useState('')
  const [fSubtitle, setFSubtitle] = useState('')
  const [fPlan, setFPlan] = useState('')

  const load = useCallback(async () => {
    const { data: l } = await supabase.from('lessons').select('*').eq('id', params.id).single()
    const lesson = (l as Lesson) ?? null
    setLesson(lesson)
    if (lesson) {
      setFName(lesson.name || '')
      setFSubtitle(lesson.subtitle || '')
      setFPlan(lesson.plan || '')
      const [{ data: c }, { data: m }] = await Promise.all([
        supabase.from('courses').select('*').eq('id', lesson.course_id).single(),
        supabase.from('lesson_media').select('*').eq('lesson_id', lesson.id).order('sort_order'),
      ])
      const cc = (c as Course) ?? null
      setCourse(cc)
      setMedia((m as LessonMedia[]) ?? [])
      if (cc) {
        const { data: d } = await supabase.from('departments').select('*').eq('id', cc.department_id).single()
        setDept((d as Department) ?? null)
      }
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  const accent = dept?.accent_color || '#b8893b'
  const videos = media.filter((m) => m.kind === 'video')
  const images = media.filter((m) => m.kind === 'image')

  async function savePlan() {
    if (!lesson) return
    setErr('')
    const { error } = await supabase
      .from('lessons')
      .update({ name: fName, subtitle: fSubtitle || null, plan: fPlan || null })
      .eq('id', lesson.id)
    if (error) return setErr(error.message)
    setEditing(false)
    load()
  }

  async function addMedia(kind: MediaKind, url: string, caption: string) {
    if (!lesson || !url.trim()) return
    setErr('')
    const count = media.filter((m) => m.kind === kind).length
    const { error } = await supabase.from('lesson_media').insert({
      lesson_id: lesson.id,
      kind,
      url: url.trim(),
      caption: caption.trim() || null,
      sort_order: count,
    })
    if (error) return setErr(error.message)
    load()
  }

  async function deleteMedia(id: string) {
    setErr('')
    const { error } = await supabase.from('lesson_media').delete().eq('id', id)
    if (error) return setErr(error.message)
    load()
  }

  async function deleteLesson() {
    if (!lesson) return
    if (!window.confirm('Delete this lesson and all its media?')) return
    await supabase.from('lesson_media').delete().eq('lesson_id', lesson.id)
    const { error } = await supabase.from('lessons').delete().eq('id', lesson.id)
    if (error) return setErr(error.message)
    if (dept) router.replace(`/school/${dept.slug}`)
    else router.replace('/school')
  }

  return (
    <SchoolShell active="departments">
      <div className="fade-in" style={{ maxWidth: 860 }}>
        {/* breadcrumb */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/school" className="school-crumb">THE SCHOOL</Link>
          {dept && <><span style={{ color: 'rgba(245,240,225,.3)' }}>/</span><Link href={`/school/${dept.slug}`} className="school-crumb">{dept.name}</Link></>}
          {course && <><span style={{ color: 'rgba(245,240,225,.3)' }}>/</span><span className="school-crumb" style={{ color: 'var(--sch-gold-light)' }}>{course.code || course.name}</span></>}
        </div>

        <header style={{ marginTop: 18 }}>
          <h1 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 30, letterSpacing: '0.08em', color: 'var(--sch-cream)', margin: 0 }}>
            {lesson?.name || (loading ? '…' : 'Lost lesson')}
          </h1>
          {lesson?.subtitle && <div style={{ fontStyle: 'italic', color: 'rgba(245,240,225,.6)', marginTop: 6 }}>{lesson.subtitle}</div>}
        </header>

        {err && <p style={{ marginTop: 14, color: '#c56a5c' }}>{err}</p>}

        {user && lesson && (
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={() => { setEditing(!editing); setErr('') }} className="school-btn">{editing ? 'close edit' : '✎ Edit lesson plan'}</button>
            <button onClick={deleteLesson} className="school-btn is-danger">Delete lesson</button>
          </div>
        )}

        {/* lesson plan */}
        <section style={{ marginTop: 24 }}>
          <div className="school-section-label">✦ THE LESSON PLAN</div>
          {user && editing ? (
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="lesson name" className="school-field" />
              <input value={fSubtitle} onChange={(e) => setFSubtitle(e.target.value)} placeholder="subtitle" className="school-field" />
              <textarea value={fPlan} onChange={(e) => setFPlan(e.target.value)} placeholder="Write the lesson plan here — the teaching, the steps, the practice…" rows={12} className="school-field" style={{ lineHeight: 1.6, resize: 'vertical' }} />
              <button onClick={savePlan} className="school-btn is-solid" style={{ justifySelf: 'start' }}>Save lesson plan</button>
            </div>
          ) : lesson?.plan ? (
            <div style={{ marginTop: 12, color: 'rgba(245,240,225,.88)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontSize: 16 }}>{lesson.plan}</div>
          ) : (
            <p style={{ marginTop: 12, color: 'rgba(245,240,225,.45)', fontStyle: 'italic' }}>
              {user ? 'No lesson plan yet — tap “Edit lesson plan” to write it.' : 'The lesson plan is still being written.'}
            </p>
          )}
        </section>

        {/* videos */}
        <MediaSection
          title="▷ VIDEOS"
          empty={user ? 'No videos yet — paste a YouTube, Vimeo, or video-file link below.' : 'No videos yet.'}
          items={videos}
          canEdit={!!user}
          onDelete={deleteMedia}
          onAdd={(url, cap) => addMedia('video', url, cap)}
          urlPlaceholder="video link (YouTube, Vimeo, or .mp4)"
          render={(m) => {
            const e = videoEmbed(m.url)
            if (e.type === 'iframe')
              return <div className="ratio"><iframe src={e.src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={m.caption || 'video'} /></div>
            if (e.type === 'file')
              return <video src={e.src} controls />
            return <a href={m.url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: 16, color: 'var(--sch-gold-light)' }}>▷ {m.url}</a>
          }}
        />

        {/* pictures */}
        <MediaSection
          title="❖ PICTURES"
          empty={user ? 'No pictures yet — paste an image link below.' : 'No pictures yet.'}
          items={images}
          canEdit={!!user}
          onDelete={deleteMedia}
          onAdd={(url, cap) => addMedia('image', url, cap)}
          urlPlaceholder="image link (https://…)"
          render={(m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.url} alt={m.caption || 'picture'} loading="lazy" />
          )}
        />
      </div>
    </SchoolShell>
  )
}

function MediaSection({
  title,
  empty,
  items,
  canEdit,
  onDelete,
  onAdd,
  urlPlaceholder,
  render,
}: {
  title: string
  empty: string
  items: LessonMedia[]
  canEdit: boolean
  onDelete: (id: string) => void
  onAdd: (url: string, caption: string) => void
  urlPlaceholder: string
  render: (m: LessonMedia) => React.ReactNode
}) {
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [open, setOpen] = useState(false)

  function submit() {
    if (!url.trim()) return
    onAdd(url, caption)
    setUrl('')
    setCaption('')
    setOpen(false)
  }

  return (
    <section style={{ marginTop: 30 }}>
      <div className="school-section-label">{title}</div>
      {items.length > 0 ? (
        <div className="school-media-grid">
          {items.map((m) => (
            <div key={m.id} className="school-media-frame" style={{ position: 'relative' }}>
              {render(m)}
              {m.caption && <div className="school-media-cap">{m.caption}</div>}
              {canEdit && (
                <button
                  onClick={() => onDelete(m.id)}
                  title="Remove"
                  style={{ position: 'absolute', top: 8, right: 8, background: '#0a0712cc', border: '1px solid #c56a5c', color: '#c56a5c', borderRadius: 9999, width: 26, height: 26, cursor: 'pointer', lineHeight: 1 }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ marginTop: 12, color: 'rgba(245,240,225,.45)', fontStyle: 'italic' }}>{empty}</p>
      )}

      {canEdit && (
        <div style={{ marginTop: 14 }}>
          {open ? (
            <div style={{ display: 'grid', gap: 10, border: '1px solid rgba(184,137,59,.4)', borderRadius: 8, padding: 14, background: '#00000033', maxWidth: 520 }}>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={urlPlaceholder} className="school-field" />
              <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="caption (optional)" className="school-field" />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={submit} className="school-btn is-solid">Add</button>
                <button onClick={() => setOpen(false)} className="school-btn" style={{ border: 'none', opacity: 0.6 }}>cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setOpen(true)} className="school-btn">＋ Add</button>
          )}
        </div>
      )}
    </section>
  )
}
