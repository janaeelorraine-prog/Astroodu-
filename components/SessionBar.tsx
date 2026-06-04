'use client'

import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useAuth } from './AuthProvider'

const btnStyle: CSSProperties = {
  background: 'transparent',
  border: '1px solid #C9982F',
  borderRadius: 9999,
  color: '#F0D27A',
  padding: '6px 14px',
  cursor: 'pointer',
  fontSize: 12,
  letterSpacing: '0.12em',
}
const inputStyle: CSSProperties = {
  background: '#00000044',
  border: '1px solid #C9982F55',
  borderRadius: 8,
  color: '#F6ECCB',
  padding: '8px 10px',
  fontSize: 14,
}

export default function SessionBar() {
  const { user, signIn, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('sending')
    const { error } = await signIn(email)
    if (error) {
      setStatus('error')
      setMsg(error)
    } else {
      setStatus('sent')
      setMsg('A gate-link was sent to ' + email + '. Open it on this device to enter.')
    }
  }

  return (
    <div style={{ position: 'fixed', top: 12, right: 16, zIndex: 50, fontFamily: 'var(--font-cinzel), serif' }}>
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.15em', color: '#6FA063', textTransform: 'uppercase' }}>
            ✦ keeper
          </span>
          <button onClick={() => signOut()} style={btnStyle}>
            Leave
          </button>
        </div>
      ) : open ? (
        <form
          onSubmit={submit}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#0a0712ee', border: '1px solid #C9982F66', borderRadius: 12, padding: 12, minWidth: 240 }}
        >
          <input
            type="email"
            required
            placeholder="your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <button type="submit" style={btnStyle} disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send gate-link'}
          </button>
          {status === 'sent' && <span style={{ fontSize: 11, color: '#6FA063', lineHeight: 1.4 }}>{msg}</span>}
          {status === 'error' && <span style={{ fontSize: 11, color: '#C56A5C', lineHeight: 1.4 }}>{msg}</span>}
          <button type="button" onClick={() => setOpen(false)} style={{ ...btnStyle, border: 'none', opacity: 0.6 }}>
            close
          </button>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} style={btnStyle}>
          ✦ Enter
        </button>
      )}
    </div>
  )
}
