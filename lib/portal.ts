import 'server-only'
import { prisma } from './db'
import { normalizeEmbedUrl } from './embed'

/** Единый контракт данных для всех экранов портала. */

export type ArticleBlock =
  | { type: 'text'; content: string }
  | { type: 'quote'; content: string; caption?: string }
  | { type: 'image'; content: string; caption?: string }
  | { type: 'video'; content?: string; url: string; caption?: string }

export type CategoryView = { id: string; name: string; bg: string; text: string }

export type ArticleView = {
  id: string
  title: string
  excerpt: string
  author: string
  authorAvatar: string | null
  category: CategoryView | null
  coverSrc: string | null
  coverRatio: string | null
  sec: 'feed' | 'tools' | 'learn'
  status: 'draft' | 'published'
  blocks: ArticleBlock[]
  readMin: number
  publishedAt: string | null
}

export type BroadcastView = {
  id: string
  title: string
  speaker: string
  role: string
  speakerAvatar: string | null
  date: string
  time: string
  status: 'draft' | 'scheduled' | 'live' | 'recorded'
  link: string
  embedUrl: string | null
  embed: boolean
  chat: boolean
  poll: { question: string; options: string[] } | null
  recordingUrl: string | null
  tags: string[]
  desc: string
}

export type HomeView = {
  heroArticleId: string | null
  heroMediaSrc: string | null
  heroMediaKind: 'image' | 'video' | null
  banner: { enabled: boolean; html: string; img: string | null; link: string }
  learnPin: {
    enabled: boolean
    img: string | null
    title: string
    desc: string
    link: string
  }
  homePromoId: string | null
}

const MONTHS = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
] as const

/** Дата публикации как в прототипе: «сегодня» / «вчера» / «2 июл». */
function publishedLabel(d: Date | null): string | null {
  if (!d) return null
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000)
  if (days <= 0) return 'сегодня'
  if (days === 1) return 'вчера'
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** ~180 слов в минуту — оценка времени чтения. */
function readMinutes(a: { excerpt: string; blocks: string }): number {
  let words = a.excerpt.split(/\s+/).filter(Boolean).length
  try {
    for (const b of JSON.parse(a.blocks) as ArticleBlock[]) {
      if ('content' in b && typeof b.content === 'string')
        words += b.content.split(/\s+/).filter(Boolean).length
    }
  } catch {
    /* повреждённый JSON — считаем только лид */
  }
  return Math.max(1, Math.round(words / 180))
}

type ArticleRow = Awaited<ReturnType<typeof prisma.article.findFirst>> & {
  category?: { id: string; name: string; bg: string; text: string } | null
}

function toArticle(a: NonNullable<ArticleRow>): ArticleView {
  let blocks: ArticleBlock[] = []
  try {
    blocks = JSON.parse(a.blocks)
  } catch {
    blocks = []
  }
  return {
    id: a.id,
    title: a.title,
    excerpt: a.excerpt,
    author: a.author,
    authorAvatar: a.authorAvatar,
    category: a.category ?? null,
    coverSrc: a.coverSrc,
    coverRatio: a.coverRatio,
    sec: a.sec as ArticleView['sec'],
    status: a.status as ArticleView['status'],
    blocks,
    readMin: readMinutes(a),
    publishedAt: publishedLabel(a.publishedAt),
  }
}

function toBroadcast(b: {
  id: string
  title: string
  speaker: string
  role: string
  speakerAvatar: string | null
  date: string
  time: string
  status: string
  link: string
  embedUrl: string | null
  embed: boolean
  chat: boolean
  pollQuestion: string | null
  pollOptions: string | null
  recordingUrl: string | null
  tags: string
  desc: string
}): BroadcastView {
  let options: string[] = []
  try {
    options = b.pollOptions ? JSON.parse(b.pollOptions) : []
  } catch {
    options = []
  }
  return {
    id: b.id,
    title: b.title,
    speaker: b.speaker,
    role: b.role,
    speakerAvatar: b.speakerAvatar,
    date: b.date,
    time: b.time,
    status: b.status as BroadcastView['status'],
    link: b.link,
    // Ссылки, сохранённые до нормализации, приводим на чтении.
    embedUrl: b.embedUrl ? (normalizeEmbedUrl(b.embedUrl).url ?? null) : null,
    embed: b.embed,
    chat: b.chat,
    poll:
      b.pollQuestion && options.length >= 2
        ? { question: b.pollQuestion, options }
        : null,
    recordingUrl: b.recordingUrl,
    tags: b.tags.split(/\s+/).filter(Boolean),
    desc: b.desc,
  }
}

export async function getPublishedArticles(sec?: 'feed' | 'tools' | 'learn') {
  const rows = await prisma.article.findMany({
    where: { status: 'published', ...(sec ? { sec } : {}) },
    include: { category: true },
    orderBy: [{ sortIndex: 'asc' }, { createdAt: 'desc' }],
  })
  return rows.map(toArticle)
}

export async function getArticle(id: string) {
  const row = await prisma.article.findFirst({
    where: { id, status: 'published' },
    include: { category: true },
  })
  return row ? toArticle(row) : null
}

export async function getBroadcasts() {
  const rows = await prisma.broadcast.findMany({
    where: { status: { not: 'draft' } },
    orderBy: [{ sortIndex: 'asc' }],
  })
  return rows.map(toBroadcast)
}

export async function getHome(): Promise<HomeView> {
  const h = await prisma.home.findUnique({ where: { id: 'home' } })
  return {
    heroArticleId: h?.heroArticleId ?? null,
    heroMediaSrc: h?.heroMediaSrc ?? null,
    heroMediaKind: (h?.heroMediaKind as 'image' | 'video' | null) ?? null,
    banner: {
      enabled: h?.bannerEnabled ?? false,
      html: h?.bannerHtml ?? '',
      img: h?.bannerImg ?? null,
      link: h?.bannerLink ?? '',
    },
    learnPin: {
      enabled: h?.learnPinOn ?? false,
      img: h?.learnPinImg ?? null,
      title: h?.learnPinTitle ?? '',
      desc: h?.learnPinDesc ?? '',
      link: h?.learnPinLink ?? '',
    },
    homePromoId: h?.homePromoId ?? null,
  }
}

/**
 * Промо-блок главной: homePromoId (если не draft) → live → ближайшая scheduled.
 * Правило зафиксировано в README хендоффа.
 */
export function pickPromo(
  broadcasts: BroadcastView[],
  homePromoId: string | null,
): BroadcastView | null {
  if (homePromoId) {
    const pinned = broadcasts.find((b) => b.id === homePromoId)
    if (pinned) return pinned
  }
  const live = broadcasts.find((b) => b.status === 'live')
  if (live) return live
  const upcoming = broadcasts
    .filter((b) => b.status === 'scheduled')
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  return upcoming[0] ?? null
}

export async function getPages() {
  return prisma.page.findMany({ orderBy: { id: 'asc' } })
}

export async function getPage(id: string) {
  return prisma.page.findUnique({ where: { id } })
}
