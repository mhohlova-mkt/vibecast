/**
 * Аватар автора/спикера.
 * Прототип: круг 26px, инициалы 10px/700, цвет текста #F4F3EC,
 * фон — либо фото (center/cover), либо цвет из палитры AV.
 * В прототипе цвет выбирался по индексу в списке (AV[i % AV.length]);
 * здесь — детерминированно по имени, чтобы карточка не зависела от порядка.
 */

/** Палитра фонов аватаров — 1:1 из прототипа. */
const AVATAR_COLORS = [
  '#3A6E7A',
  '#8A4E3A',
  '#3A5A4E',
  '#5B4B86',
  '#2E5560',
] as const

/** initialsOf() из прототипа: первые буквы первых двух слов. */
export function initialsOf(name: string): string {
  const w = (name || '').trim().split(/\s+/)
  const first = w[0] || '?'
  return ((first[0] ?? '?') + (w[1] ? w[1][0] : '')).toUpperCase()
}

/** Детерминированный выбор цвета из палитры по имени. */
export function avatarColor(name: string): string {
  let h = 0
  const s = name || ''
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

type AvatarProps = {
  name: string
  src?: string | null
  size?: number
}

export default function Avatar({ name, src, size = 26 }: AvatarProps) {
  const photo = (src || '').trim()
  // 26px → 10px, 30px → 11.5px, 36px → 13px (пропорции прототипа)
  const fontSize = Math.max(9, Math.round(size * 0.385 * 10) / 10)

  return (
    <span
      aria-hidden={photo ? undefined : true}
      title={name}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        background: photo
          ? `url("${photo}") center/cover no-repeat`
          : avatarColor(name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F4F3EC',
        fontWeight: 700,
        fontSize,
        lineHeight: 1,
        letterSpacing: 0,
        overflow: 'hidden',
      }}
    >
      {photo ? '' : initialsOf(name)}
    </span>
  )
}
