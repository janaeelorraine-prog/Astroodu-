'use client'

import { useMemo } from 'react'

// Cosmic backdrop, drifting motes, and ornate gold filigree corners.
// Rendered once at the root so the whole Temple breathes behind every screen.

function Filigree({ className }: { className: string }) {
  return (
    <svg className={`filigree ${className}`} viewBox="0 0 140 140" fill="none">
      <path
        d="M4 4 C4 60 30 60 30 30 C30 4 60 4 60 4"
        stroke="url(#fg)"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M4 4 C70 8 90 40 100 100 C104 124 124 124 136 136"
        stroke="url(#fg)"
        strokeWidth="1.4"
        fill="none"
        opacity="0.7"
      />
      <circle cx="30" cy="30" r="4" fill="#F0D27A" />
      <path
        d="M10 40 C26 44 30 60 26 78 M40 10 C44 26 60 30 78 26"
        stroke="url(#fg)"
        strokeWidth="1.2"
        opacity="0.6"
      />
      <defs>
        <linearGradient id="fg" x1="0" y1="0" x2="140" y2="140">
          <stop stopColor="#F0D27A" />
          <stop offset="0.6" stopColor="#C9982F" />
          <stop offset="1" stopColor="#8a6516" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function TempleChrome() {
  const motes = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        left: `${Math.random() * 100}%`,
        size: `${4 + Math.random() * 10}px`,
        duration: `${16 + Math.random() * 22}s`,
        delay: `${-Math.random() * 30}s`,
        key: i,
      })),
    []
  )

  return (
    <>
      <div className="temple-bg" />
      <div className="temple-stars" />
      {motes.map((m) => (
        <span
          key={m.key}
          className="mote"
          style={{
            left: m.left,
            width: m.size,
            height: m.size,
            animationDuration: m.duration,
            animationDelay: m.delay,
            bottom: 0,
          }}
        />
      ))}
      <Filigree className="tl" />
      <Filigree className="tr" />
      <Filigree className="bl" />
      <Filigree className="br" />
    </>
  )
}
