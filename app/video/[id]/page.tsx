import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { getBroadcast, getBroadcasts, getPages } from '@/lib/portal'
import { getViewer, isTelemostLink } from '@/lib/viewer'
import { broadcastPath } from '@/lib/article-slug'
import { publicUrl } from '@/lib/site'
import Header from '@/components/portal/Header'
import Footer from '@/components/portal/Footer'
import EmailGate from '@/components/portal/EmailGate'
import styles from './video.module.css'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
] as const

function formatWhen(date: string, time: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return [date, time].filter(Boolean).join(', ')
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1] ?? ''}${
    time ? ` в ${time}` : ''
  }`
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const broadcast = await getBroadcast(id)
  if (!broadcast) return { title: 'Вебинар не найден — vibecast' }

  const canonical = broadcastPath(broadcast)
  const image = publicUrl(broadcast.posterSrc || '/brand/vibecast-mark.png')
  const description =
    broadcast.desc ||
    [formatWhen(broadcast.date, broadcast.time), broadcast.speaker]
      .filter(Boolean)
      .join(' · ')

  return {
    title: `${broadcast.title} — vibecast`,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: broadcast.title,
      description,
      siteName: 'vibecast',
      locale: 'ru_RU',
      url: canonical,
      images: [{ url: image, alt: broadcast.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: broadcast.title,
      description,
      images: [{ url: image, alt: broadcast.title }],
    },
  }
}

export default async function VideoPage({ params }: Params) {
  const { id } = await params
  const [broadcast, broadcasts, pages, viewer] = await Promise.all([
    getBroadcast(id),
    getBroadcasts(),
    getPages(),
    getViewer(),
  ])
  if (!broadcast) notFound()
  if (id !== broadcast.slug) permanentRedirect(broadcastPath(broadcast))

  const isLive = broadcast.status === 'live'
  const isRecorded = broadcast.status === 'recorded'
  const canWatch = viewer != null
  const liveNow = broadcasts.some((item) => item.status === 'live')
  const watchUrl = isRecorded ? broadcast.recordingUrl : broadcast.link

  return (
    <div className={styles.page}>
      <Header liveNow={liveNow} viewer={viewer} />
      <main className={styles.main}>
        <Link href="/live" className={styles.back}>← Все вебинары</Link>

        <section className={styles.hero}>
          <div
            className={styles.poster}
            style={
              broadcast.posterSrc
                ? { backgroundImage: `url("${broadcast.posterSrc}")` }
                : undefined
            }
          >
            <span className={`${styles.status} ${isLive ? styles.statusLive : ''}`}>
              {isLive ? '● В ЭФИРЕ' : isRecorded ? 'ЗАПИСЬ' : 'БУДУЩИЙ ВЕБИНАР'}
            </span>
          </div>

          <div className={styles.content}>
            <span className={`mono ${styles.when}`}>
              {formatWhen(broadcast.date, broadcast.time)}
            </span>
            <h1 className={styles.title}>{broadcast.title}</h1>
            <p className={styles.speaker}>
              {[broadcast.speaker, broadcast.role].filter(Boolean).join(' · ')}
            </p>
            {broadcast.desc ? <p className={styles.desc}>{broadcast.desc}</p> : null}
            {broadcast.tags.length ? (
              <div className={styles.tags}>
                {broadcast.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            ) : null}

            <div className={styles.action}>
              {canWatch && watchUrl && (isRecorded || isLive) ? (
                <a
                  className={styles.watch}
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {isRecorded ? 'Смотреть запись ↗' : isTelemostLink(watchUrl) ? 'Открыть эфир ↗' : 'Смотреть эфир ↗'}
                </a>
              ) : viewer && isRecorded ? (
                <span className={styles.reminded}>Запись готовится</span>
              ) : viewer ? (
                <span className={styles.reminded}>
                  ✓ Напомним о старте на {viewer.email}
                </span>
              ) : (
                <EmailGate
                  tone="dark"
                  submitLabel={isRecorded ? 'Получить доступ' : 'Напомнить мне'}
                />
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer pages={pages.map((page) => ({ id: page.id, title: page.title }))} />
    </div>
  )
}
