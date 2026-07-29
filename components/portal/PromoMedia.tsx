import Link from 'next/link'
import styles from './PromoMedia.module.css'

/**
 * Своя картинка или видео в правом блоке главной — вместо эфира.
 * Нужно, пока трансляций нет: место не должно стоять пустым, а закрыть
 * его баннером выгоднее, чем показывать «эфиров нет».
 */

type PromoMediaProps = {
  src: string
  kind: 'image' | 'video' | null
  link: string
}

export default function PromoMedia({ src, kind, link }: PromoMediaProps) {
  const isVideo = kind === 'video' || /\.(mp4|webm)(\?.*)?$/i.test(src)

  const media = isVideo ? (
    <video
      className={styles.media}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={styles.media} src={src} alt="" />
  )

  if (!link.trim()) return <div className={styles.promo}>{media}</div>

  // Внешние ссылки открываем в новой вкладке, внутренние — обычным переходом.
  const external = /^https?:\/\//i.test(link)
  return external ? (
    <a
      className={styles.promo}
      href={link}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      {media}
    </a>
  ) : (
    <Link className={styles.promo} href={link}>
      {media}
    </Link>
  )
}
