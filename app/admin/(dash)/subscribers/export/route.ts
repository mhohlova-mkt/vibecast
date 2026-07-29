import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * Выгрузка подписчиков файлом — чтобы залить список в сервис рассылок.
 *
 * Точка с запятой как разделитель и BOM в начале: иначе Excel в русской
 * локали открывает CSV одной колонкой и портит кириллицу.
 */

function cell(value: string): string {
  // Кавычки внутри значения удваиваются — правило CSV.
  return `"${value.replace(/"/g, '""')}"`
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !['owner', 'editor'].includes(user.role))
    return new Response('Требуется вход', { status: 401 })

  const rows = await prisma.subscriber.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const header = ['Почта', 'Имя', 'Дайджест', 'Дата'].map(cell).join(';')
  const body = rows
    .map((s) =>
      [
        cell(s.email),
        cell(s.name),
        cell(s.digest ? 'да' : 'нет'),
        cell(s.createdAt.toLocaleDateString('ru-RU')),
      ].join(';'),
    )
    .join('\r\n')

  const csv = `﻿${header}\r\n${body}\r\n`
  const today = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="vibecast-subscribers-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
