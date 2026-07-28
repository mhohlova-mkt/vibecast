'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireUser, hashPassword } from '@/lib/auth'

const TELEMOST = /^https:\/\/telemost\.yandex\.ru\//

/** Разрешённые площадки для встраивания — только те, что это позволяют. */
const EMBEDDABLE = /^https:\/\/(vkvideo\.ru|vk\.com|rutube\.ru)\//

/**
 * Из админки удобнее вставлять целиком «код для вставки» — вытаскиваем
 * из него адрес сам, чтобы не заставлять редакцию ковыряться в разметке.
 */
function extractEmbedUrl(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  const fromIframe = /<iframe[^>]+src=["']([^"']+)["']/i.exec(value)
  const url = (fromIframe?.[1] ?? value).trim()
  if (!EMBEDDABLE.test(url))
    throw new Error('Поддерживаются ссылки VK Видео и Rutube — Телемост встраивать нельзя')
  return url
}

/** Обновляем и админку, и затронутые страницы портала. */
function refresh(...paths: string[]) {
  for (const p of ['/', ...paths]) revalidatePath(p)
}

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim()
}
function bool(fd: FormData, key: string) {
  return fd.get(key) === 'on' || fd.get(key) === 'true'
}

/* ─────────────── Трансляции ─────────────── */

export async function saveBroadcast(fd: FormData) {
  await requireUser(['owner', 'editor'])

  const id = str(fd, 'id')
  const link = str(fd, 'link')
  if (link && !TELEMOST.test(link))
    throw new Error('Ссылка должна начинаться с https://telemost.yandex.ru/')

  const options = (fd.getAll('pollOption') as string[])
    .map((o) => o.trim())
    .filter(Boolean)
  const question = str(fd, 'pollQuestion')

  const data = {
    title: str(fd, 'title') || 'Без названия',
    speaker: str(fd, 'speaker'),
    role: str(fd, 'role'),
    speakerAvatar: str(fd, 'speakerAvatar') || null,
    date: str(fd, 'date'),
    time: str(fd, 'time'),
    status: str(fd, 'status') || 'draft',
    link,
    embedUrl: extractEmbedUrl(str(fd, 'embedUrl')) || null,
    embed: bool(fd, 'embed'),
    chat: bool(fd, 'chat'),
    pollQuestion: question && options.length >= 2 ? question : null,
    pollOptions: question && options.length >= 2 ? JSON.stringify(options) : null,
    recordingUrl: str(fd, 'recordingUrl') || null,
    tags: str(fd, 'tags'),
    desc: str(fd, 'desc'),
  }

  if (id) await prisma.broadcast.update({ where: { id }, data })
  else await prisma.broadcast.create({ data })

  refresh('/live', '/admin/broadcasts')
  redirect('/admin/broadcasts')
}

export async function deleteBroadcast(fd: FormData) {
  await requireUser(['owner', 'editor'])
  const id = str(fd, 'id')
  if (!id) return
  await prisma.broadcast.delete({ where: { id } })
  // Снимаем закреп, если удалили закреплённую.
  await prisma.home.updateMany({
    where: { homePromoId: id },
    data: { homePromoId: null },
  })
  refresh('/live', '/admin/broadcasts')
}

/** Закреп промо на главной — эксклюзивный (один на всё). */
export async function pinBroadcast(fd: FormData) {
  await requireUser(['owner', 'editor'])
  const id = str(fd, 'id')
  const current = await prisma.home.findUnique({ where: { id: 'home' } })
  const next = current?.homePromoId === id ? null : id
  await prisma.home.upsert({
    where: { id: 'home' },
    create: { id: 'home', homePromoId: next },
    update: { homePromoId: next },
  })
  refresh('/admin/broadcasts')
}

/* ─────────────── Статьи ─────────────── */

export async function saveArticle(fd: FormData) {
  await requireUser(['owner', 'editor'])

  const id = str(fd, 'id')
  const publish = str(fd, 'intent') === 'publish'

  // Блоки приходят одним JSON-полем из клиентского редактора.
  let blocks = '[]'
  try {
    const raw = str(fd, 'blocks')
    if (raw) blocks = JSON.stringify(JSON.parse(raw))
  } catch {
    throw new Error('Не удалось сохранить содержимое статьи')
  }

  const status = publish ? 'published' : 'draft'
  const data = {
    title: str(fd, 'title') || 'Без заголовка',
    categoryId: str(fd, 'categoryId') || null,
    author: str(fd, 'author'),
    authorAvatar: str(fd, 'authorAvatar') || null,
    excerpt: str(fd, 'excerpt'),
    coverSrc: str(fd, 'coverSrc') || null,
    coverRatio: str(fd, 'coverRatio') || null,
    sec: str(fd, 'sec') || 'feed',
    blocks,
    status,
  }

  if (id) {
    const prev = await prisma.article.findUnique({ where: { id } })
    await prisma.article.update({
      where: { id },
      data: {
        ...data,
        publishedAt:
          publish && !prev?.publishedAt ? new Date() : (prev?.publishedAt ?? null),
      },
    })
  } else {
    await prisma.article.create({
      data: { ...data, publishedAt: publish ? new Date() : null },
    })
  }

  refresh('/tools', '/learn', '/admin/articles')
  redirect('/admin/articles')
}

export async function deleteArticle(fd: FormData) {
  await requireUser(['owner', 'editor'])
  const id = str(fd, 'id')
  if (!id) return
  await prisma.article.delete({ where: { id } })
  await prisma.home.updateMany({
    where: { heroArticleId: id },
    data: { heroArticleId: null },
  })
  refresh('/tools', '/learn', '/admin/articles')
}

/* ─────────────── Рубрики ─────────────── */

export async function saveCategory(fd: FormData) {
  await requireUser(['owner', 'editor'])
  const id = str(fd, 'id')
  const name = str(fd, 'name').toUpperCase()
  if (!name) return
  const data = { name, bg: str(fd, 'bg') || 'accent', text: str(fd, 'text') || '#15160F' }
  if (id) await prisma.category.update({ where: { id }, data })
  else await prisma.category.create({ data })
  refresh('/admin/articles')
}

/** Удалять можно только пустые рубрики — правило из дизайна. */
export async function deleteCategory(fd: FormData) {
  await requireUser(['owner', 'editor'])
  const id = str(fd, 'id')
  const used = await prisma.article.count({ where: { categoryId: id } })
  if (used > 0) throw new Error(`Рубрика используется в ${used} материалах`)
  await prisma.category.delete({ where: { id } })
  refresh('/admin/articles')
}

/* ─────────────── Главная и страницы ─────────────── */

export async function saveHome(fd: FormData) {
  await requireUser(['owner', 'editor'])
  const data = {
    heroArticleId: str(fd, 'heroArticleId') || null,
    heroMediaSrc: str(fd, 'heroMediaSrc') || null,
    heroMediaKind: str(fd, 'heroMediaKind') || null,
    bannerEnabled: bool(fd, 'bannerEnabled'),
    bannerHtml: str(fd, 'bannerHtml'),
    bannerImg: str(fd, 'bannerImg') || null,
    bannerLink: str(fd, 'bannerLink'),
    learnPinOn: bool(fd, 'learnPinOn'),
    learnPinImg: str(fd, 'learnPinImg') || null,
    learnPinTitle: str(fd, 'learnPinTitle'),
    learnPinDesc: str(fd, 'learnPinDesc'),
    learnPinLink: str(fd, 'learnPinLink'),
  }
  await prisma.home.upsert({
    where: { id: 'home' },
    create: { id: 'home', ...data },
    update: data,
  })
  refresh('/learn', '/admin')
}

export async function savePage(fd: FormData) {
  await requireUser(['owner', 'editor'])
  const id = str(fd, 'id')
  if (!id) return
  const data = { title: str(fd, 'title'), body: str(fd, 'body') }
  await prisma.page.upsert({ where: { id }, create: { id, ...data }, update: data })
  refresh(`/p/${id}`, '/admin/pages')
}

/* ─────────────── Команда ─────────────── */

export async function inviteMember(fd: FormData) {
  await requireUser(['owner'])
  const email = str(fd, 'email').toLowerCase()
  const name = str(fd, 'name')
  const role = str(fd, 'role') || 'editor'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Некорректная почта')
  if (!['editor', 'moderator'].includes(role)) throw new Error('Недопустимая роль')
  await prisma.user.upsert({
    where: { email },
    create: { email, name: name || email, role, invited: true },
    update: { name: name || email, role },
  })
  refresh('/admin/team')
}

export async function changeRole(fd: FormData) {
  await requireUser(['owner'])
  const id = str(fd, 'id')
  const role = str(fd, 'role')
  if (!['editor', 'moderator'].includes(role)) throw new Error('Недопустимая роль')
  const target = await prisma.user.findUnique({ where: { id } })
  if (target?.role === 'owner') throw new Error('Нельзя изменить роль владельца')
  await prisma.user.update({ where: { id }, data: { role } })
  refresh('/admin/team')
}

/**
 * Владелец задаёт пароль участнику вручную.
 * Пока не подключена почта, это единственный способ впустить человека
 * в админку: приглашение по ссылке требует отправки письма.
 */
export async function setMemberPassword(fd: FormData) {
  await requireUser(['owner'])
  const id = str(fd, 'id')
  const password = String(fd.get('password') ?? '')

  if (password.length < 10)
    throw new Error('Пароль должен быть не короче 10 символов')

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw new Error('Участник не найден')
  if (target.role === 'owner') throw new Error('Пароль владельца меняется только им самим')

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), invited: false },
  })
  refresh('/admin/team')
}

export async function removeMember(fd: FormData) {
  await requireUser(['owner'])
  const id = str(fd, 'id')
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return
  if (target.role === 'owner') throw new Error('Нельзя удалить владельца')
  await prisma.user.delete({ where: { id } })
  refresh('/admin/team')
}
