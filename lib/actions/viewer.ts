'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { isEmail, VIEWER_COOKIE, VIEWER_MAX_AGE } from '@/lib/viewer'
import { CONSENT_TEXT, isChecked, logConsent } from '@/lib/consent'

export type ViewerFormState = { error?: string } | undefined

/**
 * Доступ к материалам в обмен на почту. Аккаунтов и паролей нет:
 * зритель оставляет e-mail и получает доступ к плееру/ссылке Телемоста
 * и архиву записей.
 *
 * Доступ даёт согласие на обработку данных — оно обязательное, потому что
 * без него нельзя хранить даже почту. Рассылка условием доступа НЕ является:
 * это отдельная галочка, по умолчанию снятая. Навязывать её нельзя —
 * согласие на рекламу, полученное как плата за просмотр, ничего не стоит.
 */
export async function registerViewer(
  _prev: ViewerFormState,
  fd: FormData,
): Promise<ViewerFormState> {
  const email = String(fd.get('email') ?? '')
    .trim()
    .toLowerCase()

  if (!isEmail(email)) return { error: 'Проверьте адрес почты' }

  if (!isChecked(fd, 'consentPd')) {
    return { error: 'Без согласия на обработку данных мы не можем сохранить почту' }
  }

  const wantsDigest = isChecked(fd, 'consentAds')

  // Имя в таблице оставляем для писем-обращений; берём локальную часть.
  const name = email.split('@')[0] ?? email

  const existing = await prisma.subscriber.findUnique({ where: { email } })

  // Повторный вход НЕ включает рассылку заново. Человек мог отписаться, и
  // молча вернуть его в список — то же самое, что подписать без спроса.
  // Меняем digest только когда галочка отмечена именно сейчас.
  await prisma.subscriber.upsert({
    where: { email },
    update: wantsDigest ? { digest: true } : {},
    create: { name, email, digest: wantsDigest },
  })

  await logConsent({ email, kind: 'pd', granted: true, source: 'gate' })
  if (wantsDigest && !existing?.digest) {
    await logConsent({ email, kind: 'ads', granted: true, source: 'gate' })
  }

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

/** Тумблер дайджеста в чипе зрителя — то самое «отписаться в один клик». */
export async function setDigest(fd: FormData) {
  const jar = await cookies()
  const email = jar.get(VIEWER_COOKIE)?.value?.trim().toLowerCase()
  if (!email) return

  const granted = isChecked(fd, 'digest')

  const current = await prisma.subscriber.findUnique({ where: { email } })
  if (!current || current.digest === granted) return

  await prisma.subscriber.update({ where: { email }, data: { digest: granted } })
  // Отзыв согласия фиксируем так же тщательно, как выдачу: если человек
  // потом пожалуется на письма, нам нужно показать, когда он отписался.
  await logConsent({ email, kind: 'ads', granted, source: 'viewer' })
  revalidatePath('/live')
}

export async function logoutViewer() {
  const jar = await cookies()
  jar.delete(VIEWER_COOKIE)
  revalidatePath('/live')
}

export type SubscribeState = { error?: string; ok?: boolean } | undefined

/**
 * Подписка на дайджест из футера.
 *
 * В форме два отдельных согласия: на обработку адреса и на отправку
 * дайджеста. Оба текста сохраняются в журнале ровно в показанном виде.
 */
export async function subscribeDigest(
  _prev: SubscribeState,
  fd: FormData,
): Promise<SubscribeState> {
  const email = String(fd.get('email') ?? '')
    .trim()
    .toLowerCase()
  if (!isEmail(email)) return { error: 'Проверьте адрес почты' }

  if (!isChecked(fd, 'consentPd')) {
    return { error: 'Подтвердите обработку адреса — без этого подписка невозможна' }
  }
  if (!isChecked(fd, 'consentAds')) {
    return { error: 'Подтвердите получение дайджеста' }
  }

  const existing = await prisma.subscriber.findUnique({ where: { email } })

  await prisma.subscriber.upsert({
    where: { email },
    update: { digest: true },
    create: { name: email.split('@')[0] ?? email, email, digest: true },
  })

  await logConsent({
    email,
    kind: 'pd',
    granted: true,
    source: 'footer',
    text: CONSENT_TEXT.pd,
  })
  if (!existing?.digest) {
    await logConsent({
      email,
      kind: 'ads',
      granted: true,
      source: 'footer',
      text: CONSENT_TEXT.ads,
    })
  }

  return { ok: true }
}
