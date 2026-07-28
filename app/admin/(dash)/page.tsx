import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import HomeEditor from './HomeEditor'

export const dynamic = 'force-dynamic'

export default async function AdminHome() {
  const [user, home, published, articles, broadcasts, subscribers] =
    await Promise.all([
      getCurrentUser(),
      prisma.home.findUnique({ where: { id: 'home' } }),
      prisma.article.findMany({
        where: { status: 'published', sec: 'feed' },
        select: { id: true, title: true, author: true },
        orderBy: [{ sortIndex: 'asc' }, { createdAt: 'desc' }],
      }),
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

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 34 }}>
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

      <h2
        style={{
          fontSize: 'clamp(22px,3vw,30px)',
          fontWeight: 800,
          letterSpacing: '-.035em',
          marginBottom: 18,
        }}
      >
        Оформление главной
      </h2>

      <HomeEditor
        articles={published}
        draft={{
          heroArticleId: home?.heroArticleId ?? null,
          heroMediaSrc: home?.heroMediaSrc ?? null,
          heroMediaKind: home?.heroMediaKind ?? null,
          bannerEnabled: home?.bannerEnabled ?? false,
          bannerHtml: home?.bannerHtml ?? '',
          bannerImg: home?.bannerImg ?? null,
          bannerLink: home?.bannerLink ?? '',
          learnPinOn: home?.learnPinOn ?? false,
          learnPinTitle: home?.learnPinTitle ?? '',
          learnPinDesc: home?.learnPinDesc ?? '',
          learnPinLink: home?.learnPinLink ?? '',
        }}
      />
    </div>
  )
}
