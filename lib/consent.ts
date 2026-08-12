import 'server-only'
import { headers } from 'next/headers'
import { prisma } from './db'
import { CONSENT_TEXT, type ConsentKind } from './consent.texts'

/**
 * Журнал согласий читателей.
 *
 * Сами формулировки лежат в consent.texts.ts — их показывает браузер,
 * поэтому файл с текстами серверным быть не может. Здесь только запись.
 */

export { CONSENT_TEXT } from './consent.texts'
export type { ConsentKind } from './consent.texts'

/** Где человек дал согласие — чтобы потом понимать, какую форму чинить. */
export type ConsentSource = 'gate' | 'footer' | 'suggest' | 'admin' | 'viewer'

/**
 * IP и браузер запроса.
 *
 * Сайт стоит за nginx и туннелем Cloudflare, поэтому socket-адрес всегда
 * локальный — реальный адрес приходит заголовком. Порядок важен:
 * cf-connecting-ip точнее x-forwarded-for, который клиент может подделать.
 */
async function requestMeta(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = h.get('cf-connecting-ip') ?? h.get('x-real-ip') ?? forwarded ?? ''
  return { ip, userAgent: (h.get('user-agent') ?? '').slice(0, 300) }
}

/**
 * Записать согласие или его отзыв.
 *
 * Ничего не перезаписываем: и выдача, и отзыв ложатся отдельными строками,
 * так восстанавливается вся история по конкретному адресу.
 */
export async function logConsent(params: {
  email: string
  kind: ConsentKind
  granted: boolean
  source: ConsentSource
  /** По умолчанию — канонический текст этого согласия. */
  text?: string
}): Promise<void> {
  const { ip, userAgent } = await requestMeta()
  await prisma.consent.create({
    data: {
      email: params.email.trim().toLowerCase(),
      kind: params.kind,
      granted: params.granted,
      text: params.text ?? CONSENT_TEXT[params.kind],
      source: params.source,
      ip,
      userAgent,
    },
  })
}

/** Галочка в форме: HTML присылает поле только когда она отмечена. */
export function isChecked(fd: FormData, name: string): boolean {
  return fd.get(name) != null
}
