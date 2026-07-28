import type { Metadata } from 'next'
import { getViewer } from '@/lib/viewer'
import SectionShell from '@/components/portal/SectionShell'
import SuggestForm from '@/components/portal/SuggestForm'
import EmailGate from '@/components/portal/EmailGate'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Предложить новость — vibecast',
  description:
    'Расскажите о том, что происходит в IT и вайбкодинге. Редакция прочитает и опубликует под вашим именем.',
}

export default async function SuggestPage() {
  const viewer = await getViewer()

  return (
    <SectionShell kicker="Читателям" title="Предложить новость">
      {viewer ? (
        <SuggestForm email={viewer.email} />
      ) : (
        <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.6, color: '#3A3B30' }}>
            Новости принимаем от читателей, оставивших почту — так редакция знает,
            к кому вернуться с вопросом, и так мы отсекаем спам.
          </p>
          <div
            style={{
              background: '#15160F',
              borderRadius: 22,
              padding: 'clamp(20px,3vw,28px)',
            }}
          >
            <EmailGate
              tone="dark"
              submitLabel="Продолжить"
              note="Одно поле — и форма откроется. Регистрироваться не нужно."
            />
          </div>
        </div>
      )}
    </SectionShell>
  )
}
