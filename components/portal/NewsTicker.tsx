import Link from 'next/link'
import type { ArticleView } from '@/lib/portal'
import { articlePath } from '@/lib/article-slug'
import styles from './NewsTicker.module.css'

export default function NewsTicker({ articles }: { articles: ArticleView[] }) {
  const items = articles.slice(0, 8)
  if (items.length < 2) return null

  const group = (hidden: boolean) => (
    <div className={styles.group} aria-hidden={hidden || undefined}>
      {items.map((article) => (
        <Link key={article.id} href={articlePath(article)} className={styles.item}>
          <span>{article.category?.name ?? 'Материал'}</span>
          {article.title}
          <i aria-hidden="true">✦</i>
        </Link>
      ))}
    </div>
  )

  return (
    <section className={styles.ticker} aria-label="Свежие материалы">
      <div className={styles.track}>
        {group(false)}
        {group(true)}
      </div>
    </section>
  )
}
