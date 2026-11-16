import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export type Period = 'week' | 'month'
export type Scope = 'friends' | 'global'

export interface Row {
  user_id: string
  username: string
  pomodoros: number
  minutes: number
  rank: number
  is_me: boolean
}

export interface Friend {
  friendship_id: number
  user_id: string
  username: string
  status: 'pending' | 'accepted'
  direction: 'friend' | 'incoming' | 'outgoing'
}

export type RequestResult =
  | 'sent'
  | 'accepted'
  | 'already_friends'
  | 'already_sent'
  | 'not_found'
  | 'self'
  | 'no_profile'
  | 'too_many'
  | 'error'

export async function fetchLeaderboard(scope: Scope, period: Period): Promise<Row[]> {
  if (!supabase) throw new Error('disabled')
  const fn = scope === 'friends' ? 'leaderboard_friends' : 'leaderboard_global'
  const { data, error } = await supabase.rpc(fn, { p_period: period })
  if (error) throw error
  return (data ?? []) as Row[]
}

export async function fetchFriends(): Promise<Friend[]> {
  if (!supabase) throw new Error('disabled')
  const { data, error } = await supabase.rpc('my_friends')
  if (error) throw error
  return (data ?? []) as Friend[]
}

export async function sendRequest(username: string): Promise<RequestResult> {
  if (!supabase) return 'error'
  const { data, error } = await supabase.rpc('send_friend_request', { p_username: username })
  if (error) return 'error'
  return data as RequestResult
}

export async function acceptRequest(id: number): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id).select('id')
  return !error && (data?.length ?? 0) > 0
}

/** İsteği reddet/iptal et veya arkadaşlığı sonlandır */
export async function removeFriendship(id: number): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('friendships').delete().eq('id', id)
  return !error
}

/** Arkadaş listesini yükler; gelen istekleri fark etmek için dakikada bir ve sekmeye dönünce yeniler. */
export function useFriends(enabled: boolean) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const list = await fetchFriends()
      if (!alive.current) return
      setFriends(list)
      setError(false)
    } catch {
      if (alive.current) setError(true)
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setFriends([])
      setError(false)
      return
    }
    void reload()
    const id = window.setInterval(() => void reload(), 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, reload])

  return { friends, loading, error, reload }
}
