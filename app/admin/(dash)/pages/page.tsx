import { prisma } from '@/lib/db'
import { savePage } from '@/lib/actions/admin'

export const dynamic = 'force-dynamic'

/** Страницы компании: заголовок + текст. Абзацы разделяются пустой строкой. */
export default async function PagesAdmin() {
  const pages = await prisma.page.findMany({ orderBy: { id: 'asc' } })

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 26 }}>
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
          ФУТЕР · О КОМПАНИИ
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
          Страницы
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pages.map((p) => (
          <details
            key={p.id}
            style={{
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: 18,
              padding: '16px 20px',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '-.02em',
                listStyle: 'revert',
              }}
            >
              {p.title}
            </summary>

            <form
              action={savePage}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}
            >
              <input type="hidden" name="id" value={p.id} />

              <label
                className="mono"
                style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--muted)' }}
                htmlFor={`t-${p.id}`}
              >
                НАЗВАНИЕ ПУНКТА
              </label>
              <input
                id={`t-${p.id}`}
                name="title"
                defaultValue={p.title}
                style={{
                  background: '#F4F3EC',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: '12px 15px',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              />

              <label
                className="mono"
                style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--muted)' }}
                htmlFor={`b-${p.id}`}
              >
                ТЕКСТ · АБЗАЦЫ ЧЕРЕЗ ПУСТУЮ СТРОКУ
              </label>
              <textarea
                id={`b-${p.id}`}
                name="body"
                defaultValue={p.body}
                rows={10}
                style={{
                  background: '#F4F3EC',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: '12px 15px',
                  fontSize: 14.5,
                  lineHeight: 1.6,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />

              <button
                type="submit"
                style={{
                  alignSelf: 'flex-start',
                  border: 'none',
                  background: 'var(--dark)',
                  color: 'var(--dark-text)',
                  borderRadius: 'var(--r-pill)',
                  padding: '12px 24px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Сохранить
              </button>
            </form>
          </details>
        ))}
      </div>
    </div>
  )
}
