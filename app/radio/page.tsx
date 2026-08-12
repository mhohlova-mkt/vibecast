import type { Metadata } from 'next'
import SectionShell from '@/components/portal/SectionShell'
import VibeRadio from '@/components/portal/VibeRadio'
import styles from './radio.module.css'

export const metadata: Metadata = {
  title: 'Vibe Radio — музыка для фокуса',
  description:
    'Бесплатный фокус-звук и таймер для работы: без рекламы, регистрации и чужих аудиозаписей.',
  alternates: { canonical: '/radio' },
}

export default function RadioPage() {
  return (
    <SectionShell kicker="Бесплатный инструмент" title="Vibe Radio">
      <div className={styles.intro}>
        <p>
          Включайте перед кодингом, чтением или глубокой работой. Звуковая
          сцена синтезируется на вашем устройстве и никуда не передаётся.
        </p>
      </div>
      <VibeRadio full />
      <div className={styles.facts}>
        <span>Без рекламы</span>
        <span>Без авторских треков</span>
        <span>Без регистрации</span>
        <span>Работает прямо в браузере</span>
      </div>
    </SectionShell>
  )
}
