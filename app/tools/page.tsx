import type { Metadata } from 'next'
import { getPublishedArticles } from '@/lib/portal'
import SectionShell from '@/components/portal/SectionShell'
import HorizontalCard from '@/components/portal/HorizontalCard'

export const metadata: Metadata = {
  title: 'Инструменты для вайбкодинга — vibecast',
  description:
    'Разборы инструментов для вайбкодинга и AI-разработки: что выбрать и как применить.',
}

export default async function ToolsPage() {
  const items = await getPublishedArticles('tools')

  return (
    <SectionShell
      kicker="Раздел · Инструменты"
      title="Инструменты для вайбкодинга"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map((a) => (
          <HorizontalCard key={a.id} article={a} />
        ))}
      </div>
    </SectionShell>
  )
}
