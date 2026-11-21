/**
 * Pomogoal Worker'ı. Statik dosyaları Cloudflare kendisi sunar; buraya yalnızca
 * /api/ istekleri gelir. YouTube Data API anahtarı tarayıcıya hiç gönderilmez:
 * sitenin kodunda dursaydı herkes kopyalayıp günlük kotayı bitirebilirdi.
 */

interface Env {
  ASSETS: Fetcher
  YOUTUBE_API_KEY?: string
}

const API = 'https://www.googleapis.com/youtube/v3'
/** Aynı arama bu süre boyunca kotadan yemeden önbellekten döner */
const SEARCH_TTL = 6 * 60 * 60
const POPULAR_TTL = 60 * 60
const MAX_QUERY = 100
const PAGE_RE = /^[\w-]{1,64}$/
const REGION_RE = /^[A-Z]{2}$/
const LANG_RE = /^[a-z]{2}$/

export interface ApiItem {
  kind: 'video' | 'playlist'
  id: string
  title: string
  channel: string
  thumb: string
  /** ISO 8601 süre, yalnızca popüler listesinde gelir */
  duration?: string
}

export interface ApiResult {
  items: ApiItem[]
  next: string | null
}

function json(data: unknown, status = 200, maxAge = 0): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': maxAge ? `public, max-age=${Math.min(maxAge, 600)}` : 'no-store'
    }
  })
}

/** API başlıkları HTML kaçışlı gelir (&#39; gibi); düz metne çevrilir. */
function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

interface Thumbs {
  medium?: { url: string }
  default?: { url: string }
}
interface Snippet {
  title: string
  channelTitle: string
  thumbnails: Thumbs
}

function thumbOf(t: Thumbs): string {
  return t.medium?.url ?? t.default?.url ?? ''
}

async function youtube(path: string, params: Record<string, string>, key: string): Promise<unknown> {
  const url = new URL(`${API}/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('key', key)
  const res = await fetch(url.toString(), { headers: { accept: 'application/json' } })
  if (!res.ok) {
    // Ayrıntı yalnızca Worker günlüğüne yazılır; kullanıcıya genel bir kod döner
    console.warn('YouTube API hatası', res.status, (await res.text()).slice(0, 300))
    throw new Error(res.status === 403 ? 'quota' : 'upstream')
  }
  return res.json()
}

async function search(q: string, type: 'video' | 'playlist', page: string, lang: string, key: string): Promise<ApiResult> {
  const params: Record<string, string> = {
    part: 'snippet',
    q,
    type,
    maxResults: '20',
    safeSearch: 'moderate',
    relevanceLanguage: lang
  }
  // Yalnızca başka sitelerde oynatılmasına izin verilen videolar: gömülü
  // oynatıcıda "Video kullanılamıyor" görülmesin
  if (type === 'video') {
    params.videoEmbeddable = 'true'
    params.videoSyndicated = 'true'
  }
  if (page) params.pageToken = page
  const data = (await youtube('search', params, key)) as {
    nextPageToken?: string
    items: { id: { videoId?: string; playlistId?: string }; snippet: Snippet }[]
  }
  const items: ApiItem[] = []
  for (const it of data.items ?? []) {
    const id = it.id.videoId ?? it.id.playlistId
    if (!id) continue
    items.push({
      kind: it.id.videoId ? 'video' : 'playlist',
      id,
      title: decode(it.snippet.title),
      channel: decode(it.snippet.channelTitle),
      thumb: thumbOf(it.snippet.thumbnails)
    })
  }
  return { items, next: data.nextPageToken ?? null }
}

/** Arama yazılmadan önce gösterilen liste: bölgedeki popüler müzik videoları. */
async function popular(region: string, page: string, key: string): Promise<ApiResult> {
  const params: Record<string, string> = {
    part: 'snippet,contentDetails',
    chart: 'mostPopular',
    videoCategoryId: '10',
    regionCode: region,
    maxResults: '20'
  }
  if (page) params.pageToken = page
  const data = (await youtube('videos', params, key)) as {
    nextPageToken?: string
    items: { id: string; snippet: Snippet; contentDetails?: { duration?: string } }[]
  }
  return {
    items: (data.items ?? []).map((it) => ({
      kind: 'video' as const,
      id: it.id,
      title: decode(it.snippet.title),
      channel: decode(it.snippet.channelTitle),
      thumb: thumbOf(it.snippet.thumbnails),
      duration: it.contentDetails?.duration
    })),
    next: data.nextPageToken ?? null
  }
}

async function handleYouTube(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (req.method !== 'GET') return json({ error: 'method' }, 405)
  // Başka sitelerin bu uç noktayı kendi kotamızla kullanmasını zorlaştırır.
  // Tarayıcı dışı istemcileri durdurmaz; asıl koruma önbellek ve sınırlardır.
  const site = req.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin' && site !== 'none') return json({ error: 'forbidden' }, 403)
  if (!env.YOUTUBE_API_KEY) return json({ error: 'not_configured' }, 503)

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY)
  const type = url.searchParams.get('type') === 'playlist' ? 'playlist' : 'video'
  const page = url.searchParams.get('page') ?? ''
  const region = (url.searchParams.get('region') ?? 'TR').toUpperCase()
  const lang = (url.searchParams.get('lang') ?? 'tr').toLowerCase()
  if (page && !PAGE_RE.test(page)) return json({ error: 'bad_request' }, 400)
  if (!REGION_RE.test(region) || !LANG_RE.test(lang)) return json({ error: 'bad_request' }, 400)

  // Önbellek anahtarı yalnızca anlamlı parametrelerden kurulur; büyük/küçük harf
  // farkı aynı aramayı iki kez kotadan düşürmesin
  const cacheUrl = new URL('https://cache.pomogoal.internal/yt')
  cacheUrl.searchParams.set('q', q.toLowerCase())
  cacheUrl.searchParams.set('type', type)
  cacheUrl.searchParams.set('page', page)
  cacheUrl.searchParams.set(q ? 'lang' : 'region', q ? lang : region)
  const cacheKey = new Request(cacheUrl.toString())
  const cache = caches.default
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  try {
    const result = q
      ? await search(q, type, page, lang, env.YOUTUBE_API_KEY)
      : await popular(region, page, env.YOUTUBE_API_KEY)
    const ttl = q ? SEARCH_TTL : POPULAR_TTL
    const res = json(result, 200, ttl)
    const stored = new Response(res.clone().body, res)
    stored.headers.set('cache-control', `public, max-age=${ttl}`)
    ctx.waitUntil(cache.put(cacheKey, stored))
    return res
  } catch (err) {
    const code = err instanceof Error && err.message === 'quota' ? 'quota' : 'upstream'
    return json({ error: code }, 502)
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(req.url)
    if (pathname === '/api/youtube') return handleYouTube(req, env, ctx)
    if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404)
    return env.ASSETS.fetch(req)
  }
} satisfies ExportedHandler<Env>
