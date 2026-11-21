'use client'

import { useEffect, useRef, useState } from 'react'
import { createEngine, type Engine } from '@simpllyf/ditty'
import styles from '@/components/portal/VibeRadio.module.css'

export default function LofiRadio() {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [volume, setVolume] = useState(35)
  const engine = useRef<Engine | null>(null)

  useEffect(() => () => {
    engine.current?.dispose()
    engine.current = null
  }, [])

  async function start() {
    setLoading(true)
    setError(false)
    const previous = engine.current
    const session = previous ?? createEngine({
      style: 'lofi',
      form: 'song',
      bpm: 72,
      intro: false,
      voices: { arp: false },
      volume: volume / 100 * 0.7,
    })
    engine.current = session
    try {
      if (previous) session.resume()
      else await session.start()
      if (engine.current === session) {
        setPlaying(true)
        setLoading(false)
      }
    } catch {
      if (engine.current === session) {
        session.dispose()
        engine.current = null
        setError(true)
        setLoading(false)
      }
    }
  }

  function pause() {
    engine.current?.pause()
    setPlaying(false)
  }

  function changeVolume(next: number) {
    setVolume(next)
    engine.current?.setVolume(next / 100 * 0.7)
  }

  return (
    <section className={styles.radio} data-full="" data-mode="lofi" aria-label="Плеер Lo-fi">
      <div className={styles.topline}>
        <span className={`mono ${styles.eyebrow}`}><span className={styles.dot} /> LO-FI</span>
        <span className={styles.license}>МУЗЫКА ДЛЯ РАБОТЫ</span>
      </div>
      <div className={styles.visual} aria-hidden="true">
        <div className={styles.orb} data-playing={playing ? '' : undefined} />
        <div className={styles.wave} data-playing={playing ? '' : undefined}>
          {Array.from({ length: 35 }, (_, index) => (
            <i key={index} style={{ animationDelay: `${(index * 83) % 1060 * -1}ms` }} />
          ))}
        </div>
        <span className={styles.status}>{playing ? 'ON AIR' : 'READY'}</span>
      </div>
      <div className={styles.copy}>
        <div>
          <h2 className={styles.title}>Lo-fi для работы</h2>
          <p className={styles.note}>
            {error ? 'Не удалось запустить звук. Нажмите еще раз.' : 'Мягкие ударные, бас и клавиши. Музыка создается прямо в браузере.'}
          </p>
        </div>
        <button
          type="button"
          className={styles.play}
          onClick={() => playing ? pause() : void start()}
          aria-label={playing ? 'Пауза lo-fi' : 'Включить lo-fi'}
          disabled={loading}
        >
          {loading ? '…' : playing ? 'Ⅱ' : '▶'}
        </button>
      </div>
      <label className={styles.volume}>
        <span>Громкость</span>
        <input type="range" min="0" max="75" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} />
      </label>
    </section>
  )
}
