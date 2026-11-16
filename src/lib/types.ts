export type Mode = 'pomodoro' | 'countdown' | 'stopwatch'
export type Phase = 'focus' | 'short' | 'long'
export type DisplayStyle = 'digital' | 'ring' | 'bar' | 'minimal'
export type SoundKind = 'zil' | 'can' | 'bip' | 'yok' | 'custom'

export type BackgroundSetting =
  | { kind: 'gradient'; id: string }
  | { kind: 'color'; value: string }
  | { kind: 'image'; dataUrl: string }

export type MotionMode = 'on' | 'auto' | 'off'

export interface Settings {
  focusMin: number
  shortMin: number
  longMin: number
  longEvery: number
  countdownMin: number
  autoStart: boolean
  display: DisplayStyle
  background: BackgroundSetting
  dim: number // 0-70, arka plan karartma yüzdesi
  accent: string
  barColor: string // boşsa vurgu rengi kullanılır
  showQuotes: boolean
  notify: boolean
  motion: MotionMode
  sound: SoundKind
  volume: number // 0-1
  customSoundUrl: string
}

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  countdownMin: 10,
  autoStart: false,
  display: 'ring',
  background: { kind: 'gradient', id: 'gece' },
  dim: 15,
  accent: '#f4a259',
  barColor: '',
  showQuotes: true,
  notify: true,
  motion: 'on',
  sound: 'zil',
  volume: 0.6,
  customSoundUrl: ''
}

export interface Session {
  ts: number
  minutes: number
  /** Bu kayıttan sayılan pomodoro adedi (yoksa 1). Kronometre ve geri sayımda 20 dk = 1. */
  pomodoros?: number
}

export type GoalMetric = 'todayPomodoros' | 'todayMinutes' | 'totalPomodoros' | 'streak'

export interface Goal {
  id: string
  title: string
  metric: GoalMetric
  target: number
  reward: string
  claimedKey: string // günlük hedeflerde alındığı gün, diğerlerinde 'done'
}
