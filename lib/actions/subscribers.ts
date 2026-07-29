'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'

/**
 * Подписчики. Удаление — не прихоть: человек имеет право потребовать
 * убрать свои данные, и такая кнопка должна быть у редакции под рукой.
 */

export async function removeSubscriber(fd: FormData) {
  await requireUser(['owner', 'editor'])
  const id = String(fd.get('id') ?? '')
  if (!id) return
  await prisma.subscriber.delete({ where: { id } })
  revalidatePath('/admin/subscribers')
}

/** Тумблер согласия на дайджест — если человек попросил его отключить. */
export async function toggleDigest(fd: FormData) {
  await requireUser(['owner', 'editor'])
  const id = String(fd.get('id') ?? '')
  if (!id) return
  const s = await prisma.subscriber.findUnique({ where: { id } })
  if (!s) return
  await prisma.subscriber.update({
    where: { id },
    data: { digest: !s.digest },
  })
  revalidatePath('/admin/subscribers')
}
