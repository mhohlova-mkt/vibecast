import type { HomeView } from '@/lib/portal'
import styles from './Banner.module.css'

/**
 * Витрина проектов группы (110px). Приоритет — HTML-код из админки,
 * иначе картинка со ссылкой, иначе нейтральная заглушка.
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

  const src = (banner.img || '').trim()
  const isVideo = /\.(mp4|webm)(\?.*)?$/i.test(src)

  return (
    <a
      className={styles.banner}
      href={banner.link || '#'}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title="Проект группы Баксэт"
      style={
        src && !isVideo
          ? { background: `url("${src}") center/cover no-repeat` }
          : { background: '#fff' }
      }
    >
      {/* muted и playsinline обязательны: без них мобильные браузеры
          не дают ролику запуститься сам. */}
      {isVideo ? (
        <video
          className={styles.video}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : null}

      {src ? null : (
        <span className={styles.placeholder}>ВИТРИНА ПРОЕКТОВ</span>
      )}
    </a>
  )
}
