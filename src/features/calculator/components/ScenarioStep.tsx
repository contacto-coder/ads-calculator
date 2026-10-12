import type { CalculationResult } from '../domain/types'
import { REQUIRED_TEXT, fieldId } from '../messages'
import { Notice } from './Notice'
import { ScenarioCard } from './ScenarioCard'
import { StepNav } from './StepNav'
import { errorText } from './stepProps'
import type { StepProps } from './stepProps'

interface ExcessWarningProps extends StepProps {
  result: CalculationResult
}

/** Aviso de exceso: nunca cambia el importe, solo pide una aceptación explícita. */
function ExcessWarning(props: ExcessWarningProps) {
  const { derived, dispatch, fmt, result } = props
  const excess = derived.currentExcess
  if (!excess) return null
  const acceptanceId = fieldId('excessAcceptance')
  const error = errorText(props, 'excessAcceptance')

  return (
    <Notice tone="warning" title="Supera tu disponibilidad" role="alert">
      <p>
        El presupuesto de esta inversión es {fmt.money(excess.budgetMinor, result.currency)} y tu
        dinero disponible es {fmt.money(excess.availableMinor, result.currency)}. El importe no se
        modifica: puedes elegir otra inversión o continuar con esta.
      </p>
      <label className="checkbox" htmlFor={acceptanceId}>
        <input
          id={acceptanceId}
          type="checkbox"
          checked={derived.excessAccepted}
          aria-describedby={error ? `${acceptanceId}-error` : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(event) =>
            dispatch({ type: 'setExcessAccepted', accepted: event.target.checked })
          }
        />
        <span>
          Entiendo que este presupuesto supera mi dinero disponible y quiero continuar con este
          importe.
        </span>
      </label>
      {error && (
        <p className="field-error" id={`${acceptanceId}-error`}>
          <span className="visually-hidden">Error:</span>{' '}
          {error}
        </p>
      )}
    </Notice>
  )
}

export function ScenarioStep(props: StepProps) {
  const { state, derived, dispatch, fmt, onSubmit } = props
  const result = derived.outcome.result
  if (!result) return null

  const groupId = fieldId('selectedScenario')
  const error = errorText(props, 'selectedScenario')
  const zeroCommission = result.advisorCommissionMinor === 0

  return (
    <form noValidate onSubmit={onSubmit}>
      <p className="step-intro">{REQUIRED_TEXT.chooseScenario}</p>
      <p className="context-line">
        Tu comisión estimada es{' '}
        <strong>{fmt.money(result.advisorCommissionMinor, result.currency)}</strong>.{' '}
        {REQUIRED_TEXT.commissionEstimate}
      </p>

      {zeroCommission && (
        <Notice tone="info" title="No hay importe que planificar">
          <p>
            Tu comisión estimada es cero, así que los tres presupuestos también lo son. Vuelve atrás
            y revisa la comisión o tu participación para poder elegir una inversión.
          </p>
        </Notice>
      )}

      <fieldset
        id={groupId}
        className="scenario-group"
        tabIndex={-1}
        aria-describedby={error ? `${groupId}-error` : undefined}
      >
        <legend className="field-label">Inversión publicitaria</legend>
        <div className="scenario-grid">
          {result.scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.rate}
              scenario={scenario}
              currency={result.currency}
              checked={state.form.selectedScenario === scenario.rate}
              fmt={fmt}
              onSelect={() => dispatch({ type: 'selectScenario', rate: scenario.rate })}
            />
          ))}
        </div>
      </fieldset>
      {error && (
        <p className="field-error" id={`${groupId}-error`} role="alert">
          <span className="visually-hidden">Error:</span>{' '}
          {error}
        </p>
      )}

      <p className="note">{REQUIRED_TEXT.methodology}</p>

      <ExcessWarning {...props} result={result} />

      <StepNav onBack={() => dispatch({ type: 'back' })} nextLabel="Continuar" />
    </form>
  )
}
