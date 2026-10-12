import { PLAN_DAYS } from './allocation'
import { D, percentOf, roundMinor } from './money'
import { SCENARIO_RATES } from './types'
import type { MoneyResult, ScenarioRate, ScenarioResult } from './types'

function buildScenario(
  rate: ScenarioRate,
  commissionMinor: MoneyResult,
  availableMinor: MoneyResult | null
): ScenarioResult {
  // El presupuesto nunca supera la comisión, así que el redondeo es seguro.
  const budgetMinor = roundMinor(percentOf(commissionMinor, rate)) ?? 0
  const balanceMinor = commissionMinor - budgetMinor

  return {
    rate,
    budgetMinor,
    balanceMinor,
    averageDailyMinor: roundMinor(new D(budgetMinor).dividedBy(PLAN_DAYS)) ?? 0,
    conditionalReturnPercent:
      budgetMinor > 0
        ? new D(balanceMinor).dividedBy(budgetMinor).times(100).toFixed(2, D.ROUND_HALF_UP)
        : null,
    plannable: budgetMinor > 0,
    exceedsAvailable: availableMinor !== null && budgetMinor > availableMinor,
  }
}

/**
 * Escenarios del 5, 10 y 20 % de la comisión del asesor.
 *
 * `availableMinor` es `null` cuando la disponibilidad es desconocida (no avisa)
 * y `0` cuando no hay dinero disponible (avisa con cualquier presupuesto > 0).
 */
export function buildScenarios(
  commissionMinor: MoneyResult,
  availableMinor: MoneyResult | null
): ScenarioResult[] {
  return SCENARIO_RATES.map((rate) => buildScenario(rate, commissionMinor, availableMinor))
}
