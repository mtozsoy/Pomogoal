import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { t } from '../lib/i18n'
import { EMBED_ORIGIN, embedUrl, parseYouTube } from '../lib/youtube'
import { Switch } from './controls'
import { CloseIcon } from './icons'

export interface PlayerState {
  url: string
  open: boolean
  /** Odak başlayınca oynat, durunca veya molada duraklat */
  syncTimer: boolean
}

export const DEFAULT_PLAYER: PlayerState = { url: '', open: false, syncTimer: false }

interface Props {
  state: PlayerState
  setState: Dispatch<SetStateAction<PlayerState>>
  /** Sayaç şu an odak süresi sayıyor mu */
  focusing: boolean
}

/**
 * Köşede duran YouTube oynatıcısı. Panel kapatılınca bileşen kaldırılmaz,
 * yalnızca gizlenir: iframe DOM'dan çıkarsa müzik kesilirdi.
 */
export function MusicPlayer({ state, setState, focusing }: Props) {
  const [draft, setDraft] = useState(state.url)
  const [error, setError] = useState(false)
  // Yalnızca kullanıcı az önce bağlantı açtıysa kendiliğinden başlar; sayfa
  // yenilenince video hazır bekler ama izinsiz çalmaz
  const [autoplay, setAutoplay] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)

  const ref = useMemo(() => parseYouTube(state.url), [state.url])
  const src = useMemo(() => (ref ? embedUrl(ref, autoplay) : null), [ref, autoplay])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!parseYouTube(draft)) return setError(true)
    setError(false)
    setAutoplay(true)
    setState((s) => ({ ...s, url: draft.trim() }))
  }

  function clear() {
    setDraft('')
    setError(false)
    setState((s) => ({ ...s, url: '' }))
  }

  // Sayaçla eşleme: yalnızca odak durumu değiştiğinde komut gönderilir, böylece
  // kullanıcının oynatıcıda elle yaptığı oynat/duraklat ezilmez
  const wasFocusing = useRef(focusing)
  useEffect(() => {
    if (wasFocusing.current === focusing) return
    wasFocusing.current = focusing
    if (!state.syncTimer) return
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: focusing ? 'playVideo' : 'pauseVideo', args: [] }),
      EMBED_ORIGIN
    )
  }, [focusing, state.syncTimer])

  return (
    <section className={state.open ? 'player open' : 'player'} aria-label={t('tabPlayer')} aria-hidden={!state.open} inert={!state.open}>
      <div className="player-head">
        <h2>{t('tabPlayer')}</h2>
        <button className="link" onClick={() => setState((s) => ({ ...s, open: false }))} title={t('close')} aria-label={t('close')}>
          <CloseIcon size={18} />
        </button>
      </div>

      {src && (
        <div className="player-frame">
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

      <form className="player-form" onSubmit={submit}>
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('playerPlaceholder')}
          aria-label={t('playerPlaceholder')}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(false)
          }}
        />
        <button className="btn primary" type="submit" disabled={!draft.trim()}>
          {t('playerLoad')}
        </button>
      </form>
      {error ? (
        <p className="error" role="alert">
          {t('playerInvalid')}
        </p>
      ) : (
        <p className="hint">{t('playerHint')}</p>
      )}

      <Switch label={t('playerSync')} checked={state.syncTimer} onChange={(v) => setState((s) => ({ ...s, syncTimer: v }))} />
      {ref && (
        <button className="link" onClick={clear}>
          {t('playerClear')}
        </button>
      )}
    </section>
  )
}
