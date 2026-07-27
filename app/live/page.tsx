import type { Metadata } from 'next'
import Link from 'next/link'
import { getBroadcasts, getPages } from '@/lib/portal'
import { getViewer, isTelemostLink } from '@/lib/viewer'
import Header from '@/components/portal/Header'
import Footer from '@/components/portal/Footer'
import EmailGate from '@/components/portal/EmailGate'
import styles from './live.module.css'

export const metadata: Metadata = {
  title: 'Вебинары и прямые эфиры — vibecast',
  description:
    'Прямые эфиры с практиками вайбкодинга и архив прошедших вебинаров в записи.',
}

const MONTHS = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
] as const

function formatWhen(date: string, time: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return [date, time].filter(Boolean).join(', ')
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ''}${time ? `, ${time}` : ''}`
}

export default async function LivePage() {
  const [broadcasts, pages, viewer] = await Promise.all([
    getBroadcasts(),
    getPages(),
    getViewer(),
  ])

  const live = broadcasts.find((b) => b.status === 'live') ?? null
  const next =
    broadcasts
      .filter((b) => b.status === 'scheduled')
      .sort((a, b) =>
        `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
      )[0] ?? null
  const recorded = broadcasts.filter((b) => b.status === 'recorded')

  const canWatch = viewer != null
  const embeddable = live != null && live.embed && isTelemostLink(live.link)

  return (
    <div className={styles.page}>
      <Header liveNow={live != null} viewer={viewer} />

      <main className={styles.main}>
        <Link href="/" className={styles.back}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          На главную
        </Link>

        {live ? (
          <div className={styles.liveWrap}>
            <div className={styles.playerCol}>
              <div className={styles.player}>
                {canWatch && embeddable ? (
                  <iframe
                    className={styles.frame}
                    src={live.link}
                    title={live.title}
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    allowFullScreen
                  />
                ) : (
                  <div className={styles.poster}>
                    {canWatch ? (
                      <div className={styles.posterInner}>
                        <p className={styles.posterNote}>
                          Эфир идёт в Яндекс Телемосте.
                        </p>
                        {isTelemostLink(live.link) ? (
                          <a
                            className={styles.telemost}
                            href={live.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Открыть в Телемосте ↗
                          </a>
                        ) : (
                          <p className={styles.posterNote}>
                            Ссылка на встречу пока не добавлена.
                          </p>
                        )}
                      </div>
                    ) : (
                      <EmailGate
                        tone="overlay"
                        title="Смотреть эфир"
                        note="Оставьте почту — и эфир откроется. Регистрироваться и придумывать пароль не нужно."
                      />
                    )}
                  </div>
                )}

                <span className={`mono ${styles.liveChip}`}>
                  <span className={styles.pulse} />
                  LIVE
                </span>
              </div>

              <div className={styles.info}>
                <h1 className={styles.title}>{live.title}</h1>
                <div className={styles.speakerRow}>
                  <span className={styles.speaker}>{live.speaker}</span>
                  {live.role ? (
                    <>
                      <span className={styles.dot} />
                      <span className={styles.role}>{live.role}</span>
                    </>
                  ) : null}
                </div>
                {live.desc ? <p className={styles.desc}>{live.desc}</p> : null}
                {live.tags.length ? (
                  <div className={styles.tags}>
                    {live.tags.map((t) => (
                      <span key={t} className={`mono ${styles.tag}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <section className={styles.noLive}>
            <span className={`mono ${styles.noLiveBadge}`}>
              <span className={styles.noLiveDot} />
              СЕЙЧАС ЭФИРА НЕТ
            </span>
            <h1 className={styles.noLiveTitle}>
              {next ? next.title : 'Скоро анонсируем следующий эфир'}
            </h1>
            {next ? (
              <div className={styles.nextRow}>
                <span className={`mono ${styles.nextWhen}`}>
                  {formatWhen(next.date, next.time)}
                </span>
                <span className={styles.nextDot} />
                <span className={styles.nextSpeaker}>
                  {[next.speaker, next.role].filter(Boolean).join(' · ')}
                </span>
              </div>
            ) : null}

            {viewer ? (
              <span className={styles.reminded}>
                <span className={styles.check}>✓</span>
                Напомним о старте на {viewer.email}
              </span>
            ) : (
              <EmailGate tone="dark" submitLabel="Напомнить мне" />
            )}
          </section>
        )}

        {recorded.length ? (
          <section className={styles.recordings}>
            <h2 className={styles.recTitle}>Прошлые вебинары в записи</h2>
            <div className={styles.recRow}>
              {recorded.map((b) => (
                <article key={b.id} className={styles.recCard}>
                  <div className={styles.recFrame}>
                    <span className={`mono ${styles.recBadge}`}>ЗАПИСЬ</span>
                  </div>
                  <h3 className={styles.recCardTitle}>{b.title}</h3>
                  <span className={styles.recSpeaker}>{b.speaker}</span>
                  {canWatch ? (
                    b.recordingUrl ? (
                      <a
                        className={styles.recLink}
                        href={b.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Смотреть запись ↗
                      </a>
                    ) : (
                      <span className={styles.recSoon}>Запись готовится</span>
                    )
                  ) : (
                    <span className={styles.recSoon}>
                      Откроется после ввода почты
                    </span>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <Footer pages={pages.map((p) => ({ id: p.id, title: p.title }))} />
    </div>
  )
}
