// Kısa motivasyon sözleri. Buraya istediğin kadar yenisini ekleyebilirsin.
export type QuoteKind = 'focus' | 'break'

const FOCUS: string[] = [
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

const BREAK: string[] = [
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

export function pickQuote(kind: QuoteKind, exclude?: string): string {
  const list = kind === 'break' ? BREAK : FOCUS
  const pool = list.length > 1 ? list.filter((q) => q !== exclude) : list
  return pool[Math.floor(Math.random() * pool.length)]
}
