import Link from 'next/link'
import { prisma } from '@/lib/db'
import { deleteArticle } from '@/lib/actions/admin'
import CategoryPanel from './CategoryPanel'

export const dynamic = 'force-dynamic'

const SECTIONS = [
  { key: '', label: 'Все' },
  { key: 'feed', label: 'Лента' },
  { key: 'tools', label: 'Инструменты' },
  { key: 'learn', label: 'Обучение' },
] as const

type Search = { params?: Promise<{ sec?: string }>; searchParams: Promise<{ sec?: string }> }

function catBg(bg: string) {
  return bg === 'accent' ? 'var(--accent)' : bg
}

export default async function ArticlesPage({ searchParams }: Search) {
  const { sec } = await searchParams
  const active = SECTIONS.some((s) => s.key === sec) ? (sec ?? '') : ''

  const [items, categories, counts] = await Promise.all([
    prisma.article.findMany({
      where: active ? { sec: active } : {},
      include: { category: true },
      orderBy: [{ sortIndex: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.article.groupBy({ by: ['sec'], _count: true }),
  ])

  const countOf = (key: string) =>
    key
      ? (counts.find((c) => c.sec === key)?._count ?? 0)
      : counts.reduce((n, c) => n + c._count, 0)

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
          marginBottom: 26,
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
            МАТЕРИАЛЫ
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
            Статьи
          </h1>
        </div>

        <Link
          href="/admin/articles/new"
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
          + Новая статья
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        {SECTIONS.map((s) => {
          const on = s.key === active
          return (
            <Link
              key={s.key || 'all'}
              href={s.key ? `/admin/articles?sec=${s.key}` : '/admin/articles'}
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
              {s.label}
              <span style={{ opacity: 0.6, fontSize: 12 }}>{countOf(s.key)}</span>
            </Link>
          )
        })}
      </div>

      <CategoryPanel categories={categories} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 22 }}>
        {items.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>
            Здесь пока пусто. Нажмите «Новая статья».
          </p>
        ) : null}

        {items.map((a) => (
          <article
            key={a.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: 18,
              padding: '16px 18px',
              flexWrap: 'wrap',
            }}
          >
            <span
              className="mono"
              style={{
                background: a.status === 'published' ? '#DFEBCB' : '#E4E3DA',
                color: a.status === 'published' ? '#3D4A28' : 'var(--muted)',
                borderRadius: 'var(--r-pill)',
                padding: '8px 14px',
                fontSize: 10,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {a.status === 'published' ? 'ОПУБЛИКОВАНА' : 'ЧЕРНОВИК'}
            </span>

            <div style={{ flex: 1, minWidth: 220 }}>
              <h3
                style={{
                  margin: '0 0 4px',
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: '-.02em',
                }}
              >
                {a.title}
              </h3>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {a.author || 'Без автора'}
              </span>
            </div>

            {a.category ? (
              <span
                className="mono"
                style={{
                  background: catBg(a.category.bg),
                  color: a.category.text,
                  borderRadius: 'var(--r-pill)',
                  padding: '6px 12px',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                {a.category.name}
              </span>
            ) : null}

            <Link
              href={`/admin/articles/${a.id}`}
              style={{
                border: '1px solid var(--dark)',
                borderRadius: 'var(--r-pill)',
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--dark)',
                textDecoration: 'none',
              }}
            >
              Изменить
            </Link>

            <form action={deleteArticle}>
              <input type="hidden" name="id" value={a.id} />
              <button
                type="submit"
                title="Удалить"
                aria-label={`Удалить «${a.title}»`}
                style={{
                  width: 40,
                  height: 40,
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
          </article>
        ))}
      </div>
    </div>
  )
}
