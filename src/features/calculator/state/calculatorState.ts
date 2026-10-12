import { calculate } from '../domain/calculate'
import { createEmptyForm, isPristineForm, toSimulationInput } from '../domain/form'
import type { CommissionSpecForm, SimulationForm } from '../domain/form'
import type {
  CalculationOutcome,
  CommissionKind,
  CommissionPartKey,
  Currency,
  FieldKey,
  InputErrorCode,
  ScenarioRate,
} from '../domain/types'
import type { ExcessAcceptance, LoadResult, StepNumber } from '../storage/simulationStorage'

export type FlowErrorCode =
  | 'scenarioRequired'
  | 'scenarioNotPlannable'
  | 'zeroCommission'
  | 'excessNotAccepted'

export type UiFieldKey = FieldKey | 'selectedScenario' | 'excessAcceptance'
export type UiErrorCode = InputErrorCode | FlowErrorCode
export type UiErrors = Partial<Record<UiFieldKey, UiErrorCode>>

export type TextFieldKey = 'country' | 'listingPrice' | 'closingPrice' | 'availableBudget' | 'startDate'
export type SpecFieldKey = Exclude<keyof CommissionSpecForm, 'kind'>

export interface CalculatorState {
  form: SimulationForm
  step: StepNumber
  excessAcceptance: ExcessAcceptance | null
  /** Campos por los que la persona ya pasó: solo en ellos se muestran errores. */
  touched: Partial<Record<UiFieldKey, true>>
  /** Pasos en los que se intentó continuar: muestran todos sus errores. */
  attempted: Partial<Record<StepNumber, true>>
  defaultStartDate: string
  corruptStorageNotice: boolean
  storageUnavailable: boolean
  /** Fecha de guardado de la simulación recuperada, si la hubo. */
  restoredAt: string | null
}

export type CalculatorAction =
  | { type: 'setField'; field: TextFieldKey; value: string }
  | { type: 'setCurrency'; currency: Currency }
  | { type: 'setCommissionModel'; model: SimulationForm['commissionModel'] }
  | { type: 'setSpecKind'; part: CommissionPartKey; kind: CommissionKind }
  | { type: 'setSpecField'; part: CommissionPartKey; field: SpecFieldKey; value: string }
  | { type: 'selectScenario'; rate: ScenarioRate }
  | { type: 'setExcessAccepted'; accepted: boolean }
  | { type: 'touch'; field: UiFieldKey }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goToStep'; step: StepNumber }
  | { type: 'reset'; startDate: string }
  | { type: 'dismissStorageNotice' }

export interface DerivedCalculator {
  outcome: CalculationOutcome
  stepErrors: Record<StepNumber, UiErrors>
  /** Paso más avanzado al que se puede ir: todos los anteriores son válidos. */
  maxReachableStep: StepNumber
  /** Importes del exceso actual, o `null` si el escenario elegido no excede. */
  currentExcess: ExcessAcceptance | null
  excessAccepted: boolean
  pristine: boolean
}

const LAST_STEP: StepNumber = 5

function activeParts(form: SimulationForm): CommissionPartKey[] {
  return form.commissionModel === 'single' ? ['single'] : ['listing', 'selling']
}

/** Campos de cada paso, en el orden en que aparecen en pantalla. */
export function stepFieldOrder(step: StepNumber, form: SimulationForm): UiFieldKey[] {
  switch (step) {
    case 1:
      return ['currency', 'listingPrice', 'closingPrice']
    case 2:
      return [
        ...activeParts(form).flatMap((part): UiFieldKey[] => [
          `${part}.value`,
          `${part}.advisorSharePercent`,
        ]),
        'commission',
      ]
    case 3:
      return ['availableBudget']
    case 4:
      return ['selectedScenario', 'excessAcceptance']
    case 5:
      return ['startDate']
  }
}

function findCurrentExcess(outcome: CalculationOutcome): ExcessAcceptance | null {
  const result = outcome.result
  const selected = result?.selectedScenario
  if (!result || !selected?.exceedsAvailable || result.availableMinor === null) return null
  return { budgetMinor: selected.budgetMinor, availableMinor: result.availableMinor }
}

function sameExcess(a: ExcessAcceptance | null, b: ExcessAcceptance | null): boolean {
  return (
    a !== null && b !== null && a.budgetMinor === b.budgetMinor && a.availableMinor === b.availableMinor
  )
}

function scenarioStepErrors(outcome: CalculationOutcome, accepted: boolean): UiErrors {
  const result = outcome.result
  if (!result) return {}
  if (result.advisorCommissionMinor === 0) return { selectedScenario: 'zeroCommission' }
  if (!result.selectedScenario) return { selectedScenario: 'scenarioRequired' }
  if (!result.selectedScenario.plannable) return { selectedScenario: 'scenarioNotPlannable' }
  if (result.selectedScenario.exceedsAvailable && !accepted) {
    return { excessAcceptance: 'excessNotAccepted' }
  }
  return {}
}

function inputStepErrors(step: StepNumber, form: SimulationForm, outcome: CalculationOutcome): UiErrors {
  const errors: UiErrors = {}
  for (const field of stepFieldOrder(step, form)) {
    const code = (outcome.errors as UiErrors)[field]
    if (code) errors[field] = code
  }
  return errors
}

export function deriveCalculator(state: CalculatorState): DerivedCalculator {
  const outcome = calculate(toSimulationInput(state.form))
  const currentExcess = findCurrentExcess(outcome)
  const excessAccepted = sameExcess(state.excessAcceptance, currentExcess)

  const stepErrors: Record<StepNumber, UiErrors> = {
    1: inputStepErrors(1, state.form, outcome),
    2: inputStepErrors(2, state.form, outcome),
    3: inputStepErrors(3, state.form, outcome),
    4: scenarioStepErrors(outcome, excessAccepted),
    5: inputStepErrors(5, state.form, outcome),
  }
  const firstInvalid = ([1, 2, 3, 4] as const).find(
    (step) => Object.keys(stepErrors[step]).length > 0
  )

  return {
    outcome,
    stepErrors,
    maxReachableStep: firstInvalid ?? LAST_STEP,
    currentExcess,
    excessAccepted,
    pristine: state.step === 1 && isPristineForm(state.form, state.defaultStartDate),
  }
}

/** Error que debe verse ahora mismo en un campo, o `undefined`. */
export function visibleError(
  state: CalculatorState,
  derived: DerivedCalculator,
  field: UiFieldKey
): UiErrorCode | undefined {
  const code = derived.stepErrors[state.step][field]
  if (!code) return undefined
  return state.attempted[state.step] || state.touched[field] ? code : undefined
}

function emptyState(startDate: string): CalculatorState {
  return {
    form: createEmptyForm(startDate),
    step: 1,
    excessAcceptance: null,
    touched: {},
    attempted: {},
    defaultStartDate: startDate,
    corruptStorageNotice: false,
    storageUnavailable: false,
    restoredAt: null,
  }
}

export function createInitialState(today: string, load: LoadResult): CalculatorState {
  const base = emptyState(today)
  if (load.status === 'corrupt') return { ...base, corruptStorageNotice: true }
  if (load.status === 'unavailable') return { ...base, storageUnavailable: true }
  if (load.status === 'empty') return base

  const { input, progress, savedAt } = load.saved
  const restored: CalculatorState = {
    ...base,
    form: input,
    step: progress.step,
    excessAcceptance: progress.excessAcceptance,
    restoredAt: savedAt,
  }
  const { maxReachableStep } = deriveCalculator(restored)
  if (progress.step <= maxReachableStep) return reconcileAcceptance(restored)
  // Los datos guardados ya no permiten llegar a ese paso: se vuelve al primero
  // con errores, mostrándolos para que se vea qué falta.
  return reconcileAcceptance({
    ...restored,
    step: maxReachableStep,
    attempted: { [maxReachableStep]: true },
  })
}

/**
 * La aceptación del exceso solo vale para los importes exactos aceptados:
 * si cambian el presupuesto o la disponibilidad, se invalida.
 */
function reconcileAcceptance(state: CalculatorState): CalculatorState {
  if (state.excessAcceptance === null) return state
  const { currentExcess } = deriveCalculator(state)
  return sameExcess(state.excessAcceptance, currentExcess)
    ? state
    : { ...state, excessAcceptance: null }
}

function withForm(state: CalculatorState, form: SimulationForm): CalculatorState {
  return reconcileAcceptance({ ...state, form })
}

function goNext(state: CalculatorState): CalculatorState {
  const errors = deriveCalculator(state).stepErrors[state.step]
  if (Object.keys(errors).length > 0) {
    return { ...state, attempted: { ...state.attempted, [state.step]: true } }
  }
  return state.step < LAST_STEP ? { ...state, step: (state.step + 1) as StepNumber } : state
}

function setExcessAccepted(state: CalculatorState, accepted: boolean): CalculatorState {
  if (!accepted) return { ...state, excessAcceptance: null }
  return { ...state, excessAcceptance: deriveCalculator(state).currentExcess }
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction
): CalculatorState {
  switch (action.type) {
    case 'setField':
      return withForm(state, { ...state.form, [action.field]: action.value })
    case 'setCurrency':
      return withForm(state, { ...state.form, currency: action.currency })
    case 'setCommissionModel':
      return withForm(state, { ...state.form, commissionModel: action.model })
    case 'setSpecKind':
      return withForm(state, {
        ...state.form,
        [action.part]: { ...state.form[action.part], kind: action.kind },
      })
    case 'setSpecField':
      return withForm(state, {
        ...state.form,
        [action.part]: { ...state.form[action.part], [action.field]: action.value },
      })
    case 'selectScenario':
      return withForm(state, { ...state.form, selectedScenario: action.rate })
    case 'setExcessAccepted':
      return setExcessAccepted(state, action.accepted)
    case 'touch':
      return state.touched[action.field]
        ? state
        : { ...state, touched: { ...state.touched, [action.field]: true } }
    case 'next':
      return goNext(state)
    case 'back':
      return state.step > 1 ? { ...state, step: (state.step - 1) as StepNumber } : state
    case 'goToStep':
      return action.step <= deriveCalculator(state).maxReachableStep
        ? { ...state, step: action.step }
        : state
    case 'reset':
      return { ...emptyState(action.startDate), storageUnavailable: state.storageUnavailable }
    case 'dismissStorageNotice':
      return { ...state, corruptStorageNotice: false }
  }
}
