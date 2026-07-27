'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { isEmail, VIEWER_COOKIE, VIEWER_MAX_AGE } from '@/lib/viewer'

export type ViewerFormState = { error?: string } | undefined

/**
 * Доступ к материалам в обмен на почту. Аккаунтов и паролей нет:
 * зритель оставляет e-mail, попадает в список рассылки и получает
 * доступ к плееру/ссылке Телемоста и архиву записей.
 * Подписка здесь и есть условие доступа — отдельной галочки нет.
 */
export async function registerViewer(
  _prev: ViewerFormState,
  fd: FormData,
): Promise<ViewerFormState> {
  const email = String(fd.get('email') ?? '')
    .trim()
    .toLowerCase()

  if (!isEmail(email)) return { error: 'Проверьте адрес почты' }

  // Имя в таблице оставляем для писем-обращений; берём локальную часть.
  const name = email.split('@')[0] ?? email

  await prisma.subscriber.upsert({
    where: { email },
    update: { digest: true },
    create: { name, email, digest: true },
  })

  const jar = await cookies()
  jar.set(VIEWER_COOKIE, email, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VIEWER_MAX_AGE,
  })

  revalidatePath('/live')
  return undefined
}

/** Тумблер дайджеста в чипе зрителя. */
export async function setDigest(fd: FormData) {
  const jar = await cookies()
  const email = jar.get(VIEWER_COOKIE)?.value?.trim().toLowerCase()
  if (!email) return

  await prisma.subscriber.updateMany({
    where: { email },
    data: { digest: fd.get('digest') != null },
  })
  revalidatePath('/live')
}

export async function logoutViewer() {
  const jar = await cookies()
  jar.delete(VIEWER_COOKIE)
  revalidatePath('/live')
}

/** Подписка на дайджест из футера. */
export async function subscribeDigest(fd: FormData) {
  const email = String(fd.get('email') ?? '')
    .trim()
    .toLowerCase()
  if (!isEmail(email)) return

  await prisma.subscriber.upsert({
    where: { email },
    update: { digest: true },
    create: { name: email.split('@')[0] ?? email, email, digest: true },
  })
}
