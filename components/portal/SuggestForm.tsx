'use client'

import { useActionState, useRef, useState } from 'react'
import { submitNews, type SubmitState } from '@/lib/actions/submissions'
import styles from './SuggestForm.module.css'

/** Форма «предложить новость». Доступна тем, кто оставил почту. */

export default function SuggestForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(
    submitNews,
    undefined,
  )
  const startedAt = useRef(Date.now())
  const [photo, setPhoto] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function upload(file: File) {
    setBusy(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await fetch('/api/upload/public', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Не удалось загрузить файл')
      return data as { src: string }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Ошибка загрузки')
      return null
    } finally {
      setBusy(false)
    }
  }

  if (state?.ok) {
    return (
      <div className={styles.done}>
        <span className={styles.doneMark}>✓</span>
        <h2 className={styles.doneTitle}>Спасибо, получили</h2>
        <p className={styles.doneText}>
          Редакция прочитает новость и решит, публиковать ли её. Если возьмём —
          она появится в ленте под вашим именем.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="startedAt" value={startedAt.current} />
      <input type="hidden" name="authorPhoto" value={photo} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {/* Ловушка для ботов:人 её не видит, автозаполнение не трогает. */}
      <div className={styles.trap} aria-hidden="true">
        <label htmlFor="website">Не заполняйте это поле</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.row}>
        <div className={styles.photoBox}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className={styles.photo} />
          ) : (
            <span className={styles.photoEmpty}>фото</span>
          )}
        </div>
        <div className={styles.photoSide}>
          <label className={styles.label} htmlFor="authorName">
            Как вас подписать
          </label>
          <input
            id="authorName"
            name="authorName"
            required
            minLength={2}
            placeholder="Имя и фамилия"
            className={styles.input}
          />
          <input
            type="file"
            accept="image/*"
            className={styles.file}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const up = await upload(f)
              if (up) setPhoto(up.src)
            }}
          />
          <span className={styles.hint}>Ваше фото — необязательно</span>
        </div>
      </div>

      <label className={styles.label} htmlFor="title">
        Заголовок
      </label>
      <input
        id="title"
        name="title"
        required
        minLength={8}
        placeholder="О чём новость"
        className={styles.input}
      />

      <label className={styles.label} htmlFor="text">
        Текст
      </label>
      <textarea
        id="text"
        name="text"
        required
        minLength={200}
        rows={12}
        placeholder="Расскажите, что произошло. Чем конкретнее и полезнее — тем выше шанс, что опубликуем."
        className={styles.textarea}
      />

      <label className={styles.label}>Картинки к новости</label>
      {images.length ? (
        <div className={styles.gallery}>
          {images.map((src) => (
            <span key={src} className={styles.thumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
              <button
                type="button"
                aria-label="Убрать картинку"
                onClick={() => setImages((x) => x.filter((s) => s !== src))}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        type="file"
        accept="image/*"
        multiple
        className={styles.file}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []).slice(0, 8 - images.length)
          for (const f of files) {
            const up = await upload(f)
            if (up) setImages((x) => [...x, up.src])
          }
        }}
      />
      <span className={styles.hint}>До восьми картинок, каждая до 8 МБ.</span>

      {uploadError ? <span className={styles.error}>{uploadError}</span> : null}
      {state?.error ? <span className={styles.error}>{state.error}</span> : null}

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={pending || busy}>
          {pending ? 'Отправляем…' : 'Отправить в редакцию'}
        </button>
        <span className={styles.hint}>
          Отправляем от {email}. Публикуем только после проверки редакцией.
        </span>
      </div>
    </form>
  )
}
