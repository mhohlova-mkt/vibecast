import type { HomeView } from '@/lib/portal'
import styles from './Banner.module.css'

/**
 * Рекламный баннер главной (110px). Приоритет — HTML-код из админки,
 * иначе картинка со ссылкой, иначе плашка «место под баннер».
 */

export default function Banner({ banner }: { banner: HomeView['banner'] }) {
  if (!banner.enabled) return null

  // HTML вставляет владелец через админку (только owner/editor) — это
  // доверенный ввод, ровно как <script>-код рекламной сети на любом сайте.
  if (banner.html.trim()) {
    return (
      <div className={styles.html}>
        <div
          className={styles.htmlInner}
          dangerouslySetInnerHTML={{ __html: banner.html }}
        />
      </div>
    )
  }

  const img = (banner.img || '').trim()

  return (
    <a
      className={styles.banner}
      href={banner.link || '#'}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title="Реклама"
      style={
        img
          ? { background: `url("${img}") center/cover no-repeat` }
          : { background: '#fff' }
      }
    >
      {img ? null : (
        <span className={styles.placeholder}>МЕСТО ПОД БАННЕР</span>
      )}
    </a>
  )
}
