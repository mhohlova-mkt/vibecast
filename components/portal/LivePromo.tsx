import Link from 'next/link'
import type { BroadcastView } from '@/lib/portal'
import styles from './LivePromo.module.css'

/**
 * Правая колонка главной: промо эфира.
 * Идёт эфир — превью + «Смотреть эфир»; иначе анонс ближайшего
 * и «Напомнить о старте» (ветки homeLive / homeNoLive прототипа).
 */

const AVATAR_COLORS = [
  '#4C6B3C',
  '#8A4E3A',
  '#3F5E7A',
  '#6B4E8A',
  '#7A5C2E',
] as const

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
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

/** '2026-07-02' + '18:00' → '2 июл, 18:00'. */
function formatWhen(date: string, time: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return [date, time].filter(Boolean).join(', ')
  const day = Number(m[3])
  const month = MONTHS[Number(m[2]) - 1] ?? ''
  return `${day} ${month}${time ? `, ${time}` : ''}`
}

/** Плеер в миниатюре должен стартовать сам и молча. */
function withAutoplay(url: string): string {
  const u = new URL(url)
  u.searchParams.set('autoplay', '1')
  u.searchParams.set('muted', '1')
  return u.toString()
}

export default function LivePromo({ promo }: { promo: BroadcastView | null }) {
  if (!promo) return null

  const isLive = promo.status === 'live'
  const speakerLine = [promo.speaker, promo.role].filter(Boolean).join(' · ')

  return (
    <aside className={styles.promo}>
      <div className={styles.inner}>
        {isLive ? (
          <span className={styles.liveBadge}>
            <span className={styles.pulse} />
            <span className={`mono ${styles.liveLabel}`}>СЕЙЧАС В ЭФИРЕ</span>
          </span>
        ) : (
          <span className={styles.nextBadge}>
            <span className={styles.nextDot} />
            <span className={`mono ${styles.nextLabel}`}>СЛЕДУЮЩИЙ ЭФИР</span>
          </span>
        )}

        <div
          className={styles.frame}
          style={
            promo.posterSrc && !(isLive && promo.embedUrl)
              ? { backgroundImage: `url("${promo.posterSrc}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : undefined
          }
        >
          {/* Если площадка разрешает встраивание — показываем живой эфир
              прямо в миниатюре. Без звука: со звуком браузер не пустит. */}
          {isLive && promo.embedUrl ? (
            <iframe
              className={styles.liveFrame}
              src={withAutoplay(promo.embedUrl)}
              title={promo.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              loading="lazy"
            />
          ) : null}

          {isLive ? (
            <>
              <span className={`mono ${styles.liveChip}`}>LIVE</span>
              {promo.embedUrl ? null : (
                <span className={styles.playMark} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#15160F">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
            </>
          ) : (
            <div className={promo.posterSrc ? styles.soonOnPoster : styles.soon}>
              <span className={styles.soonMark} aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6B6C60"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <span className={styles.soonWhen}>
                {formatWhen(promo.date, promo.time)}
              </span>
            </div>
          )}
        </div>

        <h3 className={styles.title}>{promo.title}</h3>

        <div className={styles.speakerRow}>
          <span
            className={styles.speakerAvatar}
            style={{ background: avatarColor(promo.speaker) }}
          >
            {initialsOf(promo.speaker)}
          </span>
          <span className={styles.speaker}>{speakerLine}</span>
        </div>

        <Link
          href="/live"
          className={isLive ? styles.ctaSolid : styles.ctaGhost}
        >
          {isLive ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Смотреть эфир
            </>
          ) : (
            'Напомнить о старте'
          )}
        </Link>
      </div>
    </aside>
  )
}
