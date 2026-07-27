import 'server-only'
import { cookies } from 'next/headers'
import { prisma } from './db'

/**
 * Зритель портала. Регистрация без пароля (имя + e-mail) — так в дизайне.
 * В прототипе зритель лежал в localStorage под ключом `vibecast_viewer`;
 * здесь — httpOnly-кука с e-mail + запись в таблице Subscriber.
 *
 * Файл серверный ('server-only'), но НЕ 'use server' — поэтому getViewer()
 * можно импортировать напрямую из серверных компонентов.
 */

export const VIEWER_COOKIE = 'vc_viewer'

/** 180 дней. */
export const VIEWER_MAX_AGE = 180 * 24 * 60 * 60

export type Viewer = {
  name: string
  email: string
  digest: boolean
}

/** doRegister() из прототипа: /^\S+@\S+\.\S+$/ */
export function isEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value)
}

/** Валидна ли ссылка на Яндекс Телемост (та же проверка, что в админке). */
export function isTelemostLink(link: string | null | undefined): boolean {
  return /^https:\/\/telemost\.yandex\.ru\//.test((link ?? '').trim())
}

/** Текущий зритель или null. Читает куку и сверяет её с базой. */
export async function getViewer(): Promise<Viewer | null> {
  const jar = await cookies()
  const email = jar.get(VIEWER_COOKIE)?.value?.trim().toLowerCase()
  if (!email) return null

  const sub = await prisma.subscriber.findUnique({ where: { email } })
  if (!sub) return null

  return { name: sub.name, email: sub.email, digest: sub.digest }
}
