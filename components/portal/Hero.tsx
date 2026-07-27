import Link from 'next/link'
import type { ArticleView } from '@/lib/portal'
import styles from './Hero.module.css'

/**
 * Featured story — большой блок закреплённой статьи на главной.
 * Медиа-зона: загруженное в админке фото/видео, иначе обложка статьи,
 * иначе код-заглушка (heroNoMedia из прототипа).
 */

type HeroProps = {
  article: ArticleView
  mediaSrc: string | null
  mediaKind: 'image' | 'video' | null
}

const CODE_PLACEHOLDER = `const idea = "приложение за выходные"
const mvp  = await build(idea, { ai: claude })
ship(mvp) // 🚀 без штата разработчиков`

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

export default function Hero({ article, mediaSrc, mediaKind }: HeroProps) {
  const cover = (article.coverSrc || '').trim()
  const video = mediaKind === 'video' ? mediaSrc : null
  const image = mediaKind === 'video' ? null : mediaSrc || cover || null
  const noMedia = !video && !image

  const meta = [
    article.readMin ? `${article.readMin} мин` : null,
    article.publishedAt,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link href={`/a/${article.id}`} className={styles.hero}>
      <div className={styles.head}>
        <span className={`mono ${styles.badge}`}>
          ★ {article.category?.name ?? 'ГЛАВНОЕ'}
        </span>
        <span className={styles.arrow} aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </span>
      </div>

      <div className={styles.text}>
        <h1 className={styles.title}>{article.title}</h1>
        <p className={styles.excerpt}>{article.excerpt}</p>
      </div>

      <div
        className={styles.media}
        style={
          image
            ? { background: `url("${image}") center/cover no-repeat` }
            : { background: '#CFD6C6' }
        }
      >
        {video ? (
          <video
            className={styles.video}
            src={video}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : null}

        {noMedia ? <pre className={styles.code}>{CODE_PLACEHOLDER}</pre> : null}

        <div className={styles.scrim} />

        <div className={styles.byline}>
          <span className={styles.avatar}>{initialsOf(article.author)}</span>
          <span className={styles.author}>{article.author}</span>
          {meta ? (
            <>
              <span className={styles.dot} />
              <span className={styles.meta}>{meta}</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
