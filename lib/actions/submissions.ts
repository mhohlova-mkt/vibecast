'use server'

import { prisma } from '@/lib/db'
import { getViewer } from '@/lib/viewer'
import { rateLimit, requireUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type SubmitState = { error?: string; ok?: boolean } | undefined

/** Форма, заполненная быстрее — почти наверняка бот. */
const MIN_FILL_SECONDS = 5
/** Сколько заявок принимаем с одной почты в сутки. */
const PER_DAY = 3

const MIN_TITLE = 8
const MIN_TEXT = 200
const MAX_TEXT = 20_000
const MAX_IMAGES = 8

/**
 * Приём новости от читателя.
 *
 * Защита выстроена слоями, от дешёвых проверок к дорогим:
 * 1. предлагать может только оставивший почту (кука зрителя);
 * 2. поле-ловушка, невидимое человеку, но заполняемое ботами;
 * 3. проверка времени заполнения;
 * 4. ограничение числа заявок с одной почты в сутки.
 * Капча сюда добавляется пятым слоем, если этих окажется мало.
 */
export async function submitNews(
  _prev: SubmitState,
  fd: FormData,
): Promise<SubmitState> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'Сначала оставьте почту — так мы знаем, кому отвечать' }

  // Ловушка: настоящий человек это поле не видит и не заполняет.
  // Молчим про причину, чтобы бот не подстроился.
  if (String(fd.get('website') ?? '').trim()) return { ok: true }

  const startedAt = Number(fd.get('startedAt') ?? 0)
  if (!startedAt || (Date.now() - startedAt) / 1000 < MIN_FILL_SECONDS) {
    return { error: 'Слишком быстро. Проверьте текст и отправьте ещё раз' }
  }

  if (!rateLimit(`submit:${viewer.email}`, PER_DAY, 24 * 60 * 60_000)) {
    return { error: `Не больше ${PER_DAY} новостей в сутки. Попробуйте завтра` }
  }

  const authorName = String(fd.get('authorName') ?? '').trim()
  const title = String(fd.get('title') ?? '').trim()
  const text = String(fd.get('text') ?? '').trim()
  const authorPhoto = String(fd.get('authorPhoto') ?? '').trim()

  if (authorName.length < 2) return { error: 'Укажите имя' }
  if (title.length < MIN_TITLE) return { error: 'Заголовок слишком короткий' }
  if (text.length < MIN_TEXT)
    return { error: `Текст слишком короткий — нужно хотя бы ${MIN_TEXT} символов` }
  if (text.length > MAX_TEXT) return { error: 'Текст слишком длинный' }

  let images: string[] = []
  try {
    const raw = String(fd.get('images') ?? '[]')
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      images = parsed
        .filter((x): x is string => typeof x === 'string')
        .filter((x) => x.startsWith('/uploads/'))
        .slice(0, MAX_IMAGES)
    }
  } catch {
    images = []
  }

  await prisma.submission.create({
    data: {
      authorName,
      authorEmail: viewer.email,
      authorPhoto: authorPhoto.startsWith('/uploads/') ? authorPhoto : null,
      title,
      text,
      images: JSON.stringify(images),
    },
  })

  revalidatePath('/admin/submissions')
  return { ok: true }
}

/* ─────────────── Модерация ─────────────── */

/** Одобрение: заявка превращается в статью — черновиком или сразу в ленту. */
export async function approveSubmission(fd: FormData) {
  await requireUser(['owner', 'editor'])

  const id = String(fd.get('id') ?? '')
  const publish = String(fd.get('intent') ?? '') === 'publish'
  const s = await prisma.submission.findUnique({ where: { id } })
  if (!s) return

  let images: string[] = []
  try {
    images = JSON.parse(s.images)
  } catch {
    images = []
  }

  // Первая картинка становится обложкой, остальные — блоками в тексте.
  const [cover, ...rest] = images
  const blocks = [
    { type: 'text', content: s.text },
    ...rest.map((src) => ({ type: 'image', content: src, caption: '' })),
  ]

  await prisma.article.create({
    data: {
      title: s.title,
      author: s.authorName,
      authorAvatar: s.authorPhoto,
      excerpt: s.text.slice(0, 220).trim(),
      coverSrc: cover ?? null,
      sec: 'feed',
      status: publish ? 'published' : 'draft',
      publishedAt: publish ? new Date() : null,
      blocks: JSON.stringify(blocks),
    },
  })

  await prisma.submission.update({
    where: { id },
    data: { status: 'approved', reviewedAt: new Date() },
  })

  revalidatePath('/')
  revalidatePath('/admin/submissions')
  revalidatePath('/admin/articles')
}

export async function rejectSubmission(fd: FormData) {
  await requireUser(['owner', 'editor'])
  const id = String(fd.get('id') ?? '')
  const note = String(fd.get('note') ?? '').trim()
  await prisma.submission.update({
    where: { id },
    data: { status: 'rejected', note, reviewedAt: new Date() },
  })
  revalidatePath('/admin/submissions')
}
