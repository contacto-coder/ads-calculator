import type { SimulationForm } from './domain/form'
import type { CommissionPartKey, Currency } from './domain/types'
import type { UiErrorCode, UiFieldKey } from './state/calculatorState'
import type { StepNumber } from './storage/simulationStorage'

export const APP_NAME = 'Presupuesto inmobiliario para Meta'

/** Mensajes obligatorios de docs/PRODUCTO.md y docs/DISENO.md, literales. */
export const REQUIRED_TEXT = {
  commissionEstimate: 'Comisión estimada si se cierra y cobra la venta.',
  balance: 'Saldo antes de otros gastos e impuestos.',
  methodology:
    'Estos porcentajes son una metodología de planificación; no son mínimos exigidos por Meta.',
  noGuarantee: 'El presupuesto no garantiza la venta ni el plazo de cierre.',
  dailyAverages:
    'Los importes diarios son promedios de planificación; el gasto real de la plataforma puede variar.',
  chooseScenario:
    'Elige una inversión que puedas financiar. Un presupuesto mayor no garantiza una venta más rápida.',
  currencyChange:
    'Cambiar la moneda no convierte los importes. Se conservarán los números con la nueva moneda.',
} as const

export const MEDIA_ONLY_TEXT =
  'El presupuesto corresponde solo a la inversión en anuncios; no incluye producción de contenido ni otros costos.'

export const CONDITIONAL_RETURN_TEXT =
  'Considera solo la inversión publicitaria y supone que la venta se cierra y se cobra. No incluye otros gastos ni impuestos y no es una predicción.'

export const STAGE_REVIEW_TEXT =
  'Antes de pasar a la siguiente etapa, revisa las consultas calificadas, las visitas y el seguimiento que hayas tenido. Esta calculadora no cambia nada en tu cuenta publicitaria ni aumenta la inversión automáticamente: tú decides si continúas.'

export const STEP_LABELS: Record<StepNumber, string> = {
  1: 'Propiedad',
  2: 'Comisión',
  3: 'Capacidad',
  4: 'Escenarios',
  5: 'Plan',
}

export const STAGE_NAMES = [
  'Prueba inicial',
  'Revisión y ajustes',
  'Concentración',
  'Continuidad y seguimiento',
] as const

export const CURRENCY_NAMES: Record<Currency, string> = {
  USD: 'Dólar estadounidense',
  MXN: 'Peso mexicano',
  COP: 'Peso colombiano',
  EUR: 'Euro',
  PEN: 'Sol peruano',
}

export const COMMISSION_PART_LABELS: Record<CommissionPartKey, string> = {
  single: 'Comisión única',
  listing: 'Captación',
  selling: 'Venta',
}

/** Solo como referencia: el país no cambia cálculos, contratos ni impuestos. */
export const COUNTRIES = [
  { code: 'AR', name: 'Argentina' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'MX', name: 'México' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'PA', name: 'Panamá' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Perú' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'OTHER', name: 'Otro país' },
] as const

export function countryName(code: string): string | null {
  return COUNTRIES.find((country) => country.code === code)?.name ?? null
}

const DECIMAL_EXAMPLE = 'Por ejemplo: 250000.50'

type ValueKind = 'money' | 'percent' | 'other'

function valueKindOf(field: UiFieldKey, form: SimulationForm): ValueKind {
  if (field === 'listingPrice' || field === 'closingPrice' || field === 'availableBudget') {
    return 'money'
  }
  if (field.endsWith('.advisorSharePercent')) return 'percent'
  if (field.endsWith('.value')) {
    const part = field.split('.')[0] as CommissionPartKey
    return form[part].kind === 'percentage' ? 'percent' : 'money'
  }
  return 'other'
}

function requiredMessage(field: UiFieldKey, kind: ValueKind): string {
  if (field === 'currency') return 'Elige una moneda.'
  if (field === 'closingPrice') return 'Escribe el precio de cierre estimado.'
  if (field === 'startDate') return 'Elige una fecha de inicio.'
  if (field.endsWith('.advisorSharePercent')) return 'Escribe tu participación final, entre 0 y 100.'
  if (field.endsWith('.value')) {
    return kind === 'percent'
      ? 'Escribe el porcentaje de la comisión.'
      : 'Escribe el importe de la comisión.'
  }
  return 'Completa este campo.'
}

/** Texto en español para cada error, adaptado al tipo de campo. */
export function describeError(field: UiFieldKey, code: UiErrorCode, form: SimulationForm): string {
  const kind = valueKindOf(field, form)
  switch (code) {
    case 'required':
      return requiredMessage(field, kind)
    case 'invalidFormat':
      return `Escribe solo números, con punto o coma para los decimales. ${DECIMAL_EXAMPLE}`
    case 'ambiguousFormat':
      return `Escribe el número sin separadores de miles: así no hay duda entre miles y decimales. ${DECIMAL_EXAMPLE}`
    case 'negative':
      return 'El valor no puede ser negativo.'
    case 'notFinite':
      return 'Escribe un número válido.'
    case 'tooManyDecimals':
      return kind === 'percent' ? 'Usa como máximo cuatro decimales.' : 'Usa como máximo dos decimales.'
    case 'outOfRange':
      return 'El porcentaje debe estar entre 0 y 100.'
    case 'mustBePositive':
      return 'El precio de cierre debe ser mayor que cero.'
    case 'unsafeAmount':
      return 'El importe es demasiado grande para calcularlo con exactitud. Revisa las cifras.'
    case 'invalidDate':
      return 'Escribe una fecha válida.'
    case 'scenarioRequired':
      return 'Elige una de las tres inversiones para continuar.'
    case 'scenarioNotPlannable':
      return 'Esta inversión redondea a cero y no se puede planificar. Elige otra o revisa la comisión.'
    case 'zeroCommission':
      return 'Con una comisión estimada de cero no hay importe que planificar. Vuelve atrás y revisa la comisión o tu participación.'
    case 'excessNotAccepted':
      return 'Marca la casilla para confirmar que quieres continuar con este importe, o elige otra inversión.'
  }
}

/** Identificador HTML estable del control de cada campo. */
export function fieldId(field: UiFieldKey): string {
  return `field-${field.replace('.', '-')}`
}
