'use client'

import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { sendChatMessage, hideChatMessage, type LiveState } from '@/lib/actions/live'
import styles from './LiveChat.module.css'

/** Чат эфира. Писать может тот, кто оставил почту; имя спрашиваем один раз. */

type Message = {
  id: string
  author: string
  text: string
  mine: boolean
  at: string
}

const POLL_MS = 4000
const MAX_TEXT = 300

/**
 * Набор для чата вебинара: живые реакции и рабочая лексика айтишников.
 * Держим коротким намеренно — в длинной сетке никто не ищет, а панель
 * начинает занимать пол-экрана на телефоне.
 */
const EMOJI: { title: string; items: string[] }[] = [
  {
    title: 'Реакции',
    items: [
      '👍', '👎', '🔥', '❤️', '😂', '🙂', '😮', '🤯',
      '🤔', '😢', '🙏', '👏', '🎉', '💯', '👀', '🤝',
    ],
  },
  {
    title: 'Про работу',
    items: [
      '💻', '⌨️', '🐛', '🚀', '⚙️', '🔧', '📦', '🤖',
      '🧠', '☁️', '🔒', '📈', '⏱', '✅', '❌', '🧩',
    ],
  },
]

export default function LiveChat({
  broadcastId,
  viewerName,
  canWrite,
}: {
  broadcastId: string
  viewerName: string
  canWrite: boolean
}) {
  const [state, action, pending] = useActionState<LiveState, FormData>(
    sendChatMessage,
    undefined,
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [canModerate, setCanModerate] = useState(false)
  const [name, setName] = useState(viewerName)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/chat?broadcastId=${broadcastId}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages ?? [])
      setCanModerate(Boolean(data.canModerate))
    } catch {
      /* сеть моргнула — попробуем на следующем круге */
    }
  }, [broadcastId])

  useEffect(() => {
    void load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [load])

  // Держим ленту прокрученной вниз, но не мешаем читать историю.
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages])

  /** Вставляем в место, где стоит курсор, а не в конец строки. */
  function insertEmoji(symbol: string) {
    const el = inputRef.current
    if (!el) {
      setText((t) => (t + symbol).slice(0, MAX_TEXT))
      return
    }
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    const next = (text.slice(0, start) + symbol + text.slice(end)).slice(0, MAX_TEXT)
    setText(next)
    // Курсор должен оказаться после вставленного символа.
    requestAnimationFrame(() => {
      el.focus()
      const pos = Math.min(start + symbol.length, next.length)
      el.setSelectionRange(pos, pos)
    })
  }

  const needName = !name.trim()

  return (
    <section className={styles.chat}>
      <div className={styles.head}>
        <span className={`mono ${styles.kicker}`}>Чат эфира</span>
        <span className={styles.count}>{messages.length}</span>
      </div>

      <div className={styles.list} ref={listRef}>
        {messages.length === 0 ? (
          <p className={styles.empty}>Пока тихо. Напишите первым.</p>
        ) : null}

        {messages.map((m) => (
          <div key={m.id} className={m.mine ? styles.msgMine : styles.msg}>
            <div className={styles.msgHead}>
              <span className={styles.author}>{m.author}</span>
              <span className={styles.time}>
                {new Date(m.at).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {canModerate ? (
                <form action={hideChatMessage} className={styles.hideForm}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" title="Скрыть сообщение">
                    ✕
                  </button>
                </form>
              ) : null}
            </div>
            <p className={styles.text}>{m.text}</p>
          </div>
        ))}
      </div>

      {canWrite ? (
        <form
          ref={formRef}
          action={async (fd) => {
            await action(fd)
            setText('')
            setEmojiOpen(false)
            void load()
          }}
          className={styles.form}
        >
          <input type="hidden" name="broadcastId" value={broadcastId} />

          {needName ? (
            <input
              name="authorName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как вас подписать"
              maxLength={40}
              required
              className={styles.name}
            />
          ) : (
            <input type="hidden" name="authorName" value={name} />
          )}

          {emojiOpen ? (
            <div className={styles.emojiPanel}>
              {EMOJI.map((group) => (
                <div key={group.title} className={styles.emojiGroup}>
                  <span className={`mono ${styles.emojiTitle}`}>{group.title}</span>
                  <div className={styles.emojiGrid}>
                    {group.items.map((symbol) => (
                      <button
                        key={symbol}
                        type="button"
                        className={styles.emoji}
                        onClick={() => insertEmoji(symbol)}
                        aria-label={`Вставить ${symbol}`}
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className={styles.row}>
            <button
              type="button"
              className={emojiOpen ? styles.emojiToggleOn : styles.emojiToggle}
              onClick={() => setEmojiOpen((v) => !v)}
              aria-label="Эмодзи"
              aria-expanded={emojiOpen}
            >
              🙂
            </button>
            <input
              ref={inputRef}
              name="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Сообщение"
              maxLength={MAX_TEXT}
              className={styles.input}
            />
            <button
              type="submit"
              className={styles.send}
              disabled={pending || !text.trim()}
            >
              →
            </button>
          </div>

          {state?.error ? <span className={styles.error}>{state.error}</span> : null}
        </form>
      ) : (
        <p className={styles.locked}>
          Оставьте почту выше — и сможете писать в чат.
        </p>
      )}
    </section>
  )
}
