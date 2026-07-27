import Link from 'next/link'
import type { ArticleView } from '@/lib/portal'
import Avatar from './Avatar'
import styles from './ArticleCard.module.css'

/** Генеративные плашки-обложки (COVERS из прототипа) — когда фото не загружено. */
const ART_BACKGROUNDS = [
  'repeating-linear-gradient(135deg,#15160F 0 7px,#CFD6C6 7px 16px)',
  'radial-gradient(circle at 30% 32%,#15160F 0 30%,transparent 31%),radial-gradient(circle at 74% 78%,#15160F 0 19%,transparent 20%),#DBD0F2',
  'radial-gradient(#15160F 1.8px,transparent 2px) 0 0/15px 15px,#EFD2BE',
  'repeating-radial-gradient(circle at 50% 122%,#15160F 0 6px,#CBF54A 6px 14px)',
  'repeating-linear-gradient(90deg,#15160F 0 9px,#CBF54A 9px 20px)',
  'repeating-linear-gradient(45deg,#15160F 0 1.6px,transparent 1.6px 15px),repeating-linear-gradient(-45deg,#15160F 0 1.6px,transparent 1.6px 15px),#CFD6C6',
] as const

/** В прототипе плашка бралась по индексу в списке; здесь — детерминированно по id. */
function artBackground(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ART_BACKGROUNDS[h % ART_BACKGROUNDS.length]
}

/** bg === 'accent' → лаймовый акцент (catStyleOf из прототипа). */
function catBg(bg: string): string {
  return bg === 'accent' ? 'var(--accent, #CBF54A)' : bg
}

export default function ArticleCard({ article }: { article: ArticleView }) {
  const cover = (article.coverSrc || '').trim()
  const ratio = article.coverRatio || '1685/1000'

  return (
    <Link href={`/a/${article.id}`} className={styles.card}>
      {cover ? (
        <div className={styles.photo}>
          <div
            style={{
              aspectRatio: ratio,
              background: `url("${cover}") center/cover no-repeat`,
            }}
          />
        </div>
      ) : (
        <div
          className={styles.art}
          style={{ background: artBackground(article.id) }}
        >
          <span className={styles.artIco}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </span>
        </div>
      )}

      {article.category ? (
        <div className={styles.catRow}>
          <span
            className={styles.cat}
            style={{
              color: article.category.text,
              background: catBg(article.category.bg),
            }}
          >
            {article.category.name}
          </span>
        </div>
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
    </Link>
  )
}
