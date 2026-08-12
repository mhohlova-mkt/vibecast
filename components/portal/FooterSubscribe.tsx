'use client'

import { useActionState } from 'react'
import { subscribeDigest, type SubscribeState } from '@/lib/actions/viewer'
import { CONSENT_PD_PARTS, CONSENT_TEXT } from '@/lib/consent.texts'
import styles from './Footer.module.css'

/**
 * Подписка на дайджест из футера.
 *
 * Клиентский компонент нужен ради состояния: без ответа человек не понимает,
 * подписался он или нет. Раньше форма постила на /api/subscribe — маршрута
 * с таким именем в проекте нет, то есть подписка из футера просто не работала.
 */
export default function FooterSubscribe() {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(
    subscribeDigest,
    undefined,
  )

  if (state?.ok) {
    return (
      <p className={styles.subDone}>
        Готово — вы в списке. Отписаться можно ссылкой в любом письме.
      </p>
    )
  }

  return (
    <form action={action} className={styles.subForm}>
      <div className={styles.subRow}>
        <input
          type="email"
          name="email"
          required
          placeholder="e-mail"
          aria-label="e-mail"
          className={styles.subInput}
        />
        <button type="submit" className={styles.subBtn} disabled={pending}>
          {pending ? '…' : 'ОК'}
        </button>
      </div>

      <label className={styles.subCheck}>
        <input type="checkbox" name="consentPd" required />
        <span>
          {CONSENT_PD_PARTS.before}
          <a href="/p/privacy" target="_blank" rel="noopener noreferrer">
            {CONSENT_PD_PARTS.link}
          </a>
          {CONSENT_PD_PARTS.after}
        </span>
      </label>

      <label className={styles.subCheck}>
        <input type="checkbox" name="consentAds" required />
        <span>{CONSENT_TEXT.ads}</span>
      </label>

      {state?.error ? <span className={styles.subError}>{state.error}</span> : null}
    </form>
  )
}
