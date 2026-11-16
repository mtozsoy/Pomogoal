import type { DisplayStyle } from '../lib/types'

interface Props {
  style: DisplayStyle
  text: string
  progress: number // 0-1
  label: string
  fill: 'drain' | 'grow' // geri sayımda çizgiler söner, kronometrede yanar
  dots?: { done: number; total: number }
}

const CX = 170
const TICKS = 60

/** Rakamlar sabit genişlikte çizilir; saniye değişirken sayaç titremez. */
function Time({ text }: { text: string }) {
  return (
    <div className="time" role="timer" aria-label={text}>
      {text.split('').map((ch, i) =>
        ch === ':' ? (
          <span key={i} className="colon" aria-hidden="true">
            :
          </span>
        ) : (
          <span key={i} className="digit" aria-hidden="true">
            {ch}
          </span>
        )
      )}
    </div>
  )
}

function Dial({ text, progress, label, fill, dots }: Omit<Props, 'style'>) {
  const passed = Math.floor(Math.min(1, Math.max(0, progress)) * TICKS)
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const major = i % 5 === 0
    const a = (i * 6 - 90) * (Math.PI / 180)
    const r2 = 162
    const r1 = major ? 140 : 149
    const lit = fill === 'drain' ? i >= passed : i < passed
    return (
      <line
        key={i}
        className={`tick${major ? ' major' : ''}${lit ? ' lit' : ''}`}
        x1={CX + r1 * Math.cos(a)}
        y1={CX + r1 * Math.sin(a)}
        x2={CX + r2 * Math.cos(a)}
        y2={CX + r2 * Math.sin(a)}
      />
    )
  })

  return (
    <div className="display display-dial">
      <svg viewBox="0 0 340 340" aria-hidden="true">
        <circle cx={CX} cy={CX} r="124" className="dial-inner" />
        {ticks}
      </svg>
      <div className="dial-center">
        <Time text={text} />
        {label && <div className="label">{label}</div>}
        {dots && dots.total > 1 && (
          <div className="rounds" aria-hidden="true">
            {Array.from({ length: dots.total }, (_, i) => (
              <span key={i} className={i < dots.done ? 'round done' : 'round'} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function TimerDisplay(props: Props) {
  const { style, text, progress, label } = props
  const p = Math.min(1, Math.max(0, progress))

  if (style === 'ring') return <Dial {...props} />

  if (style === 'bar') {
    return (
      <div className="display display-bar">
        {label && <div className="label">{label}</div>}
        <Time text={text} />
        <div className="bar-track">
          <div className="bar-value timer-fill" style={{ width: `${p * 100}%` }} />
        </div>
      </div>
    )
  }

  if (style === 'minimal') {
    return (
      <div className="display display-minimal">
        <Time text={text} />
        {label && <div className="label">{label}</div>}
      </div>
    )
  }

  return (
    <div className="display display-digital">
      {label && <div className="label">{label}</div>}
      <Time text={text} />
    </div>
  )
}
