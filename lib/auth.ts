import 'server-only'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

export const SESSION_COOKIE = 'vc_session'
const SESSION_DAYS = 30

export type Role = 'owner' | 'editor' | 'moderator'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12)
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

/** Владелец уже завёл пароль? Если нет — показываем первичную настройку. */
export async function isSetupComplete() {
  const owner = await prisma.user.findFirst({
    where: { role: 'owner', passwordHash: { not: null } },
    select: { id: true },
  })
  return Boolean(owner)
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5)
  const session = await prisma.session.create({ data: { userId, expiresAt } })
  const jar = await cookies()
  jar.set(SESSION_COOKIE, session.id, {
    httpOnly: true, // недоступна из JS — защита от XSS-кражи
    sameSite: 'lax', // защита от CSRF
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
  return session
}

export async function destroySession() {
  const jar = await cookies()
  const id = jar.get(SESSION_COOKIE)?.value
  if (id) await prisma.session.deleteMany({ where: { id } })
  jar.delete(SESSION_COOKIE)
}

/** Текущий пользователь админки или null. Проверяется на сервере при каждом запросе. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  const id = jar.get(SESSION_COOKIE)?.value
  if (!id) return null

  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true },
  })
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id } }).catch(() => {})
    return null
  }

  prisma.user
    .update({ where: { id: session.userId }, data: { lastSeenAt: new Date() } })
    .catch(() => {})

  const { user } = session
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
  }
}

/** Для API-роутов: бросает 401/403, если нет прав. */
export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser()
  if (!user) throw new AuthError('Требуется вход', 401)
  if (roles && !roles.includes(user.role)) throw new AuthError('Недостаточно прав', 403)
  return user
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Простая защита от перебора пароля: не более N попыток на email за окно. */
const attempts = new Map<string, { n: number; until: number }>()
export function rateLimit(key: string, max = 8, windowMs = 10 * 60_000) {
  const now = Date.now()
  const rec = attempts.get(key)
  if (!rec || rec.until < now) {
    attempts.set(key, { n: 1, until: now + windowMs })
    return true
  }
  rec.n += 1
  return rec.n <= max
}
