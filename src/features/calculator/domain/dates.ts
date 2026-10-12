import { addDays, format, isValid, parse } from 'date-fns'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ISO_FORMAT = 'yyyy-MM-dd'
/** Fecha de referencia fija para que el parseo sea determinista. */
const REFERENCE = new Date(2000, 0, 1)

/**
 * Interpreta YYYY-MM-DD como fecha local del calendario. No usa `new Date(str)`
 * porque esa forma interpreta la fecha en UTC y puede retroceder un día.
 */
export function parseLocalDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null
  const date = parse(value, ISO_FORMAT, REFERENCE)
  if (!isValid(date) || format(date, ISO_FORMAT) !== value) return null
  return date
}

export function isValidLocalDate(value: string): boolean {
  return parseLocalDate(value) !== null
}

export function toLocalISODate(date: Date): string {
  return format(date, ISO_FORMAT)
}

/**
 * Suma días de calendario (no bloques de 24 horas), así un cambio de horario
 * no pierde ni repite días.
 */
export function addCalendarDays(isoDate: string, days: number): string {
  const date = parseLocalDate(isoDate)
  if (!date) throw new RangeError(`Fecha inválida: ${isoDate}`)
  return toLocalISODate(addDays(date, days))
}
