import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getViewer } from '@/lib/viewer'
import { getCurrentUser } from '@/lib/auth'

/**
 * Лента чата. Клиент раз в несколько секунд спрашивает, что нового.
 *
 * Опрос вместо постоянного соединения выбран намеренно: постоянное
 * соединение пришлось бы отдельно настраивать в nginx (буферизация,
 * таймауты), а выигрыш для чата вебинара — секунды. Здесь надёжность
 * важнее мгновенности.
 */

const LIMIT = 200

export async function GET(req: Request) {
  const viewer = await getViewer()
  if (!viewer)
    return NextResponse.json({ error: 'Нужна почта' }, { status: 401 })

  const url = new URL(req.url)
  const broadcastId = url.searchParams.get('broadcastId') ?? ''
  if (!broadcastId)
    return NextResponse.json({ error: 'Не указан эфир' }, { status: 400 })

  const b = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
    select: { chat: true },
  })
  if (!b?.chat) return NextResponse.json({ messages: [] })

  const rows = await prisma.chatMessage.findMany({
    where: { broadcastId, hidden: false },
    orderBy: { createdAt: 'desc' },
    take: LIMIT,
    select: {
      id: true,
      authorName: true,
      text: true,
      email: true,
      createdAt: true,
    },
  })

  // Модератору отдаём id для удаления; обычному зрителю — нет.
  const user = await getCurrentUser()
  const canModerate =
    user != null && ['owner', 'editor', 'moderator'].includes(user.role)

  return NextResponse.json(
    {
      canModerate,
      messages: rows.reverse().map((m) => ({
        id: m.id,
        author: m.authorName,
        text: m.text,
        mine: m.email === viewer.email,
        at: m.createdAt.toISOString(),
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
