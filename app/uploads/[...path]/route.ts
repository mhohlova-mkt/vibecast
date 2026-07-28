import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

/**
 * Раздача загруженных файлов.
 *
 * Next отдаёт содержимое public/ только в том виде, в каком оно было
 * на момент сборки — всё, что редакция загрузит позже, он не увидит.
 * Поэтому загрузки живут вне public/ (UPLOAD_DIR) и отдаются отсюда.
 * В бою этот же каталог обычно перехватывает nginx; маршрут остаётся
 * запасным путём и работает в разработке.
 */

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads')

const TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params

  const root = path.resolve(UPLOAD_DIR)
  const file = path.resolve(root, parts.join('/'))

  // Выход за пределы каталога загрузок — только 404, без подробностей.
  if (file !== root && !file.startsWith(root + path.sep)) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const info = await stat(file)
    if (!info.isFile()) return new Response('Not found', { status: 404 })

    const body = await readFile(file)
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': String(info.size),
        'Cache-Control': 'public, max-age=2592000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
