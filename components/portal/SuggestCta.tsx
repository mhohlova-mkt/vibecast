import Link from 'next/link'
import styles from './SuggestCta.module.css'

/**
 * Призыв прислать новость. Стоит в конце ленты: человек дочитал
 * материалы и как раз в настроении что-то предложить. Ссылка в футере
 * для этого не годится — до неё не долистывают.
 */
export default function SuggestCta() {
  return (
    <section className={styles.cta}>
      <div className={styles.text}>
        <span className={`mono ${styles.kicker}`}>Читателям</span>
        <h2 className={styles.title}>Знаете новость? Расскажите</h2>
        <p className={styles.desc}>
          Запустили проект, нашли инструмент, разобрались в сложном — присылайте.
          Прочитаем и опубликуем в ленте под вашим именем.
        </p>
      </div>

      <Link href="/suggest" className={styles.button}>
        Предложить новость
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 17 17 7" />
          <path d="M7 7h10v10" />
        </svg>
      </Link>
    </section>
  )
}
