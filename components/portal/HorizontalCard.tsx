import Link from 'next/link'
import type { ArticleView } from '@/lib/portal'
import Avatar from './Avatar'
import styles from './HorizontalCard.module.css'

/** COV из прототипа: три плашки для карточек разделов без обложки. */
const ART_BACKGROUNDS = [
  'repeating-linear-gradient(135deg,#15160F 0 7px,#CFD6C6 7px 16px)',
  'radial-gradient(#15160F 1.8px,transparent 2px) 0 0/15px 15px,#EFD2BE',
  'repeating-linear-gradient(90deg,#15160F 0 9px,#CBF54A 9px 20px)',
] as const

function artBackground(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ART_BACKGROUNDS[h % ART_BACKGROUNDS.length]
}

function catBg(bg: string): string {
  return bg === 'accent' ? 'var(--accent, #CBF54A)' : bg
}

export default function HorizontalCard({ article }: { article: ArticleView }) {
  const cover = (article.coverSrc || '').trim()

  return (
    <Link href={`/a/${article.id}`} className={styles.card}>
      <div
        className={styles.cover}
        style={{
          background: cover
            ? `url("${cover}") center/cover no-repeat`
            : artBackground(article.id),
        }}
      />
      <div className={styles.body}>
        {article.category ? (
          <span
            className={styles.cat}
            style={{
              color: article.category.text,
              background: catBg(article.category.bg),
            }}
          >
            {article.category.name}
          </span>
        ) : null}
        <h3 className={styles.title}>{article.title}</h3>
        <p className={styles.excerpt}>{article.excerpt}</p>
        <div className={styles.foot}>
          <Avatar name={article.author} src={article.authorAvatar} size={26} />
          <span className={styles.author}>{article.author}</span>
          <span className={styles.footArrow}>
            <svg
              width="13"
              height="13"
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
      </div>
    </Link>
  )
}
