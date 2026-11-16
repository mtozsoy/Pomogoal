import type { Goal, GoalMetric, Session } from './types'
import { t, type TextKey } from './i18n'

export function dayKey(ts: number): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export interface Stats {
  todayPomodoros: number
  todayMinutes: number
  totalPomodoros: number
  totalMinutes: number
  bestDayPomodoros: number
  streak: number
  level: number
  xpInLevel: number
  xpForNext: number
}

export const pomodorosOf = (s: Session) => s.pomodoros ?? 1

export function computeStats(sessions: Session[], nowTs = Date.now()): Stats {
  const today = dayKey(nowTs)
  const perDay = new Map<string, number>()
  let todayMinutes = 0
  let totalMinutes = 0
  for (const s of sessions) {
    const k = dayKey(s.ts)
    perDay.set(k, (perDay.get(k) ?? 0) + pomodorosOf(s))
    totalMinutes += s.minutes
    if (k === today) todayMinutes += s.minutes
  }

  // Seri: bugün (veya henüz çalışılmadıysa dünden) geriye doğru ardışık günler
  let streak = 0
  const cursor = new Date(nowTs)
  if (!perDay.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1)
  while (perDay.has(dayKey(cursor.getTime()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  // Seviye: 1 dakika odak = 1 XP, her seviye için 100 × seviye XP
  let level = 1
  let xp = totalMinutes
  while (xp >= level * 100) {
    xp -= level * 100
    level += 1
  }

  return {
    todayPomodoros: perDay.get(today) ?? 0,
    todayMinutes,
    totalPomodoros: sessions.reduce((n, s) => n + pomodorosOf(s), 0),
    totalMinutes,
    bestDayPomodoros: Math.max(0, ...perDay.values()),
    streak,
    level,
    xpInLevel: xp,
    xpForNext: level * 100
  }
}

export interface DayTotal {
  count: number
  minutes: number
}

/** Gün anahtarı (YYYY-MM-DD) -> o günün pomodoro sayısı ve odak dakikası */
export function dayTotals(sessions: Session[]): Map<string, DayTotal> {
  const map = new Map<string, DayTotal>()
  for (const s of sessions) {
    const k = dayKey(s.ts)
    const cur = map.get(k) ?? { count: 0, minutes: 0 }
    cur.count += pomodorosOf(s)
    cur.minutes += s.minutes
    map.set(k, cur)
  }
  return map
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + n).getTime())
}

/** Güncel serinin içindeki günler (bugün çalışılmadıysa dünden geriye doğru). */
export function currentStreakDays(totals: Map<string, DayTotal>, nowTs = Date.now()): Set<string> {
  const days = new Set<string>()
  let key = dayKey(nowTs)
  if (!totals.has(key)) key = addDays(key, -1)
  while (totals.has(key)) {
    days.add(key)
    key = addDays(key, -1)
  }
  return days
}

export function longestStreak(totals: Map<string, DayTotal>): number {
  let best = 0
  let run = 0
  let prev = ''
  for (const k of [...totals.keys()].sort()) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }
  return best
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} ${t('minuteUnit')}`
  return m ? `${h} ${t('hourUnit')} ${m} ${t('minuteUnit')}` : `${h} ${t('hourUnit')}`
}

export function metricValue(metric: GoalMetric, stats: Stats): number {
  switch (metric) {
    case 'todayPomodoros':
      return stats.todayPomodoros
    case 'todayMinutes':
      return stats.todayMinutes
    case 'totalPomodoros':
      return stats.totalPomodoros
    case 'streak':
      return stats.streak
  }
}

export const METRIC_LABEL: Record<GoalMetric, TextKey> = {
  todayPomodoros: 'metricTodayPomodoros',
  todayMinutes: 'metricTodayMinutes',
  totalPomodoros: 'metricTotalPomodoros',
  streak: 'metricStreak'
}

const METRIC_TITLE: Record<GoalMetric, TextKey> = {
  todayPomodoros: 'titleTodayPomodoros',
  todayMinutes: 'titleTodayMinutes',
  totalPomodoros: 'titleTotalPomodoros',
  streak: 'titleStreak'
}

export function goalTitle(metric: GoalMetric, target: number): string {
  return t(METRIC_TITLE[metric], { n: target })
}

export function isDailyMetric(metric: GoalMetric): boolean {
  return metric === 'todayPomodoros' || metric === 'todayMinutes'
}

export function claimKeyFor(goal: Goal, nowTs = Date.now()): string {
  return isDailyMetric(goal.metric) ? dayKey(nowTs) : 'done'
}

export interface Badge {
  id: string
  icon: string
  name: TextKey
  desc: TextKey
  earned: (s: Stats) => boolean
}

export const BADGES: Badge[] = [
  { id: 'first', icon: 'leaf', name: 'badgeFirst', desc: 'badgeFirstDesc', earned: (s) => s.totalPomodoros >= 1 },
  { id: 'ten', icon: 'flame', name: 'badgeTen', desc: 'badgeTenDesc', earned: (s) => s.totalPomodoros >= 10 },
  { id: 'fiveDay', icon: 'bolt', name: 'badgeFiveDay', desc: 'badgeFiveDayDesc', earned: (s) => s.bestDayPomodoros >= 5 },
  { id: 'streak3', icon: 'calendar', name: 'badgeStreak3', desc: 'badgeStreak3Desc', earned: (s) => s.streak >= 3 },
  { id: 'streak7', icon: 'target', name: 'badgeStreak7', desc: 'badgeStreak7Desc', earned: (s) => s.streak >= 7 },
  { id: 'hundred', icon: 'trophy', name: 'badgeHundred', desc: 'badgeHundredDesc', earned: (s) => s.totalPomodoros >= 100 }
]

/**
 * Eski sürümler varsayılan ödülleri Türkçe metin olarak kaydetti. Kullanıcı
 * değiştirmediyse anahtar gibi davranır ki dil değişince o da çevrilsin.
 */
const LEGACY_REWARDS: Record<string, { text: string; key: NonNullable<Goal['rewardKey']> }> = {
  'g-today-4': { text: 'Kendine bir kahve al', key: 'rewardCoffee' },
  'g-streak-3': { text: 'Bir bölüm dizi izle', key: 'rewardEpisode' },
  'g-total-25': { text: 'Küçük bir hediye al', key: 'rewardGift' }
}

export function rewardText(goal: Goal): string {
  if (goal.reward) {
    const legacy = LEGACY_REWARDS[goal.id]
    return legacy && legacy.text === goal.reward ? t(legacy.key) : goal.reward
  }
  return goal.rewardKey ? t(goal.rewardKey) : ''
}

export const DEFAULT_GOALS: Goal[] = [
  {
    id: 'g-today-4',
    title: goalTitle('todayPomodoros', 4),
    metric: 'todayPomodoros',
    target: 4,
    reward: '',
    rewardKey: 'rewardCoffee',
    claimedKey: ''
  },
  {
    id: 'g-streak-3',
    title: goalTitle('streak', 3),
    metric: 'streak',
    target: 3,
    reward: '',
    rewardKey: 'rewardEpisode',
    claimedKey: ''
  },
  {
    id: 'g-total-25',
    title: goalTitle('totalPomodoros', 25),
    metric: 'totalPomodoros',
    target: 25,
    reward: '',
    rewardKey: 'rewardGift',
    claimedKey: ''
  }
]
