import { useState, type JSX } from 'react'
import { t } from '../lib/i18n'
import { BADGES, METRIC_LABEL, claimKeyFor, goalTitle, metricValue, type Stats } from '../lib/stats'
import { BoltIcon, CalendarIcon, FlameIcon, GiftIcon, LeafIcon, TargetIcon, TrophyIcon } from './icons'
import type { Goal, GoalMetric } from '../lib/types'

interface Props {
  stats: Stats
  goals: Goal[]
  setGoals: (updater: (prev: Goal[]) => Goal[]) => void
  onClaim: (reward: string) => void
}

const METRICS: GoalMetric[] = ['todayPomodoros', 'todayMinutes', 'totalPomodoros', 'streak']

const BADGE_ICONS: Record<string, (p: { size?: number }) => JSX.Element> = {
  leaf: LeafIcon,
  flame: FlameIcon,
  bolt: BoltIcon,
  calendar: CalendarIcon,
  target: TargetIcon,
  trophy: TrophyIcon
}

export function GoalsView({ stats, goals, setGoals, onClaim }: Props) {
  const [metric, setMetric] = useState<GoalMetric>('todayPomodoros')
  const [target, setTarget] = useState(4)
  const [reward, setReward] = useState('')

  function addGoal() {
    if (target < 1) return
    setGoals((prev) => [
      ...prev,
      {
        id: `g-${Date.now()}`,
        title: goalTitle(metric, target),
        metric,
        target,
        reward: reward.trim(),
        claimedKey: ''
      }
    ])
    setReward('')
  }

  function claim(goal: Goal) {
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, claimedKey: claimKeyFor(g) } : g)))
    onClaim(goal.reward)
  }

  return (
    <div className="page-scroll">
      <div className="page">
        <section className="level">
          <div className="level-num">
            <span>{t('level')}</span>
            <b>{stats.level}</b>
          </div>
          <div className="level-body">
            <div className="level-xp">
              <span>
                {stats.xpInLevel} / {stats.xpForNext} {t('xpUnit')}
              </span>
            </div>
            <div className="bar-track">
              <div className="bar-value" style={{ width: `${(stats.xpInLevel / stats.xpForNext) * 100}%` }} />
            </div>
            <div className="level-stats">
              <span>
                <b>{stats.todayPomodoros}</b> {t('pomodoroUnit')} {t('todayUnit')}
              </span>
              <span>
                <b>{stats.totalPomodoros}</b> {t('metricTotalPomodoros').toLowerCase()}
              </span>
              <span>
                <b>{stats.streak}</b> {t('streakUnit')}
              </span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="page-h">{t('goalsTitle')}</h2>
          {goals.length === 0 && <p className="hint">{t('goalsEmpty')}</p>}
          <ul className="goal-list">
            {goals.map((g) => {
              const value = metricValue(g.metric, stats)
              const done = value >= g.target
              const claimed = g.claimedKey === claimKeyFor(g)
              return (
                <li key={g.id} className={done ? 'goal done' : 'goal'}>
                  <div className="goal-top">
                    <span className="goal-title">{g.title}</span>
                    <span className="goal-count">
                      {Math.min(value, g.target)} / {g.target}
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-value" style={{ width: `${Math.min(100, (value / g.target) * 100)}%` }} />
                  </div>
                  <div className="goal-bottom">
                    {g.reward ? (
                      <span className="goal-reward">
                        <GiftIcon size={15} />
                        {g.reward}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="goal-actions">
                      {done && (
                        <button className="btn small primary" disabled={claimed} onClick={() => claim(g)}>
                          {claimed ? t('goalClaimed') : t('goalClaim')}
                        </button>
                      )}
                      <button className="link" onClick={() => setGoals((prev) => prev.filter((x) => x.id !== g.id))}>
                        {t('goalDelete')}
                      </button>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="card wide">
          <h2>{t('goalAdd')}</h2>
          <div className="form-grid">
            <label className="field">
              <span>{t('goalMetric')}</span>
              <select value={metric} onChange={(e) => setMetric(e.target.value as GoalMetric)}>
                {METRICS.map((m) => (
                  <option key={m} value={m}>
                    {t(METRIC_LABEL[m])}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('goalTarget')}</span>
              <input
                type="number"
                min={1}
                max={10000}
                value={target}
                onChange={(e) => setTarget(Math.max(1, Math.round(Number(e.target.value)) || 1))}
              />
            </label>
            <label className="field span2">
              <span>{t('goalReward')}</span>
              <input
                type="text"
                value={reward}
                maxLength={80}
                placeholder={t('goalRewardPlaceholder')}
                onChange={(e) => setReward(e.target.value)}
              />
            </label>
          </div>
          <button className="btn primary" onClick={addGoal}>
            {t('goalCreate')}
          </button>
        </section>

        <section>
          <h2 className="page-h">{t('badges')}</h2>
          <div className="badges">
            {BADGES.map((b) => {
              const earned = b.earned(stats)
              const Icon = BADGE_ICONS[b.icon] ?? TrophyIcon
              return (
                <div key={b.id} className={earned ? 'badge earned' : 'badge'}>
                  <span className="badge-icon">
                    <Icon size={22} />
                  </span>
                  <b>{t(b.name)}</b>
                  <span className="hint">{t(b.desc)}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
