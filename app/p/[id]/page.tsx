import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPage, getPages } from '@/lib/portal'
import SectionShell from '@/components/portal/SectionShell'
import styles from './page.module.css'

// Контентом управляет админка — страницы обязаны рендериться на каждый
// запрос. Иначе Next запекает их в статику на сборке и правки редакции
// на сайте не появляются.
export const dynamic = 'force-dynamic'


/** Страницы компании (about / speakers / contacts) — из футера. */

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const page = await getPage(id)
  if (!page) return { title: 'Страница не найдена — vibecast' }
  return {
    title: `${page.title} — vibecast`,
    description: page.body.split('\n\n')[0]?.slice(0, 160) ?? undefined,
  }
}

export async function generateStaticParams() {
  const pages = await getPages()
  return pages.map((p) => ({ id: p.id }))
}

export default async function CompanyPage({ params }: Params) {
  const { id } = await params
  const page = await getPage(id)
  if (!page) notFound()

  const paragraphs = page.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <SectionShell kicker="vibecast" title={page.title}>
      <div className={styles.body}>
        {paragraphs.map((text, i) => (
          <p key={i} className={styles.paragraph}>
            {text}
          </p>
        ))}
      </div>
    </SectionShell>
  )
}
