import type { ReactNode } from 'react'

interface IconProps {
  size?: number
}

function make(children: ReactNode, filled = false) {
  return function Icon({ size = 20 }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={filled ? 'currentColor' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    )
  }
}

export const PlayIcon = make(<path d="M8 4.8v14.4a.6.6 0 0 0 .92.5l11.2-7.2a.6.6 0 0 0 0-1L8.92 4.3A.6.6 0 0 0 8 4.8z" />, true)
export const PauseIcon = make(
  <>
    <rect x="6" y="4.5" width="4.2" height="15" rx="1.2" />
    <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.2" />
  </>,
  true
)
export const ResetIcon = make(
  <>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3.5 4.5v4.8h4.8" />
  </>
)
export const SkipIcon = make(
  <>
    <path d="M5 5.5v13l9.5-6.5z" />
    <path d="M18.5 5.5v13" />
  </>
)
export const RefreshIcon = make(
  <>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4.5V11h-6.5" />
  </>
)
export const ChevronLeftIcon = make(<path d="M14.5 5.5L8 12l6.5 6.5" />)
export const ChevronRightIcon = make(<path d="M9.5 5.5L16 12l-6.5 6.5" />)
export const CloseIcon = make(<path d="M6 6l12 12M18 6L6 18" />)
export const CheckIcon = make(<path d="M5 12.5l4.5 4.5L19 7.5" />)
export const GiftIcon = make(
  <>
    <path d="M4 11h16v9.5H4z" />
    <path d="M3 7.5h18V11H3z" />
    <path d="M12 7.5v13" />
    <path d="M12 7.5H8.2a2.4 2.4 0 1 1 0-4.8C11 2.7 12 7.5 12 7.5z" />
    <path d="M12 7.5h3.8a2.4 2.4 0 1 0 0-4.8C13 2.7 12 7.5 12 7.5z" />
  </>
)
export const LeafIcon = make(
  <>
    <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" />
    <path d="M5 19c3-5 6-8 10-10" />
  </>
)
export const FlameIcon = make(<path d="M12 3c.8 3.2 5 5.2 5 10a5 5 0 0 1-10 0c0-2.2 1-3.4 2.2-4.4.1 1.6.9 2.6 1.9 2.8-.5-3 .2-5.6.9-8.4z" />)
export const BoltIcon = make(<path d="M13.5 2.5L4.5 14h6.6l-1 7.5L19.5 10h-6.7z" />)
export const CalendarIcon = make(
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </>
)
export const TargetIcon = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" />
  </>
)
export const TrophyIcon = make(
  <>
    <path d="M8 4h8v5.5a4 4 0 0 1-8 0z" />
    <path d="M8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11" />
    <path d="M12 13.5V17M8.5 20.5h7M9.5 17h5" />
  </>
)

export const GearIcon = make(
  <>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03z" />
  </>
)
export const PaletteIcon = make(
  <>
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 16.9 3 12 3z" />
    <circle cx="7.5" cy="11" r="1" />
    <circle cx="10.5" cy="7.2" r="1" />
    <circle cx="15" cy="7.8" r="1" />
  </>
)

export const UserIcon = make(
  <>
    <circle cx="12" cy="8.2" r="3.6" />
    <path d="M4.8 20c.6-3.7 3.6-5.8 7.2-5.8s6.6 2.1 7.2 5.8" />
  </>
)

export const MusicIcon = make(
  <>
    <path d="M9 17.5V5.8l10.5-2.3v11.7" />
    <circle cx="6.6" cy="17.5" r="2.4" />
    <circle cx="17.1" cy="15.2" r="2.4" />
  </>
)

/** Uygulama işareti: kadran çizgileri ve tek bir akrep. */
export function Logo({ size = 28 }: IconProps) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 - 90) * (Math.PI / 180)
    const r1 = i % 3 === 0 ? 8.6 : 9.6
    return (
      <line
        key={i}
        x1={14 + r1 * Math.cos(a)}
        y1={14 + r1 * Math.sin(a)}
        x2={14 + 11.6 * Math.cos(a)}
        y2={14 + 11.6 * Math.sin(a)}
      />
    )
  })
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      {ticks}
      <path d="M14 14l3.6-5" strokeWidth="2" />
    </svg>
  )
}
