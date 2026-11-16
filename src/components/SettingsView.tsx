import { useRef, useState } from 'react'
import { t, type TextKey } from '../lib/i18n'
import { playSound } from '../lib/sound'
import { fileToDataUrl } from '../lib/files'
import { Range, Stepper, Switch } from './controls'
import type { Settings, SoundKind } from '../lib/types'

interface Props {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

const SOUNDS: { id: SoundKind; label: TextKey }[] = [
  { id: 'zil', label: 'soundZil' },
  { id: 'can', label: 'soundCan' },
  { id: 'bip', label: 'soundBip' },
  { id: 'custom', label: 'soundCustom' },
  { id: 'yok', label: 'soundNone' }
]

export function SettingsView({ settings, update }: Props) {
  const soundInput = useRef<HTMLInputElement>(null)
  const [soundError, setSoundError] = useState('')

  return (
    <div className="sidebar-scroll">
      <section className="card">
        <h2>{t('sectionDurations')}</h2>
        <Stepper label={t('focusMin')} value={settings.focusMin} min={1} max={180} onChange={(n) => update({ focusMin: n })} />
        <Stepper label={t('shortMin')} value={settings.shortMin} min={1} max={60} onChange={(n) => update({ shortMin: n })} />
        <Stepper label={t('longMin')} value={settings.longMin} min={1} max={120} onChange={(n) => update({ longMin: n })} />
        <Stepper label={t('longEvery')} value={settings.longEvery} min={2} max={12} onChange={(n) => update({ longEvery: n })} />
        <Stepper label={t('countdownMin')} value={settings.countdownMin} min={1} max={600} onChange={(n) => update({ countdownMin: n })} />
        <div className="rule" />
        <Switch label={t('autoStart')} checked={settings.autoStart} onChange={(v) => update({ autoStart: v })} />
        <Switch label={t('notifyOn')} checked={settings.notify} onChange={(v) => update({ notify: v })} />
      </section>

      <section className="card">
        <h2>{t('sectionSound')}</h2>
        <div className="chips">
          {SOUNDS.map((s) => (
            <button
              key={s.id}
              className={settings.sound === s.id ? 'chip active' : 'chip'}
              onClick={() => update({ sound: s.id })}
            >
              {t(s.label)}
            </button>
          ))}
        </div>

        {settings.sound === 'custom' && (
          <div className="row">
            <button className="btn small" onClick={() => soundInput.current?.click()}>
              {t('soundPick')}
            </button>
            <input
              ref={soundInput}
              type="file"
              accept="audio/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                if (file.size > 1_500_000) {
                  setSoundError(t('soundTooBig'))
                  return
                }
                setSoundError('')
                update({ customSoundUrl: await fileToDataUrl(file) })
              }}
            />
            {soundError && <span className="error">{soundError}</span>}
          </div>
        )}

        <Range
          label={t('volume')}
          value={Math.round(settings.volume * 100)}
          min={0}
          max={100}
          suffix="%"
          onChange={(v) => update({ volume: v / 100 })}
        />
        <button
          className="btn small"
          onClick={() => playSound(settings.sound, settings.volume, settings.customSoundUrl)}
        >
          {t('test')}
        </button>
      </section>
    </div>
  )
}
