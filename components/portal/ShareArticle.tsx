'use client'

import { useState } from 'react'
import styles from './ShareArticle.module.css'

export default function ShareArticle({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  function currentUrl(): string {
    return window.location.href.split('#')[0]
  }

  async function share() {
    const url = currentUrl()
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    await copy()
  }

  async function copy() {
    await navigator.clipboard.writeText(currentUrl())
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function openTelegram() {
    const url = new URL('https://t.me/share/url')
    url.searchParams.set('url', currentUrl())
    url.searchParams.set('text', title)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <aside className={styles.root} aria-label="Поделиться статьёй">
      <div>
        <span className={`mono ${styles.kicker}`}>Поделиться</span>
        <p className={styles.note}>Отправьте материал коллегам или сохраните ссылку.</p>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={share}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
          </svg>
          Поделиться
        </button>
        <button type="button" className={styles.secondary} onClick={openTelegram}>
          Telegram
        </button>
        <button type="button" className={styles.secondary} onClick={copy}>
          {copied ? 'Скопировано ✓' : 'Копировать ссылку'}
        </button>
      </div>
    </aside>
  )
}
