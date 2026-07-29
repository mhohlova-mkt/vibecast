import { prisma } from '@/lib/db'
import { removeSubscriber, toggleDigest } from '@/lib/actions/subscribers'

export const dynamic = 'force-dynamic'

const PER_PAGE = 100

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; p?: string }>
}) {
  const { q, p } = await searchParams
  const query = (q ?? '').trim()
  const page = Math.max(1, Number(p) || 1)

  const where = query
    ? { OR: [{ email: { contains: query } }, { name: { contains: query } }] }
    : {}

  const [rows, total, digestCount] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.subscriber.count({ where }),
    prisma.subscriber.count({ where: { digest: true } }),
  ])

  const pages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
          marginBottom: 22,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
            ПОЧТЫ ЧИТАТЕЛЕЙ
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
            Подписчики
          </h1>
        </div>

        <a
          href="/admin/subscribers/export"
          style={{
            background: 'var(--dark)',
            color: 'var(--dark-text)',
            borderRadius: 'var(--r-pill)',
            padding: '14px 24px',
            fontWeight: 700,
            fontSize: 15,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Выгрузить файлом
        </a>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { label: 'Всего адресов', value: total },
          { label: 'Согласны на дайджест', value: digestCount },
        ].map((t) => (
          <div
            key={t.label}
            style={{
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: 18,
              padding: 18,
              minWidth: 200,
            }}
          >
            <div
              className="mono"
              style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--muted)' }}
            >
              {t.label.toUpperCase()}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.04em' }}>
              {t.value}
            </div>
          </div>
        ))}
      </div>

      <form
        method="get"
        style={{ display: 'flex', gap: 9, marginBottom: 18, maxWidth: 520 }}
      >
        <input
          name="q"
          defaultValue={query}
          placeholder="Поиск по почте или имени"
          style={{
            flex: 1,
            background: '#F4F3EC',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '12px 15px',
            fontSize: 14.5,
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          style={{
            border: '1px solid var(--dark)',
            background: 'transparent',
            borderRadius: 'var(--r-pill)',
            padding: '11px 22px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Найти
        </button>
      </form>

      {rows.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          {query ? 'Ничего не нашлось.' : 'Пока никто не оставил почту.'}
        </p>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((s) => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: 16,
              padding: '13px 18px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 220 }}>
              <div
                className="mono"
                style={{ fontSize: 14, fontWeight: 600, wordBreak: 'break-all' }}
              >
                {s.email}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {s.name || '—'} · {s.createdAt.toLocaleDateString('ru-RU')}
              </div>
            </div>

            <form action={toggleDigest}>
              <input type="hidden" name="id" value={s.id} />
              <button
                type="submit"
                className="mono"
                title="Переключить согласие на дайджест"
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 'var(--r-pill)',
                  padding: '7px 14px',
                  fontSize: 10,
                  fontWeight: 600,
                  background: s.digest ? '#DFEBCB' : '#E4E3DA',
                  color: s.digest ? '#3D4A28' : 'var(--muted)',
                }}
              >
                {s.digest ? 'ДАЙДЖЕСТ ДА' : 'ДАЙДЖЕСТ НЕТ'}
              </button>
            </form>

            <form action={removeSubscriber}>
              <input type="hidden" name="id" value={s.id} />
              <button
                type="submit"
                aria-label={`Удалить ${s.email}`}
                title="Удалить из базы"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '1px solid var(--line)',
                  background: 'transparent',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </form>
          </div>
        ))}
      </div>

      {pages > 1 ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <a
              key={n}
              href={`/admin/subscribers?p=${n}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
              style={{
                border: n === page ? '1px solid var(--dark)' : '1px solid #C9C8BC',
                background: n === page ? 'var(--dark)' : 'transparent',
                color: n === page ? 'var(--dark-text)' : 'var(--dark)',
                borderRadius: 'var(--r-pill)',
                padding: '7px 14px',
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              {n}
            </a>
          ))}
        </div>
      ) : null}

      <p
        style={{
          marginTop: 20,
          fontSize: 13,
          color: 'var(--muted)',
          maxWidth: '72ch',
          lineHeight: 1.6,
        }}
      >
        Файл выгрузки открывается в Excel и загружается в сервис рассылок.
        Адреса не подтверждались письмом, поэтому часть может быть выдуманной —
        сервис рассылок отсеет их сам при первой отправке. Кнопка удаления
        нужна, когда человек просит убрать свои данные: это его право,
        и отказать нельзя.
      </p>
    </div>
  )
}
