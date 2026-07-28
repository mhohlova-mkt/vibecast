import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import BroadcastEditor from '../BroadcastEditor'

export const dynamic = 'force-dynamic'

export default async function EditBroadcastPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const b = await prisma.broadcast.findUnique({ where: { id } })
  if (!b) notFound()

  let pollOptions: string[] = []
  try {
    pollOptions = b.pollOptions ? JSON.parse(b.pollOptions) : []
  } catch {
    pollOptions = []
  }

  return (
    <div>
      <Link
        href="/admin/broadcasts"
        style={{
          display: 'inline-block',
          marginBottom: 18,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--muted)',
          textDecoration: 'none',
        }}
      >
        ← К списку
      </Link>
      <h1
        style={{
          margin: '0 0 22px',
          fontSize: 'clamp(26px,3.4vw,38px)',
          fontWeight: 800,
          letterSpacing: '-.04em',
        }}
      >
        {b.title || 'Без названия'}
      </h1>

      <BroadcastEditor
        draft={{
          id: b.id,
          title: b.title,
          speaker: b.speaker,
          role: b.role,
          speakerAvatar: b.speakerAvatar,
          date: b.date,
          time: b.time,
          status: b.status,
          link: b.link,
          embedUrl: b.embedUrl,
          embed: b.embed,
          chat: b.chat,
          pollQuestion: b.pollQuestion ?? '',
          pollOptions,
          recordingUrl: b.recordingUrl,
          tags: b.tags,
          desc: b.desc,
        }}
      />
    </div>
  )
}
