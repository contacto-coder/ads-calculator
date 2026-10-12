import { describe, expect, it } from 'vitest'
import {
  PLAN_DAYS,
  STAGE_DAYS,
  STAGE_WEIGHTS,
  allocateDays,
  allocateStages,
  buildPlan,
} from './allocation'

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

/** Generador determinista: los casos son siempre los mismos en cada ejecución. */
function createRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

describe('allocateStages', () => {
  // Aceptación 7
  it('reparte 25000 centavos en 10/20/30/40', () => {
    expect(allocateStages(25000)).toEqual([2500, 5000, 7500, 10000])
  })

  // Aceptación 8
  it('entrega el centavo sobrante a la mayor fracción', () => {
    expect(allocateStages(101)).toEqual([10, 20, 30, 41])
    expect(allocateStages(3)).toEqual([0, 1, 1, 1])
  })

  it('desempata por índice de etapa ascendente', () => {
    expect(allocateStages(5)).toEqual([1, 1, 1, 2])
  })

  it('acepta cero y rechaza valores que no son centavos enteros', () => {
    expect(allocateStages(0)).toEqual([0, 0, 0, 0])
    expect(() => allocateStages(-1)).toThrow(RangeError)
    expect(() => allocateStages(10.5)).toThrow(RangeError)
    expect(() => allocateStages(Number.NaN)).toThrow(RangeError)
  })
})

describe('allocateDays', () => {
  it('da un centavo más a los primeros días hasta agotar el sobrante', () => {
    expect(allocateDays(2500, 7)).toEqual([358, 357, 357, 357, 357, 357, 357])
    expect(allocateDays(5000, 7)).toEqual([715, 715, 714, 714, 714, 714, 714])
    expect(allocateDays(7500, 7)).toEqual([1072, 1072, 1072, 1071, 1071, 1071, 1071])
    expect(allocateDays(10000, 9)).toEqual([1112, 1111, 1111, 1111, 1111, 1111, 1111, 1111, 1111])
  })

  it('permite días con importe cero', () => {
    expect(allocateDays(3, 7)).toEqual([1, 1, 1, 0, 0, 0, 0])
    expect(allocateDays(0, 9)).toEqual(Array(9).fill(0))
  })
})

describe('buildPlan', () => {
  // Aceptación 7: ejemplo principal de docs/REGLAS_CALCULO.md
  it('genera el plan del ejemplo de 250.00', () => {
    const plan = buildPlan(25000, '2026-10-12', 5)

    expect(plan.stages.map((stage) => stage.totalMinor)).toEqual([2500, 5000, 7500, 10000])
    expect(plan.stages.map((stage) => stage.averageDailyMinor)).toEqual([357, 714, 1071, 1111])
    expect(plan.stages.map((stage) => stage.dayCount)).toEqual([7, 7, 7, 9])
    expect(plan.days).toHaveLength(30)
    expect(sum(plan.days.map((day) => day.amountMinor))).toBe(25000)

    const amountsOf = (stageIndex: number) =>
      plan.days.filter((day) => day.stageIndex === stageIndex).map((day) => day.amountMinor)
    expect(amountsOf(0)).toEqual([358, 357, 357, 357, 357, 357, 357])
    expect(amountsOf(1)).toEqual([715, 715, 714, 714, 714, 714, 714])
    expect(amountsOf(2)).toEqual([1072, 1072, 1072, 1071, 1071, 1071, 1071])
    expect(amountsOf(3)).toEqual([1112, 1111, 1111, 1111, 1111, 1111, 1111, 1111, 1111])
  })

  it('numera los días del 1 al 30 con etapas inclusivas, sin huecos ni solapamientos', () => {
    const plan = buildPlan(25000, '2026-10-12', 5)

    expect(plan.days.map((day) => day.dayNumber)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1)
    )
    expect(plan.stages.map((stage) => [stage.startDate, stage.endDate])).toEqual([
      ['2026-10-12', '2026-10-18'],
      ['2026-10-19', '2026-10-25'],
      ['2026-10-26', '2026-11-01'],
      ['2026-11-02', '2026-11-10'],
    ])
    expect(plan.stages.map((stage) => stage.firstDayNumber)).toEqual([1, 8, 15, 22])
    expect(plan.startDate).toBe('2026-10-12')
    expect(plan.endDate).toBe('2026-11-10')
    expect(plan.days[29].date).toBe('2026-11-10')
    expect(new Set(plan.days.map((day) => day.date)).size).toBe(30)
  })

  // Aceptación 9
  it('conserva sumas exactas y pesos en presupuestos pequeños, medianos y grandes', () => {
    const random = createRandom(20261012)
    const budgets = [
      ...Array.from({ length: 1201 }, (_, index) => index),
      ...Array.from({ length: 400 }, () => Math.floor(random() * 5_000_000)),
      ...Array.from({ length: 200 }, () => Math.floor(random() * Number.MAX_SAFE_INTEGER)),
      Number.MAX_SAFE_INTEGER,
    ]

    for (const budget of budgets) {
      const stages = allocateStages(budget)
      expect(sum(stages)).toBe(budget)

      stages.forEach((stage, index) => {
        expect(Number.isSafeInteger(stage)).toBe(true)
        expect(stage).toBeGreaterThanOrEqual(0)
        // Diferencia con la cuota exacta menor a un centavo, comparada con
        // enteros para no depender de coma flotante: |100·etapa − peso·total| < 100
        const scaledDifference = BigInt(stage) * BigInt(100) - BigInt(budget) * BigInt(STAGE_WEIGHTS[index])
        expect(scaledDifference < BigInt(100) && scaledDifference > BigInt(-100)).toBe(true)

        const days = allocateDays(stage, STAGE_DAYS[index])
        expect(days).toHaveLength(STAGE_DAYS[index])
        expect(sum(days)).toBe(stage)
        expect(days.every((day) => Number.isSafeInteger(day) && day >= 0)).toBe(true)
        expect(Math.max(...days) - Math.min(...days)).toBeLessThanOrEqual(1)
      })
    }
  })

  it('el plan completo suma el presupuesto exacto con cifras pequeñas', () => {
    for (let budget = 1; budget <= 400; budget += 1) {
      const plan = buildPlan(budget, '2028-02-10', 10)
      expect(plan.days).toHaveLength(PLAN_DAYS)
      expect(sum(plan.days.map((day) => day.amountMinor))).toBe(budget)
      expect(sum(plan.stages.map((stage) => stage.totalMinor))).toBe(budget)
    }
  })
})
