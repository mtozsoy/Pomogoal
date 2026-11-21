import type { TextKey } from './i18n'

/**
 * Odak sesleri tarayıcıda Web Audio ile üretilir; YouTube'daki hazır videolar
 * yerine. Böylece reklam, telif ve "video kaldırıldı" sorunu yok, internet
 * olmadan da çalar ve frekanslar tam olarak söylediğimiz değerdedir.
 */
export type FocusSoundId = 'gamma40' | 'binaural40' | 'brown' | 'pink' | 'white'

export interface FocusSoundInfo {
  id: FocusSoundId
  name: TextKey
  desc: TextKey
  /** Araştırmanın ne söylediği: abartılı iddiada bulunmamak için ayrı tutulur */
  evidence: TextKey
  headphones?: boolean
}

export const FOCUS_SOUNDS: FocusSoundInfo[] = [
  { id: 'gamma40', name: 'fsGammaName', desc: 'fsGammaDesc', evidence: 'fsGammaEvidence' },
  { id: 'binaural40', name: 'fsBinauralName', desc: 'fsBinauralDesc', evidence: 'fsBinauralEvidence', headphones: true },
  { id: 'brown', name: 'fsBrownName', desc: 'fsBrownDesc', evidence: 'fsBrownEvidence' },
  { id: 'pink', name: 'fsPinkName', desc: 'fsPinkDesc', evidence: 'fsPinkEvidence' },
  { id: 'white', name: 'fsWhiteName', desc: 'fsWhiteDesc', evidence: 'fsWhiteEvidence' }
]

/** Döngüdeki gürültü tamponu: kısa olursa tekrar kulağa gelir */
const NOISE_SECONDS = 10
const FADE = 0.6

type NoiseColor = 'white' | 'pink' | 'brown'

function noiseBuffer(ctx: AudioContext, color: NoiseColor): AudioBuffer {
  const len = ctx.sampleRate * NOISE_SECONDS
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    // İki kanal ayrı üretilir: aynı gürültü iki kulakta "kafanın ortasında" duyulur
    const d = buf.getChannelData(ch)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    let last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      if (color === 'white') {
        d[i] = w * 0.35
      } else if (color === 'pink') {
        // Paul Kellet'in pembe gürültü süzgeci (frekans başına -3 dB/oktav)
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852
        b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.016898
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.09
        b6 = w * 0.115926
      } else {
        // Kahverengi gürültü: beyaz gürültünün sızdıran toplamı (-6 dB/oktav)
        last = (last + 0.02 * w) / 1.02
        d[i] = last * 3.2
      }
    }
    // Döngü noktasında tık sesi olmasın diye uçlar kısa bir geçişle birleştirilir
    const xf = Math.floor(ctx.sampleRate * 0.05)
    for (let i = 0; i < xf; i++) {
      const g = i / xf
      d[i] = d[i] * g + d[len - xf + i] * (1 - g)
    }
  }
  return buf
}

/** Çalan sesin durdurulabilmesi için kurulan düğümler */
interface Voice {
  out: GainNode
  stop: () => void
}

function buildVoice(ctx: AudioContext, id: FocusSoundId, dest: AudioNode): Voice {
  const out = ctx.createGain()
  out.gain.value = 0
  out.connect(dest)
  const sources: AudioScheduledSourceNode[] = []

  if (id === 'gamma40') {
    // 40 Hz'de açılıp kapanan yumuşak bir ton (izokronik uyarım). Hoparlörde
    // de çalışır; MIT'nin 40 Hz ses çalışmalarındaki uyarıma benzer.
    const carrier = ctx.createOscillator()
    carrier.frequency.value = 220
    const am = ctx.createGain()
    am.gain.value = 0.5
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 40
    const depth = ctx.createGain()
    depth.gain.value = 0.5
    lfo.connect(depth).connect(am.gain)
    const level = ctx.createGain()
    level.gain.value = 0.35
    carrier.connect(am).connect(level).connect(out)
    sources.push(carrier, lfo)
  } else if (id === 'binaural40') {
    // Sol kulak 200 Hz, sağ kulak 240 Hz: beyin aradaki 40 Hz farkı "vuruş"
    // olarak algılar. Bu yüzden yalnızca kulaklıkla anlamlıdır.
    const merger = ctx.createChannelMerger(2)
    for (const [freq, ch] of [[200, 0], [240, 1]] as const) {
      const osc = ctx.createOscillator()
      osc.frequency.value = freq
      const g = ctx.createGain()
      g.gain.value = 0.3
      osc.connect(g).connect(merger, 0, ch)
      sources.push(osc)
    }
    // Saf ton yorucu olabildiği için altına hafif pembe gürültü eklenir
    const bed = ctx.createBufferSource()
    bed.buffer = noiseBuffer(ctx, 'pink')
    bed.loop = true
    const bedGain = ctx.createGain()
    bedGain.gain.value = 0.25
    bed.connect(bedGain).connect(out)
    merger.connect(out)
    sources.push(bed)
  } else {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx, id)
    src.loop = true
    src.connect(out)
    sources.push(src)
  }

  const t = ctx.currentTime
  for (const s of sources) s.start(t)
  out.gain.setTargetAtTime(1, t, FADE / 3)

  return {
    out,
    stop: () => {
      const now = ctx.currentTime
      out.gain.cancelScheduledValues(now)
      out.gain.setTargetAtTime(0, now, FADE / 3)
      for (const s of sources) s.stop(now + FADE)
      window.setTimeout(() => out.disconnect(), FADE * 1000 + 100)
    }
  }
}

/**
 * Tek bir odak sesini çalar. AudioContext ilk dokunuşta kurulur: tarayıcılar
 * kullanıcı etkileşimi olmadan ses başlatmaya izin vermez.
 */
export class FocusSoundPlayer {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private voice: Voice | null = null
  private volume = 0.5
  current: FocusSoundId | null = null

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  play(id: FocusSoundId): void {
    const ctx = this.ensure()
    if (this.current === id && this.voice) return
    this.voice?.stop()
    this.voice = buildVoice(ctx, id, this.master!)
    this.current = id
  }

  stop(): void {
    this.voice?.stop()
    this.voice = null
    this.current = null
  }

  setVolume(v: number): void {
    this.volume = v
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }
}
