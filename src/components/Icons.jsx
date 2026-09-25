/** 统一的内联图标集，避免引入图标库依赖 */

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const Svg = ({ size = 20, children, strokeWidth, ...rest }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth={strokeWidth || base.strokeWidth} aria-hidden="true" {...rest}>
    {children}
  </svg>
)

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
)

export const IconCart = (p) => (
  <Svg {...p}>
    <path d="M3 4h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L20.5 8H6" />
    <circle cx="9.5" cy="20" r="1.4" />
    <circle cx="17.5" cy="20" r="1.4" />
  </Svg>
)

export const IconHeart = (p) => (
  <Svg {...p}>
    <path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4c0 5-7.5 9.4-7.5 9.4Z" />
  </Svg>
)

export const IconUser = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" />
  </Svg>
)

export const IconChevronLeft = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M15 5.5 8.5 12l6.5 6.5" />
  </Svg>
)

export const IconChevronRight = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M9 5.5 15.5 12 9 18.5" />
  </Svg>
)

export const IconArrowRight = (p) => (
  <Svg {...p} strokeWidth={1.9}>
    <path d="M4.5 12h15" />
    <path d="m13.5 6 6 6-6 6" />
  </Svg>
)

export const IconPlus = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Svg>
)

export const IconCheck = (p) => (
  <Svg {...p} strokeWidth={2.4}>
    <path d="m5.5 12.5 4.2 4.2L18.5 7.5" />
  </Svg>
)

export const IconStar = ({ size = 14, ...p }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M12 3.6l2.6 5.3 5.9.85-4.25 4.15 1 5.9L12 17l-5.25 2.8 1-5.9L3.5 9.75l5.9-.85z" />
  </svg>
)

export const IconTruck = (p) => (
  <Svg {...p}>
    <path d="M2.5 6.5h10.5v9H2.5z" />
    <path d="M13 9.5h4l3 3v3h-7z" />
    <circle cx="6.5" cy="17.5" r="1.6" />
    <circle cx="16.5" cy="17.5" r="1.6" />
  </Svg>
)

export const IconShield = (p) => (
  <Svg {...p}>
    <path d="M12 3 5 5.6v5.7c0 4 2.9 7.4 7 8.7 4.1-1.3 7-4.7 7-8.7V5.6z" />
    <path d="m9.2 11.8 2 2 3.6-3.8" />
  </Svg>
)

export const IconRefresh = (p) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v4.5h-4.5" />
  </Svg>
)

export const IconScissors = (p) => (
  <Svg {...p}>
    <circle cx="6.5" cy="6.5" r="2.4" />
    <circle cx="6.5" cy="17.5" r="2.4" />
    <path d="M8.7 8.2 20 18M8.7 15.8 20 6" />
  </Svg>
)

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.2V12l3.2 2" />
  </Svg>
)

export const IconTicket = (p) => (
  <Svg {...p}>
    <path d="M3.5 8.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v1.6a2 2 0 0 0 0 3.8v1.6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-1.6a2 2 0 0 0 0-3.8z" />
    <path d="M14 7v10" strokeDasharray="2 2.6" />
  </Svg>
)

export const IconMenu = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
)

export const IconClose = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const IconSpinner = ({ size = 16, ...p }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    className="spin"
    aria-hidden="true"
    {...p}
  >
    <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
  </svg>
)
