import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { inviteMember, changeRole, removeMember } from '@/lib/actions/admin'

export const dynamic = 'force-dynamic'

const ROLE_LABEL: Record<string, string> = {
  owner: 'Владелец',
  editor: 'Редактор',
  moderator: 'Модератор',
}

/** Онлайн — если заходил в последние 5 минут. */
function isOnline(lastSeenAt: Date | null): boolean {
  if (!lastSeenAt) return false
  return Date.now() - lastSeenAt.getTime() < 5 * 60 * 1000
}

export default async function TeamPage() {
  const [me, members] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({ orderBy: [{ role: 'asc' }, { createdAt: 'asc' }] }),
  ])
  const isOwner = me?.role === 'owner'

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 26 }}>
        <span
          className="mono"
          style={{
            alignSelf: 'flex-start',
            border: '1px solid var(--dark)',
            borderRadius: 'var(--r-pill)',
            padding: '6px 14px',
            fontSize: 11,
            letterSpacing: '.1em',
          }}
        >
          ДОСТУП В АДМИНКУ
        </span>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(30px,4vw,46px)',
            fontWeight: 800,
            letterSpacing: '-.04em',
            lineHeight: 0.95,
          }}
        >
          Команда
        </h1>
      </div>

      {isOwner ? (
        <form
          action={inviteMember}
          style={{
            display: 'flex',
            gap: 9,
            flexWrap: 'wrap',
            background: '#fff',
            border: '1px solid var(--line)',
            borderRadius: 18,
            padding: 18,
            marginBottom: 20,
          }}
        >
          <input
            name="name"
            placeholder="Имя"
            style={{ ...inputStyle, flex: 1, minWidth: 140 }}
          />
          <input
            name="email"
            type="email"
            required
            placeholder="почта@домен.ру"
            style={{
              ...inputStyle,
              flex: 1.4,
              minWidth: 200,
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 13.5,
            }}
          />
          <select name="role" defaultValue="editor" style={{ ...inputStyle, minWidth: 150 }}>
            <option value="editor">Редактор</option>
            <option value="moderator">Модератор</option>
          </select>
          <button
            type="submit"
            style={{
              border: 'none',
              background: 'var(--dark)',
              color: 'var(--dark-text)',
              borderRadius: 12,
              padding: '12px 22px',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Пригласить
          </button>
        </form>
      ) : (
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 18 }}>
          Приглашать и менять роли может только владелец.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {members.map((m) => {
          const online = isOnline(m.lastSeenAt)
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: '#fff',
                border: '1px solid var(--line)',
                borderRadius: 18,
                padding: '14px 18px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: m.role === 'owner' ? 'var(--accent)' : '#DDE3D4',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: 13,
                  color: 'var(--dark)',
                }}
              >
                {m.name.slice(0, 2).toUpperCase()}
              </span>

              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700 }}>{m.name}</div>
                <div
                  className="mono"
                  style={{ fontSize: 12.5, color: 'var(--muted)' }}
                >
                  {m.email}
                </div>
              </div>

              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '.08em',
                  borderRadius: 'var(--r-pill)',
                  padding: '7px 13px',
                  background: m.invited ? '#F1E7CF' : online ? '#DFEBCB' : '#E4E3DA',
                  color: m.invited ? '#6B5424' : online ? '#3D4A28' : 'var(--muted)',
                }}
              >
                {m.invited ? 'ПРИГЛАШЕНИЕ ОТПРАВЛЕНО' : online ? 'В СЕТИ' : 'НЕ В СЕТИ'}
              </span>

              {m.role === 'owner' || !isOwner ? (
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--muted)',
                    minWidth: 110,
                  }}
                >
                  {ROLE_LABEL[m.role] ?? m.role}
                </span>
              ) : (
                <form action={changeRole}>
                  <input type="hidden" name="id" value={m.id} />
                  <select
                    name="role"
                    defaultValue={m.role}
                    style={{ ...inputStyle, padding: '9px 12px', fontSize: 13.5 }}
                  >
                    <option value="editor">Редактор</option>
                    <option value="moderator">Модератор</option>
                  </select>
                  <button
                    type="submit"
                    style={{
                      marginLeft: 8,
                      border: '1px solid var(--line)',
                      background: 'transparent',
                      borderRadius: 'var(--r-pill)',
                      padding: '9px 16px',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Сменить
                  </button>
                </form>
              )}

              {isOwner && m.role !== 'owner' ? (
                <form action={removeMember}>
                  <input type="hidden" name="id" value={m.id} />
                  <button
                    type="submit"
                    aria-label={`Удалить ${m.name}`}
                    title="Удалить из команды"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      border: '1px solid var(--line)',
                      background: 'transparent',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </form>
              ) : null}
            </div>
          )
        })}
      </div>

      <p style={{ marginTop: 18, fontSize: 13, color: 'var(--muted)', maxWidth: '70ch' }}>
        Приглашённый участник появляется в списке сразу, но войти сможет после того,
        как задаст себе пароль. Отправку писем-приглашений подключим вместе с рассылкой.
      </p>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#F4F3EC',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: '12px 15px',
  fontSize: 14.5,
  fontFamily: 'inherit',
}
