import type { CalculationResult } from '../domain/types'
import type { Formatters } from '../format'
import { COMMISSION_PART_LABELS, REQUIRED_TEXT } from '../messages'
import { CommissionSpecFields } from './CommissionSpecFields'
import { Notice } from './Notice'
import { RadioOption } from './RadioOption'
import { StepNav } from './StepNav'
import { errorText } from './stepProps'
import type { StepProps } from './stepProps'

function CommissionPreview({ result, fmt }: { result: CalculationResult | null; fmt: Formatters }) {
  if (!result) {
    return <p className="preview preview-empty">Completa los campos para ver tu comisión estimada.</p>
  }
  return (
    <div className="preview">
      <p className="figure-label">Tu comisión estimada</p>
      <p className="figure-value">{fmt.money(result.advisorCommissionMinor, result.currency)}</p>
      <p className="figure-note">{REQUIRED_TEXT.commissionEstimate}</p>
      {result.breakdown.length > 1 && (
        <ul className="preview-breakdown">
          {result.breakdown.map((part) => (
            <li key={part.key}>
              {COMMISSION_PART_LABELS[part.key]}: {fmt.money(part.advisorMinor, result.currency)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function CommissionStep(props: StepProps) {
  const { state, derived, dispatch, fmt, onSubmit } = props
  const { form } = state
  const result = derived.outcome.result
  const amountError = errorText(props, 'commission')

  return (
    <form noValidate onSubmit={onSubmit}>
      <p className="step-intro">
        Indica cómo se calcula tu comisión en esta venta. <strong>Captación</strong> es conseguir la
        propiedad; <strong>venta</strong> es conseguir al comprador.
      </p>

      <fieldset className="choice-group">
        <legend className="field-label">Modelo de comisión</legend>
        <RadioOption
          id="commission-model-single"
          name="commission-model"
          title="Comisión única con reparto"
          description="Una comisión total que se distribuye entre participantes."
          checked={form.commissionModel === 'single'}
          onSelect={() => dispatch({ type: 'setCommissionModel', model: 'single' })}
        />
        <RadioOption
          id="commission-model-split"
          name="commission-model"
          title="Comisión por puntas"
          description="Captación de la propiedad y captación del comprador se calculan por separado."
          checked={form.commissionModel === 'split'}
          onSelect={() => dispatch({ type: 'setCommissionModel', model: 'split' })}
        />
      </fieldset>

      {form.commissionModel === 'single' ? (
        <CommissionSpecFields {...props} part="single" legend="Comisión única" />
      ) : (
        <>
          <CommissionSpecFields
            {...props}
            part="listing"
            legend="Captación"
            description="La comisión por conseguir la propiedad. Si no participas en esta punta, escribe 0 en tu participación."
          />
          <CommissionSpecFields
            {...props}
            part="selling"
            legend="Venta"
            description="La comisión por conseguir al comprador. Si no participas en esta punta, escribe 0 en tu participación."
          />
        </>
      )}

      {amountError && (
        <Notice tone="warning" role="alert">
          <p>{amountError}</p>
        </Notice>
      )}

      <CommissionPreview result={result} fmt={fmt} />
      {result?.advisorCommissionMinor === 0 && (
        <Notice tone="info" title="Comisión estimada de cero">
          <p>
            Con estos datos no recibirías comisión, así que no habrá importe que planificar. Revisa
            la comisión o tu participación si no es lo que esperabas.
          </p>
        </Notice>
      )}

      <StepNav onBack={() => dispatch({ type: 'back' })} nextLabel="Continuar" />
    </form>
  )
}
