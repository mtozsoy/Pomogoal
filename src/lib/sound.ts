import type { SoundKind } from './types'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  peak: number
): void {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = c.currentTime + start
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

/** Seçili bitiş sesini çalar. Ses dosyası gerekmez, tonlar kod ile üretilir. */
export function playSound(kind: SoundKind, volume: number, customUrl = ''): void {
  if (kind === 'yok') return
  if (kind === 'custom') {
    if (!customUrl) return
    const audio = new Audio(customUrl)
    audio.volume = Math.min(1, Math.max(0, volume))
    void audio.play().catch(() => undefined)
    return
  }
  const c = getCtx()
  const v = Math.min(1, Math.max(0, volume))
  if (kind === 'zil') {
    for (let i = 0; i < 3; i++) tone(c, 880, i * 0.28, 0.22, 'sine', 0.5 * v)
  } else if (kind === 'can') {
    for (const [f, g] of [
      [523.25, 0.5],
      [1046.5, 0.25],
      [1568, 0.12]
    ] as const) {
      tone(c, f, 0, 2.2, 'sine', g * v)
    }
  } else if (kind === 'bip') {
    for (let i = 0; i < 2; i++) tone(c, 660, i * 0.25, 0.15, 'square', 0.18 * v)
  }
}

/** İlk tıklamada çağrılır; tarayıcı sesi çalmaya izin versin diye. */
export function unlockAudio(): void {
  try {
    getCtx()
  } catch {
    /* ses desteklenmiyor */
  }
}
