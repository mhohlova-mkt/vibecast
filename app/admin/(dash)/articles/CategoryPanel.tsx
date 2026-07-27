'use client'

import { useState } from 'react'
import { saveCategory, deleteCategory } from '@/lib/actions/admin'

/** Палитра рубрик из прототипа. */
const PALETTE = [
  { bg: 'accent', text: '#15160F', label: 'лайм' },
  { bg: '#DBD0F2', text: '#15160F', label: 'сирень' },
  { bg: '#EFD2BE', text: '#15160F', label: 'персик' },
  { bg: '#CFD6C6', text: '#15160F', label: 'шалфей' },
  { bg: '#15160F', text: '#F4F3EC', label: 'чёрный' },
] as const

type Cat = { id: string; name: string; bg: string; text: string }

function bgOf(bg: string) {
  return bg === 'accent' ? 'var(--accent)' : bg
}

export default function CategoryPanel({ categories }: { categories: Cat[] }) {
  const [open, setOpen] = useState(false)
  const [bg, setBg] = useState<string>('accent')

  const picked = PALETTE.find((p) => p.bg === bg) ?? PALETTE[0]

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid var(--line)',
        borderRadius: 18,
        padding: '14px 18px',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--dark)',
        }}
      >
        Рубрики
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {categories.length}
        </span>
        <span style={{ color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {categories.map((c) => (
              <span
                key={c.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: bgOf(c.bg),
                  color: c.text,
                  borderRadius: 'var(--r-pill)',
                  padding: '6px 8px 6px 14px',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono), monospace',
                }}
              >
                {c.name}
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    title="Удалить рубрику (только если пустая)"
                    aria-label={`Удалить рубрику ${c.name}`}
                    style={{
                      border: 'none',
                      background: 'rgba(0,0,0,.14)',
                      color: 'inherit',
                      borderRadius: '50%',
                      width: 18,
                      height: 18,
                      cursor: 'pointer',
                      lineHeight: 1,
                      fontSize: 11,
                    }}
                  >
                    ✕
                  </button>
                </form>
              </span>
            ))}
          </div>

          <form
            action={saveCategory}
            style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center' }}
          >
            <input
              name="name"
              placeholder="НОВАЯ РУБРИКА"
              required
              style={{
                flex: 1,
                minWidth: 180,
                background: '#F4F3EC',
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: '11px 14px',
                fontSize: 13,
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono), monospace',
              }}
            />
            <input type="hidden" name="bg" value={picked.bg} />
            <input type="hidden" name="text" value={picked.text} />

            <div style={{ display: 'flex', gap: 6 }}>
              {PALETTE.map((p) => (
                <button
                  key={p.bg}
                  type="button"
                  onClick={() => setBg(p.bg)}
                  title={p.label}
                  aria-label={`Цвет: ${p.label}`}
                  aria-pressed={bg === p.bg}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: bgOf(p.bg),
                    border:
                      bg === p.bg ? '2px solid var(--dark)' : '1px solid var(--line)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              style={{
                border: 'none',
                background: 'var(--dark)',
                color: 'var(--dark-text)',
                borderRadius: 12,
                padding: '11px 20px',
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              Добавить
            </button>
          </form>

          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Удалить можно только рубрику, в которой нет материалов.
          </span>
        </div>
      ) : null}
    </section>
  )
}
