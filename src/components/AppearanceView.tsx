import { useRef } from 'react'
import { t, type TextKey } from '../lib/i18n'
import { GRADIENTS } from '../lib/themes'
import { imageToDataUrl } from '../lib/files'
import { Range, Switch } from './controls'
import { CheckIcon } from './icons'
import type { DisplayStyle, MotionMode, Settings } from '../lib/types'

interface Props {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

const DISPLAYS: { id: DisplayStyle; label: TextKey }[] = [
  { id: 'ring', label: 'displayRing' },
  { id: 'digital', label: 'displayDigital' },
  { id: 'bar', label: 'displayBar' },
  { id: 'minimal', label: 'displayMinimal' }
]

const MOTIONS: { id: MotionMode; label: TextKey }[] = [
  { id: 'on', label: 'motionOn' },
  { id: 'auto', label: 'motionAuto' },
  { id: 'off', label: 'motionOff' }
]

const PRESETS = ['#f4a259', '#ff6b5e', '#6ee7b7', '#7cc4ff', '#b79cff', '#ff8fb1', '#f2e8cf']

function ColorDots(props: { value: string; onChange: (hex: string) => void }) {
  const current = props.value.toLowerCase()
  const isPreset = PRESETS.includes(current)
  return (
    <div className="color-row">
      {PRESETS.map((c) => (
        <button
          key={c}
          className={current === c ? 'dot active' : 'dot'}
          style={{ background: c }}
          title={c}
          aria-label={c}
          aria-pressed={current === c}
          onClick={() => props.onChange(c)}
        >
          {current === c && <CheckIcon size={14} />}
        </button>
      ))}
      <label className={!isPreset && current ? 'dot custom active' : 'dot custom'} title={t('colorCustom')}>
        <input type="color" value={props.value || '#f4a259'} onChange={(e) => props.onChange(e.target.value)} aria-label={t('colorCustom')} />
      </label>
    </div>
  )
}

export function AppearanceView({ settings, update }: Props) {
  const imageInput = useRef<HTMLInputElement>(null)
  const bg = settings.background

  return (
    <div className="sidebar-scroll">
      <section className="card">
        <h2>{t('sectionClock')}</h2>
        <div className="chips">
          {DISPLAYS.map((d) => (
            <button
              key={d.id}
              className={settings.display === d.id ? 'chip active' : 'chip'}
              onClick={() => update({ display: d.id })}
            >
              {t(d.label)}
            </button>
          ))}
        </div>

        <h3>{t('barColor')}</h3>
        <button
          className={settings.barColor === '' ? 'chip active' : 'chip'}
          onClick={() => update({ barColor: '' })}
        >
          {t('barColorSame')}
        </button>
        <ColorDots value={settings.barColor} onChange={(hex) => update({ barColor: hex })} />

        <div className="rule" />
        <Switch label={t('showQuotes')} checked={settings.showQuotes} onChange={(v) => update({ showQuotes: v })} />
      </section>

      <section className="card">
        <h2>{t('background')}</h2>
        <div className="swatches">
          {GRADIENTS.map((g) => (
            <button
              key={g.id}
              title={t(g.name)}
              aria-label={t(g.name)}
              aria-pressed={bg.kind === 'gradient' && bg.id === g.id}
              className={bg.kind === 'gradient' && bg.id === g.id ? 'swatch active' : 'swatch'}
              style={{ background: g.css }}
              onClick={() => update({ background: { kind: 'gradient', id: g.id } })}
            />
          ))}
        </div>
        <div className="row">
          <label className="btn small color-btn">
            <span className="chip-dot" style={{ background: bg.kind === 'color' ? bg.value : '#1a1a24' }} />
            {t('bgColor')}
            <input
              type="color"
              value={bg.kind === 'color' ? bg.value : '#1a1a24'}
              onChange={(e) => update({ background: { kind: 'color', value: e.target.value } })}
            />
          </label>
          <button className="btn small" onClick={() => imageInput.current?.click()}>
            {t('bgImage')}
          </button>
          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                update({ background: { kind: 'image', dataUrl: await imageToDataUrl(file) } })
              } catch (err) {
                console.warn('Resim yüklenemedi', err)
              }
            }}
          />
        </div>
        <p className="hint">{t('bgImageHint')}</p>
        <Range label={t('dim')} value={settings.dim} min={0} max={70} suffix="%" onChange={(v) => update({ dim: v })} />
      </section>

      <section className="card">
        <h2>{t('accent')}</h2>
        <ColorDots value={settings.accent} onChange={(hex) => update({ accent: hex })} />
      </section>

      <section className="card">
        <h2>{t('sectionMotion')}</h2>
        <div className="chips">
          {MOTIONS.map((m) => (
            <button
              key={m.id}
              className={settings.motion === m.id ? 'chip active' : 'chip'}
              onClick={() => update({ motion: m.id })}
            >
              {t(m.label)}
            </button>
          ))}
        </div>
        <p className="hint">{t('motionHint')}</p>
      </section>
    </div>
  )
}
