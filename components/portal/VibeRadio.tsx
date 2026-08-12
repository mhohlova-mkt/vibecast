'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './VibeRadio.module.css'

type StationId = 'rain' | 'depth' | 'flow' | 'air'

type Track = {
  title: string
  artist: string
  src: string
  downloads?: string
}

type Station = {
  label: string
  title: string
  description: string
  tracks: Track[]
}

const STATIONS: Record<StationId, Station> = {
  rain: {
    label: 'Дождь',
    title: 'Дождь за окном',
    description: 'Полевая стереозапись дождя у полуоткрытого окна.',
    tracks: [
      {
        title: 'Rain from Half Open Window 2',
        artist: 'Rutger Muller',
        src: '/audio/rain-window.mp3',
      },
    ],
  },
  depth: {
    label: 'Глубина',
    title: 'Глубина',
    description: 'Популярная CC0-электроника: отобрано по скачиваниям, без вокала.',
    tracks: [
      { title: 'Model D — Dub Techno', artist: 'thehorsevalse', src: '/audio/radio/depth/04-human-dub-techno-preview.mp3', downloads: '120' },
      { title: 'gameMusic', artist: 'Magntron', src: '/audio/radio/depth/01-gamemusic.mp3', downloads: '9 741' },
      { title: 'Space Arp F Chords', artist: 'BuytheField', src: '/audio/radio/depth/02-space-arp.mp3', downloads: '2 885' },
      { title: 'Background Music PA!', artist: 'ProAnanasGumpy', src: '/audio/radio/depth/03-background-pa.mp3', downloads: '2 524' },
      { title: 'Cute Happy Background Music', artist: 'Seth Makes Sounds', src: '/audio/radio/depth/04-cute-happy.mp3', downloads: '2 361' },
      { title: 'Video Game Sound', artist: 'djgriffin', src: '/audio/radio/depth/05-video-game.mp3', downloads: '2 085' },
      { title: 'Electronic Glitter', artist: 'moogsy', src: '/audio/radio/depth/06-electronic-glitter.mp3', downloads: '1 695' },
      { title: 'Free Commercial Song', artist: 'Seth Makes Sounds', src: '/audio/radio/depth/07-free-commercial.mp3', downloads: '1 587' },
      { title: 'Retro', artist: 'B Sean', src: '/audio/radio/depth/08-retro.mp3', downloads: '1 550' },
      { title: 'Commercial Music I Guess', artist: 'Seth Makes Sounds', src: '/audio/radio/depth/09-commercial-music.mp3', downloads: '1 521' },
      { title: 'Background E-Music', artist: 'Clacksberg', src: '/audio/radio/depth/10-background-e-music.mp3', downloads: '1 464' },
    ],
  },
  flow: {
    label: 'Поток',
    title: 'Поток',
    description: 'Самые скачиваемые CC0 downtempo и trip-hop треки без вокала.',
    tracks: [
      { title: 'Parallel Universe', artist: 'Andrewkn', src: '/audio/radio/flow/15-flow-parallel-universe.mp3', downloads: '3 597' },
      { title: '2020-04-12 Keys', artist: 'Doctor Dreamchip', src: '/audio/radio/flow/flow-keys.mp3', downloads: '1 095' },
      { title: 'Smoke', artist: 'Cloud-10', src: '/audio/radio/flow/flow-smoke.mp3', downloads: '635' },
      { title: '2020-01-04', artist: 'Doctor Dreamchip', src: '/audio/radio/flow/23-flow-2020-01-04.mp3', downloads: '626' },
      { title: 'CHOKAVITZ SOUL', artist: 'LS', src: '/audio/radio/flow/flow-chokavitz.mp3', downloads: '501' },
      { title: '2019-11-29 2', artist: 'Doctor Dreamchip', src: '/audio/radio/flow/flow-2019-11-29.mp3', downloads: '386' },
      { title: '2018-03-22', artist: 'Doctor Dreamchip', src: '/audio/radio/flow/22-flow-2018-03-22.mp3', downloads: '336' },
    ],
  },
  air: {
    label: 'Воздух',
    title: 'Воздух',
    description: 'Самые скачиваемые CC0 ambient-композиции без вокала.',
    tracks: [
      { title: 'Calm Background Music', artist: 'Bertsz', src: '/audio/radio/air/air-calm-background.mp3', downloads: '6 898' },
      { title: 'Era of Space', artist: 'MrPork', src: '/audio/radio/air/air-era-of-space.mp3', downloads: '4 825' },
      { title: 'Heart Beat of a Dream', artist: 'metrostock99', src: '/audio/radio/air/air-heart-beat-dream.mp3', downloads: '4 032' },
      { title: 'Stressing Ambient', artist: 'onderwish', src: '/audio/radio/air/air-stressing-ambient.mp3', downloads: '3 171' },
      { title: 'Lake Night', artist: 'ChristmasKrumble666', src: '/audio/radio/air/air-lake-night.mp3', downloads: '2 771' },
      { title: 'Jazzy Ambient Piano', artist: 'Hakren', src: '/audio/radio/air/air-jazzy-piano.mp3', downloads: '2 701' },
    ],
  },
}

const STATION_ORDER: StationId[] = ['rain', 'depth', 'flow', 'air']

function clock(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const minutes = Math.floor(safeSeconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`
}

export default function VibeRadio({ full = false }: { full?: boolean }) {
  const [stationId, setStationId] = useState<StationId>('rain')
  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(42)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [repeat, setRepeat] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const wantsPlayback = useRef(false)

  const station = STATIONS[stationId]
  const track = station.tracks[trackIndex]

  const start = useCallback(async () => {
    const player = audio.current
    if (!player) return
    wantsPlayback.current = true
    setLoading(true)
    setError(null)
    try {
      await player.play()
      setPlaying(true)
    } catch {
      wantsPlayback.current = false
      setPlaying(false)
      setError('Не удалось загрузить трек. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }, [])

  const stop = useCallback(() => {
    wantsPlayback.current = false
    audio.current?.pause()
    setPlaying(false)
    setLoading(false)
  }, [])

  const changeTrack = useCallback(
    (step: number) => {
      setTrackIndex((current) =>
        (current + step + station.tracks.length) % station.tracks.length,
      )
    },
    [station.tracks.length],
  )

  useEffect(() => {
    const player = audio.current
    if (!player) return
    let cancelled = false

    setPosition(0)
    setDuration(0)
    setError(null)
    player.load()

    const resume = async () => {
      if (cancelled || !wantsPlayback.current) return
      setLoading(true)
      try {
        await player.play()
        if (!cancelled) setPlaying(true)
      } catch {
        if (cancelled) return
        wantsPlayback.current = false
        setPlaying(false)
        setError('Не удалось загрузить трек. Переключите его или попробуйте ещё раз.')
      } finally {
        setLoading(false)
      }
    }

    player.addEventListener('canplay', resume, { once: true })
    if (player.readyState >= 1 && Number.isFinite(player.duration)) {
      setDuration(player.duration)
    }
    if (player.readyState >= 3) void resume()
    return () => {
      cancelled = true
      player.removeEventListener('canplay', resume)
    }
  }, [track.src])

  useEffect(() => {
    if (audio.current) {
      audio.current.volume = volume / 100
      audio.current.loop = repeat
    }
  }, [repeat, volume])

  function chooseStation(next: StationId) {
    if (next === stationId) return
    setStationId(next)
    setTrackIndex(0)
  }

  function seek(next: number) {
    const player = audio.current
    if (!player || !Number.isFinite(player.duration)) return
    player.currentTime = Math.min(Math.max(next, 0), player.duration)
    setPosition(player.currentTime)
  }

  function handleEnded() {
    if (repeat) return
    if (station.tracks.length === 1) {
      wantsPlayback.current = false
      setPlaying(false)
      setPosition(duration)
      return
    }
    changeTrack(1)
  }

  return (
    <section
      className={styles.radio}
      data-full={full ? '' : undefined}
      data-mode={stationId}
    >
      <audio
        ref={audio}
        src={track.src}
        preload="metadata"
        loop={repeat}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onEnded={handleEnded}
        onError={() => {
          setLoading(false)
          setError('Этот трек не загрузился. Переключите на следующий.')
        }}
      />

      <div className={styles.topline}>
        <span className={`mono ${styles.eyebrow}`}>
          <span className={styles.dot} /> VIBE RADIO
        </span>
        <span className={styles.license}>CC0 · БЕЗ ВОКАЛА</span>
      </div>

      <div
        className={styles.visual}
        data-rain={stationId === 'rain' ? '' : undefined}
        aria-hidden="true"
      >
        <div className={styles.orb} data-playing={playing ? '' : undefined} />
        {stationId === 'rain' ? (
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
        <span className={styles.status}>{playing ? 'ON AIR' : 'READY'}</span>
      </div>

      <div className={styles.copy}>
        <div>
          <h2 className={styles.title}>{station.title}</h2>
          <p className={styles.note}>{error ?? station.description}</p>
        </div>
        <button
          type="button"
          className={styles.play}
          onClick={() => (playing ? stop() : void start())}
          aria-label={playing ? 'Пауза' : `Включить «${station.label}»`}
          disabled={loading}
        >
          {loading ? '…' : playing ? 'Ⅱ' : '▶'}
        </button>
      </div>

      <div className={styles.scenes} aria-label="Станция">
        {STATION_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.scene}
            data-active={stationId === id ? '' : undefined}
            onClick={() => chooseStation(id)}
          >
            {STATIONS[id].label}
          </button>
        ))}
      </div>

      <div className={styles.trackRow}>
        <button
          type="button"
          className={styles.trackNav}
          onClick={() => changeTrack(-1)}
          disabled={station.tracks.length === 1}
          aria-label="Предыдущий трек"
        >
          ‹
        </button>
        <div className={styles.trackCopy}>
          <strong>{track.title}</strong>
          <span>
            {track.artist}
            {track.downloads ? ` · ${track.downloads} скачиваний` : ''}
            {' · '}{trackIndex + 1}/{station.tracks.length}
          </span>
        </div>
        <button
          type="button"
          className={styles.trackNav}
          onClick={() => changeTrack(1)}
          disabled={station.tracks.length === 1}
          aria-label="Следующий трек"
        >
          ›
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
            aria-label="Позиция в треке"
          />
          <span>{clock(duration)}</span>
          <button
            type="button"
            className={styles.repeat}
            data-active={repeat ? '' : undefined}
            aria-label={repeat ? 'Выключить повтор трека' : 'Повторять трек'}
            title={repeat ? 'Повтор включён' : 'Повторять трек'}
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
