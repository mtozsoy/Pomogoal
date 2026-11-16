import { t } from '../lib/i18n'

export function Switch(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch-row">
      <span>{props.label}</span>
      <span className="switch">
        <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
        <span className="switch-track" />
      </span>
    </label>
  )
}

export function Range(props: {
  label: string
  value: number
  min: number
  max: number
  suffix?: string
  onChange: (v: number) => void
}) {
  const pct = ((props.value - props.min) / (props.max - props.min)) * 100
  return (
    <label className="range">
      <span className="range-head">
        <span>{props.label}</span>
        <span className="range-val">
          {props.value}
          {props.suffix ?? ''}
        </span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        value={props.value}
        style={{ ['--pct' as string]: `${pct}%` }}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function Stepper(props: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  const set = (n: number) => props.onChange(Math.min(props.max, Math.max(props.min, Math.round(n))))
  return (
    <div className="stepper-row">
      <span>{props.label}</span>
      <div className="stepper">
        <button type="button" aria-label={t('stepperLess')} title={t('stepperLess')} onClick={() => set(props.value - 1)} disabled={props.value <= props.min}>
          −
        </button>
        <input
          type="number"
          min={props.min}
          max={props.max}
          value={props.value}
          aria-label={props.label}
          onChange={(e) => Number.isFinite(e.target.valueAsNumber) && set(e.target.valueAsNumber)}
        />
        <button type="button" aria-label={t('stepperMore')} title={t('stepperMore')} onClick={() => set(props.value + 1)} disabled={props.value >= props.max}>
          +
        </button>
      </div>
    </div>
  )
}
