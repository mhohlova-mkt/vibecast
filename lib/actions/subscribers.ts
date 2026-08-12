'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { logConsent } from '@/lib/consent'

/**
 * Подписчики. Удаление — не прихоть: человек имеет право потребовать
 * убрать свои данные, и такая кнопка должна быть у редакции под рукой.
 */

/**
 * Удаление всех данных человека по требованию.
 *
 * Почта лежит не только в Subscriber: непроверенные заявки на новости и
 * сообщения в чате эфира тоже подписаны адресом. Удалять надо всё разом,
 * иначе обещание «удалим по первому обращению» в политике — неправда.
 *
 * Журнал согласий (Consent) при этом НЕ трогаем: он и есть доказательство
 * того, что до удаления мы обрабатывали данные законно, а после удаления —
 * что человек попросил и мы исполнили. Стереть его — значит остаться без
 * защиты по той же самой жалобе.
 *
 * Уже опубликованные статьи остаются: там авторство под настоящим именем,
 * это обнародованный материал, а не карточка в базе. Если человек просит
 * снять и его — это ручное решение редакции в разделе «Статьи».
 */
export async function removeSubscriber(fd: FormData) {
  await requireUser(['owner', 'editor'])
  const id = String(fd.get('id') ?? '')
  if (!id) return

  const s = await prisma.subscriber.findUnique({ where: { id } })
  if (!s) return

  await prisma.$transaction([
    prisma.submission.deleteMany({ where: { authorEmail: s.email } }),
    prisma.chatMessage.deleteMany({ where: { email: s.email } }),
    prisma.subscriber.delete({ where: { id } }),
  ])

  await logConsent({
    email: s.email,
    kind: 'pd',
    granted: false,
    source: 'admin',
    text: 'Данные удалены по обращению субъекта.',
  })

  revalidatePath('/admin/subscribers')
  revalidatePath('/admin/submissions')
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
  // Редакция меняет чужое согласие руками — тем более надо записать, кто и когда.
  await logConsent({
    email: s.email,
    kind: 'ads',
    granted: !s.digest,
    source: 'admin',
    text: 'Изменено редакцией в админке по обращению подписчика.',
  })
  revalidatePath('/admin/subscribers')
}
