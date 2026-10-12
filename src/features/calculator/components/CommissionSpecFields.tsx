import type { CommissionPartKey } from '../domain/types'
import { fieldId } from '../messages'
import { MoneyInput } from './MoneyInput'
import { PercentInput } from './PercentInput'
import { RadioOption } from './RadioOption'
import { errorText, moneyReadback } from './stepProps'
import type { StepProps } from './stepProps'

interface CommissionSpecFieldsProps extends Pick<StepProps, 'state' | 'derived' | 'dispatch' | 'fmt'> {
  part: CommissionPartKey
  legend: string
  description?: string
}

/** Campos de una comisión: porcentaje o importe fijo, y participación final. */
export function CommissionSpecFields(props: CommissionSpecFieldsProps) {
  const { state, dispatch, fmt, part, legend, description } = props
  const spec = state.form[part]
  const valueField = `${part}.value` as const
  const shareField = `${part}.advisorSharePercent` as const

  return (
    <fieldset className="spec-group">
      <legend className="spec-group-legend">{legend}</legend>
      {description && <p className="field-hint">{description}</p>}

      <fieldset className="inline-choice">
        <legend className="field-label">Tipo de comisión</legend>
        <div className="inline-choice-options">
          <RadioOption
            id={`${part}-kind-percentage`}
            name={`${part}-kind`}
            title="Porcentaje del precio de cierre"
            checked={spec.kind === 'percentage'}
            onSelect={() => dispatch({ type: 'setSpecKind', part, kind: 'percentage' })}
          />
          <RadioOption
            id={`${part}-kind-fixed`}
            name={`${part}-kind`}
            title="Importe fijo"
            checked={spec.kind === 'fixed'}
            onSelect={() => dispatch({ type: 'setSpecKind', part, kind: 'fixed' })}
          />
        </div>
      </fieldset>

      {spec.kind === 'percentage' ? (
        <PercentInput
          id={fieldId(valueField)}
          label="Porcentaje de comisión"
          hint="Se aplica sobre el precio de cierre estimado."
          error={errorText(props, valueField)}
          value={spec.percentage}
          onChange={(value) => dispatch({ type: 'setSpecField', part, field: 'percentage', value })}
          onBlur={() => dispatch({ type: 'touch', field: valueField })}
        />
      ) : (
        <MoneyInput
          id={fieldId(valueField)}
          label="Importe de la comisión"
          hint="Importe total fijo, en la moneda elegida."
          error={errorText(props, valueField)}
          value={spec.fixed}
          currency={state.form.currency}
          readback={moneyReadback(spec.fixed, state.form.currency, fmt)}
          required
          onChange={(value) => dispatch({ type: 'setSpecField', part, field: 'fixed', value })}
          onBlur={() => dispatch({ type: 'touch', field: valueField })}
        />
      )}

      <PercentInput
        id={fieldId(shareField)}
        label="Tu participación final"
        hint="El porcentaje que conservas después de todos los repartos."
        error={errorText(props, shareField)}
        value={spec.advisorSharePercent}
        onChange={(value) =>
          dispatch({ type: 'setSpecField', part, field: 'advisorSharePercent', value })
        }
        onBlur={() => dispatch({ type: 'touch', field: shareField })}
      />
    </fieldset>
  )
}
