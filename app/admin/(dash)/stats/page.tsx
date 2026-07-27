import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const PERIODS = [
  { key: '1', label: 'Сегодня' },
  { key: '7', label: '7 дней' },
  { key: '14', label: '14 дней' },
  { key: '30', label: '30 дней' },
] as const

const KIND_LABEL: Record<string, string> = {
  article_view: 'Просмотры статей',
  live_click: 'Клики «Смотреть эфир»',
  telemost_click: 'Переходы в Телемост',
  register: 'Новые почты',
  vote: 'Голоса в опросах',
}

function since(days: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (days - 1))
  return d
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>
}) {
  const { p } = await searchParams
  const days = PERIODS.some((x) => x.key === p) ? Number(p) : 7
  const from = since(days)
  const prevFrom = since(days * 2)

  const [events, prevEvents, subscribers, articles, broadcasts, topRaw] =
    await Promise.all([
      prisma.event.groupBy({
        by: ['kind'],
        where: { createdAt: { gte: from } },
        _count: true,
      }),
      prisma.event.groupBy({
        by: ['kind'],
        where: { createdAt: { gte: prevFrom, lt: from } },
        _count: true,
      }),
      prisma.subscriber.count(),
      prisma.article.count({ where: { status: 'published' } }),
      prisma.broadcast.count({ where: { status: { not: 'draft' } } }),
      prisma.event.groupBy({
        by: ['refId'],
        where: { kind: 'article_view', createdAt: { gte: from }, refId: { not: null } },
        _count: true,
        orderBy: { _count: { refId: 'desc' } },
        take: 5,
      }),
    ])

  const countOf = (rows: { kind: string; _count: number }[], kind: string) =>
    rows.find((r) => r.kind === kind)?._count ?? 0

  const topIds = topRaw.map((t) => t.refId).filter((x): x is string => x != null)
  const topArticles = topIds.length
    ? await prisma.article.findMany({
        where: { id: { in: topIds } },
        select: { id: true, title: true },
      })
    : []

  const totalEvents = events.reduce((n, e) => n + e._count, 0)

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
        <span
          className="mono"
          style={{
            alignSelf: 'flex-start',
            border: '1px solid var(--dark)',
            borderRadius: 'var(--r-pill)',
            padding: '6px 14px',
            fontSize: 11,
            letterSpacing: '.1em',
          }}
        >
          СЧЁТЧИКИ ПОРТАЛА
        </span>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(30px,4vw,46px)',
            fontWeight: 800,
            letterSpacing: '-.04em',
            lineHeight: 0.95,
          }}
        >
          Статистика
        </h1>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        {PERIODS.map((x) => {
          const on = Number(x.key) === days
          return (
            <a
              key={x.key}
              href={`/admin/stats?p=${x.key}`}
              style={{
                background: on ? 'var(--dark)' : 'transparent',
                color: on ? 'var(--dark-text)' : 'var(--dark)',
                border: on ? '1px solid var(--dark)' : '1px solid #C9C8BC',
                borderRadius: 'var(--r-pill)',
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: on ? 700 : 600,
                textDecoration: 'none',
              }}
            >
              {x.label}
            </a>
          )
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        <Tile label="Почт в базе" value={subscribers} note="всего за всё время" />
        <Tile label="Опубликовано статей" value={articles} note="всего" />
        <Tile label="Трансляций" value={broadcasts} note="кроме черновиков" />
        {Object.entries(KIND_LABEL).map(([kind, title]) => {
          const now = countOf(events, kind)
          const before = countOf(prevEvents, kind)
          const delta = now - before
          return (
            <Tile
              key={kind}
              label={title}
              value={now}
              note={
                before === 0 && now === 0
                  ? 'нет данных'
                  : `${delta >= 0 ? '+' : ''}${delta} к прошлому периоду`
              }
            />
          )
        })}
      </div>

      {topArticles.length ? (
        <section
          style={{
            background: '#fff',
            border: '1px solid var(--line)',
            borderRadius: 18,
            padding: 20,
          }}
        >
          <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 800 }}>
            Топ материалов
          </h2>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topRaw.map((t) => {
              const a = topArticles.find((x) => x.id === t.refId)
              if (!a) return null
              return (
                <li key={t.refId} style={{ fontSize: 14.5 }}>
                  {a.title}
                  <span style={{ color: 'var(--muted)' }}> — {t._count}</span>
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      {totalEvents === 0 ? (
        <p
          style={{
            marginTop: 18,
            fontSize: 13.5,
            color: 'var(--muted)',
            maxWidth: '72ch',
            lineHeight: 1.6,
          }}
        >
          Событий за период пока нет — счётчики начнут заполняться, когда на портал
          пойдут живые посетители. Числа здесь настоящие: ничего не симулируем.
          Для полноценной веб-аналитики (источники трафика, устройства, глубина
          просмотра) на портал стоит поставить Яндекс Метрику.
        </p>
      ) : null}
    </div>
  )
}

function Tile({
  label,
  value,
  note,
}: {
  label: string
  value: number
  note: string
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--line)',
        borderRadius: 18,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span
        className="mono"
        style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--muted)' }}
      >
        {label.toUpperCase()}
      </span>
      <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.04em' }}>
        {value}
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{note}</span>
    </div>
  )
}
