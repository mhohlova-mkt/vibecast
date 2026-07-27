'use client'

import { useActionState } from 'react'
import { registerViewer, type ViewerFormState } from '@/lib/actions/viewer'
import styles from './EmailGate.module.css'

/**
 * Доступ к материалам в обмен на почту. Ни аккаунтов, ни паролей:
 * зритель оставляет e-mail, подписывается на рассылку и сразу
 * получает доступ к эфиру и архиву записей.
 *
 * `tone="dark"` — на тёмной секции «сейчас эфира нет»,
 * `tone="overlay"` — поверх плеера.
 */

type EmailGateProps = {
  tone?: 'dark' | 'overlay'
  submitLabel?: string
  title?: string
  note?: string
}

export default function EmailGate({
  tone = 'dark',
  submitLabel = 'Смотреть эфир',
  title,
  note,
}: EmailGateProps) {
  const [state, action, pending] = useActionState<ViewerFormState, FormData>(
    registerViewer,
    undefined,
  )

  return (
    <form
      action={action}
      className={tone === 'overlay' ? styles.overlay : styles.dark}
    >
      {title ? <h3 className={styles.title}>{title}</h3> : null}
      {note ? <p className={styles.note}>{note}</p> : null}

      <div className={styles.row}>
        <input
          name="email"
          type="email"
          placeholder="you@mail.ru"
          className={styles.email}
          autoComplete="email"
          required
        />
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? 'Секунду…' : submitLabel}
        </button>
      </div>

      <span className={styles.consent}>
        Оставляя почту, вы подписываетесь на дайджест и напоминания об эфирах.
        Отписаться можно в один клик.
      </span>

      {state?.error ? <span className={styles.error}>{state.error}</span> : null}
    </form>
  )
}
