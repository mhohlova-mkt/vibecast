'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './VibeRadio.module.css'

type Scene = 'air' | 'rain' | 'deep'
type AudioEngine = { context: AudioContext; master: GainNode }

const SCENES: Array<{ id: Scene; label: string; note: string }> = [
  { id: 'air', label: 'Air', note: 'мягкий дрон' },
  { id: 'rain', label: 'Rain', note: 'шум для фокуса' },
  { id: 'deep', label: 'Deep', note: 'низкие частоты' },
]

const SOUND: Record<
  Scene,
  { frequencies: number[]; noise: number; cutoff: number }
> = {
  air: { frequencies: [110, 164.81, 220], noise: 0.045, cutoff: 950 },
  rain: { frequencies: [174.61, 261.63], noise: 0.12, cutoff: 2800 },
  deep: { frequencies: [73.42, 110, 146.83], noise: 0.035, cutoff: 560 },
}

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function createAudio(scene: Scene): AudioEngine {
  const context = new AudioContext()
  const config = SOUND[scene]
  const master = context.createGain()
  const filter = context.createBiquadFilter()

  master.gain.setValueAtTime(0.0001, context.currentTime)
  master.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 1.2)
  filter.type = 'lowpass'
  filter.frequency.value = config.cutoff
  filter.Q.value = 0.45
  filter.connect(master)
  master.connect(context.destination)

  for (const [index, frequency] of config.frequencies.entries()) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = index === 0 ? 'sine' : 'triangle'
    oscillator.frequency.value = frequency
    oscillator.detune.value = index * 3 - 3
    gain.gain.value = index === 0 ? 0.12 : 0.035
    oscillator.connect(gain).connect(filter)
    oscillator.start()
  }

  const length = context.sampleRate * 4
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const channel = buffer.getChannelData(0)
  let last = 0
  for (let index = 0; index < length; index++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.018 * white) / 1.018
    channel[index] = last * 3.2
  }
  const noise = context.createBufferSource()
  const noiseGain = context.createGain()
  noise.buffer = buffer
  noise.loop = true
  noiseGain.gain.value = config.noise
  noise.connect(noiseGain).connect(filter)
  noise.start()

  const lfo = context.createOscillator()
  const lfoGain = context.createGain()
  lfo.frequency.value = 0.075
  lfoGain.gain.value = 0.018
  lfo.connect(lfoGain).connect(master.gain)
  lfo.start()

  return { context, master }
}

export default function VibeRadio({ full = false }: { full?: boolean }) {
  const [scene, setScene] = useState<Scene>('air')
  const [playing, setPlaying] = useState(false)
  const [minutes, setMinutes] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60)
  const engine = useRef<AudioEngine | null>(null)

  const stop = useCallback(() => {
    const current = engine.current
    engine.current = null
    setPlaying(false)
    if (!current) return
    const now = current.context.currentTime
    current.master.gain.cancelScheduledValues(now)
    current.master.gain.setValueAtTime(
      Math.max(current.master.gain.value, 0.0001),
      now,
    )
    current.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    window.setTimeout(() => void current.context.close(), 420)
  }, [])

  const start = useCallback(
    async (nextScene = scene) => {
      if (engine.current) stop()
      const next = createAudio(nextScene)
      engine.current = next
      await next.context.resume()
      setPlaying(true)
    },
    [scene, stop],
  )

  useEffect(() => () => {
    void engine.current?.context.close()
  }, [])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value > 1) return value - 1
        stop()
        return minutes * 60
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [minutes, playing, stop])

  function chooseScene(next: Scene) {
    setScene(next)
    if (playing) void start(next)
  }

  function chooseMinutes(next: number) {
    setMinutes(next)
    setRemaining(next * 60)
  }

  return (
    <section className={styles.radio} data-full={full ? '' : undefined}>
      <div className={styles.topline}>
        <span className={`mono ${styles.eyebrow}`}>
          <span className={styles.dot} /> VIBE RADIO
        </span>
        <span className={styles.license}>100% generated</span>
      </div>

      <div className={styles.visual} aria-hidden="true">
        <div className={styles.orb} data-playing={playing ? '' : undefined} />
        <div className={styles.wave} data-playing={playing ? '' : undefined}>
          {Array.from({ length: 24 }, (_, index) => (
            <i key={index} style={{ animationDelay: `${index * -73}ms` }} />
          ))}
        </div>
        <span className={styles.timer}>{clock(remaining)}</span>
      </div>

      <div className={styles.copy}>
        <div>
          <h2 className={styles.title}>Звук для работы в потоке</h2>
          <p className={styles.note}>
            Генерируется в браузере: без рекламы, трекеров и чужих записей.
          </p>
        </div>
        <button
          type="button"
          className={styles.play}
          onClick={() => (playing ? stop() : void start())}
          aria-label={playing ? 'Поставить Vibe Radio на паузу' : 'Включить Vibe Radio'}
        >
          {playing ? 'Ⅱ' : '▶'}
        </button>
      </div>

      <div className={styles.scenes} aria-label="Звуковая сцена">
        {SCENES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.scene}
            data-active={scene === item.id ? '' : undefined}
            onClick={() => chooseScene(item.id)}
            title={item.note}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.bottomline}>
        <div className={styles.sessions} aria-label="Длительность фокус-сессии">
          {[25, 50].map((value) => (
            <button
              key={value}
              type="button"
              data-active={minutes === value ? '' : undefined}
              onClick={() => chooseMinutes(value)}
            >
              {value} мин
            </button>
          ))}
        </div>
        {full ? (
          <span className={styles.hint}>Нажмите play — звук не запускается сам</span>
        ) : (
          <Link href="/radio" className={styles.open}>На весь экран ↗</Link>
        )}
      </div>
    </section>
  )
}
