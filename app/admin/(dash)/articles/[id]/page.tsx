import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import type { ArticleBlock } from '@/lib/portal'
import ArticleEditor from '../ArticleEditor'

export const dynamic = 'force-dynamic'

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [article, categories] = await Promise.all([
    prisma.article.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ])
  if (!article) notFound()

  let blocks: ArticleBlock[] = []
  try {
    blocks = JSON.parse(article.blocks)
  } catch {
    blocks = []
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <Link
          href="/admin/articles"
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', textDecoration: 'none' }}
        >
          ← К списку
        </Link>
        {article.status === 'published' ? (
          <Link
            href={`/a/${article.id}`}
            target="_blank"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--dark)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-pill)',
              padding: '7px 15px',
              textDecoration: 'none',
            }}
          >
            Открыть на сайте ↗
          </Link>
        ) : null}
      </div>

      <h1
        style={{
          margin: '0 0 22px',
          fontSize: 'clamp(26px,3.4vw,38px)',
          fontWeight: 800,
          letterSpacing: '-.04em',
        }}
      >
        {article.title || 'Без заголовка'}
      </h1>

      <ArticleEditor
        categories={categories}
        draft={{
          id: article.id,
          title: article.title,
          categoryId: article.categoryId,
          author: article.author,
          authorAvatar: article.authorAvatar,
          excerpt: article.excerpt,
          coverSrc: article.coverSrc,
          coverRatio: article.coverRatio,
          sec: article.sec,
          status: article.status,
          blocks,
        }}
      />
    </div>
  )
}
