'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Header.module.css'

type HeaderProps = {
  liveNow: boolean
  viewer: { email: string; digest: boolean } | null
}

const NAV = [
  { href: '/', label: 'Лента' },
  { href: '/live', label: 'Вебинары' },
  { href: '/tools', label: 'Инструменты' },
  { href: '/learn', label: 'Обучение' },
] as const

/** Активный пункт меню. Статья (/a/...) подсвечивает «Ленту» — как в прототипе. */
function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/a/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Инициалы из e-mail: первые две буквы локальной части. */
function emailInitials(email: string): string {
  const local = (email.split('@')[0] || '?').replace(/[^\p{L}\p{N}]+/gu, '')
  return (local.slice(0, 2) || '?').toUpperCase()
}

export default function Header({ liveNow, viewer }: HeaderProps) {
  const pathname = usePathname() ?? '/'
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="vibecast — на главную">
          <span className={styles.brandMark}>&lt;/&gt;</span>
          <span className={styles.brandName}>vibecast</span>
        </Link>

        <nav className={styles.nav}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${
                isActive(item.href, pathname) ? styles.navLinkActive : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          {liveNow ? (
            <Link href="/live" className={styles.livePill}>
              <span className={styles.liveDot} />
              <span className={styles.liveLabel}>В ЭФИРЕ</span>
            </Link>
          ) : null}

          <button type="button" className={styles.iconBtn} aria-label="Поиск">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.2-3.2" />
            </svg>
          </button>

          {viewer ? (
            <div
              className={styles.viewerChip}
              title={`${viewer.email} · дайджест ${
                viewer.digest ? 'включён' : 'выключен'
              }`}
            >
              <span className={styles.viewerAvatar}>
                {emailInitials(viewer.email)}
              </span>
              <span className={styles.viewerEmail}>{viewer.email}</span>
            </div>
          ) : null}

          <button
            type="button"
            className={`${styles.iconBtn} ${styles.burger}`}
            aria-label="Меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {menuOpen ? (
                <>
                  <path d="M5 5l14 14" />
                  <path d="M19 5 5 19" />
                </>
              ) : (
                <>
                  <path d="M3 6h18" />
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className={styles.mobileMenuOpen}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.mobileLink} ${
                isActive(item.href, pathname) ? styles.mobileLinkActive : ''
              }`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  )
}
