import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedArticles } from '@/lib/portal'
import SectionShell from '@/components/portal/SectionShell'
import styles from './search.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Поиск — vibecast',
  description: 'Поиск по материалам vibecast.',
  robots: { index: false, follow: true },
}

type Props = { searchParams: Promise<{ q?: string }> }

export default async function SearchPage({ searchParams }: Props) {
  const query = (await searchParams).q?.trim() ?? ''
  const normalized = query.toLocaleLowerCase('ru')
  const articles = query ? await getPublishedArticles() : []
  const results = articles.filter((article) => {
    const body = article.blocks
      .map((block) => ('content' in block ? block.content : ''))
      .join(' ')
    const haystack = [
      article.title,
      article.excerpt,
      article.author,
      article.category?.name ?? '',
      body,
    ]
      .join(' ')
      .toLocaleLowerCase('ru')
    return haystack.includes(normalized)
  })

  return (
    <SectionShell kicker="Поиск" title="Найти материал">
      <form className={styles.form} role="search">
        <input
          className={styles.input}
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Например, Claude Code"
          aria-label="Поиск по материалам"
          autoFocus
        />
        <button className={styles.submit} type="submit">Найти</button>
      </form>

      {query ? (
        <div className={styles.results}>
          <p className={styles.summary}>
            {results.length
              ? `Найдено: ${results.length}`
              : `По запросу «${query}» ничего не найдено`}
          </p>
          {results.map((article) => (
            <Link key={article.id} href={`/a/${article.id}`} className={styles.result}>
              <span className={`mono ${styles.category}`}>
                {article.category?.name ?? 'Материал'}
              </span>
              <h2>{article.title}</h2>
              <p>{article.excerpt}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className={styles.hint}>Введите тему, название инструмента или имя автора.</p>
      )}
    </SectionShell>
  )
}
