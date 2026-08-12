'use client'

import { useActionState } from 'react'
import { registerViewer, type ViewerFormState } from '@/lib/actions/viewer'
import { CONSENT_PD_PARTS, CONSENT_TEXT } from '@/lib/consent.texts'
import styles from './EmailGate.module.css'

/**
 * Доступ к материалам в обмен на почту. Ни аккаунтов, ни паролей:
 * зритель оставляет e-mail и сразу получает доступ к эфиру и архиву.
 *
 * Галочки две и они разные по смыслу. Обработка данных обязательна —
 * без неё почту нельзя даже сохранить. Рассылка необязательна и снята
 * по умолчанию: доступ к эфиру от неё не зависит, и связывать их нельзя.
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

      <label className={styles.check}>
        <input type="checkbox" name="consentPd" required />
        <span>
          {CONSENT_PD_PARTS.before}
          <a href="/p/privacy" target="_blank" rel="noopener noreferrer">
            {CONSENT_PD_PARTS.link}
          </a>
          {CONSENT_PD_PARTS.after}
        </span>
      </label>

      <label className={styles.check}>
        <input type="checkbox" name="consentAds" />
        <span>{CONSENT_TEXT.ads}</span>
      </label>

      {state?.error ? <span className={styles.error}>{state.error}</span> : null}
    </form>
  )
}
