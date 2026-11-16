import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAccount } from '../lib/account'
import { accountsMisconfigured } from '../lib/supabase'
import { t, type TextKey } from '../lib/i18n'
import {
  acceptRequest,
  fetchLeaderboard,
  removeFriendship,
  sendRequest,
  type Friend,
  type Period,
  type RequestResult,
  type Row,
  type Scope
} from '../lib/social'
import { formatMinutes } from '../lib/stats'
import { Segmented } from './Segmented'
import { RefreshIcon } from './icons'

interface Props {
  friends: { friends: Friend[]; error: boolean; reload: () => Promise<void> }
  /** Yan çubukta hesap panelini açar */
  openAccount: () => void
  /** Eşitleme sonrası listeyi tazelemek için değişen değer */
  refreshKey: number
}

type Sub = 'ranking' | 'friends'

const REQUEST_MSG: Record<RequestResult, TextKey> = {
  sent: 'reqSent',
  accepted: 'reqAccepted',
  already_friends: 'reqAlreadyFriends',
  already_sent: 'reqAlreadySent',
  not_found: 'reqNotFound',
  self: 'reqSelf',
  no_profile: 'reqNoProfile',
  too_many: 'reqTooMany',
  error: 'reqError'
}

export function SocialView({ friends, openAccount, refreshKey }: Props) {
  const acc = useAccount()
  const [sub, setSub] = useState<Sub>('ranking')
  const incoming = friends.friends.filter((f) => f.direction === 'incoming').length

  if (!acc.enabled)
    return <Gate title="gateDisabledTitle" body={accountsMisconfigured ? 'accountBadConfig' : 'gateDisabledBody'} />
  if (acc.loading || (acc.userId && acc.profileLoading)) {
    return (
      <div className="page-scroll">
        <div className="page">
          <p className="hint">{t('lbLoading')}</p>
        </div>
      </div>
    )
  }
  if (!acc.userId) return <Gate title="gateSignInTitle" body="gateSignInBody" button="gateSignInButton" onClick={openAccount} />
  if (!acc.profile) return <Gate title="gateProfileTitle" body="gateProfileBody" button="gateProfileButton" onClick={openAccount} />

  return (
    <div className="page-scroll">
      <div className="page">
        <div className="social-head">
          <Segmented
            variant="mode"
            items={[
              { id: 'ranking' as Sub, label: t('socialRanking') },
              { id: 'friends' as Sub, label: t('socialFriends'), badge: incoming > 0, title: t('friendsIncoming') }
            ]}
            value={sub}
            onChange={setSub}
          />
        </div>
        {sub === 'ranking' ? (
          <Leaderboard isPublic={acc.profile.is_public} openAccount={openAccount} refreshKey={refreshKey} />
        ) : (
          <FriendsPanel friends={friends.friends} error={friends.error} reload={friends.reload} />
        )}
      </div>
    </div>
  )
}

function Gate(props: { title: TextKey; body: TextKey; button?: TextKey; onClick?: () => void }) {
  return (
    <div className="page-scroll">
      <div className="page">
        <section className="card gate">
          <h2>{t(props.title)}</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            {t(props.body)}
          </p>
          {props.button && (
            <button className="btn primary" onClick={props.onClick}>
              {t(props.button)}
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

function Leaderboard(props: { isPublic: boolean; openAccount: () => void; refreshKey: number }) {
  const [scope, setScope] = useState<Scope>('friends')
  const [period, setPeriod] = useState<Period>('week')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setError(false)
    fetchLeaderboard(scope, period)
      .then((r) => alive && setRows(r))
      .catch(() => alive && (setError(true), setRows(null)))
    return () => {
      alive = false
    }
  }, [scope, period, tick, props.refreshKey])

  // Sekmeye geri dönünce arkadaşların güncel sürelerini göster
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setTick((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const switchTo = useCallback(<T,>(set: (v: T) => void) => (v: T) => {
    setRows(null)
    set(v)
  }, [])

  const max = rows && rows.length ? Math.max(1, ...rows.map((r) => r.minutes)) : 1
  const me = rows?.find((r) => r.is_me)

  return (
    <section>
      <div className="lb-controls">
        <Segmented
          variant="mode"
          items={[
            { id: 'friends' as Scope, label: t('scopeFriends') },
            { id: 'global' as Scope, label: t('scopeGlobal') }
          ]}
          value={scope}
          onChange={switchTo(setScope)}
        />
        <Segmented
          variant="mode"
          items={[
            { id: 'week' as Period, label: t('periodWeek') },
            { id: 'month' as Period, label: t('periodMonth') }
          ]}
          value={period}
          onChange={switchTo(setPeriod)}
        />
        <button
          className="round-btn small"
          title={t('refresh')}
          aria-label={t('refresh')}
          onClick={() => setTick((n) => n + 1)}
        >
          <RefreshIcon size={16} />
        </button>
      </div>

      {error ? (
        <p className="error">
          {t('lbError')}{' '}
          <button className="link" onClick={() => setTick((n) => n + 1)}>
            {t('retry')}
          </button>
        </p>
      ) : rows === null ? (
        <p className="hint">{t('lbLoading')}</p>
      ) : rows.length === 0 ? (
        <p className="hint">
          {scope === 'friends' ? t('lbEmptyFriends') : props.isPublic ? t('lbNoFocusYet') : t('lbEmptyGlobal')}
        </p>
      ) : (
        <ol className="lb">
          {rows.map((r) => (
            <li key={r.user_id} className={r.is_me ? 'lb-row me' : 'lb-row'} data-rank={r.rank <= 3 && r.minutes > 0 ? r.rank : undefined}>
              <span className="lb-rank">{r.rank}</span>
              <div className="lb-main">
                <div className="lb-top">
                  <span className="lb-name">
                    @{r.username}
                    {r.is_me && <em>{t('lbYou')}</em>}
                  </span>
                  <span className="lb-val">
                    <b>{formatMinutes(r.minutes)}</b>
                    <small>{t('lbPomodoros', { n: r.pomodoros })}</small>
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-value" style={{ width: `${(r.minutes / max) * 100}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {rows && rows.length > 0 && scope === 'global' && !me && !props.isPublic && (
        <p className="hint">
          {t('lbPublicOff')}{' '}
          <button className="link" onClick={props.openAccount}>
            {t('tabAccount')}
          </button>
        </p>
      )}
      {rows && rows.length > 0 && scope === 'global' && !me && props.isPublic && (
        <p className="hint">{t('lbNoFocusYet')}</p>
      )}
      {rows && scope === 'friends' && me && me.minutes === 0 && <p className="hint">{t('lbNoFocusYet')}</p>}
      <p className="hint">{t('periodHint')}</p>
    </section>
  )
}

function FriendsPanel(props: { friends: Friend[]; error: boolean; reload: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const incoming = props.friends.filter((f) => f.direction === 'incoming')
  const outgoing = props.friends.filter((f) => f.direction === 'outgoing')
  const list = props.friends.filter((f) => f.direction === 'friend')

  async function send(e: FormEvent) {
    e.preventDefault()
    const v = name.trim().replace(/^@/, '')
    if (!v) return
    setBusy(true)
    const res = await sendRequest(v)
    setBusy(false)
    setMsg({ text: t(REQUEST_MSG[res]), ok: res === 'sent' || res === 'accepted' })
    if (res === 'sent' || res === 'accepted') {
      setName('')
      void props.reload()
    }
  }

  async function act(fn: () => Promise<boolean>) {
    setConfirmId(null)
    await fn()
    void props.reload()
  }

  return (
    <>
      <section className="card">
        <h2>{t('friendsAddTitle')}</h2>
        <form className="add-friend" onSubmit={send}>
          <input
            type="text"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            placeholder={t('friendsAddPlaceholder')}
            aria-label={t('friendsAddPlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
          />
          <button className="btn primary" type="submit" disabled={busy || !name.trim()}>
            {t('friendsAddButton')}
          </button>
        </form>
        {msg && (
          <p className={msg.ok ? 'hint ok' : 'error'} role="status">
            {msg.text}
          </p>
        )}
      </section>

      {incoming.length > 0 && (
        <section>
          <h2 className="page-h small">{t('friendsIncoming')}</h2>
          <ul className="friend-list">
            {incoming.map((f) => (
              <li key={f.friendship_id}>
                <span className="avatar" aria-hidden="true">{f.username.slice(0, 1).toUpperCase()}</span>
                <span className="friend-name">@{f.username}</span>
                <span className="friend-actions">
                  <button className="btn small primary" onClick={() => void act(() => acceptRequest(f.friendship_id))}>
                    {t('friendAccept')}
                  </button>
                  <button className="link" onClick={() => void act(() => removeFriendship(f.friendship_id))}>
                    {t('friendDecline')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="page-h small">{t('friendsList')}</h2>
        {list.length === 0 ? (
          <p className="hint">{t('friendsNone')}</p>
        ) : (
          <ul className="friend-list">
            {list.map((f) => (
              <li key={f.friendship_id}>
                <span className="avatar" aria-hidden="true">{f.username.slice(0, 1).toUpperCase()}</span>
                <span className="friend-name">@{f.username}</span>
                <span className="friend-actions">
                  {confirmId === f.friendship_id ? (
                    <>
                      <button className="btn small danger-btn" onClick={() => void act(() => removeFriendship(f.friendship_id))}>
                        {t('friendRemoveConfirm')}
                      </button>
                      <button className="link" onClick={() => setConfirmId(null)}>
                        {t('cancel')}
                      </button>
                    </>
                  ) : (
                    <button className="link" onClick={() => setConfirmId(f.friendship_id)}>
                      {t('friendRemove')}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section>
          <h2 className="page-h small">{t('friendsOutgoing')}</h2>
          <ul className="friend-list">
            {outgoing.map((f) => (
              <li key={f.friendship_id}>
                <span className="avatar" aria-hidden="true">{f.username.slice(0, 1).toUpperCase()}</span>
                <span className="friend-name">@{f.username}</span>
                <span className="friend-actions">
                  <button className="link" onClick={() => void act(() => removeFriendship(f.friendship_id))}>
                    {t('friendCancel')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {props.error && <p className="error">{t('lbError')}</p>}
    </>
  )
}
