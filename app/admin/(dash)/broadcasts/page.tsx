import Link from 'next/link'
import { prisma } from '@/lib/db'
import { deleteBroadcast, pinBroadcast } from '@/lib/actions/admin'
import Avatar from '@/components/portal/Avatar'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, { label: string; bg: string; color: string; pulse?: boolean }> =
  {
    live: { label: 'В эфире', bg: 'var(--live)', color: '#fff', pulse: true },
    scheduled: { label: 'Запланирована', bg: '#DFEBCB', color: '#3D4A28' },
    recorded: { label: 'Запись', bg: 'var(--dark)', color: 'var(--dark-text)' },
    draft: { label: 'Черновик', bg: '#E4E3DA', color: 'var(--muted)' },
  }

function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.draft
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: s.bg,
        color: s.color,
        borderRadius: 'var(--r-pill)',
        padding: '9px 16px',
        fontSize: 10,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'currentColor',
          animation: s.pulse ? 'vc-pulse 1.4s ease-in-out infinite' : undefined,
        }}
      />
      {s.label}
    </span>
  )
}

function fmtDate(date: string, time: string) {
  if (!date) return ''
  const months = [
    'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
  ]
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return `${date} ${time}`.trim()
  return `${d} ${months[m - 1]}, ${time}`
}

export default async function BroadcastsPage() {
  const [items, home] = await Promise.all([
    prisma.broadcast.findMany({ orderBy: [{ sortIndex: 'asc' }, { createdAt: 'desc' }] }),
    prisma.home.findUnique({ where: { id: 'home' } }),
  ])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          marginBottom: 28,
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              display: 'inline-block',
              border: '1px solid var(--dark)',
              borderRadius: 'var(--r-pill)',
              padding: '7px 16px',
              marginBottom: 16,
            }}
          >
            эфиры · яндекс телемост
          </div>
          <h1 style={{ fontSize: 52 }}>Трансляции</h1>
        </div>
        <Link
          href="/admin/broadcasts/new"
          style={{
            background: 'var(--dark)',
            color: 'var(--dark-text)',
            borderRadius: 'var(--r-pill)',
            padding: '15px 26px',
            fontWeight: 700,
            fontSize: 15,
            whiteSpace: 'nowrap',
          }}
        >
          + Новая трансляция
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-card)',
          padding: '18px 22px',
          marginBottom: 22,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'var(--accent)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            fontWeight: 700,
          }}
        >
          i
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--dark)' }}>
          Создайте встречу в{' '}
          <a
            href="https://telemost.yandex.ru/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: 700, textDecoration: 'underline' }}
          >
            Яндекс Телемосте
          </a>
          , скопируйте ссылку вида{' '}
          <code
            style={{
              fontFamily: 'var(--font-mono), monospace',
              background: 'var(--field)',
              borderRadius: 6,
              padding: '2px 7px',
              fontSize: 13,
            }}
          >
            telemost.yandex.ru/j/…
          </code>{' '}
          и вставьте её в карточку трансляции. Кнопка «Смотреть» на портале поведёт
          зрителей по этой ссылке.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((b) => {
          const pinned = home?.homePromoId === b.id
          return (
            <div
              key={b.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-card)',
                padding: '20px 24px',
              }}
            >
              <StatusPill status={b.status} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    marginBottom: 8,
                  }}
                >
                  {b.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Avatar name={b.speaker} src={b.speakerAvatar} size={24} />
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>
                    {b.speaker}
                    {b.date ? ` · ${fmtDate(b.date, b.time)}` : ''}
                  </span>
                </div>
              </div>

              <form action={pinBroadcast}>
                <input type="hidden" name="id" value={b.id} />
                <button
                  title={pinned ? 'Снять с главной' : 'Закрепить на главной'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 'var(--r-pill)',
                      background: pinned ? 'var(--accent-alt)' : '#E4E3DA',
                      position: 'relative',
                      transition: 'background .18s',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: pinned ? 23 : 3,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'var(--dark)',
                        transition: 'left .18s',
                      }}
                    />
                  </span>
                  <span
                    className="mono"
                    style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}
                  >
                    на главной
                  </span>
                </button>
              </form>

              {b.link ? (
                <a
                  href={b.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono"
                  style={{
                    background: 'var(--accent-alt)',
                    borderRadius: 'var(--r-pill)',
                    padding: '11px 18px',
                    fontSize: 10,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  телемост ↗
                </a>
              ) : (
                <span
                  className="mono"
                  style={{
                    border: '1px dashed var(--border)',
                    color: 'var(--muted-2)',
                    borderRadius: 'var(--r-pill)',
                    padding: '11px 18px',
                    fontSize: 10,
                    whiteSpace: 'nowrap',
                  }}
                >
                  нет ссылки
                </span>
              )}

              <Link
                href={`/admin/broadcasts/${b.id}`}
                style={{
                  border: '1.5px solid var(--dark)',
                  borderRadius: 'var(--r-pill)',
                  padding: '12px 24px',
                  fontWeight: 600,
                  fontSize: 15,
                  whiteSpace: 'nowrap',
                }}
              >
                Изменить
              </Link>

              <form action={deleteBroadcast}>
                <input type="hidden" name="id" value={b.id} />
                <button
                  title="Удалить"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    border: '1px solid var(--border)',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    fontSize: 15,
                  }}
                >
                  🗑
                </button>
              </form>
            </div>
          )
        })}

        {items.length === 0 && (
          <p style={{ color: 'var(--muted)' }}>
            Трансляций пока нет — создайте первую.
          </p>
        )}
      </div>
    </div>
  )
}
