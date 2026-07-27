import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminHome() {
  const user = await getCurrentUser()
  const [articles, broadcasts, subscribers] = await Promise.all([
    prisma.article.count(),
    prisma.broadcast.count(),
    prisma.subscriber.count(),
  ])

  const tiles = [
    { label: 'Статьи', value: articles },
    { label: 'Трансляции', value: broadcasts },
    { label: 'Подписчики', value: subscribers },
  ]

  return (
    <div>
      <div className="mono" style={{ color: 'var(--muted)', marginBottom: 12 }}>
        обзор
      </div>
      <h1 style={{ fontSize: 44, marginBottom: 28 }}>Привет, {user?.name}</h1>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {tiles.map((t) => (
          <div
            key={t.label}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-card)',
              padding: '22px 26px',
              minWidth: 180,
            }}
          >
            <div className="mono" style={{ color: 'var(--muted)', marginBottom: 8 }}>
              {t.label}
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em' }}>
              {t.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
