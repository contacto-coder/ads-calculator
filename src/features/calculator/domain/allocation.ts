import { addCalendarDays } from './dates'
import { D, isSafeMinor, roundMinor } from './money'
import type { BudgetPlan, MoneyResult, PlanDay, PlanStage, ScenarioRate } from './types'

export const STAGE_WEIGHTS = [10, 20, 30, 40] as const
export const STAGE_DAYS = [7, 7, 7, 9] as const
export const PLAN_DAYS = 30

function assertMinor(value: number, name: string): void {
  if (!isSafeMinor(value)) {
    throw new RangeError(`${name} debe ser un entero de centavos no negativo`)
  }
}

/**
 * Reparte el presupuesto entre las etapas con el método del mayor resto:
 * cada etapa recibe la parte entera de su cuota y los centavos sobrantes van
 * a las fracciones más altas; los empates los gana la etapa de menor índice.
 */
export function allocateStages(budgetMinor: MoneyResult): MoneyResult[] {
  assertMinor(budgetMinor, 'El presupuesto')
  const quotas = STAGE_WEIGHTS.map((weight) => new D(budgetMinor).times(weight).dividedBy(100))
  const amounts = quotas.map((quota) => quota.floor().toNumber())
  const assigned = amounts.reduce((sum, amount) => sum + amount, 0)

  const byRemainder = quotas
    .map((quota, index) => ({ index, fraction: quota.minus(quota.floor()) }))
    .sort((a, b) => b.fraction.comparedTo(a.fraction) || a.index - b.index)

  for (let i = 0; i < budgetMinor - assigned; i += 1) {
    const stage = byRemainder[i % byRemainder.length]
    amounts[stage.index] += 1
  }
  return amounts
}

/**
 * Divide el importe de una etapa entre sus días: los primeros `sobrante` días
 * reciben un centavo más, de modo que la suma es exacta.
 */
export function allocateDays(stageMinor: MoneyResult, dayCount: number): MoneyResult[] {
  assertMinor(stageMinor, 'El importe de la etapa')
  if (!Number.isInteger(dayCount) || dayCount <= 0) {
    throw new RangeError('La etapa debe tener al menos un día')
  }
  const base = Math.floor(stageMinor / dayCount)
  const extra = stageMinor % dayCount
  return Array.from({ length: dayCount }, (_, day) => (day < extra ? base + 1 : base))
}

/** Plan de 30 días: cuatro etapas inclusivas, sin huecos ni solapamientos. */
export function buildPlan(
  budgetMinor: MoneyResult,
  startDate: string,
  rate: ScenarioRate
): BudgetPlan {
  const stageTotals = allocateStages(budgetMinor)
  const stages: PlanStage[] = []
  const days: PlanDay[] = []
  let offset = 0

  stageTotals.forEach((totalMinor, index) => {
    const dayCount = STAGE_DAYS[index]
    allocateDays(totalMinor, dayCount).forEach((amountMinor, day) => {
      days.push({
        dayNumber: offset + day + 1,
        date: addCalendarDays(startDate, offset + day),
        stageIndex: index,
        amountMinor,
      })
    })
    stages.push({
      index,
      weightPercent: STAGE_WEIGHTS[index],
      dayCount,
      firstDayNumber: offset + 1,
      startDate: addCalendarDays(startDate, offset),
      endDate: addCalendarDays(startDate, offset + dayCount - 1),
      totalMinor,
      averageDailyMinor: roundMinor(new D(totalMinor).dividedBy(dayCount)) ?? 0,
    })
    offset += dayCount
  })

  return {
    rate,
    budgetMinor,
    startDate,
    endDate: addCalendarDays(startDate, PLAN_DAYS - 1),
    stages,
    days,
  }
}
