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
    note: 'ливень по стеклу',
    title: 'Дождь за окном',
    description:
      'Мягкий ливень, дальний гул и отдельные капли по стеклу собираются в реальном времени.',
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

function makeNoiseBuffer(
  context: AudioContext,
  seconds: number,
  channels = 2,
) {
  const buffer = context.createBuffer(
    channels,
    Math.floor(context.sampleRate * seconds),
    context.sampleRate,
  )

  for (let channelIndex = 0; channelIndex < channels; channelIndex++) {
    const channel = buffer.getChannelData(channelIndex)
    let slow = Math.random() * 0.1 - 0.05
    for (let index = 0; index < channel.length; index++) {
      const white = Math.random() * 2 - 1
      slow = slow * 0.996 + white * 0.004
      channel[index] = Math.max(-1, Math.min(1, white * 0.74 + slow * 3.2))
    }
  }

  return buffer
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

function createRain(volume: number): AudioEngine {
  const context = new AudioContext({ latencyHint: 'playback' })
  const master = context.createGain()
  const compressor = context.createDynamicsCompressor()
  const rainBuffer = makeNoiseBuffer(context, 24)
  const dropBuffer = makeNoiseBuffer(context, 3, 1)
  const rain = context.createBufferSource()

  master.gain.value = Math.max(0.0001, volume / 100)
  compressor.threshold.value = -20
  compressor.knee.value = 20
  compressor.ratio.value = 3
  compressor.attack.value = 0.025
  compressor.release.value = 0.4
  compressor.connect(master).connect(context.destination)

  rain.buffer = rainBuffer
  rain.loop = true

  const washHigh = context.createBiquadFilter()
  const washLow = context.createBiquadFilter()
  const washGain = context.createGain()
  washHigh.type = 'highpass'
  washHigh.frequency.value = 680
  washHigh.Q.value = 0.35
  washLow.type = 'lowpass'
  washLow.frequency.value = 9100
  washGain.gain.value = 0.29
  rain.connect(washHigh).connect(washLow).connect(washGain).connect(compressor)

  const glass = context.createBiquadFilter()
  const glassGain = context.createGain()
  glass.type = 'bandpass'
  glass.frequency.value = 5200
  glass.Q.value = 0.55
  glassGain.gain.value = 0.095
  rain.connect(glass).connect(glassGain).connect(compressor)

  const room = context.createBiquadFilter()
  const roomGain = context.createGain()
  room.type = 'lowpass'
  room.frequency.value = 480
  room.Q.value = 0.5
  roomGain.gain.value = 0.18
  rain.connect(room).connect(roomGain).connect(compressor)

  const drift = context.createOscillator()
  const driftDepth = context.createGain()
  drift.type = 'sine'
  drift.frequency.value = 0.045
  driftDepth.gain.value = 0.045
  drift.connect(driftDepth).connect(washGain.gain)

  rain.start()
  drift.start()

  const engine: AudioEngine = {
    context,
    master,
    timer: 0,
    stopped: false,
  }
  let nextDrop = context.currentTime + 0.05

  function drop(start: number) {
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    const pan = context.createStereoPanner()
    const heavy = Math.random() > 0.84
    const duration = heavy ? 0.19 : 0.1 + Math.random() * 0.05

    source.buffer = dropBuffer
    filter.type = 'bandpass'
    filter.frequency.value = heavy
      ? 900 + Math.random() * 1500
      : 2600 + Math.random() * 4300
    filter.Q.value = heavy ? 0.7 : 1.4
    pan.pan.value = Math.random() * 1.8 - 0.9
    envelope(
      gain.gain,
      start,
      heavy ? 0.075 : 0.018 + Math.random() * 0.025,
      0.003,
      duration,
    )

    source
      .connect(filter)
      .connect(gain)
      .connect(pan)
      .connect(compressor)
    source.start(start, Math.random() * (dropBuffer.duration - 0.25), duration)
    source.stop(start + duration + 0.01)

    if (heavy) {
      const tone = context.createOscillator()
      const toneGain = context.createGain()
      tone.type = 'sine'
      tone.frequency.setValueAtTime(1100 + Math.random() * 900, start)
      tone.frequency.exponentialRampToValueAtTime(420, start + 0.13)
      envelope(toneGain.gain, start, 0.008, 0.002, 0.14)
      tone.connect(toneGain).connect(pan)
      tone.start(start)
      tone.stop(start + 0.15)
    }
  }

  function schedule() {
    const horizon = context.currentTime + 0.45
    while (nextDrop < horizon && !engine.stopped) {
      drop(nextDrop)
      nextDrop += 0.055 + Math.random() * 0.19
    }
  }

  schedule()
  engine.timer = window.setInterval(schedule, 120)
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

function createAudio(scene: Scene, volume: number) {
  return scene === 'rain' ? createRain(volume) : createMusic(scene, volume)
}

export default function VibeRadio({ full = false }: { full?: boolean }) {
  const [scene, setScene] = useState<Scene>('rain')
  const [playing, setPlaying] = useState(false)
  const [minutes, setMinutes] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60)
  const [volume, setVolume] = useState(42)
  const engine = useRef<AudioEngine | null>(null)
  const copy = MODES[scene]

  const stop = useCallback(() => {
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
      const next = createAudio(nextScene, volume)
      engine.current = next
      await next.context.resume()
      setPlaying(true)
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
    setScene(next)
    if (playing) void start(next)
  }

  function chooseMinutes(next: number) {
    setMinutes(next)
    setRemaining(next * 60)
  }

  const playLabel = playing
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
          {scene === 'rain' ? 'SYNTHETIC RAIN · LIVE' : 'GENERATIVE LIVE'}
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
          <p className={styles.note}>{copy.description}</p>
        </div>
        <button
          type="button"
          className={styles.play}
          onClick={() => (playing ? stop() : void start())}
          aria-label={playLabel}
        >
          {playing ? 'Ⅱ' : '▶'}
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
              ? 'Рисунок дождя не повторяется буквально'
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
