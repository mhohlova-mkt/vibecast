import Link from 'next/link'
import { prisma } from '@/lib/db'
import ArticleEditor from '../ArticleEditor'

export const dynamic = 'force-dynamic'

export default async function NewArticlePage() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <Link
        href="/admin/articles"
        style={{
          display: 'inline-block',
          marginBottom: 18,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--muted)',
          textDecoration: 'none',
        }}
      >
        ← К списку
      </Link>
      <h1
        style={{
          margin: '0 0 22px',
          fontSize: 'clamp(26px,3.4vw,38px)',
          fontWeight: 800,
          letterSpacing: '-.04em',
        }}
      >
        Новая статья
      </h1>

      <ArticleEditor
        categories={categories}
        draft={{
          id: null,
          title: '',
          categoryId: null,
          author: '',
          authorAvatar: null,
          excerpt: '',
          coverSrc: null,
          coverRatio: null,
          sec: 'feed',
          status: 'draft',
          blocks: [],
        }}
      />
    </div>
  )
}
