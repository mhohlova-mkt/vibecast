'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './VibeRadio.module.css'

function clock(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const minutes = Math.floor(safeSeconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`
}

export default function VibeRadio({ full = false }: { full?: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(42)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [repeat, setRepeat] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!audio.current) return
    audio.current.volume = volume / 100
    audio.current.loop = repeat
  }, [repeat, volume])

  async function start() {
    const player = audio.current
    if (!player) return
    setLoading(true)
    setError(null)
    try {
      await player.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
      setError('Не удалось загрузить запись. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  function stop() {
    audio.current?.pause()
    setPlaying(false)
    setLoading(false)
  }

  function seek(next: number) {
    const player = audio.current
    if (!player || !Number.isFinite(player.duration)) return
    player.currentTime = Math.min(Math.max(next, 0), player.duration)
    setPosition(player.currentTime)
  }

  return (
    <section className={styles.radio} data-full={full ? '' : undefined} data-mode="rain">
      <audio
        ref={audio}
        src="/audio/rain-window.mp3"
        preload="metadata"
        loop={repeat}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onEnded={() => {
          setPosition(duration)
          setPlaying(false)
        }}
      />

      <div className={styles.topline}>
        <span className={`mono ${styles.eyebrow}`}>
          <span className={styles.dot} /> ДОЖДЬ
        </span>
        <span className={styles.license}>ПОЛЕВАЯ ЗАПИСЬ · CC0</span>
      </div>

      <div className={styles.visual} data-rain aria-hidden="true">
        <div className={styles.orb} data-playing={playing ? '' : undefined} />
        <div className={styles.rain} data-playing={playing ? '' : undefined}>
          {Array.from({ length: 32 }, (_, index) => (
            <i
              key={index}
              style={{
                left: `${(index * 37) % 103}%`,
                height: `${18 + (index * 17) % 48}px`,
                animationDelay: `${index * -91}ms`,
                animationDuration: `${620 + (index * 47) % 540}ms`,
              }}
            />
          ))}
        </div>
        <span className={styles.status}>{playing ? 'ON AIR' : 'READY'}</span>
      </div>

      <div className={styles.copy}>
        <div>
          <h2 className={styles.title}>Дождь за окном</h2>
          <p className={styles.note}>
            {error ?? 'Настоящая стереозапись дождя у полуоткрытого окна.'}
          </p>
        </div>
        <button
          type="button"
          className={styles.play}
          onClick={() => (playing ? stop() : void start())}
          aria-label={playing ? 'Пауза' : 'Включить дождь'}
          disabled={loading}
        >
          {loading ? '…' : playing ? 'Ⅱ' : '▶'}
        </button>
      </div>

      <div className={styles.transport}>
        <div className={styles.timeline}>
          <span>{clock(position)}</span>
          <input
            className={styles.progress}
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(position, duration || 0)}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Позиция в записи"
          />
          <span>{clock(duration)}</span>
          <button
            type="button"
            className={styles.repeat}
            data-active={repeat ? '' : undefined}
            aria-label={repeat ? 'Выключить повтор' : 'Повторять запись'}
            title={repeat ? 'Повтор включён' : 'Повторять запись'}
            aria-pressed={repeat}
            onClick={() => setRepeat((value) => !value)}
          >
            ↻
          </button>
        </div>
      </div>

      <label className={styles.volume}>
        <span>Громкость</span>
        <input
          type="range"
          min="0"
          max="75"
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
        />
      </label>
    </section>
  )
}
