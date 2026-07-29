import {
  getBroadcasts,
  getHome,
  getPages,
  getPublishedArticles,
  pickPromo,
} from '@/lib/portal'
import Header from '@/components/portal/Header'
import Footer from '@/components/portal/Footer'
import Hero from '@/components/portal/Hero'
import LivePromo from '@/components/portal/LivePromo'
import Banner from '@/components/portal/Banner'
import PromoMedia from '@/components/portal/PromoMedia'
import ArticleCard from '@/components/portal/ArticleCard'
import SuggestCta from '@/components/portal/SuggestCta'
import styles from './home.module.css'

// Контентом управляет админка — страницы обязаны рендериться на каждый
// запрос. Иначе Next запекает их в статику на сборке и правки редакции
// на сайте не появляются.
export const dynamic = 'force-dynamic'


export default async function Home() {
  const [home, feed, broadcasts, pages] = await Promise.all([
    getHome(),
    getPublishedArticles('feed'),
    getBroadcasts(),
    getPages(),
  ])

  // Закреп из админки; если статья снята с публикации — берём свежайшую.
  const hero = feed.find((a) => a.id === home.heroArticleId) ?? feed[0] ?? null
  const rest = hero ? feed.filter((a) => a.id !== hero.id) : feed

  const promo = pickPromo(broadcasts, home.homePromoId)
  const liveNow = broadcasts.some((b) => b.status === 'live')

  return (
    <div className={styles.page}>
      <Header liveNow={liveNow} viewer={null} />

      <main style={{ flex: 1 }}>
        <section className={styles.heroSection}>
          <div className={styles.heroGrid}>
            {hero ? (
              <Hero
                article={hero}
                mediaSrc={home.heroMediaSrc}
                mediaKind={home.heroMediaKind}
              />
            ) : null}

            <div className={styles.rail}>
              {home.promo.kind === 'media' && home.promo.mediaSrc ? (
                <PromoMedia
                  src={home.promo.mediaSrc}
                  kind={home.promo.mediaKind}
                  link={home.promo.link}
                />
              ) : home.promo.kind === 'hidden' ? null : (
                <LivePromo promo={promo} />
              )}
              <Banner banner={home.banner} />
            </div>
          </div>
        </section>

        <section className={styles.feedSection}>
          <div className={styles.feedHead}>
            <span className={`mono ${styles.kicker}`}>Лента</span>
            <h2 className={styles.feedTitle}>Что происходит в IT</h2>
          </div>

          {rest.length ? (
            <div className={styles.grid}>
              {rest.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>
              Пока нет опубликованных материалов. Добавьте статью в админке.
            </p>
          )}
        </section>

        <section className={styles.ctaSection}>
          <SuggestCta />
        </section>
      </main>

      <Footer pages={pages.map((p) => ({ id: p.id, title: p.title }))} />
    </div>
  )
}
