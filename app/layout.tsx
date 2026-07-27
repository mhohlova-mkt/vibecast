import type { Metadata } from 'next'
import { Geologica, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// Geologica — гротеск с полной кириллицей. Пришла на смену Archivo из
// макета: у той кириллического начертания нет, и русский текст падал на
// системный шрифт со сплющенными метриками.
const sans = Geologica({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-sans',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'vibecast — медиа и вебинары про вайбкодинг',
  description:
    'Прямые эфиры с практиками, разборы инструментов и учебные материалы об IT и AI-разработке.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${sans.variable} ${mono.variable}`}>
      <body style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
