import type { BackgroundSetting } from './types'
import type { TextKey } from './i18n'

// Katmanlı radyal geçişler: düz geçişlere göre daha derin görünür.
export const GRADIENTS = [
  {
    id: 'gece',
    name: 'themeGece' as TextKey,
    css: 'radial-gradient(60% 55% at 85% 105%, rgba(244,162,89,.32), transparent 62%), radial-gradient(55% 50% at 8% -5%, rgba(64,148,158,.38), transparent 62%), linear-gradient(160deg,#0b1f24,#10272c 60%,#0a171b)'
  },
  {
    id: 'orman',
    name: 'themeOrman' as TextKey,
    css: 'radial-gradient(60% 50% at 90% 0%, rgba(167,222,140,.25), transparent 60%), radial-gradient(55% 55% at 0% 100%, rgba(30,120,90,.45), transparent 60%), linear-gradient(160deg,#0c2a22,#12372c 60%,#0a1f19)'
  },
  {
    id: 'gunbatimi',
    name: 'themeGunbatimi' as TextKey,
    css: 'radial-gradient(65% 55% at 80% 100%, rgba(255,150,90,.45), transparent 60%), radial-gradient(60% 50% at 10% 0%, rgba(150,80,200,.4), transparent 60%), linear-gradient(160deg,#241638,#3a1f4a 55%,#2a1630)'
  },
  {
    id: 'okyanus',
    name: 'themeOkyanus' as TextKey,
    css: 'radial-gradient(60% 50% at 20% 100%, rgba(70,190,220,.35), transparent 60%), radial-gradient(55% 50% at 95% 0%, rgba(80,110,230,.35), transparent 60%), linear-gradient(160deg,#0b1d33,#0f2a45 60%,#091827)'
  },
  {
    id: 'domates',
    name: 'themeDomates' as TextKey,
    css: 'radial-gradient(60% 55% at 85% 100%, rgba(255,110,80,.4), transparent 60%), radial-gradient(55% 50% at 5% 0%, rgba(150,30,60,.5), transparent 60%), linear-gradient(160deg,#2a0f14,#3d1419 60%,#240c10)'
  },
  {
    id: 'kul',
    name: 'themeKul' as TextKey,
    css: 'radial-gradient(60% 50% at 80% 0%, rgba(255,255,255,.07), transparent 60%), linear-gradient(160deg,#15161b,#1f2128 60%,#131418)'
  }
] as const

export function backgroundCss(bg: BackgroundSetting): string {
  if (bg.kind === 'color') return bg.value
  if (bg.kind === 'image') return `center / cover no-repeat url("${bg.dataUrl}")`
  return (GRADIENTS.find((g) => g.id === bg.id) ?? GRADIENTS[0]).css
}

/** Vurgu rengi üzerindeki yazı için okunaklı renk (koyu veya açık). */
export function onColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#0b1f24'
  const n = parseInt(m[1], 16)
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return L > 0.35 ? '#0b1f24' : '#ffffff'
}
