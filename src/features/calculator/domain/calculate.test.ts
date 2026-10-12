import { describe, expect, it } from 'vitest'
import { calculate } from './calculate'
import type { CommissionModel, CommissionSpec, SimulationInput } from './types'

function spec(
  kind: CommissionSpec['kind'],
  value: string,
  advisorSharePercent: string
): CommissionSpec {
  return { kind, value, advisorSharePercent }
}

function single(value: string, share: string, kind: CommissionSpec['kind'] = 'percentage') {
  return { kind: 'single', single: spec(kind, value, share) } satisfies CommissionModel
}

function split(listing: CommissionSpec, selling: CommissionSpec) {
  return { kind: 'split', listing, selling } satisfies CommissionModel
}

function input(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    currency: 'USD',
    closingPrice: '200000',
    commission: single('5', '50'),
    selectedScenario: null,
    startDate: '2026-10-12',
    ...overrides,
  }
}

function resultOf(overrides: Partial<SimulationInput> = {}) {
  const outcome = calculate(input(overrides))
  if (!outcome.result) {
    throw new Error(`Se esperaba un resultado. Errores: ${JSON.stringify(outcome.errors)}`)
  }
  return outcome.result
}

describe('comisión', () => {
  // Aceptación 1
  it('única: cierre 200000, tasa 5 %, participación 50 % => 500000 centavos', () => {
    const result = resultOf()
    expect(result.advisorCommissionMinor).toBe(500000)
    expect(result.breakdown).toEqual([
      {
        key: 'single',
        kind: 'percentage',
        ratePercent: '5',
        advisorSharePercent: '50',
        grossMinor: 1000000,
        advisorMinor: 500000,
      },
    ])
  })

  // Aceptación 2
  it('puntas: captación 2 % al 0 % + venta 3 % al 50 % => 300000 centavos', () => {
    const result = resultOf({
      commission: split(spec('percentage', '2', '0'), spec('percentage', '3', '50')),
    })
    expect(result.advisorCommissionMinor).toBe(300000)
    expect(result.breakdown.map((part) => [part.key, part.grossMinor, part.advisorMinor])).toEqual([
      ['listing', 400000, 0],
      ['selling', 600000, 300000],
    ])
  })

  // Aceptación 3
  it('ambas puntas al 100 %: 2 % + 3 % => 1000000 centavos', () => {
    const result = resultOf({
      commission: split(spec('percentage', '2', '100'), spec('percentage', '3', '100')),
    })
    expect(result.advisorCommissionMinor).toBe(1000000)
  })

  // Aceptación 4
  it('fija: 1200 con participación 25 % => 30000 centavos', () => {
    const result = resultOf({ commission: single('1200', '25', 'fixed') })
    expect(result.advisorCommissionMinor).toBe(30000)
    expect(result.breakdown[0]).toMatchObject({ kind: 'fixed', ratePercent: null, grossMinor: 120000 })
  })

  it('la comisión fija no depende del precio de cierre', () => {
    const base = resultOf({ commission: single('1200', '25', 'fixed') })
    const other = resultOf({ closingPrice: '999999.99', commission: single('1200', '25', 'fixed') })
    expect(other.advisorCommissionMinor).toBe(base.advisorCommissionMinor)
  })

  // Aceptación 13
  it('decimales: cierre 100.01, comisión 2.5 %, participación 50 % => 125 centavos', () => {
    const result = resultOf({ closingPrice: '100.01', commission: single('2.5', '50') })
    expect(result.advisorCommissionMinor).toBe(125)
    // El bruto exacto es 2.50025: se muestra 2.50 pero la participación usa el exacto.
    expect(result.breakdown[0].grossMinor).toBe(250)
  })

  it('redondea HALF_UP cada punta por separado antes de sumar', () => {
    // Cada punta: 0.01 × 50 % = 0.005 => 1 centavo. Sumadas: 2, no 1.
    const result = resultOf({
      closingPrice: '1',
      commission: split(spec('percentage', '1', '50'), spec('percentage', '1', '50')),
    })
    expect(result.breakdown.map((part) => part.advisorMinor)).toEqual([1, 1])
    expect(result.advisorCommissionMinor).toBe(2)
  })

  it('acepta coma decimal en las entradas', () => {
    const result = resultOf({ closingPrice: '100,01', commission: single('2,5', '50') })
    expect(result.advisorCommissionMinor).toBe(125)
  })

  it('una participación de cero es válida', () => {
    const result = resultOf({ commission: single('5', '0') })
    expect(result.advisorCommissionMinor).toBe(0)
  })
})

describe('escenarios', () => {
  // Aceptación 6 y ejemplo principal de docs/REGLAS_CALCULO.md
  it('comisión 500000 centavos => presupuestos, saldos, promedios y retornos', () => {
    const { scenarios } = resultOf()
    expect(scenarios.map((scenario) => scenario.rate)).toEqual([5, 10, 20])
    expect(scenarios.map((scenario) => scenario.budgetMinor)).toEqual([25000, 50000, 100000])
    expect(scenarios.map((scenario) => scenario.balanceMinor)).toEqual([475000, 450000, 400000])
    expect(scenarios.map((scenario) => scenario.averageDailyMinor)).toEqual([833, 1667, 3333])
    expect(scenarios.map((scenario) => scenario.conditionalReturnPercent)).toEqual([
      '1900.00',
      '900.00',
      '400.00',
    ])
    expect(scenarios.every((scenario) => scenario.plannable)).toBe(true)
  })

  it('redondea el presupuesto HALF_UP y el saldo conserva la suma', () => {
    // Comisión 0.50: 5 % = 2.5 centavos => 3; 10 % = 5; 20 % = 10
    const { scenarios, advisorCommissionMinor } = resultOf({
      commission: single('0.50', '100', 'fixed'),
    })
    expect(advisorCommissionMinor).toBe(50)
    expect(scenarios.map((scenario) => scenario.budgetMinor)).toEqual([3, 5, 10])
    scenarios.forEach((scenario) => {
      expect(scenario.budgetMinor + scenario.balanceMinor).toBe(50)
    })
  })

  it('no selecciona ningún escenario por defecto', () => {
    const result = resultOf()
    expect(result.selectedScenario).toBeNull()
    expect(result.selectedPlan).toBeUndefined()
  })

  // Aceptación 11
  it('comisión cero: sin división por cero y plan bloqueado', () => {
    const result = resultOf({ commission: single('5', '0'), selectedScenario: 10 })
    expect(result.scenarios.map((scenario) => scenario.budgetMinor)).toEqual([0, 0, 0])
    expect(result.scenarios.map((scenario) => scenario.conditionalReturnPercent)).toEqual([
      null,
      null,
      null,
    ])
    expect(result.scenarios.every((scenario) => !scenario.plannable)).toBe(true)
    expect(result.selectedPlan).toBeUndefined()
    expect(result.notices).toEqual(['zeroCommission'])
    expect(JSON.stringify(result)).not.toMatch(/Infinity|NaN/)
  })

  it('presupuesto que redondea a cero: escenario no planificable y plan bloqueado', () => {
    // Comisión de 4 centavos: 5 % = 0.2 => 0; 10 % = 0.4 => 0; 20 % = 0.8 => 1
    const result = resultOf({ commission: single('0.04', '100', 'fixed'), selectedScenario: 5 })
    expect(result.scenarios.map((scenario) => scenario.budgetMinor)).toEqual([0, 0, 1])
    expect(result.scenarios.map((scenario) => scenario.plannable)).toEqual([false, false, true])
    expect(result.selectedPlan).toBeUndefined()
    expect(result.notices).toEqual(['selectedScenarioNotPlannable'])
  })

  it('un día con importe cero es válido y se avisa de la fragmentación', () => {
    const result = resultOf({ commission: single('0.04', '100', 'fixed'), selectedScenario: 20 })
    expect(result.selectedPlan?.budgetMinor).toBe(1)
    expect(result.selectedPlan?.days.filter((day) => day.amountMinor === 0)).toHaveLength(29)
    expect(result.notices).toEqual(['fragmentedPlan'])
  })
})

describe('disponibilidad', () => {
  const exceeds = (availableBudget: string | undefined) =>
    resultOf({ availableBudget }).scenarios.map((scenario) => scenario.exceedsAvailable)

  // Aceptación 12
  it('vacía es desconocida y no avisa', () => {
    expect(resultOf({ availableBudget: undefined }).availableMinor).toBeNull()
    expect(exceeds(undefined)).toEqual([false, false, false])
    expect(exceeds('')).toEqual([false, false, false])
    expect(exceeds('   ')).toEqual([false, false, false])
  })

  it('cero avisa con cualquier presupuesto positivo', () => {
    expect(resultOf({ availableBudget: '0' }).availableMinor).toBe(0)
    expect(exceeds('0')).toEqual([true, true, true])
  })

  it('la igualdad no avisa; un centavo menos sí', () => {
    expect(exceeds('500')).toEqual([false, false, true])
    expect(exceeds('499.99')).toEqual([false, true, true])
    expect(exceeds('250.00')).toEqual([false, true, true])
    expect(exceeds('249.99')).toEqual([true, true, true])
  })

  it('cero no avisa si el presupuesto también es cero', () => {
    const result = resultOf({ availableBudget: '0', commission: single('5', '0') })
    expect(result.scenarios.map((scenario) => scenario.exceedsAvailable)).toEqual([
      false,
      false,
      false,
    ])
  })

  it('el aviso de exceso sigue al escenario elegido', () => {
    expect(resultOf({ availableBudget: '300', selectedScenario: 5 }).notices).toEqual([])
    expect(resultOf({ availableBudget: '300', selectedScenario: 10 }).notices).toEqual([
      'exceedsAvailable',
    ])
  })
})

describe('plan del escenario elegido', () => {
  it('se genera con escenario, presupuesto positivo y fecha válida', () => {
    const result = resultOf({ selectedScenario: 5 })
    expect(result.selectedScenario?.rate).toBe(5)
    expect(result.selectedPlan?.budgetMinor).toBe(25000)
    expect(result.selectedPlan?.stages.map((stage) => stage.totalMinor)).toEqual([
      2500, 5000, 7500, 10000,
    ])
    expect(result.selectedPlan?.endDate).toBe('2026-11-10')
  })

  it('una fecha inválida bloquea el plan pero no la comisión', () => {
    const outcome = calculate(input({ selectedScenario: 5, startDate: '2026-02-30' }))
    expect(outcome.errors).toEqual({ startDate: 'invalidDate' })
    expect(outcome.result?.advisorCommissionMinor).toBe(500000)
    expect(outcome.result?.selectedPlan).toBeUndefined()
  })
})

describe('validación de entradas', () => {
  const errorsOf = (overrides: Partial<SimulationInput>) => calculate(input(overrides)).errors

  it('exige moneda, precio de cierre mayor que cero y fecha', () => {
    const outcome = calculate(input({ currency: null, closingPrice: '0', startDate: '' }))
    expect(outcome.result).toBeNull()
    expect(outcome.errors).toEqual({
      currency: 'required',
      closingPrice: 'mustBePositive',
      startDate: 'required',
    })
  })

  // Aceptación 14
  it('rechaza negativos, no finitos, porcentaje > 100, ambiguos y fuera de precisión', () => {
    expect(errorsOf({ closingPrice: '-200000' })).toEqual({ closingPrice: 'negative' })
    expect(errorsOf({ closingPrice: 'Infinity' })).toEqual({ closingPrice: 'notFinite' })
    expect(errorsOf({ closingPrice: 'NaN' })).toEqual({ closingPrice: 'notFinite' })
    expect(errorsOf({ closingPrice: '200,000.00' })).toEqual({ closingPrice: 'ambiguousFormat' })
    expect(errorsOf({ closingPrice: '200.000' })).toEqual({ closingPrice: 'ambiguousFormat' })
    expect(errorsOf({ closingPrice: '90071992547409.92' })).toEqual({ closingPrice: 'unsafeAmount' })
    expect(errorsOf({ commission: single('101', '50') })).toEqual({ 'single.value': 'outOfRange' })
    expect(errorsOf({ commission: single('5', '100.5') })).toEqual({
      'single.advisorSharePercent': 'outOfRange',
    })
    expect(errorsOf({ availableBudget: '-1' })).toEqual({ availableBudget: 'negative' })
    expect(errorsOf({ listingPrice: '1e6' })).toEqual({ listingPrice: 'invalidFormat' })
  })

  it('no calcula con entradas inválidas', () => {
    expect(calculate(input({ closingPrice: 'abc' })).result).toBeNull()
    expect(calculate(input({ commission: single('', '50') })).result).toBeNull()
    expect(calculate(input({ commission: single('5', '') })).errors).toEqual({
      'single.advisorSharePercent': 'required',
    })
  })

  it('el precio publicado es opcional', () => {
    expect(resultOf({ listingPrice: undefined }).listingPriceMinor).toBeNull()
    expect(resultOf({ listingPrice: '210000' }).listingPriceMinor).toBe(21000000)
  })

  it('señala la suma de puntas que supera la precisión segura', () => {
    const outcome = calculate(
      input({
        closingPrice: '90071992547409.91',
        commission: split(spec('percentage', '100', '100'), spec('percentage', '100', '100')),
      })
    )
    expect(outcome.result).toBeNull()
    expect(outcome.errors).toEqual({ commission: 'unsafeAmount' })
  })

  it('es determinista: la misma entrada produce el mismo resultado', () => {
    const data = input({ selectedScenario: 20, availableBudget: '100' })
    expect(calculate(data)).toEqual(calculate(data))
  })
})
