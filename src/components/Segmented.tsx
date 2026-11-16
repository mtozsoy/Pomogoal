import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

interface Props<T extends string> {
  items: { id: T; label: string; badge?: boolean; title?: string }[]
  value: T
  onChange: (id: T) => void
  variant: 'nav' | 'mode'
}

/** Seçili öğenin arkasında kayan bir gösterge olan sekme grubu. */
export function Segmented<T extends string>({ items, value, onChange, variant }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; w: number } | null>(null)
  const [animate, setAnimate] = useState(false)

  const measure = useCallback(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (el) setPos((p) => (p && p.x === el.offsetLeft && p.w === el.offsetWidth ? p : { x: el.offsetLeft, w: el.offsetWidth }))
  }, [])

  useLayoutEffect(measure, [measure, value, items.length])

  // İlk yerleşimde göstergenin soldan kayarak gelmesini istemiyoruz
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Yazı tipi yüklenince veya pencere boyu değişince yeniden ölç
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(measure)
    ro.observe(ref.current)
    void document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [measure])

  return (
    <div ref={ref} className={`seg ${variant}`} role="tablist">
      <span
        className={animate ? 'seg-ind animate' : 'seg-ind'}
        style={pos ? { transform: `translateX(${pos.x}px)`, width: pos.w } : { opacity: 0 }}
        aria-hidden="true"
      />
      {items.map((i) => (
        <button
          key={i.id}
          role="tab"
          aria-selected={i.id === value}
          className={i.badge ? 'has-badge' : undefined}
          title={i.badge ? i.title : undefined}
          onClick={() => onChange(i.id)}
        >
          {i.label}
        </button>
      ))}
    </div>
  )
}
