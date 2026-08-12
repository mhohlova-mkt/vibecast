import type { ArticleBlock } from '@/lib/portal'
import { RichText } from './RichText'
import styles from './ArticleBody.module.css'

function TextBlock({
  content,
  style = 'body',
}: {
  content: string
  style?: 'body' | 'lead'
}) {
  const paragraphs = content.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
  return (
    <div className={style === 'lead' ? styles.lead : styles.text}>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>
          {paragraph.split('\n').map((line, lineIndex) => (
            <span key={lineIndex}>
              {lineIndex > 0 ? <br /> : null}
              <RichText content={line} />
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}

function QuoteBlock({ content, caption }: { content: string; caption?: string }) {
  return (
    <blockquote className={styles.quote}>
      <p><RichText content={content} /></p>
      {caption?.trim() ? <cite>— {caption}</cite> : null}
    </blockquote>
  )
}

function ImageBlock({ content, caption }: { content: string; caption?: string }) {
  const src = content.trim()
  return (
    <figure className={styles.figure}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={caption?.trim() || ''} />
      ) : (
        <div className={styles.imagePlaceholder} />
      )}
      {caption?.trim() ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

function VideoBlock({ url, caption }: { url: string; caption?: string }) {
  const href = url.trim()
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.video}>
      <span className={styles.play} aria-hidden="true">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className={styles.videoCopy}>
        <strong>{caption?.trim() || 'Смотреть видео'}</strong>
        <span className="mono">{href}</span>
      </span>
    </a>
  )
}

function ListBlock({ content, ordered }: { content: string; ordered?: boolean }) {
  const items = content
    .split('\n')
    .map((item) => item.replace(/^\s*(?:[-–—•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <Tag className={styles.list}>
      {items.map((item, index) => <li key={index}><RichText content={item} /></li>)}
    </Tag>
  )
}

export default function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className={styles.root}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'text':
            return <TextBlock key={index} content={block.content} style={block.style} />
          case 'heading': {
            const Tag = block.level === 3 ? 'h3' : 'h2'
            return <Tag key={index} className={styles.heading}><RichText content={block.content} /></Tag>
          }
          case 'list':
            return <ListBlock key={index} content={block.content} ordered={block.ordered} />
          case 'quote':
            return <QuoteBlock key={index} content={block.content} caption={block.caption} />
          case 'callout':
            return (
              <aside key={index} className={`${styles.callout} ${styles[block.tone ?? 'note']}`}>
                <RichText content={block.content} />
              </aside>
            )
          case 'image':
            return <ImageBlock key={index} content={block.content} caption={block.caption} />
          case 'video':
            return <VideoBlock key={index} url={block.url} caption={block.caption} />
          case 'divider':
            return <hr key={index} className={styles.divider} />
          default:
            return null
        }
      })}
    </div>
  )
}
