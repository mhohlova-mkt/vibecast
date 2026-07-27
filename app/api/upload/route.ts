import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { getCurrentUser } from '@/lib/auth'

const IMAGE = /^image\/(png|jpe?g|webp|gif|avif)$/
const VIDEO = /^video\/(mp4|webm)$/
const MAX_IMAGE = 8 * 1024 * 1024 // 8 МБ — как в дизайне
const MAX_VIDEO = 12 * 1024 * 1024 // 12 МБ

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads')

/** Загрузка медиа. Только для вошедших в админку. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Требуется вход' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File))
    return NextResponse.json({ error: 'Файл не передан' }, { status: 400 })

  const isImage = IMAGE.test(file.type)
  const isVideo = VIDEO.test(file.type)
  if (!isImage && !isVideo)
    return NextResponse.json(
      { error: 'Поддерживаются изображения (PNG, JPG, WebP, GIF) и видео MP4/WebM' },
      { status: 415 },
    )

  const limit = isVideo ? MAX_VIDEO : MAX_IMAGE
  if (file.size > limit)
    return NextResponse.json(
      { error: `Файл больше ${Math.round(limit / 1048576)} МБ` },
      { status: 413 },
    )

  await mkdir(UPLOAD_DIR, { recursive: true })
  const buf = Buffer.from(await file.arrayBuffer())

  if (isVideo) {
    const ext = file.type === 'video/webm' ? 'webm' : 'mp4'
    const name = `${randomUUID()}.${ext}`
    await writeFile(path.join(UPLOAD_DIR, name), buf)
    return NextResponse.json({ src: `/uploads/${name}`, kind: 'video', ratio: null })
  }

  // GIF не трогаем — ресайз убил бы анимацию.
  if (file.type === 'image/gif') {
    const name = `${randomUUID()}.gif`
    await writeFile(path.join(UPLOAD_DIR, name), buf)
    const meta = await sharp(buf).metadata()
    return NextResponse.json({
      src: `/uploads/${name}`,
      kind: 'image',
      ratio: meta.width && meta.height ? `${meta.width}/${meta.height}` : null,
    })
  }

  // Ресайз до 1600px по ширине с сохранением пропорций (как в дизайне).
  const meta = await sharp(buf).metadata()
  const isPng = file.type === 'image/png'
  const name = `${randomUUID()}.${isPng ? 'png' : 'jpg'}`
  const pipeline = sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true })
  const out = isPng
    ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
    : await pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer()
  await writeFile(path.join(UPLOAD_DIR, name), out)

  return NextResponse.json({
    src: `/uploads/${name}`,
    kind: 'image',
    // Пропорции исходника — вёрстка держит обложку в оригинальном соотношении.
    ratio: meta.width && meta.height ? `${meta.width}/${meta.height}` : null,
  })
}
