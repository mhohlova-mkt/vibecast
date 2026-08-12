import type { Metadata } from 'next'
import SectionShell from '@/components/portal/SectionShell'
import VibeRadio from '@/components/portal/VibeRadio'
import styles from './radio.module.css'

export const metadata: Metadata = {
  title: 'Дождь за окном — звук для работы',
  description:
    'Настоящая стереозапись дождя за окном — бесплатно, без рекламы и регистрации.',
  alternates: { canonical: '/radio' },
}

export default function RadioPage() {
  return (
    <SectionShell kicker="Бесплатный звук" title="Дождь за окном">
      <div className={styles.intro}>
        <p>
          Включайте перед кодингом, чтением или глубокой работой. Настоящая
          стереозапись дождя у полуоткрытого окна — без рекламы и регистрации.
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
