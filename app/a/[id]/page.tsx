import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getArticle, getBroadcasts, getPages } from '@/lib/portal'
import Header from '@/components/portal/Header'
import Footer from '@/components/portal/Footer'
import Avatar from '@/components/portal/Avatar'
import ArticleBody from '@/components/portal/ArticleBody'

// Контентом управляет админка — страницы обязаны рендериться на каждый
// запрос. Иначе Next запекает их в статику на сборке и правки редакции
// на сайте не появляются.
export const dynamic = 'force-dynamic'


type Params = { params: Promise<{ id: string }> }

/** Дефолт пропорций обложки из прототипа. */
const DEFAULT_RATIO = '1685/1000'

/** «сегодня · vibecast» из прототипа; при наличии даты публикации — она. */
const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Moscow',
})

function catBg(bg: string): string {
  return bg === 'accent' ? 'var(--accent, #CBF54A)' : bg
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const article = await getArticle(id)
  if (!article) return { title: 'Материал не найден — vibecast' }

  const cover = (article.coverSrc || '').trim()
  return {
    title: `${article.title} — vibecast`,
    description: article.excerpt,
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt,
      siteName: 'vibecast',
      ...(cover ? { images: [cover] } : {}),
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title: article.title,
      description: article.excerpt,
      ...(cover ? { images: [cover] } : {}),
    },
  }
}

export default async function ArticlePage({ params }: Params) {
  const { id } = await params
  const [article, broadcasts, pages] = await Promise.all([
    getArticle(id),
    getBroadcasts(),
    getPages(),
  ])
  if (!article) notFound()

  const liveNow = broadcasts.some((b) => b.status === 'live')
  const cover = (article.coverSrc || '').trim()
  const stamp = article.publishedAt
    ? dateFmt.format(new Date(article.publishedAt))
    : 'сегодня'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header liveNow={liveNow} viewer={null} />

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 920,
          margin: '0 auto',
          padding:
            'clamp(16px,2.5vw,26px) clamp(16px,4vw,40px) clamp(36px,5vw,56px)',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid #D2D1C6',
            background: 'transparent',
            cursor: 'pointer',
            color: '#15160F',
            fontSize: 14,
            fontWeight: 600,
            padding: '8px 15px',
            borderRadius: 999,
            marginBottom: 22,
            whiteSpace: 'nowrap',
          }}
        >
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
          К ленте
        </Link>

        <article
          style={{ display: 'flex', flexDirection: 'column', gap: 22 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {article.category ? (
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '.06em',
                  color: article.category.text,
                  background: catBg(article.category.bg),
                  padding: '6px 13px',
                  borderRadius: 999,
                }}
              >
                {article.category.name}
              </span>
            ) : null}
            <span
              className="mono"
              style={{
                fontSize: 12,
                color: '#9A9B8E',
                textTransform: 'none',
                letterSpacing: 0,
                fontWeight: 400,
              }}
            >
              {stamp} · vibecast
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(32px,4.6vw,56px)',
              lineHeight: 0.98,
              letterSpacing: '-.04em',
              fontWeight: 800,
              textWrap: 'balance',
            }}
          >
            {article.title}
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 18,
              lineHeight: 1.55,
              color: '#5C5D52',
              maxWidth: '64ch',
            }}
          >
            {article.excerpt}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Avatar name={article.author} src={article.authorAvatar} size={40} />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#3A3B30' }}>
              {article.author || '—'}
            </span>
          </div>

          {cover ? (
            <div
              style={{
                width: '100%',
                aspectRatio: article.coverRatio?.trim() || DEFAULT_RATIO,
                borderRadius: 'clamp(16px,2.4vw,26px)',
                background: `url("${cover}") center/cover no-repeat`,
              }}
            />
          ) : null}

          <ArticleBody blocks={article.blocks} />
        </article>
      </main>

      <Footer pages={pages.map((p) => ({ id: p.id, title: p.title }))} />
    </div>
  )
}
