import type { Metadata } from 'next'
import SectionShell from '@/components/portal/SectionShell'
import VibeRadio from '@/components/portal/VibeRadio'
import styles from './radio.module.css'

export const metadata: Metadata = {
  title: 'Vibe Focus — дождь и звуки для работы',
  description:
    'Генеративный дождь за окном, электронные режимы и таймер для спокойной работы без рекламы и регистрации.',
  alternates: { canonical: '/radio' },
}

export default function RadioPage() {
  return (
    <SectionShell kicker="Бесплатный инструмент" title="Vibe Focus">
      <div className={styles.intro}>
        <p>
          Включайте перед кодингом, чтением или глубокой работой. Дождь и
          электронные режимы создаются прямо в браузере и не требуют загрузки
          чужой трансляции.
        </p>
      </div>
      <VibeRadio full />
      <div className={styles.facts}>
        <span>Без рекламы</span>
        <span>Дождь за окном</span>
        <span>Без аудиопетель</span>
        <span>Без регистрации</span>
        <span>Работает прямо в браузере</span>
      </div>
    </SectionShell>
  )
}
