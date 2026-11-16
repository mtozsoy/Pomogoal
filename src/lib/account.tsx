import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session as AuthSession } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { t, type TextKey } from './i18n'

export interface Profile {
  id: string
  username: string
  is_public: boolean
}

interface AuthResult {
  error?: string
  /** Kayıt tamam ama e-posta onayı bekleniyor */
  needsConfirm?: boolean
}

interface AccountApi {
  enabled: boolean
  /** İlk oturum kontrolü sürüyor */
  loading: boolean
  userId: string | null
  email: string | null
  profile: Profile | null
  profileLoading: boolean
  /** Şifre sıfırlama bağlantısıyla gelindi: yeni şifre belirlenmeli */
  recovery: boolean
  signUp: (email: string, password: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signInWithGoogle: () => Promise<AuthResult>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
  createProfile: (username: string) => Promise<string | null>
  setPublic: (value: boolean) => Promise<string | null>
  deleteAccount: () => Promise<string | null>
}

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/
export const MIN_PASSWORD = 8

const Ctx = createContext<AccountApi | null>(null)

export function useAccount(): AccountApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('AccountProvider eksik')
  return v
}

interface ErrLike {
  message?: string
  code?: string
  status?: number
}

function authError(err: ErrLike): string {
  const msg = (err.message ?? '').toLowerCase()
  const code = err.code ?? ''
  let key: TextKey = 'errGeneric'
  if (msg.includes('invalid login')) key = 'errBadLogin'
  else if (msg.includes('not confirmed')) key = 'errNotConfirmed'
  else if (msg.includes('already registered') || code === 'user_already_exists') key = 'errAlreadyRegistered'
  else if (msg.includes('password should be') || code === 'weak_password') key = 'errWeakPassword'
  else if (code.includes('rate_limit') || msg.includes('rate limit') || err.status === 429) key = 'errRateLimit'
  else if (msg.includes('invalid') && msg.includes('email')) key = 'errBadEmail'
  else if (msg.includes('fetch') || msg.includes('network')) key = 'errNetwork'
  return t(key)
}

function dbError(err: ErrLike): string {
  if (err.code === '23505') return t('errUsernameTaken')
  if (err.code === '23514') return t('errUsernameInvalid')
  if (err.message?.toLowerCase().includes('fetch')) return t('errNetwork')
  return t('errGeneric')
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(supabase !== null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let alive = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setAuth(data.session)
      setLoading(false)
    })
    // Burada başka Supabase çağrısı beklenmez (kilitlenmeye yol açar); sadece state güncellenir
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setAuth(session)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') setRecovery(false)
    })
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  const userId = auth?.user.id ?? null

  useEffect(() => {
    if (!supabase || !userId) {
      setProfile(null)
      setProfileLoading(false)
      return
    }
    let alive = true
    setProfileLoading(true)
    void supabase
      .from('profiles')
      .select('id, username, is_public')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return
        setProfile((data as Profile | null) ?? null)
        setProfileLoading(false)
      })
    return () => {
      alive = false
    }
  }, [userId])

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: t('errGeneric') }
    if (password.length < MIN_PASSWORD) return { error: t('errWeakPassword') }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    })
    if (error) return { error: authError(error) }
    // E-posta zaten kayıtlıysa Supabase hata yerine boş kimlik listesi döner
    if (data.user && data.user.identities?.length === 0) return { error: t('errAlreadyRegistered') }
    return { needsConfirm: !data.session }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: t('errGeneric') }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return error ? { error: authError(error) } : {}
  }, [])

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: t('errGeneric') }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    })
    return error ? { error: authError(error) } : {}
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    setRecovery(false)
    await supabase.auth.signOut()
  }, [])

  const sendPasswordReset = useCallback(async (email: string): Promise<string | null> => {
    if (!supabase) return t('errGeneric')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + window.location.pathname
    })
    return error ? authError(error) : null
  }, [])

  const updatePassword = useCallback(async (password: string): Promise<string | null> => {
    if (!supabase) return t('errGeneric')
    if (password.length < MIN_PASSWORD) return t('errWeakPassword')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return authError(error)
    setRecovery(false)
    return null
  }, [])

  const createProfile = useCallback(
    async (username: string): Promise<string | null> => {
      if (!supabase || !userId) return t('errGeneric')
      const name = username.trim().toLowerCase()
      if (!USERNAME_RE.test(name)) return t('errUsernameInvalid')
      const { data, error } = await supabase
        .from('profiles')
        .insert({ id: userId, username: name })
        .select('id, username, is_public')
        .single()
      if (error) return dbError(error)
      setProfile(data as Profile)
      return null
    },
    [userId]
  )

  const setPublic = useCallback(
    async (value: boolean): Promise<string | null> => {
      if (!supabase || !userId) return t('errGeneric')
      const { error } = await supabase.from('profiles').update({ is_public: value }).eq('id', userId)
      if (error) return dbError(error)
      setProfile((p) => (p ? { ...p, is_public: value } : p))
      return null
    },
    [userId]
  )

  const deleteAccount = useCallback(async (): Promise<string | null> => {
    if (!supabase) return t('errGeneric')
    const { error } = await supabase.rpc('delete_my_account')
    if (error) return dbError(error)
    // Yerel kayıtlar bu cihazda kalsın; yeni bir hesap açılırsa onlar yüklensin
    try {
      localStorage.removeItem('syncOwner')
    } catch {
      /* depolama kapalı olabilir */
    }
    await supabase.auth.signOut()
    return null
  }, [])

  const value = useMemo<AccountApi>(
    () => ({
      enabled: supabase !== null,
      loading,
      userId,
      email: auth?.user.email ?? null,
      profile,
      profileLoading,
      recovery,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      sendPasswordReset,
      updatePassword,
      createProfile,
      setPublic,
      deleteAccount
    }),
    [
      loading,
      userId,
      auth,
      profile,
      profileLoading,
      recovery,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      sendPasswordReset,
      updatePassword,
      createProfile,
      setPublic,
      deleteAccount
    ]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
