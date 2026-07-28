import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { getViewer } from '@/lib/viewer'
import { rateLimit } from '@/lib/auth'

/**
 * Загрузка картинок читателем — для формы «предложить новость».
 *
 * Отличия от админской загрузки: только изображения (никакого видео),
 * доступ лишь тем, кто оставил почту, и жёсткий лимит на число файлов
 * в сутки. Всё перекодируется через sharp, так что подсунуть под видом
 * картинки исполняемый файл не выйдет.
 */

const IMAGE = /^image\/(png|jpe?g|webp|gif|avif)$/
const MAX_SIZE = 8 * 1024 * 1024
const PER_DAY = 30

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads')

export async function POST(req: Request) {
  const viewer = await getViewer()
  if (!viewer)
    return NextResponse.json({ error: 'Сначала оставьте почту' }, { status: 401 })

  if (!rateLimit(`upload:${viewer.email}`, PER_DAY, 24 * 60 * 60_000))
    return NextResponse.json(
      { error: 'Слишком много загрузок за сутки' },
      { status: 429 },
    )

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File))
    return NextResponse.json({ error: 'Файл не передан' }, { status: 400 })

  if (!IMAGE.test(file.type))
    return NextResponse.json(
      { error: 'Только изображения: PNG, JPG, WebP, GIF' },
      { status: 415 },
    )

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'Файл больше 8 МБ' }, { status: 413 })

  await mkdir(UPLOAD_DIR, { recursive: true })
  const buf = Buffer.from(await file.arrayBuffer())

  try {
    // GIF не пересобираем — потеряется анимация; остальное приводим к jpeg.
    if (file.type === 'image/gif') {
      await sharp(buf).metadata() // не картинка — бросит исключение
      const name = `${randomUUID()}.gif`
      await writeFile(path.join(UPLOAD_DIR, name), buf)
      return NextResponse.json({ src: `/uploads/${name}` })
    }

    const out = await sharp(buf)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()

    const name = `${randomUUID()}.jpg`
    await writeFile(path.join(UPLOAD_DIR, name), out)
    return NextResponse.json({ src: `/uploads/${name}` })
  } catch {
    return NextResponse.json({ error: 'Файл не похож на изображение' }, { status: 415 })
  }
}
