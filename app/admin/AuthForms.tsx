'use client'

import { useActionState } from 'react'
import { login, setupOwner, type FormState } from '@/lib/actions/auth'

const wrap: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'var(--dark)',
  padding: 24,
}

const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  background: 'var(--card)',
  borderRadius: 'var(--r-card-lg)',
  padding: 32,
  animation: 'vc-fadeup .35s ease both',
}

const label: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--muted)',
}

const input: React.CSSProperties = {
  width: '100%',
  background: 'var(--field)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-field)',
  padding: '12px 14px',
  fontSize: 15,
  marginBottom: 14,
}

const button: React.CSSProperties = {
  width: '100%',
  background: 'var(--dark)',
  color: 'var(--dark-text)',
  border: 'none',
  borderRadius: 'var(--r-pill)',
  padding: '14px 20px',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  marginTop: 4,
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'var(--accent)',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--font-mono), monospace',
          fontWeight: 700,
          fontSize: 17,
        }}
      >
        {'</>'}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em' }}>
          vibecast
        </div>
        <div className="mono" style={{ color: 'var(--muted-2)', fontSize: 10 }}>
          админка
        </div>
      </div>
    </div>
  )
}

function Error({ state }: { state: FormState }) {
  if (!state?.error) return null
  return (
    <div
      style={{
        background: '#fdecea',
        color: 'var(--error-2)',
        border: '1px solid #f3c7c1',
        borderRadius: 'var(--r-field)',
        padding: '10px 14px',
        fontSize: 14,
        marginBottom: 14,
      }}
    >
      {state.error}
    </div>
  )
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)
  return (
    <div style={wrap}>
      <div style={card}>
        <Logo />
        <h1 style={{ fontSize: 26, marginBottom: 20 }}>Вход в админку</h1>
        <form action={action}>
          <Error state={state} />
          <label style={label} htmlFor="email">
            Почта
          </label>
          <input
            style={input}
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
          />
          <label style={label} htmlFor="password">
            Пароль
          </label>
          <input
            style={input}
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
          <button style={button} disabled={pending}>
            {pending ? 'Проверяем…' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function SetupForm() {
  const [state, action, pending] = useActionState(setupOwner, undefined)
  return (
    <div style={wrap}>
      <div style={card}>
        <Logo />
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Первый запуск</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
          Создайте учётную запись владельца. Пароль знаете только вы — он хранится
          в зашифрованном виде.
        </p>
        <form action={action}>
          <Error state={state} />
          <label style={label} htmlFor="name">
            Ваше имя
          </label>
          <input style={input} id="name" name="name" required />
          <label style={label} htmlFor="email">
            Почта (это будет логин)
          </label>
          <input
            style={input}
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
          />
          <label style={label} htmlFor="password">
            Пароль — минимум 10 символов
          </label>
          <input
            style={input}
            id="password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
          />
          <label style={label} htmlFor="password2">
            Повторите пароль
          </label>
          <input
            style={input}
            id="password2"
            name="password2"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
          />
          <button style={button} disabled={pending}>
            {pending ? 'Создаём…' : 'Создать и войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
