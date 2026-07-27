'use client'

import { useState } from 'react'
import { saveArticle } from '@/lib/actions/admin'
import type { ArticleBlock } from '@/lib/portal'

/**
 * Редактор статьи: шапка, обложка, блочный контент.
 * Блоки уезжают на сервер одним JSON-полем (см. saveArticle).
 */

type Cat = { id: string; name: string; bg: string; text: string }

export type ArticleDraft = {
  id: string | null
  title: string
  categoryId: string | null
  author: string
  authorAvatar: string | null
  excerpt: string
  coverSrc: string | null
  coverRatio: string | null
  sec: string
  status: string
  blocks: ArticleBlock[]
}

const SECS = [
  { key: 'feed', label: 'Лента' },
  { key: 'tools', label: 'Инструменты' },
  { key: 'learn', label: 'Обучение' },
] as const

const BLOCK_LABEL: Record<ArticleBlock['type'], string> = {
  text: 'Текст',
  quote: 'Цитата',
  image: 'Фото',
  video: 'Видео',
}

const field: React.CSSProperties = {
  background: '#F4F3EC',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: '12px 15px',
  fontSize: 14.5,
  width: '100%',
  fontFamily: 'inherit',
}

const label: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '.1em',
  color: 'var(--muted)',
  fontFamily: 'var(--font-mono), monospace',
  textTransform: 'uppercase',
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--line)',
  borderRadius: 18,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

export default function ArticleEditor({
  draft,
  categories,
}: {
  draft: ArticleDraft
  categories: Cat[]
}) {
  const [sec, setSec] = useState(draft.sec)
  const [blocks, setBlocks] = useState<ArticleBlock[]>(draft.blocks)
  const [cover, setCover] = useState(draft.coverSrc ?? '')
  const [ratio, setRatio] = useState(draft.coverRatio ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Не удалось загрузить файл')
      return data as { src: string; kind: string; ratio: string | null }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
      return null
    } finally {
      setBusy(false)
    }
  }

  async function onCover(file: File) {
    const up = await upload(file)
    if (!up) return
    setCover(up.src)
    setRatio(up.ratio ?? '')
  }

  function addBlock(type: ArticleBlock['type']) {
    const fresh: ArticleBlock =
      type === 'video'
        ? { type: 'video', url: '', caption: '' }
        : type === 'text'
          ? { type: 'text', content: '' }
          : { type, content: '', caption: '' }
    setBlocks((b) => [...b, fresh])
  }

  function patch(i: number, next: Partial<ArticleBlock>) {
    setBlocks((b) =>
      b.map((x, j) => (j === i ? ({ ...x, ...next } as ArticleBlock) : x)),
    )
  }

  function move(i: number, dir: -1 | 1) {
    setBlocks((b) => {
      const j = i + dir
      if (j < 0 || j >= b.length) return b
      const copy = [...b]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
  }

  return (
    <form action={saveArticle} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {draft.id ? <input type="hidden" name="id" value={draft.id} /> : null}
      <input type="hidden" name="sec" value={sec} />
      <input type="hidden" name="coverSrc" value={cover} />
      <input type="hidden" name="coverRatio" value={ratio} />
      <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
      <input
        type="hidden"
        name="authorAvatar"
        value={draft.authorAvatar ?? ''}
      />

      <section style={card}>
        <label style={label} htmlFor="title">
          Заголовок
        </label>
        <input
          id="title"
          name="title"
          defaultValue={draft.title}
          placeholder="О чём материал"
          required
          style={{ ...field, fontSize: 22, fontWeight: 700, letterSpacing: '-.03em' }}
        />

        <span style={label}>Раздел сайта</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SECS.map((s) => {
            const on = s.key === sec
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSec(s.key)}
                aria-pressed={on}
                style={{
                  border: on ? '1px solid var(--dark)' : '1px solid #C9C8BC',
                  background: on ? 'var(--dark)' : 'transparent',
                  color: on ? 'var(--dark-text)' : 'var(--dark)',
                  borderRadius: 'var(--r-pill)',
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: on ? 700 : 600,
                  cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 190, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={label} htmlFor="categoryId">
              Рубрика
            </label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={draft.categoryId ?? ''}
              style={field}
            >
              <option value="">— без рубрики —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 190, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={label} htmlFor="author">
              Автор
            </label>
            <input
              id="author"
              name="author"
              defaultValue={draft.author}
              placeholder="Имя Фамилия"
              style={field}
            />
          </div>
        </div>

        <label style={label} htmlFor="excerpt">
          Лид
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          defaultValue={draft.excerpt}
          rows={3}
          placeholder="Короткий анонс — он виден в ленте"
          style={{ ...field, resize: 'vertical', lineHeight: 1.5 }}
        />
      </section>

      <section style={card}>
        <span style={label}>Обложка</span>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            style={{ width: '100%', borderRadius: 14, aspectRatio: ratio || undefined, objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              height: 120,
              borderRadius: 14,
              border: '1.5px dashed #C9C8BC',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--muted)',
              fontSize: 13,
            }}
          >
            Обложка не загружена
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onCover(f)
            }}
            style={{ fontSize: 13 }}
          />
          {cover ? (
            <button
              type="button"
              onClick={() => {
                setCover('')
                setRatio('')
              }}
              style={{
                border: '1px solid var(--line)',
                background: 'transparent',
                borderRadius: 'var(--r-pill)',
                padding: '8px 16px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Убрать
            </button>
          ) : null}
        </div>
      </section>

      <section style={card}>
        <span style={label}>Содержимое</span>

        {blocks.map((b, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: '#FCFCF9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--muted)' }}>
                {BLOCK_LABEL[b.type].toUpperCase()}
              </span>
              <div style={{ flex: 1 }} />
              <button type="button" onClick={() => move(i, -1)} aria-label="Выше" style={iconBtn}>
                ↑
              </button>
              <button type="button" onClick={() => move(i, 1)} aria-label="Ниже" style={iconBtn}>
                ↓
              </button>
              <button
                type="button"
                onClick={() => setBlocks((x) => x.filter((_, j) => j !== i))}
                aria-label="Удалить блок"
                style={iconBtn}
              >
                ✕
              </button>
            </div>

            {b.type === 'text' || b.type === 'quote' ? (
              <textarea
                value={b.content}
                onChange={(e) => patch(i, { content: e.target.value })}
                rows={b.type === 'quote' ? 2 : 5}
                placeholder={b.type === 'quote' ? 'Цитата' : 'Текст абзаца'}
                style={{ ...field, resize: 'vertical', lineHeight: 1.6 }}
              />
            ) : null}

            {b.type === 'image' ? (
              <>
                {b.content ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.content} alt="" style={{ maxWidth: '100%', borderRadius: 10 }} />
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    const up = await upload(f)
                    if (up) patch(i, { content: up.src })
                  }}
                  style={{ fontSize: 13 }}
                />
              </>
            ) : null}

            {b.type === 'video' ? (
              <input
                value={b.url}
                onChange={(e) => patch(i, { url: e.target.value })}
                placeholder="Ссылка на видео (VK Видео, Rutube, YouTube)"
                style={field}
              />
            ) : null}

            {b.type !== 'text' ? (
              <input
                value={b.caption ?? ''}
                onChange={(e) => patch(i, { caption: e.target.value })}
                placeholder="Подпись (необязательно)"
                style={{ ...field, fontSize: 13 }}
              />
            ) : null}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(Object.keys(BLOCK_LABEL) as ArticleBlock['type'][]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addBlock(t)}
              style={{
                border: '1px solid #C9C8BC',
                background: 'transparent',
                borderRadius: 'var(--r-pill)',
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + {BLOCK_LABEL[t]}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <span style={{ color: '#C93A2B', fontSize: 13, fontWeight: 600 }}>{error}</span>
      ) : null}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={busy}
          style={{
            border: '1px solid var(--dark)',
            background: 'transparent',
            color: 'var(--dark)',
            borderRadius: 'var(--r-pill)',
            padding: '14px 26px',
            fontWeight: 700,
            fontSize: 14.5,
            cursor: 'pointer',
          }}
        >
          Сохранить черновик
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={busy}
          style={{
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--dark)',
            borderRadius: 'var(--r-pill)',
            padding: '14px 30px',
            fontWeight: 800,
            fontSize: 14.5,
            cursor: 'pointer',
          }}
        >
          Опубликовать
        </button>
        {busy ? <span style={{ alignSelf: 'center', color: 'var(--muted)' }}>Загрузка…</span> : null}
      </div>
    </form>
  )
}

const iconBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid var(--line)',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  color: 'var(--muted)',
}
