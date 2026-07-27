import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Sidebar from '../Sidebar'

export const dynamic = 'force-dynamic'

/** Всё внутри этой группы доступно только после входа (проверка на сервере). */
export default async function DashLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <Sidebar user={user} />
      <main style={{ flex: 1, minWidth: 0, padding: '40px 48px' }}>{children}</main>
    </div>
  )
}
