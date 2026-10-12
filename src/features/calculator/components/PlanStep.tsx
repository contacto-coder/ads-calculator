import { describeError, fieldId } from '../messages'
import { Field } from './Field'
import { Results } from './Results'
import { StepNav } from './StepNav'
import type { StepProps } from './stepProps'

interface PlanStepProps extends StepProps {
  onPrint: () => void
}

export function PlanStep(props: PlanStepProps) {
  const { state, derived, dispatch, fmt, onPrint } = props
  const result = derived.outcome.result
  const plan = result?.selectedPlan
  // En este paso no hay "Continuar": el error de fecha se muestra en cuanto existe.
  const dateError = derived.stepErrors[5].startDate

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()}>
      <p className="step-intro">
        Elige cuándo empezar. El plan dura siempre 30 días seguidos, en cuatro etapas de 7, 7, 7 y 9
        días.
      </p>

      <Field
        id={fieldId('startDate')}
        label="Fecha de inicio"
        hint={
          plan
            ? `El día 30 del plan es el ${fmt.weekdayDate(plan.endDate)}.`
            : 'Por defecto, la fecha de hoy en este dispositivo.'
        }
        error={dateError ? describeError('startDate', dateError, state.form) : undefined}
      >
        {(control) => (
          <input
            {...control}
            className="input input-date"
            type="date"
            aria-required
            value={state.form.startDate}
            onChange={(event) =>
              dispatch({ type: 'setField', field: 'startDate', value: event.target.value })
            }
            onBlur={() => dispatch({ type: 'touch', field: 'startDate' })}
          />
        )}
      </Field>

      {result && (
        <Results
          result={result}
          fmt={fmt}
          excessAccepted={derived.excessAccepted}
          onPrint={onPrint}
        />
      )}

      <StepNav onBack={() => dispatch({ type: 'back' })} />
    </form>
  )
}
