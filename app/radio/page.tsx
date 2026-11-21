import type { Metadata } from 'next'
import Link from 'next/link'
import SectionShell from '@/components/portal/SectionShell'
import VibeRadio from '@/components/portal/VibeRadio'
import LofiRadio from './LofiRadio'
import styles from './radio.module.css'

export const metadata: Metadata = {
  title: 'Радио VibeCast – дождь и lo-fi',
  description:
    'Две станции для работы и чтения – стереозапись дождя у окна и инструментальный lo-fi.',
  alternates: { canonical: '/radio' },
}

export default async function RadioPage({
  searchParams,
}: {
  searchParams: Promise<{ station?: string | string[] }>
}) {
  const lofi = (await searchParams).station === 'lofi'
  return (
    <SectionShell title="Радио VibeCast">
      <nav className={styles.stations} aria-label="Станции радио">
        <Link href="/radio" aria-current={lofi ? undefined : 'page'}>Дождь</Link>
        <Link href="/radio?station=lofi" aria-current={lofi ? 'page' : undefined}>Lo-fi</Link>
      </nav>
      {lofi ? <LofiRadio /> : <VibeRadio full />}
    </SectionShell>
  )
}
