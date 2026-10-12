import { fieldId } from '../messages'
import { MoneyInput } from './MoneyInput'
import { StepNav } from './StepNav'
import { errorText, moneyReadback } from './stepProps'
import type { StepProps } from './stepProps'

/** Explica cómo se interpretará lo escrito: vacío y cero no son lo mismo. */
function interpretation({ state, derived, fmt }: StepProps): string | null {
  if (state.form.availableBudget.trim() === '') {
    return 'Disponibilidad desconocida: no compararemos los presupuestos con tu dinero disponible.'
  }
  const result = derived.outcome.result
  if (derived.outcome.errors.availableBudget || !result || result.availableMinor === null) {
    return null
  }
  if (result.availableMinor === 0) {
    return 'Sin dinero disponible: te avisaremos en cualquier presupuesto mayor que cero.'
  }
  return `Te avisaremos si un presupuesto supera ${fmt.money(result.availableMinor, result.currency)}.`
}

export function CapacityStep(props: StepProps) {
  const { state, dispatch, fmt, onSubmit } = props
  const meaning = interpretation(props)

  return (
    <form noValidate onSubmit={onSubmit}>
      <p className="step-intro">
        ¿Cuánto dinero tienes hoy para invertir en publicidad? Es opcional: sirve para avisarte si
        una inversión supera lo que tienes disponible.
      </p>

      <MoneyInput
        id={fieldId('availableBudget')}
        label="Dinero disponible para publicidad (opcional)"
        hint="Déjalo vacío si todavía no lo sabes. Escribe 0 si no tienes dinero disponible."
        error={errorText(props, 'availableBudget')}
        value={state.form.availableBudget}
        currency={state.form.currency}
        readback={moneyReadback(state.form.availableBudget, state.form.currency, fmt)}
        onChange={(value) => dispatch({ type: 'setField', field: 'availableBudget', value })}
        onBlur={() => dispatch({ type: 'touch', field: 'availableBudget' })}
      />

      {meaning && <p className="preview preview-text">{meaning}</p>}

      <StepNav onBack={() => dispatch({ type: 'back' })} nextLabel="Continuar" />
    </form>
  )
}
