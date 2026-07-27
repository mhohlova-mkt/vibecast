'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import {
  createSession,
  destroySession,
  hashPassword,
  isSetupComplete,
  rateLimit,
  verifyPassword,
} from '@/lib/auth'

export type FormState = { error?: string } | undefined

/**
 * Первичная настройка: владелец сам задаёт свой пароль.
 * Доступна только пока в базе нет owner с паролем.
 */
export async function setupOwner(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (await isSetupComplete()) return { error: 'Владелец уже создан. Войдите.' }

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  const password2 = String(formData.get('password2') ?? '')

  if (!name) return { error: 'Укажите имя' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Некорректная почта' }
  if (password.length < 10)
    return { error: 'Пароль должен быть не короче 10 символов' }
  if (password !== password2) return { error: 'Пароли не совпадают' }

  const passwordHash = await hashPassword(password)
  const existing = await prisma.user.findUnique({ where: { email } })
  const owner = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { name, role: 'owner', passwordHash, invited: false },
      })
    : await prisma.user.create({
        data: { name, email, role: 'owner', passwordHash },
      })

  await createSession(owner.id)
  redirect('/admin')
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!rateLimit(`login:${email}`))
    return { error: 'Слишком много попыток. Попробуйте через 10 минут.' }

  const user = await prisma.user.findUnique({ where: { email } })
  // Одинаковый текст ошибки, чтобы нельзя было перебором узнать существующие почты.
  const invalid = { error: 'Неверная почта или пароль' }
  if (!user?.passwordHash) return invalid
  if (!(await verifyPassword(password, user.passwordHash))) return invalid

  await createSession(user.id)
  redirect('/admin')
}

export async function logout() {
  await destroySession()
  redirect('/admin/login')
}
