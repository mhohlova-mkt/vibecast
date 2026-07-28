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

          <div className={styles.row}>
            <input
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
