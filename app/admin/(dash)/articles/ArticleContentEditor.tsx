'use client'

import { useRef, useState } from 'react'
import type { ArticleBlock } from '@/lib/portal'
import styles from './ArticleEditor.module.css'

type UploadResult = { src: string; kind: string; ratio: string | null }

function blocksToSource(blocks: ArticleBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'text':
          return block.style === 'lead'
            ? `:::lead\n${block.content}\n:::`
            : block.content
        case 'heading':
          return `${block.level === 3 ? '###' : '##'} ${block.content}`
        case 'list':
          return block.content
            .split('\n')
            .filter(Boolean)
            .map((item, index) => `${block.ordered ? `${index + 1}.` : '-'} ${item}`)
            .join('\n')
        case 'quote': {
          const lines = block.content.split('\n').map((line) => `> ${line}`)
          if (block.caption?.trim()) lines.push(`> — ${block.caption.trim()}`)
          return lines.join('\n')
        }
        case 'callout':
          return `:::${block.tone ?? 'note'}\n${block.content}\n:::`
        case 'image':
          return `![${block.caption ?? ''}](${block.content})`
        case 'video':
          return `[video${block.caption?.trim() ? `: ${block.caption.trim()}` : ''}](${block.url})`
        case 'divider':
          return '---'
      }
    })
    .join('\n\n')
    .trim()
}

function sourceToBlocks(source: string): ArticleBlock[] {
  const clean = source.replace(/\r/g, '').trim()
  if (!clean) return []

  const lines = clean.split('\n')
  const blocks: ArticleBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i += 1
      continue
    }

    const directive = line.match(/^:::(lead|note|key|warning)$/)
    if (directive) {
      const kind = directive[1] as 'lead' | 'note' | 'key' | 'warning'
      const content: string[] = []
      i += 1
      while (i < lines.length && lines[i].trim() !== ':::') {
        content.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      const value = content.join('\n').trim()
      if (kind === 'lead') {
        blocks.push({ type: 'text', content: value, style: 'lead' })
      } else {
        blocks.push({ type: 'callout', content: value, tone: kind })
      }
      continue
    }

    const heading = line.match(/^(#{2,3})\s+(.+)$/)
    if (heading) {
      blocks.push({
        type: 'heading',
        content: heading[2].trim(),
        level: heading[1].length === 3 ? 3 : 2,
      })
      i += 1
      continue
    }

    const image = line.match(/^!\[(.*)\]\((.*)\)$/)
    if (image) {
      blocks.push({ type: 'image', content: image[2].trim(), caption: image[1].trim() })
      i += 1
      continue
    }

    const video = line.match(/^\[video(?::\s*(.*?))?\]\((.*)\)$/i)
    if (video) {
      blocks.push({ type: 'video', url: video[2].trim(), caption: video[1]?.trim() ?? '' })
      i += 1
      continue
    }

    if (line === '---') {
      blocks.push({ type: 'divider' })
      i += 1
      continue
    }

    const ordered = /^\d+[.)]\s+/.test(line)
    const unordered = /^[-–—•]\s+/.test(line)
    if (ordered || unordered) {
      const pattern = ordered ? /^\d+[.)]\s+/ : /^[-–—•]\s+/
      const items: string[] = []
      while (i < lines.length && pattern.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(pattern, ''))
        i += 1
      }
      blocks.push({ type: 'list', content: items.join('\n'), ordered })
      continue
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''))
        i += 1
      }
      const last = quote.at(-1) ?? ''
      const caption = /^—\s+/.test(last) ? quote.pop()?.replace(/^—\s+/, '') : undefined
      blocks.push({ type: 'quote', content: quote.join('\n'), caption })
      continue
    }

    const paragraph: string[] = []
    while (i < lines.length && lines[i].trim()) {
      paragraph.push(lines[i].trimEnd())
      i += 1
    }
    blocks.push({ type: 'text', content: paragraph.join('\n').trim(), style: 'body' })
  }

  return blocks.filter((block) => {
    if (block.type === 'divider') return true
    if (block.type === 'video') return Boolean(block.url.trim())
    return Boolean(block.content.trim())
  })
}

export default function ArticleContentEditor({
  initialBlocks,
  onChange,
  upload,
}: {
  initialBlocks: ArticleBlock[]
  onChange: (blocks: ArticleBlock[]) => void
  upload: (file: File) => Promise<UploadResult | null>
}) {
  const [source, setSource] = useState(() => blocksToSource(initialBlocks))
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function commit(next: string, selectionStart?: number, selectionEnd?: number) {
    setSource(next)
    onChange(sourceToBlocks(next))
    if (selectionStart == null) return
    requestAnimationFrame(() => {
      areaRef.current?.focus()
      areaRef.current?.setSelectionRange(selectionStart, selectionEnd ?? selectionStart)
    })
  }

  function insert(before: string, after: string, fallback: string) {
    const area = areaRef.current
    if (!area) return
    const start = area.selectionStart
    const end = area.selectionEnd
    const selected = source.slice(start, end) || fallback
    const next = `${source.slice(0, start)}${before}${selected}${after}${source.slice(end)}`
    commit(next, start + before.length, start + before.length + selected.length)
  }

  function insertRaw(value: string) {
    const area = areaRef.current
    if (!area) return
    const start = area.selectionStart
    const end = area.selectionEnd
    const left = source.slice(0, start).replace(/\s*$/, '')
    const right = source.slice(end).replace(/^\s*/, '')
    const next = `${left}${left ? '\n\n' : ''}${value}${right ? `\n\n${right}` : ''}`
    const cursor = left.length + (left ? 2 : 0) + value.length
    commit(next, cursor)
  }

  function prefixLines(prefix: string | ((index: number) => string), fallback: string) {
    const area = areaRef.current
    if (!area) return
    const start = area.selectionStart
    const end = area.selectionEnd
    if (start === end) {
      insert(typeof prefix === 'string' ? prefix : prefix(0), '', fallback)
      return
    }
    const lineStart = source.lastIndexOf('\n', Math.max(0, start - 1)) + 1
    const foundEnd = source.indexOf('\n', end)
    const lineEnd = foundEnd === -1 ? source.length : foundEnd
    const selected = source.slice(lineStart, lineEnd)
    const nextBlock = selected
      .split('\n')
      .map((line, index) => (line.trim() ? `${typeof prefix === 'string' ? prefix : prefix(index)}${line}` : line))
      .join('\n')
    const next = `${source.slice(0, lineStart)}${nextBlock}${source.slice(lineEnd)}`
    commit(next, lineStart, lineStart + nextBlock.length)
  }

  async function addImage(file: File) {
    const result = await upload(file)
    if (!result) return
    insertRaw(`![Подпись к изображению](${result.src})`)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className={styles.singleEditor}>
      <div className={styles.singleToolbar} aria-label="Форматирование статьи">
        <button type="button" onClick={() => insert('**', '**', 'жирный текст')} title="Жирный"><strong>Ж</strong></button>
        <button type="button" onClick={() => insert('*', '*', 'курсив')} title="Курсив"><em>К</em></button>
        <button type="button" onClick={() => insert('[', '](https://example.com)', 'текст ссылки')} title="Ссылка">Ссылка</button>
        <button type="button" onClick={() => insert('`', '`', 'код')} title="Код">{'</>'}</button>
        <span className={styles.toolbarDivider} />
        <button type="button" onClick={() => prefixLines('## ', 'Подзаголовок')} title="Основной подзаголовок">H2</button>
        <button type="button" onClick={() => prefixLines('### ', 'Малый подзаголовок')} title="Малый подзаголовок">H3</button>
        <button type="button" onClick={() => prefixLines('- ', 'Пункт списка')} title="Маркированный список">• Список</button>
        <button type="button" onClick={() => prefixLines((index) => `${index + 1}. `, 'Пункт списка')} title="Нумерованный список">1. Список</button>
        <button type="button" onClick={() => prefixLines('> ', 'Цитата')} title="Цитата">Цитата</button>
        <span className={styles.toolbarDivider} />
        <button type="button" onClick={() => insert(':::lead\n', '\n:::', 'Вводный текст')} title="Крупный вводный текст">Лид</button>
        <button type="button" onClick={() => insert(':::note\n', '\n:::', 'Пояснение')} title="Нейтральная врезка">Врезка</button>
        <button type="button" onClick={() => insert(':::key\n', '\n:::', 'Ключевая мысль')} title="Ключевая мысль">Ключевое</button>
        <button type="button" onClick={() => insert(':::warning\n', '\n:::', 'Важное предупреждение')} title="Предупреждение">Важно</button>
        <button type="button" onClick={() => insertRaw('---')} title="Разделитель">Разделитель</button>
        <button type="button" onClick={() => fileRef.current?.click()} title="Загрузить изображение">Фото</button>
        <button type="button" onClick={() => insertRaw('[video: Название видео](https://...)')} title="Добавить видео">Видео</button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className={styles.hiddenFile}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void addImage(file)
          }}
        />
      </div>

      <textarea
        ref={areaRef}
        value={source}
        onChange={(event) => commit(event.target.value)}
        className={styles.articleSource}
        aria-label="Текст статьи"
        placeholder="Вставьте или напишите всю статью здесь…"
        spellCheck
      />

      <div className={styles.editorHelp}>
        Пустая строка создаёт абзац. Форматирование можно применять кнопками к выделенному тексту.
      </div>
    </div>
  )
}
