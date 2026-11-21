import { revalidatePath } from 'next/cache'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { articlePath, articleSlugBase } from '@/lib/article-slug'
import { prisma } from '@/lib/db'
import type { ArticleBlock } from '@/lib/portal'

export const runtime = 'nodejs'
const headers = { 'cache-control': 'no-store' }
const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads')
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers })

function isAuthorized(request: Request) {
  const token = process.env.VIBECAST_PUBLISH_TOKEN
  const header = request.headers.get('authorization')
  if (!token || !header || header.length !== 71) return false
  const hash = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(hash(header), hash(`Bearer ${token}`))
}

export function HEAD(request: Request) {
  return new Response(null, { status: isAuthorized(request) ? 204 : 401, headers })
}

function parseArticle(raw: FormDataEntryValue | null) {
  if (typeof raw !== 'string' || raw.length > 20000) return null
  const value = JSON.parse(raw)
  if (!value || typeof value !== 'object') return null
  const { id, title, excerpt, blocks, sources } = value
  const text = (item: unknown, max: number): item is string =>
    typeof item === 'string' && !!item.trim() && item.length <= max
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id) ||
      !text(title, 180) || !text(excerpt, 500) ||
      !Array.isArray(blocks) || !blocks.length || blocks.length > 50 ||
      !Array.isArray(sources) || !sources.length || sources.length > 20) return null

  const cleaned: ArticleBlock[] = []
  for (const block of blocks) {
    if (!block || !text(block.content, 4500)) return null
    if (block.type === 'heading' && (block.level === 2 || block.level === 3)) {
      cleaned.push({ type: 'heading', content: block.content, level: block.level })
    } else if (block.type === 'text') {
      cleaned.push({ type: 'text', content: block.content, style: 'body' })
    } else if (block.type === 'quote') {
      cleaned.push({ type: 'quote', content: block.content })
    } else return null
  }
  const links: string[] = []
  for (const source of sources) {
    if (!text(source, 2000)) return null
    const url = new URL(source)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    const href = url.href.replaceAll('(', '%28').replaceAll(')', '%29')
    links.push(`[${url.hostname}](${href})`)
  }
  cleaned.push({ type: 'heading', content: 'Источники', level: 2 })
  cleaned.push({ type: 'list', content: links.join('\n'), ordered: true })
  return { id, title: title.trim(), excerpt: excerpt.trim(), blocks: cleaned }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return reply({ error: 'Требуется доступ к публикации' }, 401)
  if (Number(request.headers.get('content-length') || 0) > 1_500_000) {
    return reply({ error: 'Материал слишком большой' }, 413)
  }
  let article: ReturnType<typeof parseArticle>
  let cover: FormDataEntryValue | null
  try {
    const form = await request.formData()
    article = parseArticle(form.get('article'))
    cover = form.get('cover')
  } catch {
    return reply({ error: 'Некорректные данные статьи' }, 400)
  }
  if (!article || !(cover instanceof File) || cover.type !== 'image/jpeg' ||
      cover.size < 4 || cover.size > 1_200_000) {
    return reply({ error: 'Нужны статья и обложка JPEG' }, 400)
  }

  const id = `vibeseeker-${article.id}`
  const select = { id: true, slug: true, status: true }
  const existing = await prisma.article.findUnique({ where: { id }, select })
  if (existing) return existing.status === 'published'
    ? reply({ path: articlePath(existing) })
    : reply({ error: 'Запись есть в админке, но не опубликована' }, 409)

  let jpeg: Buffer
  let ratio: string
  try {
    const original = Buffer.from(await cover.arrayBuffer())
    const image = sharp(original, { limitInputPixels: 8_000_000 })
    if ((await image.metadata()).format !== 'jpeg') throw new Error('Format')
    const { data, info } = await image.rotate().resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 86, mozjpeg: true }).toBuffer({ resolveWithObject: true })
    jpeg = data
    ratio = `${info.width}/${info.height}`
  } catch {
    return reply({ error: 'Обложку не удалось прочитать' }, 415)
  }

  const coverHash = createHash('sha256').update(jpeg).digest('hex').slice(0, 16)
  const coverName = `vc-${article.id.slice(0, 16)}-${coverHash}.jpg`
  await mkdir(uploadDir, { recursive: true })
  const temp = path.join(uploadDir, `.${randomUUID()}.tmp`)
  try {
    await writeFile(temp, jpeg, { flag: 'wx' })
    await rename(temp, path.join(uploadDir, coverName))
  } finally {
    await rm(temp, { force: true })
  }

  const category = await prisma.category.findFirst({
    where: { name: 'НОВОСТИ' }, select: { id: true },
  })
  const published = await prisma.article.upsert({
    where: { id },
    update: {},
    create: {
      id,
      slug: `${articleSlugBase(article.title)}_${article.id.slice(0, 12)}`,
      title: article.title,
      excerpt: article.excerpt,
      author: 'Редакция VibeCast',
      categoryId: category?.id ?? null,
      sec: 'feed',
      status: 'published',
      publishedAt: new Date(),
      coverSrc: `/uploads/${coverName}`,
      coverRatio: ratio,
      blocks: JSON.stringify(article.blocks),
    },
    select,
  })
  if (published.status !== 'published') return reply({ error: 'Запись требует проверки в админке' }, 409)
  revalidatePath('/')
  revalidatePath('/admin/articles')
  return reply({ path: articlePath(published) }, 201)
}
