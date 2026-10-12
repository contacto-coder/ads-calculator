/**
 * Contrato de datos del motor de cálculo.
 *
 * El dominio no conoce React, localStorage ni formato visual: recibe cadenas
 * tal como las escribe la persona y devuelve enteros de centavos.
 */

export const CURRENCIES = ['USD', 'MXN', 'COP', 'EUR', 'PEN'] as const
export type Currency = (typeof CURRENCIES)[number]

export const SCENARIO_RATES = [5, 10, 20] as const
export type ScenarioRate = (typeof SCENARIO_RATES)[number]

/** Versión de las reglas de docs/REGLAS_CALCULO.md que implementa el motor. */
export const CALCULATION_VERSION = 1

/** Cadena decimal escrita por la persona: "1250.50" o "1250,50". */
export type MoneyInput = string
/** Entero de unidades monetarias mínimas (centavos). */
export type MoneyResult = number

export type CommissionKind = 'percentage' | 'fixed'

export interface CommissionSpec {
  kind: CommissionKind
  /** Porcentaje del precio de cierre o importe fijo, según `kind`. */
  value: string
  /** Participación final del asesor, entre 0 y 100. */
  advisorSharePercent: string
}

export type CommissionModel =
  | { kind: 'single'; single: CommissionSpec }
  | { kind: 'split'; listing: CommissionSpec; selling: CommissionSpec }

export interface SimulationInput {
  country?: string
  /** `null` mientras la persona no ha elegido moneda. */
  currency: Currency | null
  listingPrice?: MoneyInput
  closingPrice: MoneyInput
  commission: CommissionModel
  /** Ausente = disponibilidad desconocida. "0" = ninguna disponibilidad. */
  availableBudget?: MoneyInput
  selectedScenario: ScenarioRate | null
  /** Fecha local en formato YYYY-MM-DD. */
  startDate: string
}

export type InputErrorCode =
  | 'required'
  | 'invalidFormat'
  | 'ambiguousFormat'
  | 'negative'
  | 'notFinite'
  | 'tooManyDecimals'
  | 'outOfRange'
  | 'mustBePositive'
  | 'unsafeAmount'
  | 'invalidDate'

export type CommissionPartKey = 'single' | 'listing' | 'selling'

export type FieldKey =
  | 'currency'
  | 'listingPrice'
  | 'closingPrice'
  | `${CommissionPartKey}.value`
  | `${CommissionPartKey}.advisorSharePercent`
  | 'commission'
  | 'availableBudget'
  | 'startDate'

export type FieldErrors = Partial<Record<FieldKey, InputErrorCode>>

export interface CommissionPart {
  key: CommissionPartKey
  kind: CommissionKind
  /** Porcentaje normalizado (punto decimal) cuando `kind` es 'percentage'. */
  ratePercent: string | null
  /** Participación normalizada (punto decimal). */
  advisorSharePercent: string
  /** Comisión bruta de esta parte, redondeada a centavos para mostrarla. */
  grossMinor: MoneyResult
  /** Lo que conserva el asesor de esta parte. */
  advisorMinor: MoneyResult
}

export interface ScenarioResult {
  rate: ScenarioRate
  budgetMinor: MoneyResult
  balanceMinor: MoneyResult
  /**
   * Promedio diario (presupuesto / 30) redondeado a centavos. Solo para
   * mostrar: nunca reconstruir el total a partir de este valor.
   */
  averageDailyMinor: MoneyResult
  /** saldo / presupuesto × 100 con dos decimales; `null` si presupuesto = 0. */
  conditionalReturnPercent: string | null
  /** `false` cuando el presupuesto redondea a cero. */
  plannable: boolean
  exceedsAvailable: boolean
}

export interface PlanDay {
  /** 1 a 30. */
  dayNumber: number
  date: string
  stageIndex: number
  amountMinor: MoneyResult
}

export interface PlanStage {
  index: number
  weightPercent: number
  dayCount: number
  firstDayNumber: number
  startDate: string
  endDate: string
  totalMinor: MoneyResult
  /** Promedio diario de la etapa redondeado a centavos. Solo para mostrar. */
  averageDailyMinor: MoneyResult
}

export interface BudgetPlan {
  rate: ScenarioRate
  budgetMinor: MoneyResult
  startDate: string
  endDate: string
  stages: PlanStage[]
  days: PlanDay[]
}

export type NoticeCode =
  | 'zeroCommission'
  | 'selectedScenarioNotPlannable'
  | 'exceedsAvailable'
  | 'fragmentedPlan'

export interface CalculationResult {
  currency: Currency
  closingPriceMinor: MoneyResult
  listingPriceMinor: MoneyResult | null
  advisorCommissionMinor: MoneyResult
  breakdown: CommissionPart[]
  /** `null` = disponibilidad desconocida. */
  availableMinor: MoneyResult | null
  scenarios: ScenarioResult[]
  selectedScenario: ScenarioResult | null
  selectedPlan?: BudgetPlan
  notices: NoticeCode[]
}

export interface CalculationOutcome {
  /** Errores de todas las entradas, se haya podido calcular o no. */
  errors: FieldErrors
  /** `null` si la propiedad o la comisión no son válidas todavía. */
  result: CalculationResult | null
}
