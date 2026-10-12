import { parseLocalDate } from './domain/dates'
import { MINOR_PER_UNIT } from './domain/money'
import type { Currency } from './domain/types'

/**
 * Formato visual. Intl se usa solo para mostrar resultados: las entradas se
 * interpretan en el dominio, nunca aquí.
 */

export const FALLBACK_LOCALE = 'es-MX'
const NBSP = ' '

export interface Formatters {
  locale: string
  /** Importe exacto con el código de moneda siempre visible: "USD 5,000.00". */
  money(minor: number, currency: Currency): string
  /** Porcentaje escrito por la persona o normalizado: "2,5" => "2.5 %". */
  percent(value: string): string
  /** Porcentaje con decimales fijos: "1900.00" => "1,900.00 %". */
  fixedPercent(value: string, decimals: number): string
  /** "12 oct 2026" */
  date(isoDate: string): string
  /** "lun, 12 oct 2026" */
  weekdayDate(isoDate: string): string
  /** Hora local de un instante ISO: "11:42". */
  time(isoInstant: string): string
}

/** Formato regional en español del dispositivo; si no lo hay, es-MX. */
export function resolveDisplayLocale(language: string | undefined): string {
  if (!language || !/^es(?:-|$)/i.test(language)) return FALLBACK_LOCALE
  try {
    return Intl.NumberFormat.supportedLocalesOf(language)[0] ?? FALLBACK_LOCALE
  } catch {
    return FALLBACK_LOCALE
  }
}

function toNumber(value: string): number {
  return Number(value.trim().replace(',', '.'))
}

function createMoneyFormatter(locale: string) {
  const cache = new Map<Currency, Intl.NumberFormat>()
  return (minor: number, currency: Currency): string => {
    let formatter = cache.get(currency)
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'code',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      cache.set(currency, formatter)
    }
    // Se formatea la parte entera y se insertan los centavos exactos, para no
    // pasar por una división en coma flotante con importes muy grandes.
    const cents = minor % MINOR_PER_UNIT
    const units = (minor - cents) / MINOR_PER_UNIT
    return formatter
      .formatToParts(units)
      .map((part) => (part.type === 'fraction' ? String(cents).padStart(2, '0') : part.value))
      .join('')
  }
}

export function createFormatters(locale: string): Formatters {
  const percentFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 })
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  // El día de la semana se formatea aparte: el patrón combinado de algunas
  // regiones ("lun, 12 de oct de 2026") es demasiado largo para el calendario.
  const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const timeFormat = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })

  const formatDate = (format: Intl.DateTimeFormat, isoDate: string): string => {
    const date = parseLocalDate(isoDate)
    return date ? format.format(date) : isoDate
  }

  return {
    locale,
    money: createMoneyFormatter(locale),
    percent(value) {
      const number = toNumber(value)
      return Number.isFinite(number) ? `${percentFormat.format(number)}${NBSP}%` : value
    },
    fixedPercent(value, decimals) {
      const number = toNumber(value)
      if (!Number.isFinite(number)) return value
      const format = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
      return `${format.format(number)}${NBSP}%`
    },
    date: (isoDate) => formatDate(dateFormat, isoDate),
    weekdayDate(isoDate) {
      const date = parseLocalDate(isoDate)
      return date ? `${weekdayFormat.format(date)}, ${dateFormat.format(date)}` : isoDate
    },
    time(isoInstant) {
      const instant = new Date(isoInstant)
      return Number.isNaN(instant.getTime()) ? '' : timeFormat.format(instant)
    },
  }
}
