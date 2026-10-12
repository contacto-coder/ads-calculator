import { COMMISSION_PART_KEYS } from '../domain/form'
import type { CommissionSpecForm, SimulationForm } from '../domain/form'
import { isSafeMinor } from '../domain/money'
import { CALCULATION_VERSION, SCENARIO_RATES } from '../domain/types'
import type { ScenarioRate } from '../domain/types'
import { isCurrency } from '../domain/validation'

export const STORAGE_KEY = 'meta-real-estate-budget:v1'
export const SCHEMA_VERSION = 1
/** Ningún campo legítimo se acerca a este tamaño; más largo se trata como dañado. */
const MAX_TEXT_LENGTH = 64

export const STEP_NUMBERS = [1, 2, 3, 4, 5] as const
export type StepNumber = (typeof STEP_NUMBERS)[number]

/** Aceptación del aviso de exceso, ligada a los importes exactos que se aceptaron. */
export interface ExcessAcceptance {
  budgetMinor: number
  availableMinor: number
}

export interface SimulationProgress {
  step: StepNumber
  excessAcceptance: ExcessAcceptance | null
}

/**
 * Se guardan las entradas, nunca los resultados: al recuperar se recalcula.
 * No contiene datos sensibles, propietarios ni direcciones.
 */
export interface SavedSimulation {
  schemaVersion: typeof SCHEMA_VERSION
  calculationVersion: typeof CALCULATION_VERSION
  savedAt: string
  input: SimulationForm
  progress: SimulationProgress
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'loaded'; saved: SavedSimulation }
  | { status: 'corrupt' }
  | { status: 'unavailable' }

export type SaveResult = { ok: true; savedAt: string } | { ok: false }

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** `null` si el navegador niega el acceso (modo privado, políticas, iframes). */
export function getBrowserStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_TEXT_LENGTH
}

function isSpecForm(value: unknown): value is CommissionSpecForm {
  return (
    isRecord(value) &&
    (value.kind === 'percentage' || value.kind === 'fixed') &&
    isText(value.percentage) &&
    isText(value.fixed) &&
    isText(value.advisorSharePercent)
  )
}

function isScenarioRate(value: unknown): value is ScenarioRate {
  return (SCENARIO_RATES as readonly unknown[]).includes(value)
}

function isSimulationForm(value: unknown): value is SimulationForm {
  return (
    isRecord(value) &&
    isText(value.country) &&
    (value.currency === '' || isCurrency(value.currency)) &&
    isText(value.listingPrice) &&
    isText(value.closingPrice) &&
    (value.commissionModel === 'single' || value.commissionModel === 'split') &&
    COMMISSION_PART_KEYS.every((key) => isSpecForm(value[key])) &&
    isText(value.availableBudget) &&
    (value.selectedScenario === null || isScenarioRate(value.selectedScenario)) &&
    isText(value.startDate)
  )
}

function isProgress(value: unknown): value is SimulationProgress {
  if (!isRecord(value)) return false
  const acceptance = value.excessAcceptance
  const validAcceptance =
    acceptance === null ||
    (isRecord(acceptance) &&
      isSafeMinor(acceptance.budgetMinor) &&
      isSafeMinor(acceptance.availableMinor))
  return (STEP_NUMBERS as readonly unknown[]).includes(value.step) && validAcceptance
}

function isSavedSimulation(value: unknown): value is SavedSimulation {
  return (
    isRecord(value) &&
    value.schemaVersion === SCHEMA_VERSION &&
    value.calculationVersion === CALCULATION_VERSION &&
    typeof value.savedAt === 'string' &&
    !Number.isNaN(Date.parse(value.savedAt)) &&
    isSimulationForm(value.input) &&
    isProgress(value.progress)
  )
}

/** Copia solo los campos conocidos, para no arrastrar propiedades extrañas. */
function sanitize(saved: SavedSimulation): SavedSimulation {
  const { input, progress } = saved
  const spec = (form: CommissionSpecForm): CommissionSpecForm => ({
    kind: form.kind,
    percentage: form.percentage,
    fixed: form.fixed,
    advisorSharePercent: form.advisorSharePercent,
  })
  return {
    schemaVersion: SCHEMA_VERSION,
    calculationVersion: CALCULATION_VERSION,
    savedAt: saved.savedAt,
    input: {
      country: input.country,
      currency: input.currency,
      listingPrice: input.listingPrice,
      closingPrice: input.closingPrice,
      commissionModel: input.commissionModel,
      single: spec(input.single),
      listing: spec(input.listing),
      selling: spec(input.selling),
      availableBudget: input.availableBudget,
      selectedScenario: input.selectedScenario,
      startDate: input.startDate,
    },
    progress: {
      step: progress.step,
      excessAcceptance: progress.excessAcceptance
        ? {
            budgetMinor: progress.excessAcceptance.budgetMinor,
            availableMinor: progress.excessAcceptance.availableMinor,
          }
        : null,
    },
  }
}

/**
 * Lee y valida la simulación guardada. Un contenido dañado o de otra versión
 * se informa como `corrupt` sin lanzar errores: la app debe seguir funcionando.
 */
export function loadSimulation(storage: StorageLike | null = getBrowserStorage()): LoadResult {
  if (!storage) return { status: 'unavailable' }
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { status: 'unavailable' }
  }
  if (raw === null) return { status: 'empty' }

  try {
    const parsed: unknown = JSON.parse(raw)
    return isSavedSimulation(parsed)
      ? { status: 'loaded', saved: sanitize(parsed) }
      : { status: 'corrupt' }
  } catch {
    return { status: 'corrupt' }
  }
}

/** Guarda las entradas. Devuelve `ok: false` si no hay acceso o no hay cuota. */
export function saveSimulation(
  input: SimulationForm,
  progress: SimulationProgress,
  now: Date,
  storage: StorageLike | null = getBrowserStorage()
): SaveResult {
  if (!storage) return { ok: false }
  const saved: SavedSimulation = sanitize({
    schemaVersion: SCHEMA_VERSION,
    calculationVersion: CALCULATION_VERSION,
    savedAt: now.toISOString(),
    input,
    progress,
  })
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))
    return { ok: true, savedAt: saved.savedAt }
  } catch {
    return { ok: false }
  }
}

export function clearSimulation(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false
  try {
    storage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
