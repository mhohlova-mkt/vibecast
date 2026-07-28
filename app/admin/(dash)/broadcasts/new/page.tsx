import Link from 'next/link'
import BroadcastEditor from '../BroadcastEditor'

export const dynamic = 'force-dynamic'

export default function NewBroadcastPage() {
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
        Новая трансляция
      </h1>

      <BroadcastEditor
        draft={{
          id: null,
          title: '',
          speaker: '',
          role: '',
          speakerAvatar: null,
          date: '',
          time: '',
          status: 'draft',
          link: '',
          embed: false,
          chat: false,
          pollQuestion: '',
          pollOptions: [],
          recordingUrl: null,
          tags: '',
          desc: '',
        }}
      />
    </div>
  )
}
