import Decimal from 'decimal.js'
import type { InputErrorCode, MoneyResult } from './types'

/**
 * Constructor decimal propio: no altera la configuración global de decimal.js
 * y fija el redondeo HALF_UP que exigen las reglas de cálculo.
 */
export const D = Decimal.clone({ precision: 60, rounding: Decimal.ROUND_HALF_UP })

/** Todas las monedas del MVP usan dos decimales contables. */
export const MINOR_PER_UNIT = 100
export const MONEY_MAX_DECIMALS = 2
export const PERCENT_MAX_DECIMALS = 4

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: InputErrorCode }

const PLAIN_DECIMAL = /^\d+(?:[.,]\d+)?$/
const NOT_FINITE = /^[+-]?(?:infinity|inf|nan|∞)$/i
/** Solo dígitos con separadores o caracteres de agrupación: "1,234.56", "1 234". */
const DIGITS_WITH_GROUPING = /^\d[\d.,\s'’_]*$/
const GROUPING_CHARS = /[\s'’_]/

function fail(error: InputErrorCode): { ok: false; error: InputErrorCode } {
  return { ok: false, error }
}

function countSeparators(text: string): number {
  return text.split('').filter((char) => char === '.' || char === ',').length
}

/**
 * Normalización documentada de la entrada decimal:
 * - se ignoran espacios al inicio y al final;
 * - se acepta punto o coma como separador decimal (uno solo);
 * - no se aceptan separadores de miles, signos, exponentes ni símbolos.
 *
 * Nunca trunca: si hay más decimales de los permitidos, se rechaza.
 */
function parsePlainDecimal(
  raw: string,
  maxDecimals: number,
  threeDecimalsAreAmbiguous: boolean
): ParseResult<Decimal> {
  const text = raw.trim()
  if (text === '') return fail('required')
  if (NOT_FINITE.test(text)) return fail('notFinite')
  if (/^[-−]\s*\d/.test(text)) return fail('negative')
  if (!PLAIN_DECIMAL.test(text)) {
    const looksGrouped = countSeparators(text) > 1 || GROUPING_CHARS.test(text)
    return fail(DIGITS_WITH_GROUPING.test(text) && looksGrouped ? 'ambiguousFormat' : 'invalidFormat')
  }

  const decimals = text.split(/[.,]/)[1]?.length ?? 0
  if (decimals > maxDecimals) {
    // "1.234" en un importe puede ser mil doscientos treinta y cuatro o 1,234.
    return fail(threeDecimalsAreAmbiguous && decimals === 3 ? 'ambiguousFormat' : 'tooManyDecimals')
  }
  return { ok: true, value: new D(text.replace(',', '.')) }
}

/** Convierte un importe escrito por la persona en centavos enteros seguros. */
export function parseMoney(raw: string): ParseResult<MoneyResult> {
  const parsed = parsePlainDecimal(raw, MONEY_MAX_DECIMALS, true)
  if (!parsed.ok) return parsed
  const minor = parsed.value.times(MINOR_PER_UNIT)
  if (minor.greaterThan(Number.MAX_SAFE_INTEGER)) return fail('unsafeAmount')
  return { ok: true, value: minor.toNumber() }
}

/** Convierte un porcentaje entre 0 y 100 con hasta cuatro decimales. */
export function parsePercent(raw: string): ParseResult<Decimal> {
  const parsed = parsePlainDecimal(raw, PERCENT_MAX_DECIMALS, false)
  if (!parsed.ok) return parsed
  if (parsed.value.greaterThan(100)) return fail('outOfRange')
  return parsed
}

/**
 * Redondea HALF_UP a centavos enteros. Devuelve `null` si el resultado no
 * cabe en un entero seguro de JavaScript.
 */
export function roundMinor(amountMinor: Decimal): MoneyResult | null {
  const rounded = amountMinor.toDecimalPlaces(0, D.ROUND_HALF_UP)
  if (rounded.isNegative() && !rounded.isZero()) return null
  if (rounded.greaterThan(Number.MAX_SAFE_INTEGER)) return null
  return rounded.toNumber()
}

/** `percent` % de un importe en centavos, sin redondear. */
export function percentOf(amountMinor: Decimal | number, percent: Decimal | number): Decimal {
  return new D(amountMinor).times(percent).dividedBy(100)
}

export function isSafeMinor(value: unknown): value is MoneyResult {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
