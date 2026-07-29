'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import type { SessionUser } from '@/lib/auth'

const NAV = [
  { n: '01', label: 'Главная', href: '/admin' },
  { n: '02', label: 'Трансляции', href: '/admin/broadcasts' },
  { n: '03', label: 'Статьи', href: '/admin/articles' },
  { n: '04', label: 'Предложенные', href: '/admin/submissions' },
  { n: '05', label: 'Подписчики', href: '/admin/subscribers' },
  { n: '06', label: 'Страницы', href: '/admin/pages' },
  { n: '07', label: 'Команда', href: '/admin/team' },
  { n: '08', label: 'Статистика', href: '/admin/stats' },
]

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: 268,
        flexShrink: 0,
        background: 'var(--dark)',
        color: 'var(--dark-text)',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 20px',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <Link
        href="/admin"
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 34 }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'var(--accent)',
            color: 'var(--dark)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-mono), monospace',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {'</>'}
        </div>
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.04em' }}>
            vibecast
          </div>
          <div className="mono" style={{ color: 'var(--dark-text-2)', fontSize: 9 }}>
            админка
          </div>
        </div>
      </Link>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map((item) => {
          const active =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 16px',
                borderRadius: 'var(--r-field)',
                background: active ? 'var(--accent-alt)' : 'transparent',
                color: active ? 'var(--dark)' : 'var(--dark-text)',
                fontWeight: active ? 700 : 500,
                fontSize: 15,
                transition: 'background .15s',
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  opacity: active ? 0.55 : 0.4,
                  color: 'inherit',
                }}
              >
                {item.n}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
        <div
          className="mono"
          style={{ color: 'var(--dark-text-2)', fontSize: 9, marginBottom: 12 }}
        >
          вы вошли как
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'var(--dark)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials(user.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--dark-text-2)' }}>
              {user.role === 'owner'
                ? 'главный редактор'
                : user.role === 'editor'
                  ? 'редактор'
                  : 'модератор'}
            </div>
          </div>
        </div>

        <Link
          href="/"
          target="_blank"
          style={{
            display: 'block',
            textAlign: 'center',
            border: '1px solid var(--dark-border)',
            borderRadius: 'var(--r-pill)',
            padding: '11px 16px',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Открыть портал ↗
        </Link>
        <form action={logout}>
          <button
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: 'var(--dark-text-2)',
              fontSize: 13,
              padding: '8px 0',
              cursor: 'pointer',
            }}
          >
            Выйти
          </button>
        </form>
      </div>
    </aside>
  )
}
