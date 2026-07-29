'use client'

import { useState } from 'react'
import { saveHome } from '@/lib/actions/admin'

/**
 * Раздел «Главная»: что закреплено в большом блоке, какое у него медиа,
 * рекламный баннер и закреп в «Обучении».
 */

type ArticleOption = { id: string; title: string; author: string }

export type HomeDraft = {
  promoKind: string
  promoMediaSrc: string | null
  promoMediaKind: string | null
  promoLink: string
  heroArticleId: string | null
  heroMediaSrc: string | null
  heroMediaKind: string | null
  bannerEnabled: boolean
  bannerHtml: string
  bannerImg: string | null
  bannerLink: string
  learnPinOn: boolean
  learnPinImg: string | null
  learnPinTitle: string
  learnPinDesc: string
  learnPinLink: string
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--line)',
  borderRadius: 18,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

const field: React.CSSProperties = {
  background: '#F4F3EC',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: '12px 15px',
  fontSize: 14.5,
  width: '100%',
  fontFamily: 'inherit',
}

const label: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '.1em',
  color: 'var(--muted)',
  fontFamily: 'var(--font-mono), monospace',
  textTransform: 'uppercase',
}

const isVideo = (s: string) => /\.(mp4|webm)(\?.*)?$/i.test(s)

export default function HomeEditor({
  draft,
  articles,
}: {
  draft: HomeDraft
  articles: ArticleOption[]
}) {
  const [heroId, setHeroId] = useState(draft.heroArticleId ?? '')
  const [heroMedia, setHeroMedia] = useState(draft.heroMediaSrc ?? '')
  const [heroKind, setHeroKind] = useState(draft.heroMediaKind ?? '')
  const [promoKind, setPromoKind] = useState(draft.promoKind || 'broadcast')
  const [promoMedia, setPromoMedia] = useState(draft.promoMediaSrc ?? '')
  const [promoMediaKind, setPromoMediaKind] = useState(draft.promoMediaKind ?? '')
  const [bannerOn, setBannerOn] = useState(draft.bannerEnabled)
  const [bannerMode, setBannerMode] = useState<'media' | 'html'>(
    draft.bannerHtml.trim() ? 'html' : 'media',
  )
  const [bannerImg, setBannerImg] = useState(draft.bannerImg ?? '')
  const [learnOn, setLearnOn] = useState(draft.learnPinOn)
  const [learnImg, setLearnImg] = useState(draft.learnPinImg ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Не удалось загрузить файл')
      return data as { src: string; kind: string }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
      return null
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      action={saveHome}
      style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <input type="hidden" name="heroArticleId" value={heroId} />
      <input type="hidden" name="heroMediaSrc" value={heroMedia} />
      <input type="hidden" name="heroMediaKind" value={heroKind} />
      <input type="hidden" name="promoKind" value={promoKind} />
      <input type="hidden" name="promoMediaSrc" value={promoMedia} />
      <input type="hidden" name="promoMediaKind" value={promoMediaKind} />
      <input type="hidden" name="bannerEnabled" value={bannerOn ? 'true' : ''} />
      <input type="hidden" name="bannerImg" value={bannerImg} />
      <input type="hidden" name="learnPinOn" value={learnOn ? 'true' : ''} />
      <input type="hidden" name="learnPinImg" value={learnImg} />

      {/* ─── Закреплённая статья ─── */}
      <section style={card}>
        <span style={label}>Главный блок — какая статья</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {articles.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
              Нет опубликованных статей. Сначала опубликуйте материал.
            </p>
          ) : null}

          {articles.map((a) => {
            const on = a.id === heroId
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setHeroId(on ? '' : a.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textAlign: 'left',
                  border: on ? '1.5px solid var(--dark)' : '1.5px solid #D8D7CB',
                  background: on ? '#F4F7EC' : '#FCFCF9',
                  borderRadius: 12,
                  padding: '11px 14px',
                  cursor: 'pointer',
                  font: 'inherit',
                }}
              >
                {/* Кружок-переключатель: без него строки читаются как текст,
                    и непонятно, что по ним можно кликать. */}
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    flexShrink: 0,
                    border: on ? '5px solid var(--dark)' : '2px solid #B9B8AC',
                    background: '#fff',
                  }}
                />

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 15 }}>
                    {a.title}
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {a.author}
                  </span>
                </span>
                {on ? (
                  <span
                    className="mono"
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--dark)',
                      borderRadius: 'var(--r-pill)',
                      padding: '5px 11px',
                      fontSize: 10,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    НА ГЛАВНОЙ
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          Если ничего не выбрано, в главный блок попадёт самая свежая статья ленты.
        </span>
      </section>

      {/* ─── Медиа главного блока ─── */}
      <section style={card}>
        <span style={label}>Медиа главного блока</span>

        {/* Превью — маленькое, сбоку; занимать полосу во всю ширину незачем. */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 190,
              aspectRatio: '16 / 10',
              flexShrink: 0,
              borderRadius: 12,
              overflow: 'hidden',
              border: heroMedia ? '1px solid var(--line)' : '1.5px dashed #C9C8BC',
              background: '#F4F3EC',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {heroMedia ? (
              heroKind === 'video' ? (
                <video
                  src={heroMedia}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroMedia}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )
            ) : (
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  textAlign: 'center',
                  padding: '0 12px',
                  lineHeight: 1.4,
                }}
              >
                Обложка статьи
              </span>
            )}
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 220,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              style={{ fontSize: 13 }}
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const up = await upload(f)
                if (up) {
                  setHeroMedia(up.src)
                  setHeroKind(up.kind)
                }
              }}
            />
            {heroMedia ? (
              <button
                type="button"
                onClick={() => {
                  setHeroMedia('')
                  setHeroKind('')
                }}
                style={{
                  border: '1px solid var(--line)',
                  background: 'transparent',
                  borderRadius: 'var(--r-pill)',
                  padding: '8px 16px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Вернуть обложку статьи
              </button>
            ) : null}
            <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              Фото или GIF до 8 МБ, видео MP4 или WebM до 12 МБ. Видео идёт без
              звука. Если ничего не загружено, берётся обложка закреплённой статьи.
            </span>
          </div>
        </div>
      </section>

      {/* ─── Блок справа ─── */}
      <section style={card}>
        <span style={label}>Блок справа на главной</span>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 }}>
          Пока трансляций нет, место можно занять баннером — оно на самом
          видном экране, и пустым его держать незачем.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'broadcast', label: 'Эфир или анонс' },
            { key: 'media', label: 'Картинка или видео' },
            { key: 'hidden', label: 'Скрыть блок' },
          ].map((o) => {
            const on = o.key === promoKind
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setPromoKind(o.key)}
                style={{
                  border: on ? '1.5px solid var(--dark)' : '1.5px solid #D8D7CB',
                  background: on ? 'var(--dark)' : '#FCFCF9',
                  color: on ? 'var(--dark-text)' : 'var(--dark)',
                  borderRadius: 'var(--r-pill)',
                  padding: '9px 18px',
                  fontSize: 13.5,
                  fontWeight: on ? 700 : 600,
                  cursor: 'pointer',
                }}
              >
                {o.label}
              </button>
            )
          })}
        </div>

        {promoKind === 'media' ? (
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flexShrink: 0 }}>
              <div
                style={{
                  width: 220,
                  minHeight: 150,
                  borderRadius: 20,
                  overflow: 'hidden',
                  border: promoMedia ? '1px solid var(--line)' : '1.5px dashed #C9C8BC',
                  background: '#F4F3EC',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {promoMedia ? (
                  promoMediaKind === 'video' ? (
                    <video
                      src={promoMedia}
                      style={{ width: '100%', display: 'block' }}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={promoMedia} alt="" style={{ width: '100%', display: 'block' }} />
                  )
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Не загружено</span>
                )}
              </div>
              <span
                style={{ display: 'block', marginTop: 6, fontSize: 11.5, color: 'var(--muted)' }}
              >
                Так это выглядит на сайте
              </span>
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 220,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <input
                type="file"
                accept="image/*,video/mp4,video/webm"
                style={{ fontSize: 13 }}
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const up = await upload(f)
                  if (up) {
                    setPromoMedia(up.src)
                    setPromoMediaKind(up.kind)
                  }
                }}
              />
              {promoMedia ? (
                <button
                  type="button"
                  onClick={() => {
                    setPromoMedia('')
                    setPromoMediaKind('')
                  }}
                  style={{
                    border: '1px solid var(--line)',
                    background: 'transparent',
                    borderRadius: 'var(--r-pill)',
                    padding: '8px 16px',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Убрать
                </button>
              ) : null}
              <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                Ширина блока около 380 пикселей, высота свободная — пропорции
                берутся из файла. Видео крутится само и без звука.
              </span>

              <label style={{ ...label, marginTop: 4 }} htmlFor="promoLink">
                Ссылка по клику
              </label>
              <input
                id="promoLink"
                name="promoLink"
                defaultValue={draft.promoLink}
                placeholder="https://... или /live"
                style={field}
              />
            </div>
          </div>
        ) : (
          <input type="hidden" name="promoLink" value={draft.promoLink} />
        )}
      </section>

      {/* ─── Рекламный баннер ─── */}
      <section style={card}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={bannerOn}
            onChange={(e) => setBannerOn(e.target.checked)}
            style={{ width: 17, height: 17, accentColor: '#15160F' }}
          />
          <span style={{ fontSize: 15, fontWeight: 700 }}>Показывать баннер</span>
        </label>

        {bannerOn ? (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['media', 'html'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBannerMode(m)}
                  style={{
                    border: bannerMode === m ? '1px solid var(--dark)' : '1px solid #C9C8BC',
                    background: bannerMode === m ? 'var(--dark)' : 'transparent',
                    color: bannerMode === m ? 'var(--dark-text)' : 'var(--dark)',
                    borderRadius: 'var(--r-pill)',
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: bannerMode === m ? 700 : 600,
                    cursor: 'pointer',
                  }}
                >
                  {m === 'media' ? 'Картинка или видео' : 'HTML-код'}
                </button>
              ))}
            </div>

            {bannerMode === 'media' ? (
              <>
                {/* HTML не нужен — гасим его, иначе он перебьёт медиа. */}
                <input type="hidden" name="bannerHtml" value="" />

                {/* Превью ровно того размера, каким баннер будет на сайте:
                    380×110. Растянутое на всю ширину врало бы про кадрирование. */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flexShrink: 0 }}>
                    <div
                      style={{
                        width: 380,
                        height: 110,
                        maxWidth: '100%',
                        borderRadius: 20,
                        overflow: 'hidden',
                        border: '1px solid var(--line)',
                        background: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {bannerImg ? (
                        isVideo(bannerImg) ? (
                          <video
                            src={bannerImg}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            autoPlay
                            muted
                            loop
                            playsInline
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={bannerImg}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )
                      ) : (
                        <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                          МЕСТО ПОД БАННЕР
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 6,
                        fontSize: 11.5,
                        color: 'var(--muted)',
                      }}
                    >
                      Так это выглядит на сайте
                    </span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 220,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm"
                      style={{ fontSize: 13 }}
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        const up = await upload(f)
                        if (up) setBannerImg(up.src)
                      }}
                    />
                    {bannerImg ? (
                      <button
                        type="button"
                        onClick={() => setBannerImg('')}
                        style={{
                          border: '1px solid var(--line)',
                          background: 'transparent',
                          borderRadius: 'var(--r-pill)',
                          padding: '8px 16px',
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        Убрать
                      </button>
                    ) : null}
                    <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                      Пропорция примерно 3,5 к 1, лучше всего файл 1200×340.
                      Видео проигрывается само, по кругу и без звука.
                    </span>

                    <label style={{ ...label, marginTop: 4 }} htmlFor="bannerLink">
                      Ссылка по клику
                    </label>
                    <input
                      id="bannerLink"
                      name="bannerLink"
                      defaultValue={draft.bannerLink}
                      placeholder="https://..."
                      style={field}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <label style={label} htmlFor="bannerHtml">
                  HTML-код
                </label>
                <textarea
                  id="bannerHtml"
                  name="bannerHtml"
                  defaultValue={draft.bannerHtml}
                  rows={6}
                  placeholder="<div>...</div>"
                  style={{
                    ...field,
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: 13,
                    resize: 'vertical',
                  }}
                />
                <input type="hidden" name="bannerLink" value={draft.bannerLink} />
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  Код вставляется на страницу как есть — сюда идёт готовый блок
                  от рекламной сети. Высота области 110 пикселей.
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <input type="hidden" name="bannerHtml" value={draft.bannerHtml} />
            <input type="hidden" name="bannerLink" value={draft.bannerLink} />
          </>
        )}
      </section>

      {/* ─── Закреп в «Обучении» ─── */}
      <section style={card}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={learnOn}
            onChange={(e) => setLearnOn(e.target.checked)}
            style={{ width: 17, height: 17, accentColor: '#15160F' }}
          />
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            Закреп в разделе «Обучение»
          </span>
        </label>

        {learnOn ? (
          <>
            {/* Белая часть блока — под логотип партнёра. */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flexShrink: 0 }}>
                <div
                  style={{
                    width: 200,
                    height: 120,
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid var(--line)',
                    background: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    padding: 16,
                  }}
                >
                  {learnImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={learnImg}
                      alt=""
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span
                      style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}
                    >
                      Логотип по умолчанию
                    </span>
                  )}
                </div>
                <span
                  style={{
                    display: 'block',
                    marginTop: 6,
                    fontSize: 11.5,
                    color: 'var(--muted)',
                  }}
                >
                  Так это выглядит на сайте
                </span>
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  style={{ fontSize: 13 }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    const up = await upload(f)
                    if (up) setLearnImg(up.src)
                  }}
                />
                {learnImg ? (
                  <button
                    type="button"
                    onClick={() => setLearnImg('')}
                    style={{
                      border: '1px solid var(--line)',
                      background: 'transparent',
                      borderRadius: 'var(--r-pill)',
                      padding: '8px 16px',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Убрать
                  </button>
                ) : null}
                <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  Логотип на белом фоне, PNG с прозрачностью. Вписывается целиком,
                  не обрезается.
                </span>
              </div>
            </div>

            <input
              name="learnPinTitle"
              defaultValue={draft.learnPinTitle}
              placeholder="Заголовок"
              style={field}
            />
            <textarea
              name="learnPinDesc"
              defaultValue={draft.learnPinDesc}
              rows={3}
              placeholder="Короткое описание"
              style={{ ...field, resize: 'vertical' }}
            />
            <input
              name="learnPinLink"
              defaultValue={draft.learnPinLink}
              placeholder="https://..."
              style={field}
            />
          </>
        ) : (
          <>
            <input type="hidden" name="learnPinTitle" value={draft.learnPinTitle} />
            <input type="hidden" name="learnPinDesc" value={draft.learnPinDesc} />
            <input type="hidden" name="learnPinLink" value={draft.learnPinLink} />
          </>
        )}
      </section>

      {error ? (
        <span style={{ color: '#C93A2B', fontSize: 13, fontWeight: 600 }}>{error}</span>
      ) : null}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="submit"
          disabled={busy}
          style={{
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--dark)',
            borderRadius: 'var(--r-pill)',
            padding: '14px 30px',
            fontWeight: 800,
            fontSize: 14.5,
            cursor: 'pointer',
          }}
        >
          Сохранить
        </button>
        {busy ? <span style={{ color: 'var(--muted)' }}>Загрузка файла…</span> : null}
      </div>
    </form>
  )
}
