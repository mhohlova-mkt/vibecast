import type { Metadata } from 'next'
import SectionShell from '@/components/portal/SectionShell'
import VibeRadio from '@/components/portal/VibeRadio'
import styles from './radio.module.css'

export const metadata: Metadata = {
  title: 'Vibe Radio — электронная музыка и дождь для работы',
  description:
    'Три плейлиста спокойной электронной музыки без вокала и настоящая стереозапись дождя — бесплатно, без рекламы и регистрации.',
  alternates: { canonical: '/radio' },
}

export default function RadioPage() {
  return (
    <SectionShell kicker="Бесплатная музыка" title="Vibe Radio">
      <div className={styles.intro}>
        <p>
          Включайте перед кодингом, чтением или глубокой работой. Четыре станции:
          дождь, dub techno, downtempo и длинный ambient — без вокала и рекламы.
        </p>
      </div>
      <VibeRadio full />
      <div className={styles.facts}>
        <span>Без рекламы</span>
        <span>Стереозапись у окна</span>
        <span>Лицензия CC0</span>
        <span>Без регистрации</span>
        <span>Работает прямо в браузере</span>
      </div>
    </SectionShell>
  )
}
