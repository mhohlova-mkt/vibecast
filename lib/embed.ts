/**
 * Приведение ссылки к адресу плеера.
 *
 * Из админки вставляют что угодно: адрес страницы, код для вставки, иногда
 * готовый адрес плеера. Если вставить страницу как есть, в окно попадает
 * весь интерфейс площадки — меню, поиск, боковая панель. Поэтому здесь
 * из любой формы вытаскиваем именно плеер.
 */

/** Ссылка на конкретное видео VK: video-12345_67890 или video12345_67890. */
const VK_VIDEO = /(?:vk\.com|vkvideo\.ru)\/(?:.*[?&]z=)?video(-?\d+)_(\d+)/i
/** Уже готовый плеер VK. */
const VK_PLAYER = /^https:\/\/(?:vk\.com|vkvideo\.ru)\/video_ext\.php\?/i

const RUTUBE_VIDEO = /rutube\.ru\/(?:video|shorts)\/([0-9a-f]{32})/i
const RUTUBE_PLAYER = /^https:\/\/rutube\.ru\/play\/embed\//i

/** Из «кода для вставки» берём адрес из src. */
function fromIframe(raw: string): string {
  const m = /<iframe[^>]+src=["']([^"']+)["']/i.exec(raw)
  return (m?.[1] ?? raw).trim()
}

export type EmbedResult =
  | { url: string; error?: undefined }
  | { url?: undefined; error: string }

export function normalizeEmbedUrl(raw: string): EmbedResult {
  const input = fromIframe((raw ?? '').trim())
  if (!input) return { url: '' }

  // Протокол мог не приехать — без него URL не разобрать.
  const value = /^https?:\/\//i.test(input) ? input : `https://${input}`

  if (VK_PLAYER.test(value) || RUTUBE_PLAYER.test(value)) return { url: value }

  const vk = VK_VIDEO.exec(value)
  if (vk) {
    // hd=2 — просим качество повыше, если оно есть у источника.
    return { url: `https://vkvideo.ru/video_ext.php?oid=${vk[1]}&id=${vk[2]}&hd=2` }
  }

  const rutube = RUTUBE_VIDEO.exec(value)
  if (rutube) return { url: `https://rutube.ru/play/embed/${rutube[1]}` }

  if (/telemost\.yandex\.ru/i.test(value))
    return {
      error:
        'Телемост встраивать нельзя — он это запрещает. Его ссылка идёт в поле выше.',
    }

  return {
    error:
      'Не разобрал ссылку. Нужен адрес видео или трансляции с VK Видео либо Rutube — можно вставить «код для вставки» целиком.',
  }
}
