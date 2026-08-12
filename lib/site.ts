export const SITE_NAME = 'vibecast'
export const SITE_ORIGIN = 'https://vibecast.one'
export const SITE_URL = new URL(SITE_ORIGIN)

/** Превращает локальный путь загрузки в публичный URL для соцсетей и ботов. */
export function publicUrl(path: string): string {
  const value = path.trim()
  if (!value) return `${SITE_ORIGIN}/brand/vibecast-mark.png`
  return new URL(value, SITE_URL).toString()
}
