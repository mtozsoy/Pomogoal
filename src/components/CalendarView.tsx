import { useMemo, useState } from 'react'
import { dateLocale, t } from '../lib/i18n'
import {
  currentStreakDays,
  dayKey,
  dayTotals,
  formatMinutes,
  longestStreak,
  type Stats
} from '../lib/stats'
import type { Session } from '../lib/types'
import { ChevronLeftIcon, ChevronRightIcon, FlameIcon } from './icons'

interface Props {
  sessions: Session[]
  stats: Stats
}

function levelFor(minutes: number): number {
  if (minutes <= 0) return 0
  if (minutes < 25) return 1
  if (minutes < 60) return 2
  if (minutes < 120) return 3
  return 4
}

function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function capitalize(s: string): string {
  return s.charAt(0).toLocaleUpperCase(dateLocale()) + s.slice(1)
}

export function CalendarView({ sessions, stats }: Props) {
  const todayKey = dayKey(Date.now())
  const [month, setMonth] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [selected, setSelected] = useState(todayKey)

  const totals = useMemo(() => dayTotals(sessions), [sessions])
  const streakDays = useMemo(() => currentStreakDays(totals), [totals])
  const longest = useMemo(() => longestStreak(totals), [totals])

  const y = month.getFullYear()
  const m = month.getMonth()
  const offset = (new Date(y, m, 1).getDay() + 6) % 7 // hafta pazartesi başlar
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const keyOf = (d: number) => dayKey(new Date(y, m, d).getTime())

  let monthMinutes = 0
  let activeDays = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const tot = totals.get(keyOf(d))
    if (tot) {
      monthMinutes += tot.minutes
      activeDays += 1
    }
  }

  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(dateLocale(), { weekday: 'short' }).format(new Date(2024, 0, 1 + i))
  )
  const monthLabel = capitalize(new Intl.DateTimeFormat(dateLocale(), { month: 'long', year: 'numeric' }).format(month))

  const now = new Date()
  const isCurrentMonth = y === now.getFullYear() && m === now.getMonth()
  const shift = (n: number) => setMonth(new Date(y, m + n, 1))

  const selTotal = totals.get(selected)
  const selSessions = sessions.filter((s) => dayKey(s.ts) === selected).sort((a, b) => a.ts - b.ts)
  const selLabel = capitalize(
    new Intl.DateTimeFormat(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(keyToDate(selected))
  )

  return (
    <div className="page-scroll">
      <div className="page">
        <section className="cal-summary">
          <div>
            <b>{stats.streak}</b>
            <span>{t('calStreak')}</span>
          </div>
          <div>
            <b>{longest}</b>
            <span>{t('calLongest')}</span>
          </div>
          <div>
            <b>{formatMinutes(monthMinutes)}</b>
            <span>{t('calMonthFocus')}</span>
          </div>
          <div>
            <b>{activeDays}</b>
            <span>{t('calActiveDays')}</span>
          </div>
        </section>

        <section className="card wide cal">
          <div className="cal-head">
            <h2>{monthLabel}</h2>
            <div className="cal-nav">
              <button className="btn small" onClick={() => { setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelected(todayKey) }} disabled={isCurrentMonth && selected === todayKey}>
                {t('calToday')}
              </button>
              <button className="round-btn small" aria-label={t('calPrev')} title={t('calPrev')} onClick={() => shift(-1)}>
                <ChevronLeftIcon size={18} />
              </button>
              <button className="round-btn small" aria-label={t('calNext')} title={t('calNext')} onClick={() => shift(1)} disabled={isCurrentMonth}>
                <ChevronRightIcon size={18} />
              </button>
            </div>
          </div>

          <div className="cal-grid" key={monthLabel}>
            {weekdays.map((w) => (
              <div key={w} className="cal-dow">
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />
              const key = keyOf(d)
              const tot = totals.get(key)
              const minutes = tot?.minutes ?? 0
              const future = key > todayKey
              const cls = [
                'cal-day',
                `lv${levelFor(minutes)}`,
                key === todayKey ? 'today' : '',
                key === selected ? 'selected' : '',
                future ? 'future' : ''
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={key}
                  className={cls}
                  disabled={future}
                  aria-pressed={key === selected}
                  aria-label={`${d} ${monthLabel}: ${tot ? t('calDayTotal', { n: tot.count, m: formatMinutes(minutes) }) : t('calNoSessions')}`}
                  onClick={() => setSelected(key)}
                >
                  <span className="cal-num">{d}</span>
                  {streakDays.has(key) && (
                    <span className="cal-flame" aria-hidden="true">
                      <FlameIcon size={13} />
                    </span>
                  )}
                  {minutes > 0 && <span className="cal-min">{minutes}</span>}
                </button>
              )
            })}
          </div>

          <div className="cal-legend">
            <span className="legend-scale">
              {t('calLess')}
              {[0, 1, 2, 3, 4].map((l) => (
                <i key={l} className={`cal-swatch lv${l}`} />
              ))}
              {t('calMore')}
            </span>
            <span className="legend-flame">
              <FlameIcon size={13} />
              {t('calLegendStreak')}
            </span>
          </div>
          <p className="hint">{t('calCellHint')}</p>
        </section>

        <section className="cal-detail" key={selected}>
          <h2 className="page-h">{selLabel}</h2>
          {selTotal ? (
            <>
              <p className="hint cal-total">{t('calDayTotal', { n: selTotal.count, m: formatMinutes(selTotal.minutes) })}</p>
              <ul className="cal-sessions">
                {selSessions.map((s) => (
                  <li key={s.ts}>
                    <span>{new Date(s.ts).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>
                      {s.minutes} {t('minuteUnit')}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="hint">{t('calNoSessions')}</p>
          )}
        </section>
      </div>
    </div>
  )
}
