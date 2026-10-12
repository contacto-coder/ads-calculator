import type { ParsedCommissionSpec } from './commission'
import { isValidLocalDate } from './dates'
import { parseMoney, parsePercent } from './money'
import { CURRENCIES } from './types'
import type {
  CommissionModel,
  CommissionPartKey,
  CommissionSpec,
  Currency,
  FieldErrors,
  MoneyResult,
  SimulationInput,
} from './types'

export interface ParsedProperty {
  currency: Currency
  closingMinor: MoneyResult
  listingMinor: MoneyResult | null
}

function isBlank(value: string | undefined): value is undefined | '' {
  return value === undefined || value.trim() === ''
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value)
}

/** Moneda obligatoria, cierre mayor que cero y precio publicado opcional. */
export function parseProperty(input: SimulationInput, errors: FieldErrors): ParsedProperty | null {
  const currency = isCurrency(input.currency) ? input.currency : null
  if (!currency) errors.currency = 'required'

  const closing = parseMoney(input.closingPrice)
  if (!closing.ok) errors.closingPrice = closing.error
  else if (closing.value === 0) errors.closingPrice = 'mustBePositive'

  let listingMinor: MoneyResult | null = null
  if (!isBlank(input.listingPrice)) {
    const listing = parseMoney(input.listingPrice)
    if (listing.ok) listingMinor = listing.value
    else errors.listingPrice = listing.error
  }

  if (!currency || !closing.ok || closing.value === 0 || errors.listingPrice) return null
  return { currency, closingMinor: closing.value, listingMinor }
}

function parseSpec(
  key: CommissionPartKey,
  spec: CommissionSpec,
  errors: FieldErrors
): ParsedCommissionSpec | null {
  const share = parsePercent(spec.advisorSharePercent)
  if (!share.ok) errors[`${key}.advisorSharePercent`] = share.error

  if (spec.kind === 'percentage') {
    const rate = parsePercent(spec.value)
    if (!rate.ok) errors[`${key}.value`] = rate.error
    if (!rate.ok || !share.ok) return null
    return { key, kind: 'percentage', ratePercent: rate.value, share: share.value }
  }

  const fixed = parseMoney(spec.value)
  if (!fixed.ok) errors[`${key}.value`] = fixed.error
  if (!fixed.ok || !share.ok) return null
  return { key, kind: 'fixed', fixedMinor: fixed.value, share: share.value }
}

/** Solo se validan las comisiones del modelo activo. */
export function parseCommissionModel(
  model: CommissionModel,
  errors: FieldErrors
): ParsedCommissionSpec[] | null {
  if (model.kind === 'single') {
    const single = parseSpec('single', model.single, errors)
    return single ? [single] : null
  }
  const listing = parseSpec('listing', model.listing, errors)
  const selling = parseSpec('selling', model.selling, errors)
  return listing && selling ? [listing, selling] : null
}

/**
 * Disponibilidad opcional: vacío es "desconocida" (`null`) y "0" es "ninguna".
 * Si la entrada no es válida se trata como desconocida y se registra el error.
 */
export function parseAvailable(raw: string | undefined, errors: FieldErrors): MoneyResult | null {
  if (isBlank(raw)) return null
  const available = parseMoney(raw)
  if (available.ok) return available.value
  errors.availableBudget = available.error
  return null
}

export function parseStartDate(raw: string, errors: FieldErrors): string | null {
  if (raw.trim() === '') {
    errors.startDate = 'required'
    return null
  }
  if (!isValidLocalDate(raw)) {
    errors.startDate = 'invalidDate'
    return null
  }
  return raw
}
