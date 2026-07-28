'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getViewer } from '@/lib/viewer'
import { rateLimit, getCurrentUser } from '@/lib/auth'

export type LiveState = { error?: string } | undefined

const MAX_TEXT = 300
/** Не чаще одного сообщения в 3 секунды и не больше 40 за час. */
const BURST_MS = 3_000
const PER_HOUR = 40

/* ─────────────── Опрос ─────────────── */

/**
 * Голос в опросе — один на зрителя. Повторное нажатие меняет ответ:
 * так честнее, чем «уже голосовали», и накрутку это не открывает —
 * запись в базе всё равно одна.
 */
export async function votePoll(_prev: LiveState, fd: FormData): Promise<LiveState> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'Оставьте почту, чтобы голосовать' }

  const broadcastId = String(fd.get('broadcastId') ?? '')
  const optionIndex = Number(fd.get('optionIndex') ?? -1)
  if (!broadcastId || !Number.isInteger(optionIndex) || optionIndex < 0)
    return { error: 'Неизвестный вариант' }

  const b = await prisma.broadcast.findUnique({ where: { id: broadcastId } })
  if (!b?.pollQuestion) return { error: 'Опроса нет' }

  let options: string[] = []
  try {
    options = b.pollOptions ? JSON.parse(b.pollOptions) : []
  } catch {
    options = []
  }
  if (optionIndex >= options.length) return { error: 'Неизвестный вариант' }

  await prisma.pollVote.upsert({
    where: { broadcastId_email: { broadcastId, email: viewer.email } },
    create: { broadcastId, email: viewer.email, optionIndex },
    update: { optionIndex },
  })
  await prisma.event.create({ data: { kind: 'vote', refId: broadcastId } })

  revalidatePath('/live')
  return undefined
}

/* ─────────────── Чат ─────────────── */

export async function sendChatMessage(
  _prev: LiveState,
  fd: FormData,
): Promise<LiveState> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'Оставьте почту, чтобы писать в чат' }

  const broadcastId = String(fd.get('broadcastId') ?? '')
  const text = String(fd.get('text') ?? '').trim()
  const nameInput = String(fd.get('authorName') ?? '').trim()

  if (!text) return undefined
  if (text.length > MAX_TEXT) return { error: `Не длиннее ${MAX_TEXT} символов` }

  const b = await prisma.broadcast.findUnique({ where: { id: broadcastId } })
  if (!b?.chat) return { error: 'Чат для этого эфира выключен' }

  if (!rateLimit(`chat-burst:${viewer.email}`, 1, BURST_MS))
    return { error: 'Слишком часто — подождите пару секунд' }
  if (!rateLimit(`chat-hour:${viewer.email}`, PER_HOUR, 60 * 60_000))
    return { error: 'Слишком много сообщений за час' }

  // Имя спрашиваем один раз и запоминаем в профиле подписчика.
  let authorName = viewer.name.trim()
  if (nameInput && nameInput !== authorName) {
    authorName = nameInput.slice(0, 40)
    await prisma.subscriber.updateMany({
      where: { email: viewer.email },
      data: { name: authorName },
    })
  }
  if (!authorName) authorName = viewer.email.split('@')[0] ?? 'Гость'

  await prisma.chatMessage.create({
    data: { broadcastId, email: viewer.email, authorName, text },
  })
  await prisma.event.create({ data: { kind: 'chat_msg', refId: broadcastId } })

  return undefined
}

/** Модератор убирает сообщение из ленты. В базе оно остаётся. */
export async function hideChatMessage(fd: FormData) {
  const user = await getCurrentUser()
  if (!user || !['owner', 'editor', 'moderator'].includes(user.role)) return

  const id = String(fd.get('id') ?? '')
  if (!id) return
  await prisma.chatMessage.update({ where: { id }, data: { hidden: true } })
  revalidatePath('/live')
}
