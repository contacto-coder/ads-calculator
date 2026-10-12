import { describe, expect, it } from 'vitest'
import { createEmptyForm } from '../domain/form'
import type { SimulationForm } from '../domain/form'
import type { LoadResult, SavedSimulation } from '../storage/simulationStorage'
import {
  calculatorReducer,
  createInitialState,
  deriveCalculator,
  stepFieldOrder,
  visibleError,
} from './calculatorState'
import type { CalculatorAction, CalculatorState } from './calculatorState'

const TODAY = '2026-10-12'

function validForm(overrides: Partial<SimulationForm> = {}): SimulationForm {
  return {
    ...createEmptyForm(TODAY),
    currency: 'USD',
    closingPrice: '200000',
    single: { kind: 'percentage', percentage: '5', fixed: '', advisorSharePercent: '50' },
    ...overrides,
  }
}

function loaded(input: SimulationForm, progress: SavedSimulation['progress']): LoadResult {
  return {
    status: 'loaded',
    saved: {
      schemaVersion: 1,
      calculationVersion: 1,
      savedAt: '2026-10-12T18:30:00.000Z',
      input,
      progress,
    },
  }
}

function run(state: CalculatorState, ...actions: CalculatorAction[]): CalculatorState {
  return actions.reduce(calculatorReducer, state)
}

const fresh = () => createInitialState(TODAY, { status: 'empty' })

describe('estado inicial', () => {
  it('empieza en el paso 1, sin escenario elegido y con la fecha de hoy', () => {
    const state = fresh()
    expect(state.step).toBe(1)
    expect(state.form.selectedScenario).toBeNull()
    expect(state.form.startDate).toBe(TODAY)
    expect(deriveCalculator(state).pristine).toBe(true)
  })

  it('marca el aviso de datos dañados o de almacenamiento no disponible', () => {
    expect(createInitialState(TODAY, { status: 'corrupt' }).corruptStorageNotice).toBe(true)
    expect(createInitialState(TODAY, { status: 'unavailable' }).storageUnavailable).toBe(true)
  })

  it('restaura la simulación guardada en su paso', () => {
    const state = createInitialState(
      TODAY,
      loaded(validForm({ selectedScenario: 5 }), { step: 5, excessAcceptance: null })
    )
    expect(state.step).toBe(5)
    expect(state.restoredAt).toBe('2026-10-12T18:30:00.000Z')
    expect(deriveCalculator(state).outcome.result?.selectedPlan?.budgetMinor).toBe(25000)
  })

  it('si lo guardado no permite llegar a ese paso, vuelve al primero inválido y muestra errores', () => {
    const state = createInitialState(
      TODAY,
      loaded(validForm({ closingPrice: '' }), { step: 5, excessAcceptance: null })
    )
    expect(state.step).toBe(1)
    expect(visibleError(state, deriveCalculator(state), 'closingPrice')).toBe('required')
  })

  it('descarta una aceptación guardada que ya no corresponde a los importes', () => {
    const form = validForm({ availableBudget: '300', selectedScenario: 10 })
    const stale = createInitialState(
      TODAY,
      loaded(form, { step: 4, excessAcceptance: { budgetMinor: 1, availableMinor: 30000 } })
    )
    expect(stale.excessAcceptance).toBeNull()

    const current = createInitialState(
      TODAY,
      loaded(form, { step: 4, excessAcceptance: { budgetMinor: 50000, availableMinor: 30000 } })
    )
    expect(current.excessAcceptance).toEqual({ budgetMinor: 50000, availableMinor: 30000 })
    expect(deriveCalculator(current).excessAccepted).toBe(true)
  })
})

describe('navegación entre pasos', () => {
  it('no avanza con errores y los hace visibles', () => {
    const state = run(fresh(), { type: 'next' })
    expect(state.step).toBe(1)
    const derived = deriveCalculator(state)
    expect(visibleError(state, derived, 'currency')).toBe('required')
    expect(visibleError(state, derived, 'closingPrice')).toBe('required')
  })

  it('oculta los errores de un campo hasta que se toca o se intenta continuar', () => {
    const state = fresh()
    expect(visibleError(state, deriveCalculator(state), 'closingPrice')).toBeUndefined()
    const touched = run(state, { type: 'touch', field: 'closingPrice' })
    expect(visibleError(touched, deriveCalculator(touched), 'closingPrice')).toBe('required')
    expect(visibleError(touched, deriveCalculator(touched), 'currency')).toBeUndefined()
  })

  it('avanza y retrocede sin perder datos', () => {
    const start = { ...fresh(), form: validForm() }
    const atThree = run(start, { type: 'next' }, { type: 'next' })
    expect(atThree.step).toBe(3)
    const back = run(atThree, { type: 'back' }, { type: 'back' }, { type: 'back' })
    expect(back.step).toBe(1)
    expect(back.form).toEqual(validForm())
  })

  it('solo permite saltar a pasos cuyos anteriores son válidos', () => {
    const start = { ...fresh(), form: validForm() }
    expect(deriveCalculator(start).maxReachableStep).toBe(4)
    expect(run(start, { type: 'goToStep', step: 4 }).step).toBe(4)
    expect(run(start, { type: 'goToStep', step: 5 }).step).toBe(1)

    const withScenario = run(start, { type: 'selectScenario', rate: 10 })
    expect(deriveCalculator(withScenario).maxReachableStep).toBe(5)
    expect(run(withScenario, { type: 'goToStep', step: 5 }).step).toBe(5)
  })

  it('no pasa del último paso ni baja del primero', () => {
    const atFive = { ...fresh(), form: validForm({ selectedScenario: 5 }), step: 5 as const }
    expect(run(atFive, { type: 'next' }).step).toBe(5)
    expect(run(fresh(), { type: 'back' }).step).toBe(1)
  })

  it('ordena los campos de cada paso según el modelo de comisión activo', () => {
    expect(stepFieldOrder(2, validForm())).toEqual([
      'single.value',
      'single.advisorSharePercent',
      'commission',
    ])
    expect(stepFieldOrder(2, validForm({ commissionModel: 'split' }))).toEqual([
      'listing.value',
      'listing.advisorSharePercent',
      'selling.value',
      'selling.advisorSharePercent',
      'commission',
    ])
  })
})

describe('paso de escenarios', () => {
  const atScenarios = (overrides: Partial<SimulationForm> = {}): CalculatorState => ({
    ...fresh(),
    form: validForm(overrides),
    step: 4,
  })

  it('exige elegir un escenario', () => {
    const state = run(atScenarios(), { type: 'next' })
    expect(state.step).toBe(4)
    expect(deriveCalculator(state).stepErrors[4]).toEqual({ selectedScenario: 'scenarioRequired' })
  })

  it('bloquea el plan con comisión cero o presupuesto que redondea a cero', () => {
    const zero = atScenarios({
      single: { kind: 'percentage', percentage: '5', fixed: '', advisorSharePercent: '0' },
      selectedScenario: 10,
    })
    expect(deriveCalculator(zero).stepErrors[4]).toEqual({ selectedScenario: 'zeroCommission' })
    expect(run(zero, { type: 'next' }).step).toBe(4)

    const tiny = atScenarios({
      single: { kind: 'fixed', percentage: '', fixed: '0.04', advisorSharePercent: '100' },
      selectedScenario: 5,
    })
    expect(deriveCalculator(tiny).stepErrors[4]).toEqual({ selectedScenario: 'scenarioNotPlannable' })
  })

  it('con exceso exige aceptación y la liga a los importes exactos', () => {
    const exceeding = run(atScenarios({ availableBudget: '300' }), { type: 'selectScenario', rate: 10 })
    expect(deriveCalculator(exceeding).currentExcess).toEqual({ budgetMinor: 50000, availableMinor: 30000 })
    expect(run(exceeding, { type: 'next' }).step).toBe(4)

    const accepted = run(exceeding, { type: 'setExcessAccepted', accepted: true })
    expect(accepted.excessAcceptance).toEqual({ budgetMinor: 50000, availableMinor: 30000 })
    expect(run(accepted, { type: 'next' }).step).toBe(5)

    const withdrawn = run(accepted, { type: 'setExcessAccepted', accepted: false })
    expect(withdrawn.excessAcceptance).toBeNull()
  })

  it.each<[string, CalculatorAction]>([
    ['la disponibilidad', { type: 'setField', field: 'availableBudget', value: '400' }],
    ['el precio de cierre', { type: 'setField', field: 'closingPrice', value: '300000' }],
    ['el escenario', { type: 'selectScenario', rate: 20 }],
    ['la participación', { type: 'setSpecField', part: 'single', field: 'advisorSharePercent', value: '40' }],
    ['el tipo de comisión', { type: 'setSpecKind', part: 'single', kind: 'fixed' }],
    ['el modelo de comisión', { type: 'setCommissionModel', model: 'split' }],
  ])('cambiar %s invalida la aceptación', (_name, action) => {
    const accepted = run(
      atScenarios({ availableBudget: '300' }),
      { type: 'selectScenario', rate: 10 },
      { type: 'setExcessAccepted', accepted: true }
    )
    expect(accepted.excessAcceptance).not.toBeNull()
    expect(run(accepted, action).excessAcceptance).toBeNull()
  })

  it('los cambios que no alteran presupuesto ni disponibilidad conservan la aceptación', () => {
    const accepted = run(
      atScenarios({ availableBudget: '300' }),
      { type: 'selectScenario', rate: 10 },
      { type: 'setExcessAccepted', accepted: true }
    )
    const edited = run(
      accepted,
      { type: 'setField', field: 'country', value: 'MX' },
      { type: 'setField', field: 'startDate', value: '2026-12-01' },
      { type: 'setCurrency', currency: 'MXN' },
      { type: 'setField', field: 'availableBudget', value: '300.00' }
    )
    expect(edited.excessAcceptance).toEqual({ budgetMinor: 50000, availableMinor: 30000 })
  })

  it('aceptar sin exceso no registra nada', () => {
    const state = run(atScenarios(), { type: 'selectScenario', rate: 5 }, { type: 'setExcessAccepted', accepted: true })
    expect(state.excessAcceptance).toBeNull()
  })
})

describe('reinicio', () => {
  it('vuelve al estado vacío con la fecha indicada', () => {
    const dirty = run(
      { ...fresh(), form: validForm({ selectedScenario: 5 }), step: 5, corruptStorageNotice: true },
      { type: 'touch', field: 'closingPrice' }
    )
    const reset = run(dirty, { type: 'reset', startDate: '2026-10-13' })
    expect(reset.form).toEqual(createEmptyForm('2026-10-13'))
    expect(reset.step).toBe(1)
    expect(reset.touched).toEqual({})
    expect(reset.corruptStorageNotice).toBe(false)
    expect(deriveCalculator(reset).pristine).toBe(true)
  })

  it('descarta el aviso de datos dañados sin tocar el formulario', () => {
    const state = createInitialState(TODAY, { status: 'corrupt' })
    const dismissed = run(state, { type: 'dismissStorageNotice' })
    expect(dismissed.corruptStorageNotice).toBe(false)
    expect(dismissed.form).toEqual(state.form)
  })
})
