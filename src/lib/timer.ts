import { useCallback, useEffect, useRef, useState } from 'react'
import { startTicker } from './ticker'
import type { Mode, Phase, Settings } from './types'
import { t } from './i18n'

interface TimerState {
  mode: Mode
  phase: Phase
  running: boolean
  baseMs: number // duraklatmalardan önce biriken süre
  startedAt: number | null
  focusDone: number // bu döngüde biten odak sayısı
  saved: Record<string, number> // başka sekmeye geçilirken saklanan ilerlemeler
  credited: number // kronometrede odak olarak kaydedilmiş tam dakika
}

const INITIAL: TimerState = {
  mode: 'pomodoro',
  phase: 'focus',
  running: false,
  baseMs: 0,
  startedAt: null,
  focusDone: 0,
  saved: {},
  credited: 0
}

const STORE_KEY = 'timerState'
/** Çalışırken bu sıklıkla "hâlâ açığız" damgası yazılır */
const BEAT_MS = 10_000
/** Damga bu süreden eskiyse sekme kapanmış sayılır ve sayaç o ana donar */
const STALE_MS = 90_000
/** Tek seferde kaydedilebilecek en uzun seans (veritabanı sınırı) */
const MAX_SESSION_MIN = 240

const slotOf = (mode: Mode, phase: Phase) => (mode === 'pomodoro' ? `pomodoro:${phase}` : mode)

const elapsedOf = (s: TimerState, t: number) => s.baseMs + (s.running && s.startedAt ? t - s.startedAt : 0)

/** Kronometrede henüz odak olarak kaydedilmemiş tam dakika. */
function unclaimedMinutes(s: TimerState, t: number): number {
  if (s.mode !== 'stopwatch') return 0
  return Math.max(0, Math.floor(elapsedOf(s, t) / 60_000) - s.credited)
}

function isState(v: unknown): v is TimerState {
  const s = v as TimerState
  return (
    typeof s === 'object' &&
    s !== null &&
    typeof s.baseMs === 'number' &&
    typeof s.running === 'boolean' &&
    typeof s.credited === 'number' &&
    typeof s.saved === 'object' &&
    s.saved !== null
  )
}

/**
 * Sayfa yenilenince sayaç kaldığı yerden devam etsin diye durumu geri yükler.
 * Sekme kapalıyken geçen süre sayılmaz: son damgadan sonrası atılır ve sayaç
 * o ana donmuş olarak gelir.
 */
function restore(): TimerState {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return INITIAL
    const { state, lastSeen } = JSON.parse(raw) as { state: unknown; lastSeen: number }
    if (!isState(state)) return INITIAL
    const s: TimerState = { ...INITIAL, ...state }
    if (!s.running || !s.startedAt) return { ...s, running: false, startedAt: null }
    const gap = Date.now() - lastSeen
    if (gap <= STALE_MS) return s
    return { ...s, running: false, baseMs: Math.max(0, elapsedOf(s, lastSeen)), startedAt: null }
  } catch {
    return INITIAL
  }
}

function persist(state: TimerState): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ state, lastSeen: Date.now() }))
  } catch {
    /* depolama dolu olabilir; sayaç yine de çalışır */
  }
}

/**
 * Başka bir mod veya aşamaya geçer. Mevcut ilerleme silinmez, saklanır ve
 * geri dönünce kaldığı yerden devam eder. Çalışan sayaç duraklatılır.
 */
function switchTo(s: TimerState, mode: Mode, phase: Phase, t: number): TimerState {
  const from = slotOf(s.mode, s.phase)
  const to = slotOf(mode, phase)
  if (from === to) return s
  const saved = { ...s.saved }
  const elapsed = elapsedOf(s, t)
  if (elapsed > 0) saved[from] = elapsed
  else delete saved[from]
  const baseMs = saved[to] ?? 0
  delete saved[to]
  return { ...s, mode, phase, running: false, baseMs, startedAt: null, saved }
}

function durationFor(s: TimerState, settings: Settings): number | null {
  if (s.mode === 'stopwatch') return null
  if (s.mode === 'countdown') return settings.countdownMin * 60_000
  const min =
    s.phase === 'focus' ? settings.focusMin : s.phase === 'short' ? settings.shortMin : settings.longMin
  return min * 60_000
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** 'pomodoro': tam bir odak aşaması. 'free': kronometre/geri sayım süresi. */
export type FocusKind = 'pomodoro' | 'free'

interface Callbacks {
  onFocusComplete: (minutes: number, kind: FocusKind) => void
  onAlarm: (done: { mode: Mode; phase: Phase }) => void
}

/** Zamanı sayaç artırarak değil, gerçek saatten hesaplar; arka planda kayma olmaz. */
export function useTimer(settings: Settings, { onFocusComplete, onAlarm }: Callbacks) {
  const [state, setState] = useState<TimerState>(restore)
  const [now, setNow] = useState(() => Date.now())
  const stateRef = useRef(state)
  stateRef.current = state

  // Durumu sakla; çalışırken düzenli olarak damga at ki yenilemede süre kaybolmasın
  useEffect(() => {
    persist(state)
    if (!state.running) return
    const beat = () => persist(stateRef.current)
    const id = window.setInterval(beat, BEAT_MS)
    window.addEventListener('pagehide', beat)
    document.addEventListener('visibilitychange', beat)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('pagehide', beat)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [state])

  /** Serbest süreyi kaydeder. Tek kayıt sınırını aşan süre parçalara bölünür. */
  const recordFree = useCallback(
    (minutes: number) => {
      for (let left = minutes; left > 0; left -= MAX_SESSION_MIN) {
        onFocusComplete(Math.min(left, MAX_SESSION_MIN), 'free')
      }
    },
    [onFocusComplete]
  )

  /** Kronometrede biriken tam dakikaları odak olarak kaydeder. */
  const creditStopwatch = useCallback(() => {
    const delta = unclaimedMinutes(stateRef.current, Date.now())
    recordFree(delta)
    return delta
  }, [recordFree])

  useEffect(() => {
    if (!state.running) return
    const sync = () => setNow(Date.now())
    const stop = startTicker(sync, 200)
    document.addEventListener('visibilitychange', sync)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [state.running])

  const durationMs = durationFor(state, settings)
  const elapsed = state.baseMs + (state.running && state.startedAt ? Math.max(0, now - state.startedAt) : 0)
  const remaining = durationMs === null ? null : Math.max(0, durationMs - elapsed)

  // Süre dolunca: alarm çal, pomodoro ise bir sonraki aşamaya geç
  useEffect(() => {
    if (!state.running || durationMs === null || elapsed < durationMs) return
    onAlarm({ mode: state.mode, phase: state.phase })
    if (state.mode === 'pomodoro') {
      let focusDone = state.focusDone
      let next: Phase
      if (state.phase === 'focus') {
        onFocusComplete(Math.min(settings.focusMin, MAX_SESSION_MIN), 'pomodoro')
        focusDone += 1
        next = focusDone % settings.longEvery === 0 ? 'long' : 'short'
      } else {
        next = 'focus'
      }
      const saved = { ...state.saved }
      delete saved[slotOf('pomodoro', next)]
      setState({
        ...state,
        phase: next,
        focusDone,
        saved,
        baseMs: 0,
        running: settings.autoStart,
        startedAt: settings.autoStart ? Date.now() : null
      })
    } else {
      recordFree(settings.countdownMin)
      setState({ ...state, running: false, baseMs: 0, startedAt: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, state.running])

  useEffect(() => {
    const live = state.running || elapsed > 0
    document.title = live ? `${formatTime(remaining ?? elapsed)} · ${t('appName')}` : t('appName')
    return () => {
      document.title = t('appName')
    }
  }, [remaining, elapsed, state.running])

  const start = useCallback(() => {
    const t = Date.now()
    setNow(t)
    setState((s) => {
      if (s.running) return s
      // Süresi dolmuş (ör. ayarlardan kısaltılmış) bir sayaç baştan başlar,
      // yoksa başlar başlamaz "bitti" sayılıp süre kaydedilirdi
      const dur = durationFor(s, settings)
      const baseMs = dur !== null && s.baseMs >= dur ? 0 : s.baseMs
      return { ...s, running: true, baseMs, startedAt: t }
    })
  }, [settings])

  const pause = useCallback(() => {
    const t = Date.now()
    const delta = creditStopwatch()
    setState((s) => ({
      ...s,
      running: false,
      baseMs: elapsedOf(s, t),
      startedAt: null,
      credited: s.credited + delta
    }))
  }, [creditStopwatch])

  const reset = useCallback(() => {
    creditStopwatch()
    setState((s) => ({
      ...s,
      running: false,
      baseMs: 0,
      startedAt: null,
      // Kronometre sıfırlanınca sayım da sıfırlanır; başka moddayken park etmiş
      // kronometre ilerlemesinin sayımı bozulmasın diye korunur
      credited: s.mode === 'stopwatch' ? 0 : s.credited
    }))
  }, [creditStopwatch])

  const setMode = useCallback(
    (mode: Mode) => {
      const delta = creditStopwatch()
      setState((s) => switchTo({ ...s, credited: s.credited + delta }, mode, s.phase, Date.now()))
    },
    [creditStopwatch]
  )

  const setPhase = useCallback((phase: Phase) => {
    setState((s) => (s.mode === 'pomodoro' ? switchTo(s, s.mode, phase, Date.now()) : s))
  }, [])

  /** Pomodoroda mevcut aşamayı sayılmadan geçer. */
  const skip = useCallback(() => {
    creditStopwatch()
    setState((s) => {
      if (s.mode !== 'pomodoro') {
        return { ...s, running: false, baseMs: 0, startedAt: null, credited: s.mode === 'stopwatch' ? 0 : s.credited }
      }
      const next: Phase =
        s.phase === 'focus' ? ((s.focusDone + 1) % settings.longEvery === 0 ? 'long' : 'short') : 'focus'
      const saved = { ...s.saved }
      delete saved[slotOf('pomodoro', next)]
      return {
        ...s,
        phase: next,
        saved,
        focusDone: s.phase === 'focus' ? s.focusDone + 1 : s.focusDone,
        running: false,
        baseMs: 0,
        startedAt: null
      }
    })
  }, [settings.longEvery, creditStopwatch])

  return {
    mode: state.mode,
    phase: state.phase,
    running: state.running,
    started: elapsed > 0,
    elapsed,
    remaining,
    durationMs,
    focusDone: state.focusDone,
    parked: Object.keys(state.saved),
    start,
    pause,
    reset,
    skip,
    setMode,
    setPhase
  }
}
