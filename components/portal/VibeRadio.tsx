'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './VibeRadio.module.css'

type MusicScene = 'ambient' | 'pulse' | 'night'
type Scene = 'rain' | MusicScene

type AudioEngine = {
  context: AudioContext
  master: GainNode
  timer: number
  stopped: boolean
}

type SceneConfig = {
  bpm: number
  chords: number[][]
  bass: number[]
  melody: number[]
  drums: boolean
  drive: number
}

type ModeCopy = {
  label: string
  note: string
  title: string
  description: string
}

const MODES: Record<Scene, ModeCopy> = {
  rain: {
    label: 'Дождь',
    note: 'стереозапись у окна',
    title: 'Дождь за окном',
    description:
      'Настоящая полевая стереозапись: дождь по стенам и стеклу, записанный из комнаты у полуоткрытого окна.',
  },
  ambient: {
    label: 'Ambient',
    note: 'воздушные аккорды',
    title: 'Спокойный электронный фон',
    description:
      'Воздушные аккорды и редкие мелодические фразы собираются заново прямо в браузере.',
  },
  pulse: {
    label: 'Focus Beat',
    note: 'ровный рабочий грув',
    title: 'Ровный ритм для фокуса',
    description:
      'Ненавязчивый бас и рабочий грув помогают держать темп без резких переходов.',
  },
  night: {
    label: 'Night Drive',
    note: 'тёмный синтвейв',
    title: 'Ночной электронный поток',
    description:
      'Более тёмный синтезаторный рисунок для поздней работы и длинных задач.',
  },
}

const MUSIC: Record<MusicScene, SceneConfig> = {
  ambient: {
    bpm: 68,
    chords: [
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [48, 52, 55, 59],
      [55, 59, 62, 64],
    ],
    bass: [45, 41, 36, 43],
    melody: [69, 72, 76, 79, 76, 72, 71, 74],
    drums: false,
    drive: 0.34,
  },
  pulse: {
    bpm: 104,
    chords: [
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [48, 52, 55, 59],
      [55, 59, 62, 67],
    ],
    bass: [45, 41, 36, 43],
    melody: [69, 72, 76, 72, 67, 71, 74, 79],
    drums: true,
    drive: 0.52,
  },
  night: {
    bpm: 92,
    chords: [
      [50, 53, 57, 60],
      [46, 50, 53, 57],
      [53, 57, 60, 64],
      [48, 52, 55, 60],
    ],
    bass: [38, 34, 41, 36],
    melody: [74, 77, 81, 77, 72, 76, 79, 84],
    drums: true,
    drive: 0.64,
  },
}

const MODE_ORDER: Scene[] = ['rain', 'ambient', 'pulse', 'night']

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function frequency(note: number) {
  return 440 * 2 ** ((note - 69) / 12)
}

function makeReverb(context: AudioContext) {
  const convolver = context.createConvolver()
  const seconds = 2.8
  const impulse = context.createBuffer(
    2,
    Math.floor(context.sampleRate * seconds),
    context.sampleRate,
  )
  for (let channelIndex = 0; channelIndex < impulse.numberOfChannels; channelIndex++) {
    const channel = impulse.getChannelData(channelIndex)
    for (let index = 0; index < channel.length; index++) {
      const decay = (1 - index / channel.length) ** 2.7
      channel[index] = (Math.random() * 2 - 1) * decay
    }
  }
  convolver.buffer = impulse
  return convolver
}

function envelope(
  gain: AudioParam,
  start: number,
  peak: number,
  attack: number,
  duration: number,
) {
  gain.setValueAtTime(0.0001, start)
  gain.exponentialRampToValueAtTime(peak, start + attack)
  gain.exponentialRampToValueAtTime(0.0001, start + duration)
}

async function createRain(volume: number): Promise<AudioEngine> {
  const context = new AudioContext({ latencyHint: 'playback' })
  const master = context.createGain()
  master.gain.value = Math.max(0.0001, volume / 100)
  master.connect(context.destination)
  await context.resume()

  const response = await fetch('/audio/rain-window.mp3', { cache: 'force-cache' })
  if (!response.ok) {
    await context.close()
    throw new Error('rain audio unavailable')
  }
  const buffer = await context.decodeAudioData(await response.arrayBuffer())

  const engine: AudioEngine = {
    context,
    master,
    timer: 0,
    stopped: false,
  }
  const crossfade = Math.min(7, buffer.duration / 8)
  let nextStart = context.currentTime + 0.06
  let sequence = 0

  function scheduleSource(start: number, first: boolean) {
    const source = context.createBufferSource()
    const gain = context.createGain()
    const end = start + buffer.duration
    const fadeIn = first ? 0.8 : crossfade

    source.buffer = buffer
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(1, start + fadeIn)
    gain.gain.setValueAtTime(1, end - crossfade)
    gain.gain.linearRampToValueAtTime(0.0001, end)
    source.connect(gain).connect(master)
    source.start(start)
    source.stop(end + 0.05)
  }

  function schedule() {
    const horizon = context.currentTime + buffer.duration * 1.5
    while (nextStart < horizon && !engine.stopped) {
      scheduleSource(nextStart, sequence === 0)
      nextStart += buffer.duration - crossfade
      sequence++
    }
  }

  schedule()
  engine.timer = window.setInterval(schedule, 10000)
  return engine
}

function createMusic(scene: MusicScene, volume: number): AudioEngine {
  const context = new AudioContext()
  const config = MUSIC[scene]
  const master = context.createGain()
  const compressor = context.createDynamicsCompressor()
  const dry = context.createGain()
  const wet = context.createGain()
  const reverb = makeReverb(context)
  const delay = context.createDelay(1.2)
  const feedback = context.createGain()

  master.gain.value = Math.max(0.0001, volume / 100)
  compressor.threshold.value = -18
  compressor.knee.value = 18
  compressor.ratio.value = 5
  compressor.attack.value = 0.012
  compressor.release.value = 0.28
  dry.gain.value = 0.86
  wet.gain.value = scene === 'ambient' ? 0.38 : 0.22
  delay.delayTime.value = (60 / config.bpm) * 0.75
  feedback.gain.value = 0.27

  dry.connect(compressor)
  reverb.connect(wet).connect(compressor)
  delay.connect(feedback).connect(delay)
  delay.connect(wet)
  compressor.connect(master).connect(context.destination)

  const engine: AudioEngine = {
    context,
    master,
    timer: 0,
    stopped: false,
  }
  const beat = 60 / config.bpm
  let step = 0
  let nextTime = context.currentTime + 0.08

  function route(node: AudioNode, send = 0.32) {
    node.connect(dry)
    const sendGain = context.createGain()
    sendGain.gain.value = send
    node.connect(sendGain).connect(reverb)
    node.connect(delay)
  }

  function pad(notes: number[], start: number) {
    for (const [index, note] of notes.entries()) {
      const oscillator = context.createOscillator()
      const filter = context.createBiquadFilter()
      const gain = context.createGain()
      oscillator.type = index % 2 ? 'triangle' : 'sine'
      oscillator.frequency.value = frequency(note)
      oscillator.detune.value = index * 2.5 - 4
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(scene === 'night' ? 920 : 1450, start)
      filter.Q.value = 0.7
      envelope(gain.gain, start, 0.045, 0.38, beat * 7.8)
      oscillator.connect(filter).connect(gain)
      route(gain, scene === 'ambient' ? 0.72 : 0.44)
      oscillator.start(start)
      oscillator.stop(start + beat * 8)
    }
  }

  function pluck(note: number, start: number, accent = false) {
    const oscillator = context.createOscillator()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    oscillator.type = scene === 'night' ? 'sawtooth' : 'triangle'
    oscillator.frequency.value = frequency(note)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(scene === 'ambient' ? 1600 : 2300, start)
    filter.frequency.exponentialRampToValueAtTime(420, start + beat * 0.65)
    filter.Q.value = 2.8
    envelope(gain.gain, start, accent ? 0.075 : 0.048, 0.012, beat * 0.72)
    oscillator.connect(filter).connect(gain)
    route(gain, 0.5)
    oscillator.start(start)
    oscillator.stop(start + beat * 0.8)
  }

  function bass(note: number, start: number) {
    const oscillator = context.createOscillator()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    oscillator.type = scene === 'night' ? 'sawtooth' : 'triangle'
    oscillator.frequency.value = frequency(note)
    filter.type = 'lowpass'
    filter.frequency.value = scene === 'night' ? 310 : 220
    filter.Q.value = 1.1
    envelope(gain.gain, start, config.drive * 0.16, 0.018, beat * 0.82)
    oscillator.connect(filter).connect(gain)
    gain.connect(dry)
    oscillator.start(start)
    oscillator.stop(start + beat * 0.9)
  }

  function kick(start: number) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(132, start)
    oscillator.frequency.exponentialRampToValueAtTime(44, start + 0.16)
    envelope(gain.gain, start, 0.34, 0.006, 0.25)
    oscillator.connect(gain).connect(dry)
    oscillator.start(start)
    oscillator.stop(start + 0.27)
  }

  function clap(start: number) {
    for (const offset of [0, 0.018, 0.036]) {
      const oscillator = context.createOscillator()
      const filter = context.createBiquadFilter()
      const gain = context.createGain()
      oscillator.type = 'square'
      oscillator.frequency.value = 920 + offset * 5000
      filter.type = 'bandpass'
      filter.frequency.value = 1250
      filter.Q.value = 0.8
      envelope(gain.gain, start + offset, 0.026, 0.003, 0.075)
      oscillator.connect(filter).connect(gain)
      route(gain, 0.18)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.09)
    }
  }

  function hat(start: number) {
    const gain = context.createGain()
    const filter = context.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 5400
    envelope(gain.gain, start, 0.018, 0.002, 0.045)
    for (const pitch of [431, 677, 983]) {
      const oscillator = context.createOscillator()
      oscillator.type = 'square'
      oscillator.frequency.value = pitch
      oscillator.connect(filter)
      oscillator.start(start)
      oscillator.stop(start + 0.055)
    }
    filter.connect(gain).connect(dry)
  }

  function schedule() {
    const horizon = context.currentTime + 0.22
    while (nextTime < horizon && !engine.stopped) {
      const halfBeat = beat / 2
      const chordIndex = Math.floor(step / 16) % config.chords.length
      const withinChord = step % 16

      if (withinChord === 0) pad(config.chords[chordIndex], nextTime)
      if (withinChord % 4 === 0) bass(config.bass[chordIndex], nextTime)

      const chord = config.chords[chordIndex]
      const chordNote = chord[(withinChord / 2 + chordIndex) % chord.length | 0] + 12
      if (scene === 'ambient') {
        if (withinChord % 2 === 0) pluck(chordNote, nextTime, withinChord === 0)
      } else {
        pluck(chordNote, nextTime, withinChord % 4 === 0)
      }

      if (withinChord === 6 || withinChord === 14) {
        const melodyIndex =
          (Math.floor(step / 16) * 2 + (withinChord === 14 ? 1 : 0)) %
          config.melody.length
        pluck(config.melody[melodyIndex], nextTime, true)
      }

      if (config.drums) {
        if (withinChord % 8 === 0 || withinChord % 8 === 4) kick(nextTime)
        if (withinChord % 8 === 4) clap(nextTime)
        if (withinChord % 2 === 1) hat(nextTime)
      }

      step++
      nextTime += halfBeat
    }
  }

  schedule()
  engine.timer = window.setInterval(schedule, 80)
  return engine
}

async function createAudio(scene: Scene, volume: number) {
  return scene === 'rain' ? createRain(volume) : createMusic(scene, volume)
}

export default function VibeRadio({ full = false }: { full?: boolean }) {
  const [scene, setScene] = useState<Scene>('rain')
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [minutes, setMinutes] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60)
  const [volume, setVolume] = useState(42)
  const engine = useRef<AudioEngine | null>(null)
  const startRequest = useRef(0)
  const copy = MODES[scene]

  const stop = useCallback(() => {
    startRequest.current++
    const current = engine.current
    engine.current = null
    setPlaying(false)
    if (!current) return
    current.stopped = true
    window.clearInterval(current.timer)
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
      const request = ++startRequest.current
      setLoading(true)
      setError(null)
      try {
        const next = await createAudio(nextScene, volume)
        if (request !== startRequest.current) {
          next.stopped = true
          window.clearInterval(next.timer)
          await next.context.close()
          return
        }
        engine.current = next
        await next.context.resume()
        setPlaying(true)
      } catch {
        if (request === startRequest.current) {
          setError('Не удалось загрузить запись. Попробуйте включить ещё раз.')
        }
      } finally {
        if (request === startRequest.current) setLoading(false)
      }
    },
    [scene, stop, volume],
  )

  useEffect(
    () => () => {
      if (!engine.current) return
      engine.current.stopped = true
      window.clearInterval(engine.current.timer)
      void engine.current.context.close()
    },
    [],
  )

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

  useEffect(() => {
    const current = engine.current
    if (!current) return
    current.master.gain.setTargetAtTime(
      Math.max(0.0001, volume / 100),
      current.context.currentTime,
      0.08,
    )
  }, [volume])

  function chooseScene(next: Scene) {
    if (loading) {
      startRequest.current++
      setLoading(false)
    }
    setScene(next)
    if (playing) void start(next)
  }

  function chooseMinutes(next: number) {
    setMinutes(next)
    setRemaining(next * 60)
  }

  const playLabel = loading
    ? `Загружаем «${copy.label}»`
    : playing
      ? `Поставить «${copy.label}» на паузу`
      : `Включить «${copy.label}»`

  return (
    <section
      className={styles.radio}
      data-full={full ? '' : undefined}
      data-mode={scene}
    >
      <div className={styles.topline}>
        <span className={`mono ${styles.eyebrow}`}>
          <span className={styles.dot} /> VIBE FOCUS
        </span>
        <span className={styles.license}>
          {scene === 'rain' ? 'FIELD RECORDING · CC0' : 'GENERATIVE LIVE'}
        </span>
      </div>

      <div
        className={styles.visual}
        data-rain={scene === 'rain' ? '' : undefined}
        aria-hidden="true"
      >
        <div className={styles.orb} data-playing={playing ? '' : undefined} />
        {scene === 'rain' ? (
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
        ) : (
          <div className={styles.wave} data-playing={playing ? '' : undefined}>
            {Array.from({ length: 24 }, (_, index) => (
              <i key={index} style={{ animationDelay: `${index * -73}ms` }} />
            ))}
          </div>
        )}
        <span className={styles.timer}>{clock(remaining)}</span>
      </div>

      <div className={styles.copy}>
        <div>
          <h2 className={styles.title}>{copy.title}</h2>
          <p className={styles.note}>{error ?? copy.description}</p>
        </div>
        <button
          type="button"
          className={styles.play}
          onClick={() => (playing ? stop() : void start())}
          aria-label={playLabel}
          disabled={loading}
        >
          {loading ? '…' : playing ? 'Ⅱ' : '▶'}
        </button>
      </div>

      <div className={styles.scenes} aria-label="Звуковой режим">
        {MODE_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.scene}
            data-active={scene === id ? '' : undefined}
            onClick={() => chooseScene(id)}
            title={MODES[id].note}
          >
            {MODES[id].label}
          </button>
        ))}
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
          <span className={styles.hint}>
            {scene === 'rain'
              ? '3:28 стереозаписи · плавное продолжение'
              : 'Каждая сессия звучит немного иначе'}
          </span>
        ) : (
          <Link href="/radio" className={styles.open}>
            На весь экран ↗
          </Link>
        )}
      </div>
    </section>
  )
}
