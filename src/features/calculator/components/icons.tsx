/**
 * Iconos propios, solo donde aportan significado. Son decorativos para los
 * lectores de pantalla: el texto que los acompaña ya dice lo mismo.
 */

interface IconProps {
  className?: string
}

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const

/** Marca de la app: una casa con un signo de porcentaje. No imita ningún logo. */
export function BrandMark({ className }: IconProps) {
  return (
    <svg className={className} width="36" height="36" viewBox="0 0 32 32" aria-hidden focusable={false}>
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <g fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 15.5 16 7l9.5 8.5" />
        <path d="M9.5 14.5V24.5h13v-10" />
      </g>
      <path d="m13 22 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="13.4" cy="16.8" r="1.4" fill="#fff" />
      <circle cx="18.6" cy="21.2" r="1.4" fill="#fff" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  )
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  )
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M16 10H4M9 5l-5 5 5 5" />
    </svg>
  )
}

export function PrinterIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M6 7V3h8v4M6 14H4.5A1.5 1.5 0 0 1 3 12.5v-4A1.5 1.5 0 0 1 4.5 7h11A1.5 1.5 0 0 1 17 8.5v4a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M6 11.5h8V17H6z" />
    </svg>
  )
}
