import type { ArticleBlock } from '@/lib/portal'

/**
 * Рендер блочного контента статьи. 1:1 с прототипом
 * («Портал vibecast 2.0.dc.html», секция isArticle).
 * Переиспользуется на публичной статье и в предпросмотре админки.
 */

const wrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

function TextBlock({ content }: { content: string }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 17.5,
        lineHeight: 1.7,
        color: '#3A3B30',
        whiteSpace: 'pre-wrap',
      }}
    >
      {content}
    </p>
  )
}

function QuoteBlock({ content, caption }: { content: string; caption?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderLeft: '4px solid var(--accent, #CBF54A)',
        padding: '6px 0 6px 18px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 22,
          lineHeight: 1.4,
          fontWeight: 700,
          fontStyle: 'italic',
          letterSpacing: '-.01em',
        }}
      >
        {content}
      </p>
      {caption && caption.trim() ? (
        <span
          className="mono"
          style={{
            fontSize: 12,
            color: '#6B6C60',
            textTransform: 'none',
            letterSpacing: 0,
            fontWeight: 400,
          }}
        >
          — {caption}
        </span>
      ) : null}
    </div>
  )
}

function ImageBlock({ content, caption }: { content: string; caption?: string }) {
  const src = (content || '').trim()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {src ? (
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 16,
            background: `url("${src}") center/cover no-repeat`,
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 16,
            background: '#ECEBE2',
          }}
        />
      )}
      {caption && caption.trim() ? (
        <span style={{ fontSize: 13, color: '#9A9B8E' }}>{caption}</span>
      ) : null}
    </div>
  )
}

function VideoBlock({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: '#15160F',
        borderRadius: 18,
        padding: '18px 20px',
        color: '#F4F3EC',
        textDecoration: 'none',
      }}
    >
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          background: 'var(--accent, #CBF54A)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="#15160F">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          minWidth: 0,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700 }}>Смотреть видео</span>
        <span
          className="mono"
          style={{
            fontSize: 11.5,
            color: '#A9B29C',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textTransform: 'none',
            letterSpacing: 0,
            fontWeight: 400,
          }}
        >
          {url}
        </span>
      </div>
    </a>
  )
}

export default function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        maxWidth: 760,
      }}
    >
      {blocks.map((b, i) => (
        <div key={i} style={wrap}>
          {b.type === 'text' ? <TextBlock content={b.content} /> : null}
          {b.type === 'quote' ? (
            <QuoteBlock content={b.content} caption={b.caption} />
          ) : null}
          {b.type === 'image' ? (
            <ImageBlock content={b.content} caption={b.caption} />
          ) : null}
          {b.type === 'video' ? <VideoBlock url={b.url} /> : null}
        </div>
      ))}
    </div>
  )
}
