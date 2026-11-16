import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { supabase } from './supabase'
import { useAccount } from './account'
import type { Session } from './types'

const MAX_SESSIONS = 5000
const PAGE = 1000
const CHUNK = 500
const OWNER_KEY = 'syncOwner'
const MARK_KEY = 'syncMark'
const STASH_KEY = 'syncStash'

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

/**
 * Sunucuda `pomodoros` sütunu yoksa (şema güncellemesi çalıştırılmadıysa)
 * uygulama yine de çalışsın diye o sütun olmadan devam edilir.
 */
let hasPomodoroColumn = true

function missingColumn(err: { code?: string; message?: string }): boolean {
  return err.code === '42703' || err.code === 'PGRST204' || (err.message ?? '').includes('pomodoros')
}

async function fetchRemote(): Promise<Session[]> {
  if (!supabase) return []
  const out: Session[] = []
  for (let from = 0; from < MAX_SESSIONS; from += PAGE) {
    const cols = hasPomodoroColumn ? 'ts, minutes, pomodoros' : 'ts, minutes'
    const { data, error } = await supabase
      .from('sessions')
      .select(cols)
      .order('ts', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) {
      if (hasPomodoroColumn && missingColumn(error)) {
        hasPomodoroColumn = false
        return fetchRemote()
      }
      throw error
    }
    for (const r of data as unknown as { ts: string; minutes: number; pomodoros?: number }[])
      out.push({ ts: Date.parse(r.ts), minutes: r.minutes, pomodoros: r.pomodoros ?? 1 })
    if (data.length < PAGE) break
  }
  return out
}

async function pushRows(userId: string, rows: Session[]): Promise<void> {
  if (!supabase) return
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map((s) => {
      const row: Record<string, unknown> = {
        user_id: userId,
        ts: new Date(s.ts).toISOString(),
        minutes: s.minutes
      }
      if (hasPomodoroColumn) row.pomodoros = s.pomodoros ?? 1
      return row
    })
    const { error } = await supabase
      .from('sessions')
      .upsert(chunk, { onConflict: 'user_id,ts', ignoreDuplicates: true })
    if (error) {
      if (hasPomodoroColumn && missingColumn(error)) {
        hasPomodoroColumn = false
        return pushRows(userId, rows.slice(i))
      }
      throw error
    }
  }
}

/** Gizli sekmede veya depolama kapalıyken localStorage erişimi hata atabilir. */
function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

function writeOwner(id: string): void {
  try {
    localStorage.setItem(OWNER_KEY, id)
  } catch {
    /* depolama kullanılamıyor; eşitleme yine de çalışır */
  }
}

/**
 * Son başarılı eşitlemede buluttaki en yeni kaydın zamanı. Bundan sonraki yerel
 * kayıtların sahibinin hesabına ulaştığı garanti değildir (çevrimdışıyken biten
 * seanslar, çıkış yaptıktan sonra hesapsız yapılanlar).
 */
function readMark(): number {
  try {
    return Number(localStorage.getItem(MARK_KEY)) || 0
  } catch {
    return 0
  }
}

function writeMark(ts: number): void {
  try {
    localStorage.setItem(MARK_KEY, String(ts))
  } catch {
    /* işaret yazılamazsa bir dahaki hesap değişiminde fazladan kayıt saklanır, kayıp olmaz */
  }
}

/**
 * Başka hesaba geçilirken önceki hesabın buluta ulaşmamış kayıtları silinmesin
 * diye sahibine göre burada bekletilir; o hesapla tekrar giriş yapılınca yüklenir.
 */
function readStash(): Record<string, Session[]> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(STASH_KEY) ?? '{}')
    return v && typeof v === 'object' ? (v as Record<string, Session[]>) : {}
  } catch {
    return {}
  }
}

/** Yazılamazsa hata atar: saklanamayan kayıt yerelden silinmemeli. */
function writeStash(stash: Record<string, Session[]>): void {
  if (Object.keys(stash).length === 0) localStorage.removeItem(STASH_KEY)
  else localStorage.setItem(STASH_KEY, JSON.stringify(stash))
}

function merge(a: Session[], b: Session[]): Session[] {
  const map = new Map<number, Session>()
  for (const s of a) map.set(s.ts, s)
  for (const s of b) if (!map.has(s.ts)) map.set(s.ts, s)
  return [...map.values()].sort((x, y) => x.ts - y.ts).slice(-MAX_SESSIONS)
}

/**
 * Giriş yapılmış ve kullanıcı adı seçilmişse seansları buluttaki hesapla eşitler.
 * Hesap yoksa hiçbir şey yapmaz; uygulama yerel çalışmaya devam eder.
 */
export function useSync(sessions: Session[], setSessions: Dispatch<SetStateAction<Session[]>>) {
  const { userId, profile } = useAccount()
  const ready = userId !== null && profile !== null
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastSync, setLastSync] = useState<number | null>(null)
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions
  const running = useRef(false)

  const fullSync = useCallback(async () => {
    if (!ready || !userId || running.current) return
    running.current = true
    setStatus('syncing')
    try {
      // Bu tarayıcıdaki yerel kayıtlar başka bir hesaba aitse onları yeni hesaba
      // yükleme; ama buluta ulaştığı kesin olmayanları silmeden önce sakla.
      // Ağ çağrısından önce yapılır ki eşitleme yarıda kalsa da kayıt kaybolmasın.
      const owner = readOwner()
      const foreign = owner !== null && owner !== userId
      const snapshot = sessionsRef.current
      const stash = readStash()
      if (foreign) {
        const mark = readMark()
        const unsynced = snapshot.filter((s) => s.ts > mark)
        if (unsynced.length) {
          stash[owner] = merge(stash[owner] ?? [], unsynced)
          writeStash(stash)
        }
      }
      const restored = stash[userId] ?? []

      const remote = await fetchRemote()
      const have = new Set(remote.map((s) => s.ts))
      const local = merge(foreign ? [] : snapshot, restored)
      const missing = local.filter((s) => !have.has(s.ts))
      if (missing.length) await pushRows(userId, missing)

      if (restored.length) {
        const fresh = readStash()
        delete fresh[userId]
        try {
          writeStash(fresh)
        } catch {
          /* silinemezse sonraki girişte tekrar yüklenir; çiftler sunucuda yok sayılır */
        }
      }
      const snapTs = new Set(snapshot.map((s) => s.ts))
      // Eşitleme sürerken yeni hesapla biten seanslar (snapshot'ta olmayanlar) korunur
      setSessions((prev) => merge(merge(foreign ? prev.filter((s) => !snapTs.has(s.ts)) : prev, restored), remote))
      const synced = merge(local, remote)
      writeMark(synced.length ? synced[synced.length - 1].ts : 0)
      writeOwner(userId)
      setStatus('ok')
      setLastSync(Date.now())
    } catch {
      setStatus('error')
    } finally {
      running.current = false
    }
  }, [ready, userId, setSessions])

  const statusRef = useRef(status)
  statusRef.current = status
  const lastSyncRef = useRef(lastSync)
  lastSyncRef.current = lastSync

  useEffect(() => {
    if (!ready) {
      setStatus('idle')
      setLastSync(null)
      return
    }
    void fullSync()
    const onOnline = () => void fullSync()
    // Eşitleme başarısızsa ya da üzerinden zaman geçtiyse sekmeye dönünce tekrar dene
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const stale = lastSyncRef.current === null || Date.now() - lastSyncRef.current > 5 * 60_000
      if (statusRef.current === 'error' || stale) void fullSync()
    }
    const retry = window.setInterval(() => {
      if (statusRef.current === 'error' && navigator.onLine) void fullSync()
    }, 60_000)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(retry)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ready, fullSync])

  /** Yeni biten bir odak seansını hemen buluta gönderir; başarısızsa sonraki eşitleme tamamlar. */
  const pushOne = useCallback(
    (s: Session) => {
      if (!ready || !userId) return
      pushRows(userId, [s]).catch(() => setStatus('error'))
    },
    [ready, userId]
  )

  return { status, lastSync, syncNow: fullSync, pushOne }
}
