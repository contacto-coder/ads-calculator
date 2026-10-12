import type Decimal from 'decimal.js'
import { D, percentOf, roundMinor } from './money'
import type { CommissionPart, CommissionPartKey, MoneyResult } from './types'

export type ParsedCommissionSpec = { key: CommissionPartKey; share: Decimal } & (
  | { kind: 'percentage'; ratePercent: Decimal }
  | { kind: 'fixed'; fixedMinor: MoneyResult }
)

export interface CommissionTotals {
  advisorCommissionMinor: MoneyResult
  breakdown: CommissionPart[]
}

/**
 * Comisión de una parte: bruto = precio de cierre × tasa, o el importe fijo;
 * el asesor conserva bruto × participación, redondeado a centavos. La
 * participación se aplica al bruto exacto, no al bruto ya redondeado.
 */
function computePart(spec: ParsedCommissionSpec, closingMinor: MoneyResult): CommissionPart | null {
  const gross =
    spec.kind === 'percentage' ? percentOf(closingMinor, spec.ratePercent) : new D(spec.fixedMinor)
  const grossMinor = roundMinor(gross)
  const advisorMinor = roundMinor(percentOf(gross, spec.share))
  if (grossMinor === null || advisorMinor === null) return null

  return {
    key: spec.key,
    kind: spec.kind,
    ratePercent: spec.kind === 'percentage' ? spec.ratePercent.toString() : null,
    advisorSharePercent: spec.share.toString(),
    grossMinor,
    advisorMinor,
  }
}

/**
 * Suma las partes del modelo activo. Con comisión única hay una sola parte;
 * por puntas, captación y venta se calculan y redondean por separado y no se
 * aplica ningún reparto global adicional.
 *
 * Devuelve `null` si algún importe no cabe en un entero seguro.
 */
export function computeCommission(
  specs: ParsedCommissionSpec[],
  closingMinor: MoneyResult
): CommissionTotals | null {
  const breakdown: CommissionPart[] = []
  for (const spec of specs) {
    const part = computePart(spec, closingMinor)
    if (!part) return null
    breakdown.push(part)
  }
  const advisorCommissionMinor = breakdown.reduce((sum, part) => sum + part.advisorMinor, 0)
  if (!Number.isSafeInteger(advisorCommissionMinor)) return null
  return { advisorCommissionMinor, breakdown }
}
