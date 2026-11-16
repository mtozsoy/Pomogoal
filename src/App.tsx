import { useEffect, useMemo, useRef, useState } from 'react'
import { TimerView } from './components/TimerView'
import { SettingsView } from './components/SettingsView'
import { AppearanceView } from './components/AppearanceView'
import { GoalsView } from './components/GoalsView'
import { CalendarView } from './components/CalendarView'
import { SocialView } from './components/SocialView'
import { AccountView } from './components/AccountView'
import { DEFAULT_PLAYER, MusicPlayer, type PlayerState } from './components/MusicPlayer'
import { Segmented } from './components/Segmented'
import { GearIcon, Logo, MusicIcon, PaletteIcon, UserIcon } from './components/icons'
import { useTimer } from './lib/timer'
import { useLocalStorage } from './lib/storage'
import { useAccount } from './lib/account'
import { useSync } from './lib/sync'
import { useFriends } from './lib/social'
import { playSound, unlockAudio } from './lib/sound'
import { ensureNotifyPermission, notify } from './lib/notify'
import { backgroundCss, onColor } from './lib/themes'
import { DEFAULT_GOALS, computeStats, dayKey } from './lib/stats'
import { t, type TextKey } from './lib/i18n'
import { DEFAULT_SETTINGS, type Goal, type Session, type Settings } from './lib/types'

type Tab = 'timer' | 'calendar' | 'goals' | 'social'
type Panel = 'settings' | 'appearance' | 'account'

const PANEL_TITLE: Record<Panel, TextKey> = { settings: 'tabSettings', appearance: 'tabAppearance', account: 'tabAccount' }

const TABS: { id: Tab; label: TextKey }[] = [
  { id: 'timer', label: 'tabTimer' },
  { id: 'calendar', label: 'tabCalendar' },
  { id: 'goals', label: 'tabGoals' },
  { id: 'social', label: 'tabSocial' }
]

const MAX_SESSIONS = 5000
/** Kronometre ve geri sayımda kaç dakika odak 1 pomodoro sayılır */
const MIN_PER_POMODORO = 20

export default function App() {
  const [tab, setTab] = useState<Tab>('timer')
  const [panel, setPanel] = useLocalStorage<Panel | null>('sidebarPanel', 'settings')
  const [settings, setSettings] = useLocalStorage<Settings>('settings', DEFAULT_SETTINGS)
  const [sessions, setSessions] = useLocalStorage<Session[]>('sessions', [])
  const [goals, setGoals] = useLocalStorage<Goal[]>('goals', DEFAULT_GOALS)
  const [player, setPlayer] = useLocalStorage<PlayerState>('player', DEFAULT_PLAYER)
  // Aynı metin art arda gelse de bildirim yeniden görünsün diye kimlik taşır
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [toastOut, setToastOut] = useState(false)

  // Yan bar kapanırken içeriğin hemen kaybolmaması için son açık paneli hatırla
  const lastPanel = useRef<Panel>('settings')
  if (panel) lastPanel.current = panel
  const shown: Panel = panel ?? lastPanel.current
  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p))

  // Uygulama gece yarısını geçerse "bugün" değerleri kendiliğinden yenilensin
  const [today, setToday] = useState(() => dayKey(Date.now()))
  useEffect(() => {
    const check = () => setToday(dayKey(Date.now()))
    const id = window.setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `today` gün dönümünde yeniden hesaplatır
  const stats = useMemo(() => computeStats(sessions), [sessions, today])

  const account = useAccount()
  const sync = useSync(sessions, setSessions)
  const social = useFriends(account.userId !== null && account.profile !== null)
  const incomingRequests = social.friends.filter((f) => f.direction === 'incoming').length

  // Kronometre/geri sayımda 20 dakikaya tamamlanmayan süre burada birikir
  const [carry, setCarry] = useLocalStorage<number>('pomodoroCarry', 0)
  const carryRef = useRef(carry)
  const lastTs = useRef(0)

  const timer = useTimer(settings, {
    onAlarm: ({ mode, phase }) => {
      playSound(settings.sound, settings.volume, settings.customSoundUrl)
      if (!settings.notify) return
      if (mode !== 'pomodoro') notify(t('notifyCountdownTitle'), t('notifyCountdownBody'))
      else if (phase === 'focus') notify(t('notifyFocusTitle'), t('notifyFocusBody'))
      else notify(t('notifyBreakTitle'), t('notifyBreakBody'))
    },
    onFocusComplete: (minutes, kind) => {
      let pomodoros = 1
      if (kind === 'free') {
        const total = carryRef.current + minutes
        pomodoros = Math.floor(total / MIN_PER_POMODORO)
        carryRef.current = total % MIN_PER_POMODORO
        setCarry(carryRef.current)
      }
      // Aynı anda birden fazla kayıt eklenirse zaman damgaları çakışmasın
      const ts = Math.max(Date.now(), lastTs.current + 1)
      lastTs.current = ts
      const session = { ts, minutes, pomodoros }
      setSessions((prev) => [...prev, session].slice(-MAX_SESSIONS))
      sync.pushOne(session)
    }
  })

  // Tarayıcılar ses ve bildirim iznini ancak kullanıcı etkileşiminden sonra verir
  const timerApi = {
    ...timer,
    start: () => {
      unlockAudio()
      if (settings.notify) void ensureNotifyPermission()
      timer.start()
    }
  }

  // Şifre sıfırlama bağlantısıyla gelindiyse hesap panelini aç
  useEffect(() => {
    if (account.recovery) setPanel('account')
  }, [account.recovery, setPanel])

  useEffect(() => {
    if (!toast) return
    setToastOut(false)
    const hide = window.setTimeout(() => setToastOut(true), 3700)
    const remove = window.setTimeout(() => setToast(null), 4000)
    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(remove)
    }
  }, [toast])

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }))

  return (
    <div
      className="app"
      data-motion={settings.motion}
      style={{
        ['--accent' as string]: settings.accent,
        ['--on-accent' as string]: onColor(settings.accent),
        ['--bar' as string]: settings.barColor || settings.accent
      }}
    >
      <div className="bg" style={{ background: backgroundCss(settings.background) }} />
      <div className="bg-dim" style={{ opacity: settings.dim / 100 }} />

      <header className="topbar">
        <div className="topbar-left">
          <button
            className={panel === 'settings' ? 'icon-btn active' : 'icon-btn'}
            title={t('tabSettings')}
            aria-label={t('tabSettings')}
            aria-expanded={panel === 'settings'}
            onClick={() => togglePanel('settings')}
          >
            <GearIcon size={20} />
          </button>
          <button
            className={panel === 'appearance' ? 'icon-btn active' : 'icon-btn'}
            title={t('tabAppearance')}
            aria-label={t('tabAppearance')}
            aria-expanded={panel === 'appearance'}
            onClick={() => togglePanel('appearance')}
          >
            <PaletteIcon size={20} />
          </button>
          <button
            className={panel === 'account' ? 'icon-btn active' : 'icon-btn'}
            title={t('tabAccount')}
            aria-label={t('tabAccount')}
            aria-expanded={panel === 'account'}
            onClick={() => togglePanel('account')}
          >
            <UserIcon size={20} />
            {account.profile && <span className="icon-dot" aria-hidden="true" />}
          </button>
          <button
            className={player.open ? 'icon-btn active' : 'icon-btn'}
            title={t('tabPlayer')}
            aria-label={t('tabPlayer')}
            aria-expanded={player.open}
            onClick={() => setPlayer((p) => ({ ...p, open: !p.open }))}
          >
            <MusicIcon size={20} />
            {player.url && <span className="icon-dot" aria-hidden="true" />}
          </button>
          <span className="brand">
            <Logo size={26} />
            <span className="brand-name">{t('appName')}</span>
          </span>
        </div>
        <nav className="topnav">
          <Segmented
            variant="nav"
            items={TABS.map((x) => ({
              id: x.id,
              label: t(x.label),
              badge: x.id === 'social' && incomingRequests > 0,
              title: t('friendsIncoming')
            }))}
            value={tab}
            onChange={setTab}
          />
        </nav>
        <div className="topbar-right" />
      </header>

      <div className="body">
        <div className={panel ? 'scrim show' : 'scrim'} onClick={() => setPanel(null)} aria-hidden="true" />
        <aside className={panel ? 'sidebar open' : 'sidebar'} aria-hidden={!panel} inert={!panel}>
          <div className="sidebar-inner">
            <div className="sidebar-head">
              <h2>{t(PANEL_TITLE[shown])}</h2>
              <button className="link" onClick={() => setPanel(null)}>
                {t('close')}
              </button>
            </div>
            <div className="panel-swap" key={shown}>
              {shown === 'settings' && <SettingsView settings={settings} update={update} />}
              {shown === 'appearance' && <AppearanceView settings={settings} update={update} />}
              {shown === 'account' && <AccountView sync={sync} />}
            </div>
          </div>
        </aside>

        <main className="content">
          <div className="view" key={tab}>
          {tab === 'timer' && (
            <TimerView
              timer={timerApi}
              display={settings.display}
              stats={stats}
              showQuotes={settings.showQuotes}
              longEvery={settings.longEvery}
            />
          )}
          {tab === 'calendar' && <CalendarView sessions={sessions} stats={stats} />}
          {tab === 'social' && (
            <SocialView friends={social} openAccount={() => setPanel('account')} refreshKey={sync.lastSync ?? 0} />
          )}
          {tab === 'goals' && (
            <GoalsView
              stats={stats}
              goals={goals}
              setGoals={setGoals}
              onClaim={(reward) => reward && setToast({ id: Date.now(), text: `${t('rewardEarned')} ${reward}` })}
            />
          )}
          </div>
        </main>
      </div>

      <MusicPlayer
        state={player}
        setState={setPlayer}
        focusing={timer.running && (timer.mode !== 'pomodoro' || timer.phase === 'focus')}
      />

      {toast && (
        <div className={toastOut ? 'toast out' : 'toast'} role="status">
          {toast.text}
        </div>
      )}
    </div>
  )
}
