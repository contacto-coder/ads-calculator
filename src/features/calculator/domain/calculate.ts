import { buildPlan } from './allocation'
import { computeCommission } from './commission'
import { buildScenarios } from './scenarios'
import type {
  BudgetPlan,
  CalculationOutcome,
  FieldErrors,
  NoticeCode,
  ScenarioResult,
  SimulationInput,
} from './types'
import { parseAvailable, parseCommissionModel, parseProperty, parseStartDate } from './validation'

function collectNotices(
  commissionMinor: number,
  selected: ScenarioResult | null,
  plan: BudgetPlan | undefined
): NoticeCode[] {
  const notices: NoticeCode[] = []
  if (commissionMinor === 0) notices.push('zeroCommission')
  else if (selected && !selected.plannable) notices.push('selectedScenarioNotPlannable')
  if (selected?.exceedsAvailable) notices.push('exceedsAvailable')
  if (plan?.days.some((day) => day.amountMinor === 0)) notices.push('fragmentedPlan')
  return notices
}

/**
 * Punto de entrada del motor. Función pura y determinista: valida las
 * entradas y calcula solo con datos válidos.
 *
 * - Sin propiedad o comisión válidas no hay resultado.
 * - El plan solo existe con un escenario elegido cuyo presupuesto es mayor
 *   que cero y una fecha de inicio válida.
 */
export function calculate(input: SimulationInput): CalculationOutcome {
  const errors: FieldErrors = {}
  const property = parseProperty(input, errors)
  const specs = parseCommissionModel(input.commission, errors)
  const availableMinor = parseAvailable(input.availableBudget, errors)
  const startDate = parseStartDate(input.startDate, errors)
  if (!property || !specs) return { errors, result: null }

  const commission = computeCommission(specs, property.closingMinor)
  if (!commission) {
    errors.commission = 'unsafeAmount'
    return { errors, result: null }
  }

  const scenarios = buildScenarios(commission.advisorCommissionMinor, availableMinor)
  const selectedScenario =
    scenarios.find((scenario) => scenario.rate === input.selectedScenario) ?? null
  const selectedPlan =
    selectedScenario?.plannable && startDate
      ? buildPlan(selectedScenario.budgetMinor, startDate, selectedScenario.rate)
      : undefined

  return {
    errors,
    result: {
      currency: property.currency,
      closingPriceMinor: property.closingMinor,
      listingPriceMinor: property.listingMinor,
      advisorCommissionMinor: commission.advisorCommissionMinor,
      breakdown: commission.breakdown,
      availableMinor,
      scenarios,
      selectedScenario,
      selectedPlan,
      notices: collectNotices(commission.advisorCommissionMinor, selectedScenario, selectedPlan),
    },
  }
}
