import { redirect } from 'next/navigation'
import { getCurrentUser, isSetupComplete } from '@/lib/auth'
import { LoginForm, SetupForm } from '../AuthForms'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/admin')
  // Пока владелец не создан — показываем первичную настройку.
  if (!(await isSetupComplete())) return <SetupForm />
  return <LoginForm />
}
