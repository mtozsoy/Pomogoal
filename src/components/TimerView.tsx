import { TimerDisplay } from './TimerDisplay'
import { Quote } from './Quote'
import { Segmented } from './Segmented'
import { PauseIcon, PlayIcon, ResetIcon, SkipIcon } from './icons'
import { formatTime } from '../lib/timer'
import { t, type TextKey } from '../lib/i18n'
import type { Mode, Phase, DisplayStyle } from '../lib/types'
import type { Stats } from '../lib/stats'

interface TimerApi {
  mode: Mode
  phase: Phase
  running: boolean
  started: boolean
  elapsed: number
  remaining: number | null
  durationMs: number | null
  focusDone: number
  parked: string[]
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  setMode: (m: Mode) => void
  setPhase: (p: Phase) => void
}

const MODES: { id: Mode; label: TextKey }[] = [
  { id: 'pomodoro', label: 'modePomodoro' },
  { id: 'countdown', label: 'modeCountdown' },
  { id: 'stopwatch', label: 'modeStopwatch' }
]

const PHASES: { id: Phase; label: TextKey }[] = [
  { id: 'focus', label: 'phaseFocus' },
  { id: 'short', label: 'phaseShort' },
  { id: 'long', label: 'phaseLong' }
]

interface Props {
  timer: TimerApi
  display: DisplayStyle
  stats: Stats
  showQuotes: boolean
  longEvery: number
}

export function TimerView({ timer, display, stats, showQuotes, longEvery }: Props) {
  const isStopwatch = timer.mode === 'stopwatch'
  const isPomodoro = timer.mode === 'pomodoro'
  const shownMs = isStopwatch ? timer.elapsed : (timer.remaining ?? 0)
  const progress = isStopwatch
    ? (timer.elapsed % 60_000) / 60_000
    : timer.durationMs
      ? 1 - (timer.remaining ?? 0) / timer.durationMs
      : 0
  // Pomodoroda aşama zaten üstteki sekmelerde görünür; etiketi tekrarlamayız
  const label = isPomodoro ? '' : timer.mode === 'countdown' ? t('modeCountdown') : t('modeStopwatch')

  const dots = isPomodoro
    ? { done: timer.phase === 'long' ? longEvery : timer.focusDone % longEvery, total: longEvery }
    : undefined

  return (
    <div className="timer-view">
      <Segmented
        variant="mode"
        items={MODES.map((m) => {
          const badge =
            m.id !== timer.mode &&
            timer.parked.some((k) => (m.id === 'pomodoro' ? k.startsWith('pomodoro:') : k === m.id))
          return { id: m.id, label: t(m.label), badge, title: t('progressSaved') }
        })}
        value={timer.mode}
        onChange={timer.setMode}
      />

      {isPomodoro && (
        <div className="phases">
          {PHASES.map((p) => (
            <button
              key={p.id}
              className={[
                'phase',
                timer.phase === p.id ? 'active' : '',
                timer.phase !== p.id && timer.parked.includes(`pomodoro:${p.id}`) ? 'has-badge' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              title={
                timer.phase !== p.id && timer.parked.includes(`pomodoro:${p.id}`) ? t('progressSaved') : undefined
              }
              onClick={() => timer.setPhase(p.id)}
            >
              {t(p.label)}
            </button>
          ))}
        </div>
      )}

      <TimerDisplay
        key={`${display}-${timer.mode}`}
        style={display}
        text={formatTime(shownMs)}
        progress={progress}
        label={label}
        fill={isStopwatch ? 'grow' : 'drain'}
        dots={dots}
      />

      <div className="controls">
        <button
          className="round-btn"
          title={t('reset')}
          aria-label={t('reset')}
          onClick={timer.reset}
          disabled={!timer.started && !timer.running}
        >
          <ResetIcon size={20} />
        </button>
        <button className="primary-btn" onClick={timer.running ? timer.pause : timer.start}>
          <span className="btn-icon" key={timer.running ? 'pause' : 'play'}>
            {timer.running ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
          </span>
          {timer.running ? t('pause') : timer.started ? t('resume') : t('start')}
        </button>
        {isPomodoro ? (
          <button className="round-btn" title={t('skip')} aria-label={t('skip')} onClick={timer.skip}>
            <SkipIcon size={20} />
          </button>
        ) : (
          <span className="round-spacer" />
        )}
      </div>

      {showQuotes && (
        <Quote
          key={`${timer.mode}-${timer.phase}-${timer.focusDone}`}
          kind={isPomodoro && timer.phase !== 'focus' ? 'break' : 'focus'}
        />
      )}

      <div className="today">
        <span>
          <b>{stats.todayPomodoros}</b> {t('pomodoroUnit')} {t('todayUnit')}
        </span>
        <span>
          <b>{stats.todayMinutes}</b> {t('minuteUnit')}
        </span>
        <span>
          <b>{stats.streak}</b> {t('streakUnit')}
        </span>
      </div>
    </div>
  )
}
