'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'

type NavKey = 'dashboard' | 'departments' | 'grove' | 'hub' | 'profile'

const NAV: { key: NavKey; label: string; href: string; mark: string }[] = [
  { key: 'dashboard', label: 'DASHBOARD', href: '/school', mark: '✦' },
  { key: 'departments', label: 'MY DEPARTMENTS', href: '/school#departments', mark: '✧' },
  { key: 'grove', label: 'THE OPEN GROVE', href: '/school#grove', mark: '✧' },
  { key: 'hub', label: 'PRACTITIONER HUB', href: '/school#hub', mark: '✧' },
  { key: 'profile', label: 'PROFILE', href: '/', mark: '✧' },
]

// The gilded-doorway chrome from design 1a: a temple sidebar + starfield body.
export default function SchoolShell({
  active,
  children,
}: {
  active: NavKey
  children: ReactNode
}) {
  const { user } = useAuth()
  return (
    <div className="school-root">
      <aside className="school-side">
        <div className="school-brand">
          <div className="school-brand-kicker">THE ASTROODU</div>
          <div className="school-brand-name">SCHOOL</div>
          <div className="school-brand-motto">Iboru. Iboya. Ibosheshe.</div>
        </div>
        <nav className="school-nav">
          {NAV.map((n) => (
            <Link
              key={n.key}
              href={n.href}
              className={'school-nav-item' + (n.key === active ? ' is-active' : '')}
            >
              <span className="school-nav-mark">{n.mark}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="school-side-foot">
          <div className="school-side-foot-title">PRACTITIONER TRACK</div>
          <div className="school-side-foot-note">
            {user ? '✦ Keeper — you may add & edit' : 'Sealed · above the school'}
          </div>
        </div>
      </aside>
      <div className="school-main">
        <div className="school-stars" aria-hidden />
        <div className="school-main-inner">{children}</div>
      </div>
    </div>
  )
}
