export interface YouTubeRef {
  videoId?: string
  listId?: string
}

const VIDEO_RE = /^[\w-]{11}$/
const LIST_RE = /^[\w-]{10,64}$/
const HOSTS = new Set(['youtube.com', 'youtube-nocookie.com', 'youtu.be'])
/** Kimliği yolun ilk parçasından sonra gelen adres biçimleri */
const PATH_KINDS = new Set(['embed', 'shorts', 'live', 'v'])

/** Çerezsiz alan adı: video oynatılana kadar YouTube izleme çerezi bırakmaz. */
export const EMBED_ORIGIN = 'https://www.youtube-nocookie.com'

/**
 * Kullanıcının yapıştırdığı metinden video ve/veya oynatma listesi kimliğini
 * çıkarır. Adres doğrudan iframe'e verilmez: yalnızca doğrulanmış kimlikler
 * kullanılır ki oynatıcıya YouTube dışı bir sayfa yüklenemesin.
 */
export function parseYouTube(input: string): YouTubeRef | null {
  const text = input.trim()
  if (!text) return null
  if (VIDEO_RE.test(text)) return { videoId: text }

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '')
  if (!HOSTS.has(host)) return null

  const parts = url.pathname.split('/').filter(Boolean)
  let videoId: string | undefined
  if (host === 'youtu.be') videoId = parts[0]
  else if (parts[0] === 'watch') videoId = url.searchParams.get('v') ?? undefined
  else if (PATH_KINDS.has(parts[0])) videoId = parts[1]
  // "embed/videoseries" bir video değil, liste oynatıcısının sabit adıdır
  if (videoId && !VIDEO_RE.test(videoId)) videoId = undefined

  const list = url.searchParams.get('list') ?? undefined
  const listId = list && LIST_RE.test(list) ? list : undefined

  if (!videoId && !listId) return null
  return { videoId, listId }
}

export function embedUrl(ref: YouTubeRef, autoplay: boolean): string {
  const params = new URLSearchParams({
    // Oynat/duraklat komutlarını postMessage ile gönderebilmek için gerekli
    enablejsapi: '1',
    origin: window.location.origin,
    playsinline: '1',
    rel: '0'
  })
  if (ref.listId) params.set('list', ref.listId)
  if (autoplay) params.set('autoplay', '1')
  return `${EMBED_ORIGIN}/embed/${ref.videoId ?? 'videoseries'}?${params}`
}
