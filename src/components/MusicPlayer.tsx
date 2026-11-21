import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { getLocale, t } from '../lib/i18n'
import { EMBED_ORIGIN, embedUrl, parseYouTube } from '../lib/youtube'
import { FOCUS_SOUNDS, FocusSoundPlayer, type FocusSoundId } from '../lib/focusSounds'
import { YtSearchError, formatDuration, ytSearch, type YtError, type YtItem } from '../lib/youtubeSearch'
import { Range, Switch } from './controls'
import { Segmented } from './Segmented'
import { CloseIcon, PauseIcon, PlayIcon } from './icons'

type PlayerTab = 'sounds' | 'youtube'

export interface PlayerState {
  url: string
  open: boolean
  /** Odak başlayınca oynat, durunca veya molada duraklat */
  syncTimer: boolean
  tab: PlayerTab
  /** Odak sesi düzeyi (0-1); YouTube'un kendi ses ayarından bağımsızdır */
  soundVolume: number
}

export const DEFAULT_PLAYER: PlayerState = { url: '', open: false, syncTimer: false, tab: 'sounds', soundVolume: 0.5 }

interface Props {
  state: PlayerState
  setState: Dispatch<SetStateAction<PlayerState>>
  /** Sayaç şu an odak süresi sayıyor mu */
  focusing: boolean
}

const ERROR_TEXT: Record<YtError, 'playerErrNotConfigured' | 'playerErrQuota' | 'playerErrNetwork' | 'playerErrOther'> = {
  not_configured: 'playerErrNotConfigured',
  quota: 'playerErrQuota',
  network: 'playerErrNetwork',
  other: 'playerErrOther'
}

/**
 * Köşede duran müzik paneli: cihazda üretilen odak sesleri ve YouTube.
 * Panel kapatılınca bileşen kaldırılmaz, yalnızca gizlenir: iframe DOM'dan
 * çıkarsa müzik kesilirdi.
 */
export function MusicPlayer({ state, setState, focusing }: Props) {
  // Yalnızca kullanıcı az önce bir içerik açtıysa kendiliğinden başlar; sayfa
  // yenilenince video hazır bekler ama izinsiz çalmaz
  const [autoplay, setAutoplay] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const ref = useMemo(() => parseYouTube(state.url), [state.url])
  const src = useMemo(() => (ref ? embedUrl(ref, autoplay) : null), [ref, autoplay])

  // ---- Odak sesleri ----
  const engine = useRef<FocusSoundPlayer | null>(null)
  const [playing, setPlaying] = useState<FocusSoundId | null>(null)
  // Sayaçla eşlemede molada durdurulan ses, odak dönünce kaldığı yerden başlasın
  const pausedByTimer = useRef<FocusSoundId | null>(null)

  const getEngine = () => (engine.current ??= new FocusSoundPlayer())

  useEffect(() => {
    engine.current?.setVolume(state.soundVolume)
  }, [state.soundVolume])

  useEffect(() => () => engine.current?.stop(), [])

  function toggleSound(id: FocusSoundId) {
    const e = getEngine()
    e.setVolume(state.soundVolume)
    pausedByTimer.current = null
    if (playing === id) {
      e.stop()
      setPlaying(null)
    } else {
      e.play(id)
      setPlaying(id)
    }
  }

  // ---- YouTube ----
  function load(url: string) {
    setAutoplay(true)
    setState((s) => ({ ...s, url }))
  }

  const sendCommand = useCallback((func: 'playVideo' | 'pauseVideo') => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), EMBED_ORIGIN)
  }, [])

  // Sayaçla eşleme yalnızca odak durumu değiştiğinde komut gönderir; böylece
  // kullanıcının elle yaptığı oynat/duraklat ezilmez
  const wasFocusing = useRef(focusing)
  useEffect(() => {
    if (wasFocusing.current === focusing) return
    wasFocusing.current = focusing
    if (!state.syncTimer) return
    sendCommand(focusing ? 'playVideo' : 'pauseVideo')
    const e = engine.current
    if (!e) return
    if (focusing && pausedByTimer.current) {
      e.play(pausedByTimer.current)
      setPlaying(pausedByTimer.current)
      pausedByTimer.current = null
    } else if (!focusing && e.current) {
      pausedByTimer.current = e.current
      e.stop()
      setPlaying(null)
    }
  }, [focusing, state.syncTimer, sendCommand])

  const setTab = (tab: PlayerTab) => setState((s) => ({ ...s, tab }))

  return (
    <section className={state.open ? 'player open' : 'player'} aria-label={t('tabPlayer')} aria-hidden={!state.open} inert={!state.open}>
      <div className="player-head">
        <h2>{t('tabPlayer')}</h2>
        <button className="link" onClick={() => setState((s) => ({ ...s, open: false }))} title={t('close')} aria-label={t('close')}>
          <CloseIcon size={18} />
        </button>
      </div>

      <Segmented
        variant="mode"
        items={[
          { id: 'sounds' as PlayerTab, label: t('playerTabSounds'), badge: playing !== null },
          { id: 'youtube' as PlayerTab, label: t('playerTabYoutube'), badge: !!src && state.tab !== 'youtube' }
        ]}
        value={state.tab}
        onChange={setTab}
      />

      {/* Oynatıcı her iki sekmede de DOM'da kalır ki sekme değişince müzik kesilmesin */}
      {src && (
        <div className={state.tab === 'youtube' ? 'player-frame' : 'player-frame tucked'}>
          <iframe
            ref={frame}
            key={src}
            src={src}
            title={t('playerFrameTitle')}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            // YouTube, kaynağı bildirmeyen gömmeleri reddediyor (hata 153)
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}

      <div className="player-body">
        {state.tab === 'sounds' ? (
          <SoundsTab
            playing={playing}
            onToggle={toggleSound}
            volume={state.soundVolume}
            setVolume={(v) => setState((s) => ({ ...s, soundVolume: v }))}
          />
        ) : (
          <YouTubeTab active={state.open && state.tab === 'youtube'} hasVideo={!!ref} onLoad={load} onClear={() => setState((s) => ({ ...s, url: '' }))} />
        )}
      </div>

      <Switch label={t('playerSync')} checked={state.syncTimer} onChange={(v) => setState((s) => ({ ...s, syncTimer: v }))} />
    </section>
  )
}

function SoundsTab(props: {
  playing: FocusSoundId | null
  onToggle: (id: FocusSoundId) => void
  volume: number
  setVolume: (v: number) => void
}) {
  return (
    <>
      <p className="hint">{t('fsIntro')}</p>
      <ul className="sound-list">
        {FOCUS_SOUNDS.map((s) => {
          const on = props.playing === s.id
          return (
            <li key={s.id}>
              <button className={on ? 'sound-item on' : 'sound-item'} aria-pressed={on} onClick={() => props.onToggle(s.id)}>
                <span className="sound-icon" aria-hidden="true">
                  {on ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                </span>
                <span className="sound-text">
                  <b>
                    {t(s.name)}
                    {s.headphones && <em>{t('fsHeadphones')}</em>}
                  </b>
                  <span>{t(s.desc)}</span>
                  <small>{t(s.evidence)}</small>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <Range
        label={t('volume')}
        value={Math.round(props.volume * 100)}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => props.setVolume(v / 100)}
      />
    </>
  )
}

function YouTubeTab(props: { active: boolean; hasVideo: boolean; onLoad: (url: string) => void; onClear: () => void }) {
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'video' | 'playlist'>('video')
  const [items, setItems] = useState<YtItem[] | null>(null)
  const [next, setNext] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<YtError | null>(null)
  const abort = useRef<AbortController | null>(null)

  const run = useCallback(async (q: string, kind: 'video' | 'playlist', page?: string) => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setLoading(true)
    setError(null)
    try {
      const res = await ytSearch({ q, type: kind, page, lang: getLocale(), signal: ctrl.signal })
      setItems((prev) => (page && prev ? [...prev, ...res.items] : res.items))
      setNext(res.next)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof YtSearchError ? err.code : 'other')
      if (!page) setItems(null)
    } finally {
      if (abort.current === ctrl) setLoading(false)
    }
  }, [])

  // Popüler liste yalnızca sekme ilk kez açıldığında istenir: her sayfa
  // açılışında kotadan yemesin
  const started = useRef(false)
  useEffect(() => {
    if (!props.active || started.current) return
    started.current = true
    void run('', 'video')
  }, [props.active, run])

  useEffect(() => () => abort.current?.abort(), [])

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    // Bağlantı yapıştırıldıysa arama yapmadan doğrudan aç
    if (parseYouTube(text)) {
      props.onLoad(text)
      setDraft('')
      return
    }
    setQuery(text)
    void run(text, type)
  }

  function pickSuggestion(q: string) {
    setDraft(q)
    setQuery(q)
    void run(q, type)
  }

  function changeType(kind: 'video' | 'playlist') {
    setType(kind)
    if (query) void run(query, kind)
  }

  function open(item: YtItem) {
    props.onLoad(
      item.kind === 'video' ? `https://www.youtube.com/watch?v=${item.id}` : `https://www.youtube.com/playlist?list=${item.id}`
    )
  }

  const suggestions = t('ytSuggestions').split('|')

  return (
    <>
      <form className="player-form" onSubmit={submit} role="search">
        <input
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('playerSearchPlaceholder')}
          aria-label={t('playerSearchPlaceholder')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn primary" type="submit" disabled={!draft.trim()}>
          {t('playerSearch')}
        </button>
      </form>

      <div className="chips small">
        <button type="button" className={type === 'video' ? 'chip active' : 'chip'} onClick={() => changeType('video')}>
          {t('playerTypeVideos')}
        </button>
        <button type="button" className={type === 'playlist' ? 'chip active' : 'chip'} onClick={() => changeType('playlist')}>
          {t('playerTypePlaylists')}
        </button>
        {props.hasVideo && (
          <button type="button" className="link push" onClick={props.onClear}>
            {t('playerClear')}
          </button>
        )}
      </div>

      <div>
        <h3 className="player-sub">{t('playerSuggested')}</h3>
        <div className="chips small">
          {suggestions.map((s) => (
            <button key={s} type="button" className={query === s ? 'chip active' : 'chip'} onClick={() => pickSuggestion(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <h3 className="player-sub">{query ? `"${query}"` : t('playerPopular')}</h3>
      {error ? (
        <p className={error === 'not_configured' ? 'hint' : 'error'} role="status">
          {t(ERROR_TEXT[error])}
        </p>
      ) : items && items.length === 0 ? (
        <p className="hint">{t('playerNoResults')}</p>
      ) : (
        <ul className="yt-results" aria-busy={loading}>
          {(items ?? []).map((it) => (
            <li key={`${it.kind}:${it.id}`}>
              <button className="yt-item" onClick={() => open(it)}>
                <span className="yt-thumb">
                  {it.thumb && <img src={it.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />}
                  {it.kind === 'playlist' ? (
                    <em>{t('playerPlaylistBadge')}</em>
                  ) : (
                    it.duration && <em>{formatDuration(it.duration)}</em>
                  )}
                </span>
                <span className="yt-text">
                  <b>{it.title}</b>
                  <span>{it.channel}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && <p className="hint">{t('playerLoading')}</p>}
      {!loading && !error && next && (
        <button className="btn small" onClick={() => void run(query, query ? type : 'video', next)}>
          {t('playerMore')}
        </button>
      )}
      <p className="hint">{t('playerHint')}</p>
    </>
  )
}
