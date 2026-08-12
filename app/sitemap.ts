import type { MetadataRoute } from 'next'
import { getBroadcasts, getPages, getPublishedArticles } from '@/lib/portal'
import { SITE_ORIGIN } from '@/lib/site'
import { articlePath, broadcastPath } from '@/lib/article-slug'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, broadcasts, pages] = await Promise.all([
    getPublishedArticles(),
    getBroadcasts(),
    getPages(),
  ])

  const staticRoutes = ['', '/live', '/tools', '/learn', '/radio', '/suggest']

  return [
    ...staticRoutes.map((path, index) => ({
      url: `${SITE_ORIGIN}${path}`,
      changeFrequency: (index === 0 ? 'daily' : 'weekly') as 'daily' | 'weekly',
      priority: index === 0 ? 1 : 0.7,
    })),
    ...articles.map((article) => ({
      url: `${SITE_ORIGIN}${articlePath(article)}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...broadcasts.map((broadcast) => ({
      url: `${SITE_ORIGIN}${broadcastPath(broadcast)}`,
      changeFrequency: 'weekly' as const,
      priority: broadcast.status === 'live' ? 0.9 : 0.7,
    })),
    ...pages.map((page) => ({
      url: `${SITE_ORIGIN}/p/${encodeURIComponent(page.id)}`,
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    })),
  ]
}
