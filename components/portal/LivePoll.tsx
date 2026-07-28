'use client'

import { useActionState } from 'react'
import { votePoll, type LiveState } from '@/lib/actions/live'
import styles from './LivePoll.module.css'

/** Опрос под плеером: до голоса — кнопки, после — проценты. */

type LivePollProps = {
  broadcastId: string
  question: string
  options: string[]
  counts: number[]
  myVote: number | null
  canVote: boolean
}

export default function LivePoll({
  broadcastId,
  question,
  options,
  counts,
  myVote,
  canVote,
}: LivePollProps) {
  const [state, action, pending] = useActionState<LiveState, FormData>(
    votePoll,
    undefined,
  )

  const total = counts.reduce((a, b) => a + b, 0)
  const voted = myVote != null

  return (
    <section className={styles.poll}>
      <span className={`mono ${styles.kicker}`}>Опрос</span>
      <h3 className={styles.question}>{question}</h3>

      <form action={action} className={styles.options}>
        <input type="hidden" name="broadcastId" value={broadcastId} />

        {options.map((label, i) => {
          const share = total ? Math.round((counts[i] / total) * 100) : 0
          const mine = myVote === i

          return (
            <button
              key={i}
              type="submit"
              name="optionIndex"
              value={i}
              disabled={!canVote || pending}
              className={mine ? styles.optionMine : styles.option}
              title={canVote ? 'Проголосовать' : 'Оставьте почту, чтобы голосовать'}
            >
              {/* Заливка показывает долю — видна только после голосования. */}
              {voted ? (
                <span className={styles.bar} style={{ width: `${share}%` }} />
              ) : null}

              <span className={styles.optionText}>{label}</span>
              {voted ? <span className={styles.share}>{share}%</span> : null}
            </button>
          )
        })}
      </form>

      <div className={styles.footer}>
        {voted ? (
          <span className={styles.total}>
            {total} {plural(total, 'голос', 'голоса', 'голосов')}
          </span>
        ) : (
          <span className={styles.total}>
            {canVote ? 'Выберите вариант' : 'Оставьте почту, чтобы голосовать'}
          </span>
        )}
        {state?.error ? <span className={styles.error}>{state.error}</span> : null}
      </div>
    </section>
  )
}

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
