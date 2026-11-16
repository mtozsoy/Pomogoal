import { useEffect, useState, type FormEvent } from 'react'
import { MIN_PASSWORD, USERNAME_RE, useAccount } from '../lib/account'
import { t, type TextKey } from '../lib/i18n'
import { accountsMisconfigured, fetchGoogleEnabled } from '../lib/supabase'
import type { SyncStatus } from '../lib/sync'
import { Switch } from './controls'

interface Props {
  sync: { status: SyncStatus; lastSync: number | null; syncNow: () => Promise<void> }
}

const SYNC_LABEL: Record<SyncStatus, TextKey> = {
  idle: 'syncIdle',
  syncing: 'syncSyncing',
  ok: 'syncOk',
  error: 'syncError'
}

export function AccountView({ sync }: Props) {
  return (
    <div className="sidebar-scroll">
      <AccountBody sync={sync} />
    </div>
  )
}

function AccountBody({ sync }: Props) {
  const acc = useAccount()

  if (!acc.enabled) {
    return (
      <div className="card">
        <p className="hint" style={{ marginTop: 0 }}>
          {t(accountsMisconfigured ? 'accountBadConfig' : 'accountDisabled')}
        </p>
      </div>
    )
  }
  if (acc.loading || (acc.userId && acc.profileLoading)) {
    return (
      <div className="card">
        <p className="hint">{t('working')}</p>
      </div>
    )
  }
  if (acc.recovery) return <NewPasswordForm />
  if (!acc.userId) return <SignInForm />
  if (!acc.profile) return <UsernameForm />
  return <Signed sync={sync} />
}

/** Şifre sıfırlama bağlantısından gelindiğinde yeni şifreyi alır. */
function NewPasswordForm() {
  const acc = useAccount()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const err = await acc.updatePassword(password)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="card">
      <h2>{t('accountNewPassword')}</h2>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>{t('accountPassword')}</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <small className="hint">{t('accountPasswordHint')}</small>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy || password.length < MIN_PASSWORD}>
          {busy ? t('working') : t('accountSavePassword')}
        </button>
      </form>
      <div className="rule" />
      <button className="link" onClick={() => void acc.signOut()}>
        {t('cancel')}
      </button>
    </div>
  )
}

function SignInForm() {
  const acc = useAccount()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [googleOn, setGoogleOn] = useState(false)

  useEffect(() => {
    let alive = true
    void fetchGoogleEnabled().then((on) => alive && setGoogleOn(on))
    return () => {
      alive = false
    }
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    const res = mode === 'in' ? await acc.signIn(email, password) : await acc.signUp(email, password)
    setBusy(false)
    if (res.error) setError(res.error)
    else if (res.needsConfirm) setInfo(t('accountConfirmSent'))
  }

  async function forgot() {
    if (!email.trim()) {
      setError(t('errBadEmail'))
      return
    }
    setBusy(true)
    setError('')
    setInfo('')
    const err = await acc.sendPasswordReset(email)
    setBusy(false)
    if (err) setError(err)
    else setInfo(t('accountResetSent'))
  }

  async function google() {
    setError('')
    setBusy(true)
    const res = await acc.signInWithGoogle()
    // Başarılıysa sayfa Google'a yönlenir; düğme o ana kadar kilitli kalır
    if (res.error) {
      setBusy(false)
      setError(res.error)
    }
  }

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        {t('accountLocalOnly')}
      </p>
      <div className="chips" style={{ margin: '14px 0' }}>
        <button type="button" className={mode === 'in' ? 'chip active' : 'chip'} onClick={() => setMode('in')}>
          {t('accountSignIn')}
        </button>
        <button type="button" className={mode === 'up' ? 'chip active' : 'chip'} onClick={() => setMode('up')}>
          {t('accountSignUp')}
        </button>
      </div>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>{t('accountEmail')}</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>{t('accountPassword')}</span>
          <input
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'up' ? MIN_PASSWORD : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'up' && <small className="hint">{t('accountPasswordHint')}</small>}
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        {info && <p className="hint" role="status">{info}</p>}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? t('working') : mode === 'in' ? t('accountSignIn') : t('accountSignUp')}
        </button>
        {mode === 'in' && (
          <button className="link" type="button" onClick={() => void forgot()} disabled={busy}>
            {t('accountForgot')}
          </button>
        )}
      </form>
      {googleOn && (
        <>
          <div className="or-sep">
            <span>{t('accountOr')}</span>
          </div>
          <button className="btn wide-btn" type="button" onClick={() => void google()} disabled={busy}>
            <GoogleMark />
            {t('accountGoogle')}
          </button>
        </>
      )}
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6-4.5H2.4v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M6 14.1a6.6 6.6 0 0 1 0-4.200V7.100H2.400a11 11 0 0 0 0 9.800L6 14.100z" />
      <path fill="#EA4335" d="M12 5.400c1.600 0 3.100.6 4.200 1.700l3.100-3.100A11 11 0 0 0 2.400 7.100L6 9.900c.8-2.600 3.200-4.500 6-4.500z" />
    </svg>
  )
}

export function UsernameForm() {
  const acc = useAccount()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const v = name.trim().toLowerCase()
    if (!USERNAME_RE.test(v)) return setError(t('errUsernameInvalid'))
    setBusy(true)
    setError('')
    const err = await acc.createProfile(v)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="card">
      <h2>{t('accountChooseUsername')}</h2>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>{t('accountUsername')}</span>
          <input
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
          />
          <small className="hint">{t('accountUsernameHint')}</small>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy || name.length < 3}>
          {busy ? t('working') : t('accountUsernameSave')}
        </button>
      </form>
      <div className="rule" />
      <button className="link" onClick={() => void acc.signOut()}>
        {t('accountSignOut')}
      </button>
    </div>
  )
}

function Signed({ sync }: Props) {
  const acc = useAccount()
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const profile = acc.profile!

  async function togglePublic(v: boolean) {
    setError('')
    const err = await acc.setPublic(v)
    if (err) setError(err)
  }

  async function remove() {
    setBusy(true)
    const err = await acc.deleteAccount()
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <>
      <div className="card">
        <div className="me-row">
          <span className="avatar" aria-hidden="true">
            {profile.username.slice(0, 1).toUpperCase()}
          </span>
          <div className="me-text">
            <b>@{profile.username}</b>
            <span className="hint">{acc.email}</span>
          </div>
        </div>
        <div className="rule" />
        <Switch label={t('accountPublic')} checked={profile.is_public} onChange={(v) => void togglePublic(v)} />
        <p className="hint">{t('accountPublicHint')}</p>
        {error && <p className="error" role="alert">{error}</p>}
      </div>

      <div className="card">
        <h2>{t('accountSync')}</h2>
        <div className="sync-row">
          <span className={`sync-dot ${sync.status}`} aria-hidden="true" />
          <span>{t(SYNC_LABEL[sync.status])}</span>
          <button className="link" onClick={() => void sync.syncNow()} disabled={sync.status === 'syncing'}>
            {t('syncNow')}
          </button>
        </div>
        <p className="hint">{t('accountSyncHint')}</p>
      </div>

      <div className="card">
        <button className="btn" onClick={() => void acc.signOut()}>
          {t('accountSignOut')}
        </button>
        <div className="rule" />
        {!confirmDelete ? (
          <button className="link danger" onClick={() => setConfirmDelete(true)}>
            {t('accountDelete')}
          </button>
        ) : (
          <div className="stack">
            <p className="hint" style={{ margin: 0 }}>
              {t('accountDeleteWarn')}
            </p>
            <div className="row" style={{ marginTop: 0 }}>
              <button className="btn small danger-btn" disabled={busy} onClick={() => void remove()}>
                {busy ? t('working') : t('accountDeleteConfirm')}
              </button>
              <button className="link" onClick={() => setConfirmDelete(false)}>
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
