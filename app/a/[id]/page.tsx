import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { getArticle, getBroadcasts, getPages } from '@/lib/portal'
import { getViewer } from '@/lib/viewer'
import Header from '@/components/portal/Header'
import Footer from '@/components/portal/Footer'
import Avatar from '@/components/portal/Avatar'
import ArticleBody from '@/components/portal/ArticleBody'
import ShareArticle from '@/components/portal/ShareArticle'
import { publicUrl } from '@/lib/site'
import { articlePath } from '@/lib/article-slug'

// Контентом управляет админка — страницы обязаны рендериться на каждый
// запрос. Иначе Next запекает их в статику на сборке и правки редакции
// на сайте не появляются.
export const dynamic = 'force-dynamic'


type Params = { params: Promise<{ id: string }> }

/** Дефолт пропорций обложки из прототипа. */
const DEFAULT_RATIO = '1685/1000'

function catBg(bg: string): string {
  return bg === 'accent' ? 'var(--accent, #CBF54A)' : bg
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const article = await getArticle(id)
  if (!article) return { title: 'Материал не найден — vibecast' }

  const cover = (article.coverSrc || '').trim()
  const canonical = articlePath(article)
  const socialImage = publicUrl(cover || '/brand/vibecast-mark.png')
  return {
    title: `${article.title} — vibecast`,
    description: article.excerpt,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt,
      siteName: 'vibecast',
      locale: 'ru_RU',
      url: canonical,
      images: [
        {
          url: socialImage,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: [{ url: socialImage, alt: article.title }],
    },
  }
}

export default async function ArticlePage({ params }: Params) {
  const { id } = await params
  const [article, broadcasts, pages, viewer] = await Promise.all([
    getArticle(id),
    getBroadcasts(),
    getPages(),
    getViewer(),
  ])
  if (!article) notFound()
  if (id !== article.slug) permanentRedirect(articlePath(article))

  const liveNow = broadcasts.some((b) => b.status === 'live')
  const cover = (article.coverSrc || '').trim()
  // publishedAt приходит уже готовой подписью («сегодня», «2 июл») —
  // разбирать его как дату нельзя, страница на этом падала.
  const stamp = article.publishedAt ?? 'сегодня'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header liveNow={liveNow} viewer={viewer} />

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 860,
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
          style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
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
              fontSize: 'clamp(32px,4.2vw,50px)',
              lineHeight: 1.02,
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
              fontSize: 17.5,
              lineHeight: 1.58,
              color: '#5C5D52',
              maxWidth: '60ch',
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

          <ShareArticle title={article.title} />
        </article>
      </main>

      <Footer pages={pages.map((p) => ({ id: p.id, title: p.title }))} />
    </div>
  )
}
