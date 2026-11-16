// Kısa motivasyon sözleri. Her dilde aynı sayıda olmaları gerekmez.
import { getLocale, type Lang } from './i18n'

export type QuoteKind = 'focus' | 'break'

const FOCUS_TR: string[] = [
  'Küçük adımlar, büyük yolları bitirir.',
  'Şimdi sadece bu görev var. Gerisi bekleyebilir.',
  'Mükemmel olmak zorunda değil, başlamış olmak yeter.',
  'Bugün attığın her pomodoro, yarının kolaylığıdır.',
  'Zor kısım başlamaktı, onu zaten geçtin.',
  'Bir pomodoro daha: bu kadar uzun sürmez.',
  'Dikkatin nereye giderse emeğin de oraya gider.',
  'Telefonu bırak, sadece birkaç dakika.',
  'Yavaş ilerlemek, hiç ilerlememekten iyidir.',
  'Her seansta biraz daha iyisin.',
  'Büyük işler, tekrarlanan küçük odak anlarından oluşur.',
  'Zihnin dağılırsa kızma, nazikçe geri dön.',
  'Bitmiş iş, başlanmamış mükemmel işten iyidir.',
  'Sınav, proje, ödev... hepsi parça parça biter.',
  'Bugünkü emeğin, yarınki rahatlığın.',
  'Sadece bir sonraki küçük adıma odaklan.'
]

const BREAK_TR: string[] = [
  'Gözlerini ekrandan ayır, biraz uzağa bak.',
  'Bir bardak su iç, omuzlarını gevşet.',
  'Dinlenmek de işin bir parçasıdır.',
  'Ayağa kalk, biraz esne.',
  'Derin bir nefes al, yavaşça ver.',
  'Molayı hak ettin. Telefona değil, kendine ayır.',
  'Dinlenen zihin daha iyi öğrenir.',
  'Pencereden dışarı bak, birkaç dakika sadece bekle.',
  'Kısa bir yürüyüş, sonraki seansı kolaylaştırır.'
]

const FOCUS_EN: string[] = [
  'Small steps finish long roads.',
  'Right now there is only this task. Everything else can wait.',
  'It does not have to be perfect; starting is enough.',
  'Every pomodoro today makes tomorrow easier.',
  'The hard part was starting, and you already did it.',
  'One more pomodoro: it will not take that long.',
  'Where your attention goes, your effort follows.',
  'Put the phone down, just for a few minutes.',
  'Slow progress beats no progress.',
  'You get a little better with every session.',
  'Big work is made of small moments of focus, repeated.',
  'If your mind wanders, do not be hard on yourself. Gently come back.',
  'Done is better than perfect and never started.',
  'Exams, projects, assignments: all of them get done piece by piece.',
  'Today’s effort is tomorrow’s ease.',
  'Focus only on the next small step.'
]

const BREAK_EN: string[] = [
  'Look away from the screen at something far away.',
  'Drink a glass of water and relax your shoulders.',
  'Rest is part of the work.',
  'Stand up and stretch a little.',
  'Take a deep breath and let it out slowly.',
  'You earned this break. Spend it on yourself, not your phone.',
  'A rested mind learns better.',
  'Look out the window and just wait for a few minutes.',
  'A short walk makes the next session easier.'
]

const LISTS: Record<Lang, Record<QuoteKind, string[]>> = {
  tr: { focus: FOCUS_TR, break: BREAK_TR },
  en: { focus: FOCUS_EN, break: BREAK_EN }
}

/**
 * Söz metni değil sırası saklanır: dil değişince ekrandaki söz de anında
 * çevrilsin. Diller arasında liste uzunluğu farklıysa mod alınır.
 */
export function pickQuote(kind: QuoteKind, exclude?: number): number {
  const len = LISTS[getLocale()][kind].length
  if (len <= 1) return 0
  let i = Math.floor(Math.random() * (len - 1))
  if (exclude !== undefined && i >= exclude % len) i += 1
  return i
}

export function quoteText(kind: QuoteKind, index: number): string {
  const list = LISTS[getLocale()][kind]
  return list[index % list.length]
}
