import Link from 'next/link'
import styles from './Footer.module.css'

type FooterProps = {
  pages: { id: string; title: string }[]
  /** Server action подписки. Если не передан — форма постит на /api/subscribe. */
  subscribeAction?: (formData: FormData) => void | Promise<void>
}

const SECTIONS = [
  { href: '/', label: 'Лента' },
  { href: '/live', label: 'Вебинары' },
  { href: '/tools', label: 'Инструменты' },
  { href: '/learn', label: 'Обучение' },
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
