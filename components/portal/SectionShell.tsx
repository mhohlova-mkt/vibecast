import { getBroadcasts, getPages } from '@/lib/portal'
import Header from './Header'
import Footer from './Footer'

/**
 * Обёртка разделов «Инструменты» / «Обучение».
 * Шапка + шапка раздела (пилюля-кикер + заголовок) + контент + футер.
 * Значения 1:1 из прототипа (секция isSection).
 */

type SectionShellProps = {
  title: string
  kicker?: string
  children: React.ReactNode
}

export default async function SectionShell({
  title,
  kicker,
  children,
}: SectionShellProps) {
  const [broadcasts, pages] = await Promise.all([getBroadcasts(), getPages()])
  const liveNow = broadcasts.some((b) => b.status === 'live')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Header liveNow={liveNow} viewer={null} />

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          padding:
            'clamp(26px,4vw,50px) clamp(16px,4vw,40px) clamp(36px,5vw,56px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            marginBottom: 'clamp(20px,3vw,30px)',
          }}
        >
          {kicker ? (
            <span
              className="mono"
              style={{
                alignSelf: 'flex-start',
                border: '1px solid #15160F',
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '.1em',
                color: '#15160F',
              }}
            >
              {kicker}
            </span>
          ) : null}
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(28px,4vw,46px)',
              fontWeight: 800,
              letterSpacing: '-.04em',
              lineHeight: 0.95,
            }}
          >
            {title}
          </h2>
        </div>

        {children}
      </main>

      <Footer pages={pages.map((p) => ({ id: p.id, title: p.title }))} />
    </div>
  )
}
