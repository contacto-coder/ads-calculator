import type {
  CommissionKind,
  CommissionModel,
  CommissionPartKey,
  CommissionSpec,
  Currency,
  ScenarioRate,
  SimulationInput,
} from './types'

/**
 * Borrador de una comisión. Guarda por separado el porcentaje y el importe
 * fijo para que cambiar de tipo no convierta un número en otra cosa.
 */
export interface CommissionSpecForm {
  kind: CommissionKind
  percentage: string
  fixed: string
  advisorSharePercent: string
}

/**
 * Lo que la persona ha escrito, válido o no. Es un superconjunto de
 * `SimulationInput`: conserva también los borradores del modelo de comisión
 * inactivo, que nunca participan en el cálculo.
 */
export interface SimulationForm {
  country: string
  currency: Currency | ''
  listingPrice: string
  closingPrice: string
  commissionModel: CommissionModel['kind']
  single: CommissionSpecForm
  listing: CommissionSpecForm
  selling: CommissionSpecForm
  availableBudget: string
  selectedScenario: ScenarioRate | null
  startDate: string
}

export const COMMISSION_PART_KEYS: readonly CommissionPartKey[] = ['single', 'listing', 'selling']

export function createEmptySpecForm(): CommissionSpecForm {
  return { kind: 'percentage', percentage: '', fixed: '', advisorSharePercent: '' }
}

export function createEmptyForm(startDate: string): SimulationForm {
  return {
    country: '',
    currency: '',
    listingPrice: '',
    closingPrice: '',
    commissionModel: 'single',
    single: createEmptySpecForm(),
    listing: createEmptySpecForm(),
    selling: createEmptySpecForm(),
    availableBudget: '',
    selectedScenario: null,
    startDate,
  }
}

function toSpec(form: CommissionSpecForm): CommissionSpec {
  return {
    kind: form.kind,
    value: form.kind === 'percentage' ? form.percentage : form.fixed,
    advisorSharePercent: form.advisorSharePercent,
  }
}

function optional(value: string): string | undefined {
  return value.trim() === '' ? undefined : value
}

/** Entrada del motor: solo el modelo de comisión activo y su tipo activo. */
export function toSimulationInput(form: SimulationForm): SimulationInput {
  const commission: CommissionModel =
    form.commissionModel === 'single'
      ? { kind: 'single', single: toSpec(form.single) }
      : { kind: 'split', listing: toSpec(form.listing), selling: toSpec(form.selling) }

  return {
    country: optional(form.country),
    currency: form.currency === '' ? null : form.currency,
    listingPrice: optional(form.listingPrice),
    closingPrice: form.closingPrice,
    commission,
    availableBudget: optional(form.availableBudget),
    selectedScenario: form.selectedScenario,
    startDate: form.startDate,
  }
}

/** ¿Hay algún importe escrito? Decide si cambiar de moneda pide confirmación. */
export function hasMonetaryAmounts(form: SimulationForm): boolean {
  const amounts = [
    form.listingPrice,
    form.closingPrice,
    form.availableBudget,
    ...COMMISSION_PART_KEYS.map((key) => form[key].fixed),
  ]
  return amounts.some((amount) => amount.trim() !== '')
}

function isEmptySpec(spec: CommissionSpecForm): boolean {
  const empty = createEmptySpecForm()
  return (
    spec.kind === empty.kind &&
    spec.percentage === '' &&
    spec.fixed === '' &&
    spec.advisorSharePercent === ''
  )
}

/** `true` si la persona todavía no ha introducido ningún dato. */
export function isPristineForm(form: SimulationForm, defaultStartDate: string): boolean {
  return (
    form.country === '' &&
    form.currency === '' &&
    form.listingPrice === '' &&
    form.closingPrice === '' &&
    form.commissionModel === 'single' &&
    COMMISSION_PART_KEYS.every((key) => isEmptySpec(form[key])) &&
    form.availableBudget === '' &&
    form.selectedScenario === null &&
    form.startDate === defaultStartDate
  )
}
