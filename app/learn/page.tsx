import type { Metadata } from 'next'
import { getHome, getPublishedArticles } from '@/lib/portal'
import SectionShell from '@/components/portal/SectionShell'
import HorizontalCard from '@/components/portal/HorizontalCard'

// Контентом управляет админка — страницы обязаны рендериться на каждый
// запрос. Иначе Next запекает их в статику на сборке и правки редакции
// на сайте не появляются.
export const dynamic = 'force-dynamic'


export const metadata: Metadata = {
  title: 'Обучение и разборы — vibecast',
  description:
    'Учебные материалы, разборы и практика по IT, вайбкодингу и AI-разработке.',
}

/** Дефолты закрепа EdMe — 1:1 из прототипа (на случай пустых полей в БД). */
const PIN_FALLBACK = {
  title: 'EdMe — профессия в IT с личным ИИ-наставником',
  desc:
    'Подбор направления, индивидуальный план обучения с практикой и поддержка наставника на каждом шаге. 5 направлений, 20 профессий.',
  link: 'https://edme.pro',
} as const

export default async function LearnPage() {
  const [home, items] = await Promise.all([
    getHome(),
    getPublishedArticles('learn'),
  ])
  const pin = home.learnPin

  return (
    <SectionShell kicker="Раздел · Обучение" title="Обучение и разборы">
      {pin.enabled ? (
        <>
          <style>{`
            .vc-learnpin{transition:transform .18s,box-shadow .18s}
            .vc-learnpin:hover{transform:translateY(-3px);box-shadow:0 18px 34px -22px rgba(21,22,15,.6)}
          `}</style>
          <a
            className="vc-learnpin"
            href={pin.link.trim() || PIN_FALLBACK.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              gap: 0,
              background: '#15160F',
              color: '#F4F3EC',
              borderRadius: 22,
              overflow: 'hidden',
              textDecoration: 'none',
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                flex: '0 0 clamp(220px,32%,360px)',
                minHeight: 190,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
                padding: 28,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/uploads/edme-logo-full.png"
                alt="EdMe"
                style={{ width: 'min(72%,220px)', height: 'auto', display: 'block' }}
              />
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 'min(100%,300px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: 'clamp(20px,2.6vw,28px)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: '.06em',
                    color: '#15160F',
                    background: 'var(--accent, #CBF54A)',
                    padding: '5px 11px',
                    borderRadius: 999,
                  }}
                >
                  ★ ЗАКРЕПЛЕНО
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: '.06em',
                    color: '#C7C6BA',
                    border: '1px solid #4A4B40',
                    padding: '5px 11px',
                    borderRadius: 999,
                  }}
                >
                  ПАРТНЁРСКИЙ ПРОЕКТ
                </span>
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: 'clamp(19px,2.2vw,24px)',
                  lineHeight: 1.12,
                  fontWeight: 800,
                  letterSpacing: '-.025em',
                  textWrap: 'balance',
                }}
              >
                {pin.title.trim() || PIN_FALLBACK.title}
              </h3>

              <p
                style={{
                  margin: 0,
                  fontSize: 14.5,
                  lineHeight: 1.55,
                  color: '#A9B29C',
                  flex: 1,
                  maxWidth: '64ch',
                }}
              >
                {pin.desc.trim() || PIN_FALLBACK.desc}
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  paddingTop: 12,
                  borderTop: '1px solid #2A2B22',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: '#F4F3EC' }}>
                  edme.pro
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'var(--accent, #CBF54A)',
                    color: '#15160F',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17 17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </span>
              </div>
            </div>
          </a>
        </>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map((a) => (
          <HorizontalCard key={a.id} article={a} />
        ))}
      </div>
    </SectionShell>
  )
}
