import type { Metadata } from 'next'
import { Archivo, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// Archivo не отдаёт кириллический сабсет — как и в прототипе, кириллица
// падает на системный гротеск, латиница идёт в Archivo.
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-archivo',
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
    <html lang="ru" className={`${archivo.variable} ${mono.variable}`}>
      <body style={{ fontFamily: 'var(--font-archivo), Archivo, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
