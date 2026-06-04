'use client'

import { useEffect } from 'react'

function maybeReloadOnStaleChunk(error: Error) {
  const msg = (error && (error.name + ' ' + error.message)) || ''
  if (/ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch/i.test(msg)) {
    try {
      if (!sessionStorage.getItem('astroodu_reloaded')) {
        sessionStorage.setItem('astroodu_reloaded', '1')
        window.location.reload()
      }
    } catch (e) {
      window.location.reload()
    }
  }
}

export default function Error({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    maybeReloadOnStaleChunk(error)
  }, [error])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', color: '#F6ECCB' }}>
      <p style={{ letterSpacing: '0.3em', textTransform: 'uppercase', fontSize: '0.7rem', color: '#F0D27A', opacity: 0.8 }}>Iboru. Iboya. Ibosheshe.</p>
      <h1 style={{ fontFamily: 'serif', fontSize: '2rem', color: '#C9982F', margin: '1rem 0' }}>The gate flickered.</h1>
      <p style={{ maxWidth: '28rem', opacity: 0.85, lineHeight: 1.6 }}>A passing disturbance in the temple — usually it just means a fresh version was deployed. Step back through the gate.</p>
      <button
        onClick={() => { try { sessionStorage.removeItem('astroodu_reloaded') } catch (e) {} ; window.location.reload() }}
        style={{ marginTop: '1.5rem', padding: '0.7rem 1.4rem', border: '1px solid #C9982F', borderRadius: '9999px', background: 'transparent', color: '#F0D27A', cursor: 'pointer', letterSpacing: '0.1em', fontFamily: 'serif' }}
      >
        Return to the Temple
      </button>
    </div>
  )
}
