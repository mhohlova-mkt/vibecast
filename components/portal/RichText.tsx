import type { ReactNode } from 'react'

function safeHref(raw: string): string | null {
  const href = raw.trim()
  if (href.startsWith('/') || href.startsWith('#')) return href
  try {
    const url = new URL(href)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? href : null
  } catch {
    return null
  }
}

/**
 * Небольшой безопасный набор строчного форматирования для редакционных
 * материалов. HTML из админки не исполняется: поддерживаются только
 * **жирный**, *курсив*, `код` и [ссылка](https://example.com).
 */
export function RichText({ content }: { content: string }) {
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g
  const nodes: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > cursor) nodes.push(content.slice(cursor, match.index))

    if (match[2] && match[3]) {
      const href = safeHref(match[3])
      nodes.push(
        href ? (
          <a
            key={match.index}
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {match[2]}
          </a>
        ) : (
          match[2]
        ),
      )
    } else if (match[4]) {
      nodes.push(<strong key={match.index}>{match[4]}</strong>)
    } else if (match[5]) {
      nodes.push(<em key={match.index}>{match[5]}</em>)
    } else if (match[6]) {
      nodes.push(<code key={match.index}>{match[6]}</code>)
    }
    cursor = pattern.lastIndex
  }

  if (cursor < content.length) nodes.push(content.slice(cursor))
  return <>{nodes}</>
}
