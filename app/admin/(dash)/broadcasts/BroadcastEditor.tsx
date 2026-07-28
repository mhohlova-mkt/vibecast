'use client'

import { useState } from 'react'
import { saveBroadcast } from '@/lib/actions/admin'

/** Карточка трансляции: расписание, спикер, Телемост, интерактив. */

export type BroadcastDraft = {
  id: string | null
  title: string
  speaker: string
  role: string
  speakerAvatar: string | null
  date: string
  time: string
  status: string
  link: string
  embedUrl: string | null
  posterSrc: string | null
  embed: boolean
  chat: boolean
  pollQuestion: string
  pollOptions: string[]
  recordingUrl: string | null
  tags: string
  desc: string
}

const STATUSES = [
  { key: 'draft', label: 'Черновик', hint: 'не видна на сайте' },
  { key: 'scheduled', label: 'Запланирована', hint: 'анонс на портале' },
  { key: 'live', label: 'В эфире', hint: 'показывается на главной' },
  { key: 'recorded', label: 'Запись', hint: 'в архиве вебинаров' },
] as const

const TELEMOST = /^https:\/\/telemost\.yandex\.ru\//

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--line)',
  borderRadius: 18,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
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

export default function BroadcastEditor({ draft }: { draft: BroadcastDraft }) {
  const [status, setStatus] = useState(draft.status || 'draft')
  const [link, setLink] = useState(draft.link)
  const [embedUrl, setEmbedUrl] = useState(draft.embedUrl ?? '')
  const [poster, setPoster] = useState(draft.posterSrc ?? '')
  const [chat, setChat] = useState(draft.chat)
  const [avatar, setAvatar] = useState(draft.speakerAvatar ?? '')
  const [pollOn, setPollOn] = useState(draft.pollOptions.length >= 2)
  const [options, setOptions] = useState<string[]>(
    draft.pollOptions.length >= 2 ? draft.pollOptions : ['', ''],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const linkOk = TELEMOST.test(link.trim())
  const linkFilled = link.trim().length > 0

  async function upload(file: File, apply: (src: string) => void) {
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Не удалось загрузить файл')
      apply(data.src as string)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form action={saveBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {draft.id ? <input type="hidden" name="id" value={draft.id} /> : null}
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="speakerAvatar" value={avatar} />
      <input type="hidden" name="posterSrc" value={poster} />
      <input type="hidden" name="chat" value={chat ? 'true' : ''} />

      {/* ─── О чём эфир ─── */}
      <section style={card}>
        <label style={label} htmlFor="title">
          Название
        </label>
        <input
          id="title"
          name="title"
          defaultValue={draft.title}
          placeholder="Тема вебинара"
          required
          style={{ ...field, fontSize: 20, fontWeight: 700, letterSpacing: '-.02em' }}
        />

        <span style={label}>Статус</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUSES.map((s) => {
            const on = s.key === status
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStatus(s.key)}
                title={s.hint}
                style={{
                  border: on ? '1.5px solid var(--dark)' : '1.5px solid #D8D7CB',
                  background: on ? 'var(--dark)' : '#FCFCF9',
                  color: on ? 'var(--dark-text)' : 'var(--dark)',
                  borderRadius: 'var(--r-pill)',
                  padding: '9px 18px',
                  fontSize: 13.5,
                  fontWeight: on ? 700 : 600,
                  cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          {STATUSES.find((s) => s.key === status)?.hint}
        </span>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={label} htmlFor="date">
              Дата
            </label>
            <input id="date" name="date" type="date" defaultValue={draft.date} style={field} />
          </div>
          <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={label} htmlFor="time">
              Время
            </label>
            <input id="time" name="time" type="time" defaultValue={draft.time} style={field} />
          </div>
        </div>

        <label style={label} htmlFor="desc">
          Описание
        </label>
        <textarea
          id="desc"
          name="desc"
          defaultValue={draft.desc}
          rows={4}
          placeholder="О чём поговорим и кому будет полезно"
          style={{ ...field, resize: 'vertical', lineHeight: 1.55 }}
        />

        <label style={label} htmlFor="tags">
          Теги
        </label>
        <input
          id="tags"
          name="tags"
          defaultValue={draft.tags}
          placeholder="через пробел: saas деплой next"
          style={field}
        />
      </section>

      {/* ─── Спикер ─── */}
      <section style={card}>
        <span style={label}>Спикер</span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              border: '1px solid var(--line)',
              background: '#F4F3EC',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                ФОТО
              </span>
            )}
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 240,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <input
              name="speaker"
              defaultValue={draft.speaker}
              placeholder="Имя и фамилия"
              style={field}
            />
            <input
              name="role"
              defaultValue={draft.role}
              placeholder="Должность и компания"
              style={field}
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept="image/*"
                style={{ fontSize: 13 }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void upload(f, setAvatar)
                }}
              />
              {avatar ? (
                <button
                  type="button"
                  onClick={() => setAvatar('')}
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
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              Без фото покажем инициалы на цветном круге.
            </span>
          </div>
        </div>
      </section>

      {/* ─── Телемост ─── */}
      <section style={card}>
        <span style={label}>Яндекс Телемост</span>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 }}>
          Создайте встречу в Телемосте и вставьте сюда ссылку. По ней зрители
          попадут на эфир с кнопки «Смотреть».
        </p>

        <input
          name="link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://telemost.yandex.ru/j/..."
          style={{
            ...field,
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 13.5,
            borderColor: linkFilled && !linkOk ? '#C93A2B' : 'var(--line)',
          }}
        />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {linkFilled ? (
            <span
              className="mono"
              style={{
                background: linkOk ? '#DFEBCB' : '#F6DAD5',
                color: linkOk ? '#3D4A28' : '#8A2B1E',
                borderRadius: 'var(--r-pill)',
                padding: '7px 14px',
                fontSize: 10.5,
                fontWeight: 600,
              }}
            >
              {linkOk ? 'ССЫЛКА КОРРЕКТНА' : 'НЕ ПОХОЖЕ НА ТЕЛЕМОСТ'}
            </span>
          ) : null}

          {linkOk ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-pill)',
                padding: '7px 15px',
                fontSize: 13,
                color: 'var(--dark)',
                textDecoration: 'none',
              }}
            >
              Проверить ↗
            </a>
          ) : null}
        </div>

        <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          Телемост нельзя показать внутри сайта — он это запрещает. Зрители
          уйдут на него по кнопке. Чтобы эфир шёл прямо на странице, добавьте
          ниже трансляцию с площадки, которая встраивание разрешает.
        </span>
      </section>

      {/* ─── Плеер на сайте ─── */}
      <section style={card}>
        <span style={label}>Эфир прямо на сайте</span>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 }}>
          Вставьте ссылку на видео или трансляцию с VK Видео либо Rutube —
          подойдёт и обычный адрес страницы, и «код для вставки». Адрес плеера
          я соберу сам, чтобы в окно не залез интерфейс площадки.
        </p>
        <textarea
          name="embedUrl"
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          rows={3}
          placeholder={'https://vkvideo.ru/video-227249474_456239018'}
          style={{
            ...field,
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 12.5,
            resize: 'vertical',
          }}
        />

        {status === 'recorded' ? (
          <>
            <label style={label} htmlFor="recordingUrl">
              Ссылка на запись
            </label>
            <input
              id="recordingUrl"
              name="recordingUrl"
              defaultValue={draft.recordingUrl ?? ''}
              placeholder="VK Видео, Rutube, YouTube или файл"
              style={field}
            />
          </>
        ) : (
          <input type="hidden" name="recordingUrl" value={draft.recordingUrl ?? ''} />
        )}
      </section>

      {/* ─── Интерактив ─── */}
      <section style={card}>
        <span style={label}>Интерактив</span>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={chat}
            onChange={(e) => setChat(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#15160F' }}
          />
          <span style={{ fontSize: 14 }}>Чат во время эфира</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={pollOn}
            onChange={(e) => setPollOn(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#15160F' }}
          />
          <span style={{ fontSize: 14 }}>Опрос для зрителей</span>
        </label>

        {pollOn ? (
          <>
            <input
              name="pollQuestion"
              defaultValue={draft.pollQuestion}
              placeholder="Вопрос"
              style={field}
            />
            {options.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  name="pollOption"
                  value={o}
                  onChange={(e) =>
                    setOptions((x) => x.map((v, j) => (j === i ? e.target.value : v)))
                  }
                  placeholder={`Вариант ${i + 1}`}
                  style={field}
                />
                {options.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => setOptions((x) => x.filter((_, j) => j !== i))}
                    aria-label="Убрать вариант"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      border: '1px solid var(--line)',
                      background: 'transparent',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            ))}
            {options.length < 6 ? (
              <button
                type="button"
                onClick={() => setOptions((x) => [...x, ''])}
                style={{
                  alignSelf: 'flex-start',
                  border: '1px solid #C9C8BC',
                  background: 'transparent',
                  borderRadius: 'var(--r-pill)',
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Вариант
              </button>
            ) : null}
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              От двух до шести вариантов. Пустые не сохраняются.
            </span>
          </>
        ) : (
          <input type="hidden" name="pollQuestion" value="" />
        )}
      </section>

      {error ? (
        <span style={{ color: '#C93A2B', fontSize: 13, fontWeight: 600 }}>{error}</span>
      ) : null}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="submit"
          disabled={busy || (linkFilled && !linkOk)}
          style={{
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--dark)',
            borderRadius: 'var(--r-pill)',
            padding: '14px 30px',
            fontWeight: 800,
            fontSize: 14.5,
            cursor: 'pointer',
            opacity: linkFilled && !linkOk ? 0.5 : 1,
          }}
        >
          Сохранить
        </button>
        {linkFilled && !linkOk ? (
          <span style={{ fontSize: 13, color: '#C93A2B' }}>
            Исправьте ссылку — она должна начинаться с https://telemost.yandex.ru/
          </span>
        ) : null}
      </div>
    </form>
  )
}
