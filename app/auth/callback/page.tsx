'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [msg, setMsg] = useState('Opening the gate…')

  useEffect(() => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      router.replace('/')
    }

    ;(async () => {
      try {
        const url = new URL(window.location.href)
        const err = url.searchParams.get('error_description') || url.searchParams.get('error')
        if (err) {
          setMsg(err)
          return
        }
        const code = url.searchParams.get('code')
        if (code) {
          await supabase.auth.exchangeCodeForSession(code).catch(() => {})
        }
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          finish()
        } else {
          setMsg('Could not complete sign-in. Please request a fresh gate-link on this device.')
        }
      } catch (e) {
        setMsg('Could not complete sign-in. Please request a fresh gate-link on this device.')
      }
    })()
  }, [router])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        color: '#F0D27A',
        fontFamily: 'var(--font-cinzel), Georgia, serif',
        letterSpacing: '0.12em',
      }}
    >
      <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.8 }}>
        Iboru. Iboya. Ibosheshe.
      </p>
      <p style={{ marginTop: '1rem', maxWidth: '26rem', lineHeight: 1.6, color: '#F6ECCB' }}>{msg}</p>
    </div>
  )
}
