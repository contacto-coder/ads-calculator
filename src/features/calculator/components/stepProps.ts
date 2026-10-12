import type { Dispatch, FormEvent } from 'react'
import { parseMoney } from '../domain/money'
import type { Currency } from '../domain/types'
import type { Formatters } from '../format'
import { describeError } from '../messages'
import { visibleError } from '../state/calculatorState'
import type {
  CalculatorAction,
  CalculatorState,
  DerivedCalculator,
  UiFieldKey,
} from '../state/calculatorState'

/** Lo que recibe cada paso del asistente. */
export interface StepProps {
  state: CalculatorState
  derived: DerivedCalculator
  dispatch: Dispatch<CalculatorAction>
  fmt: Formatters
  /** Valida el paso y avanza; si hay errores, lleva el foco al primero. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

/** Mensaje de error que debe verse ahora en un campo, o `undefined`. */
export function errorText(
  { state, derived }: Pick<StepProps, 'state' | 'derived'>,
  field: UiFieldKey
): string | undefined {
  const code = visibleError(state, derived, field)
  return code ? describeError(field, code, state.form) : undefined
}

/**
 * Lo escrito en un campo de importe, con separadores y moneda, para comprobar
 * la magnitud. `null` mientras no sea un importe válido o no haya moneda.
 */
export function moneyReadback(value: string, currency: Currency | '', fmt: Formatters): string | null {
  if (currency === '') return null
  const parsed = parseMoney(value)
  return parsed.ok ? `Se lee: ${fmt.money(parsed.value, currency)}` : null
}
