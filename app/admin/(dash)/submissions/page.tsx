import { prisma } from '@/lib/db'
import { approveSubmission, rejectSubmission } from '@/lib/actions/submissions'

export const dynamic = 'force-dynamic'

const TABS = [
  { key: 'pending', label: 'На проверке' },
  { key: 'approved', label: 'Опубликованные' },
  { key: 'rejected', label: 'Отклонённые' },
] as const

function when(d: Date) {
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>
}) {
  const { s } = await searchParams
  const status = TABS.some((t) => t.key === s) ? (s as string) : 'pending'

  const [items, counts] = await Promise.all([
    prisma.submission.findMany({ where: { status }, orderBy: { createdAt: 'desc' } }),
    prisma.submission.groupBy({ by: ['status'], _count: true }),
  ])

  const countOf = (k: string) => counts.find((c) => c.status === k)?._count ?? 0

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
          ОТ ЧИТАТЕЛЕЙ
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
          Предложенные
        </h1>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        {TABS.map((t) => {
          const on = t.key === status
          return (
            <a
              key={t.key}
              href={`/admin/submissions?s=${t.key}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
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
              {t.label}
              <span style={{ opacity: 0.6, fontSize: 12 }}>{countOf(t.key)}</span>
            </a>
          )
        })}
      </div>

      {items.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          {status === 'pending' ? 'Новых предложений нет.' : 'Пусто.'}
        </p>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map((sub) => {
          let images: string[] = []
          try {
            images = JSON.parse(sub.images)
          } catch {
            images = []
          }

          return (
            <article
              key={sub.id}
              style={{
                background: '#fff',
                border: '1px solid var(--line)',
                borderRadius: 18,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {sub.authorPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sub.authorPhoto}
                    alt=""
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#DDE3D4',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    {sub.authorName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{sub.authorName}</div>
                  <div className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {sub.authorEmail} · {when(sub.createdAt)}
                  </div>
                </div>
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '-.03em',
                  lineHeight: 1.15,
                }}
              >
                {sub.title}
              </h2>

              <p
                style={{
                  margin: 0,
                  fontSize: 15.5,
                  lineHeight: 1.65,
                  color: '#3A3B30',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {sub.text}
              </p>

              {images.length ? (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {images.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt=""
                      style={{
                        width: 130,
                        height: 90,
                        objectFit: 'cover',
                        borderRadius: 10,
                        border: '1px solid var(--line)',
                      }}
                    />
                  ))}
                </div>
              ) : null}

              {sub.note ? (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                  Заметка: {sub.note}
                </p>
              ) : null}

              {sub.status === 'pending' ? (
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    borderTop: '1px solid var(--line)',
                    paddingTop: 14,
                  }}
                >
                  <form action={approveSubmission} style={{ display: 'flex', gap: 10 }}>
                    <input type="hidden" name="id" value={sub.id} />
                    <button
                      type="submit"
                      name="intent"
                      value="publish"
                      style={{
                        border: 'none',
                        background: 'var(--accent)',
                        color: 'var(--dark)',
                        borderRadius: 'var(--r-pill)',
                        padding: '11px 22px',
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      Опубликовать
                    </button>
                    <button
                      type="submit"
                      name="intent"
                      value="draft"
                      style={{
                        border: '1px solid var(--dark)',
                        background: 'transparent',
                        color: 'var(--dark)',
                        borderRadius: 'var(--r-pill)',
                        padding: '11px 22px',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      В черновики
                    </button>
                  </form>

                  <form
                    action={rejectSubmission}
                    style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}
                  >
                    <input type="hidden" name="id" value={sub.id} />
                    <input
                      name="note"
                      placeholder="Причина отказа (для себя)"
                      style={{
                        flex: 1,
                        background: '#F4F3EC',
                        border: '1px solid var(--line)',
                        borderRadius: 12,
                        padding: '10px 14px',
                        fontSize: 13.5,
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        border: '1px solid var(--line)',
                        background: 'transparent',
                        color: 'var(--muted)',
                        borderRadius: 'var(--r-pill)',
                        padding: '10px 20px',
                        fontSize: 13.5,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Отклонить
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      <p style={{ marginTop: 20, fontSize: 13, color: 'var(--muted)', maxWidth: '72ch', lineHeight: 1.6 }}>
        «Опубликовать» сразу создаёт статью в ленте от имени автора. «В черновики» —
        то же самое, но материал не виден читателям, пока вы его не доработаете
        в разделе «Статьи».
      </p>
    </div>
  )
}
