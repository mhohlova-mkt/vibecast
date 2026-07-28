import Link from 'next/link'
import styles from './Footer.module.css'

type FooterProps = {
  pages: { id: string; title: string }[]
  /** Server action подписки. Если не передан — форма постит на /api/subscribe. */
  subscribeAction?: (formData: FormData) => void | Promise<void>
}

/** Каналы проекта. Иконки рисуем сами — сторонние наборы тянуть незачем. */
const SOCIAL = [
  {
    href: 'https://t.me/vibecaast',
    label: 'Telegram',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.94 4.6 18.9 19.1c-.23 1.02-.84 1.27-1.7.79l-4.7-3.47-2.27 2.18c-.25.25-.46.46-.95.46l.34-4.79 8.72-7.88c.38-.34-.08-.53-.59-.19L6.98 13.09l-4.63-1.45c-1-.31-1.02-1 .21-1.48l18.1-6.98c.84-.31 1.57.2 1.28 1.42Z" />
      </svg>
    ),
  },
  {
    href: 'https://vk.ru/vibecaast',
    label: 'ВКонтакте',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.16 17.2c-5.35 0-8.55-3.72-8.68-9.9h2.7c.09 4.55 2.13 6.48 3.76 6.88V7.3h2.55v3.86c1.6-.17 3.28-2 3.85-3.86h2.54c-.43 2.3-2.22 4.13-3.5 4.88 1.28.61 3.31 2.2 4.09 5.02h-2.8c-.6-1.9-2.13-3.37-4.18-3.57v3.57h-.33Z" />
      </svg>
    ),
  },
] as const

const SECTIONS = [
  { href: '/', label: 'Лента' },
  { href: '/live', label: 'Вебинары' },
  { href: '/tools', label: 'Инструменты' },
  { href: '/learn', label: 'Обучение' },
  { href: '/suggest', label: 'Предложить новость' },
] as const

export default function Footer({ pages, subscribeAction }: FooterProps) {
  const formProps: React.ComponentProps<'form'> = subscribeAction
    ? { action: subscribeAction }
    : { action: '/api/subscribe', method: 'post' }

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <h2 className={styles.logo}>vibecast</h2>
          <span className={styles.topArrow} aria-hidden="true">
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </span>
        </div>

        <div className={styles.cols}>
          <div className={styles.about}>
            <p className={styles.aboutText}>
              Медиа и платформа вебинаров об IT, вайбкодинге и инструментах для
              бизнеса.
            </p>

            <div className={styles.social}>
              {SOCIAL.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                  title={s.label}
                >
                  {s.icon}
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <div className={styles.col}>
            <span className={styles.colTitle}>Контент</span>
            {SECTIONS.map((s) => (
              <Link key={s.href} href={s.href} className={styles.colLink}>
                {s.label}
              </Link>
            ))}
          </div>

          <div className={styles.col}>
            <span className={styles.colTitle}>Компания</span>
            {pages.map((p) => (
              <Link key={p.id} href={`/p/${p.id}`} className={styles.colLink}>
                {p.title}
              </Link>
            ))}
          </div>

          <div className={styles.sub}>
            <span className={styles.colTitle}>Рассылка</span>
            <p className={styles.subText}>
              Дайджест эфиров и материалов раз в неделю
            </p>
            <form {...formProps} className={styles.subForm}>
              <input
                type="email"
                name="email"
                required
                placeholder="e-mail"
                aria-label="e-mail"
                className={styles.subInput}
              />
              <button type="submit" className={styles.subBtn}>
                ОК
              </button>
            </form>
          </div>
        </div>

        <div className={styles.bottom}>
          <span>© 2026 vibecast · Все права защищены</span>
          <span className={styles.built}>built with vibes ✦</span>
        </div>
      </div>
    </footer>
  )
}
