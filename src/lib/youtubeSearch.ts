// Worker'daki /api/youtube ucunun istemci tarafı. Tipler Worker koduyla aynı
// biçimdedir; ayrı tutulur çünkü Worker tipleri tarayıcı derlemesine girmez.
export interface YtItem {
  kind: 'video' | 'playlist'
  id: string
  title: string
  channel: string
  thumb: string
  duration?: string
}

export interface YtPage {
  items: YtItem[]
  next: string | null
}

/** Worker'ın döndürdüğü hata kodları; arayüzde ayrı mesajlara karşılık gelir */
export type YtError = 'not_configured' | 'quota' | 'network' | 'other'

export class YtSearchError extends Error {
  constructor(public code: YtError) {
    super(code)
  }
}

export async function ytSearch(opts: {
  q: string
  type: 'video' | 'playlist'
  page?: string
  lang: string
  signal?: AbortSignal
}): Promise<YtPage> {
  const params = new URLSearchParams({ type: opts.type, lang: opts.lang })
  if (opts.q) params.set('q', opts.q)
  if (opts.page) params.set('page', opts.page)
  // Bölge tarayıcı dilinden alınır: popüler listesi kullanıcının ülkesine uysun
  const region = (navigator.language.split('-')[1] ?? (opts.lang === 'tr' ? 'TR' : 'US')).toUpperCase()
  if (/^[A-Z]{2}$/.test(region)) params.set('region', region)

  let res: Response
  try {
    res = await fetch(`/api/youtube?${params}`, { signal: opts.signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new YtSearchError('network')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    if (body.error === 'not_configured' || body.error === 'quota') throw new YtSearchError(body.error)
    // Yerel geliştirmede Worker çalışmıyorsa Vite 404/500 döner
    throw new YtSearchError(res.status >= 500 && !body.error ? 'not_configured' : 'other')
  }
  return (await res.json()) as YtPage
}

/** "PT1H2M3S" → "1:02:03" */
export function formatDuration(iso?: string): string {
  const m = iso ? /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso) : null
  if (!m) return ''
  const [h, min, s] = [Number(m[1] ?? 0), Number(m[2] ?? 0), Number(m[3] ?? 0)]
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${String(min).padStart(2, '0')}:${ss}` : `${min}:${ss}`
}
