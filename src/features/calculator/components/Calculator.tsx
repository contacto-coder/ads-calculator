'use client'

import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { toLocalISODate } from '../domain/dates'
import { hasMonetaryAmounts } from '../domain/form'
import type { CalculationResult, Currency } from '../domain/types'
import type { Formatters } from '../format'
import { useAutosave } from '../hooks/useAutosave'
import { useFormatters } from '../hooks/useFormatters'
import { APP_NAME, REQUIRED_TEXT, STEP_LABELS, fieldId } from '../messages'
import {
  calculatorReducer,
  createInitialState,
  deriveCalculator,
  stepFieldOrder,
} from '../state/calculatorState'
import type { CalculatorState } from '../state/calculatorState'
import { clearSimulation, loadSimulation } from '../storage/simulationStorage'
import { CapacityStep } from './CapacityStep'
import { CommissionStep } from './CommissionStep'
import { ConfirmDialog } from './ConfirmDialog'
import { Notice } from './Notice'
import { PlanStep } from './PlanStep'
import { PrintReport } from './PrintReport'
import { PropertyStep } from './PropertyStep'
import { SaveIndicator } from './SaveIndicator'
import { ScenarioStep } from './ScenarioStep'
import { StepIndicator } from './StepIndicator'
import { SummaryPanel } from './SummaryPanel'
import { BrandMark } from './icons'
import type { StepProps } from './stepProps'

type DialogState = { kind: 'currency'; currency: Currency } | { kind: 'reset' } | null

function bootCalculator(): CalculatorState {
  return createInitialState(toLocalISODate(new Date()), loadSimulation())
}

/** Texto que los lectores de pantalla anuncian cuando cambian los resultados. */
function liveSummary(result: CalculationResult | null, fmt: Formatters): string {
  if (!result) return ''
  const parts = [`Comisión estimada: ${fmt.money(result.advisorCommissionMinor, result.currency)}.`]
  const scenario = result.selectedScenario
  if (scenario) {
    parts.push(
      `Presupuesto del ${scenario.rate} %: ${fmt.money(scenario.budgetMinor, result.currency)}.`
    )
  }
  return `Resultados actualizados. ${parts.join(' ')}`
}

export function Calculator() {
  const [state, dispatch] = useReducer(calculatorReducer, undefined, bootCalculator)
  const derived = useMemo(() => deriveCalculator(state), [state])
  const fmt = useFormatters()
  const saveStatus = useAutosave(state, derived.pristine)
  const [dialog, setDialog] = useState<DialogState>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const lastStep = useRef(state.step)

  // Al cambiar de paso, el foco va al título para que teclado y lector de
  // pantalla continúen desde el contenido nuevo.
  useEffect(() => {
    if (lastStep.current === state.step) return
    lastStep.current = state.step
    headingRef.current?.focus()
  }, [state.step])

  const result = derived.outcome.result

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errors = derived.stepErrors[state.step]
    dispatch({ type: 'next' })
    const firstInvalid = stepFieldOrder(state.step, state.form).find((field) => errors[field])
    if (firstInvalid) document.getElementById(fieldId(firstInvalid))?.focus()
  }

  const handleCurrencyChange = (currency: Currency) => {
    if (currency === state.form.currency) return
    if (state.form.currency !== '' && hasMonetaryAmounts(state.form)) {
      setDialog({ kind: 'currency', currency })
    } else {
      dispatch({ type: 'setCurrency', currency })
    }
  }

  const startOver = () => {
    clearSimulation()
    dispatch({ type: 'reset', startDate: toLocalISODate(new Date()) })
    setDialog(null)
  }

  const stepProps: StepProps = { state, derived, dispatch, fmt, onSubmit: handleSubmit }
  const showSummary = state.step < 5

  return (
    <div className="app-shell">
      <div className={showSummary ? 'screen-only has-summary-bar' : 'screen-only'}>
        <header className="app-header">
          <div className="app-brand">
            <BrandMark className="app-brand-mark" />
            <h1 className="app-title">{APP_NAME}</h1>
          </div>
          <SaveIndicator status={saveStatus} fmt={fmt} />
        </header>

        {/* La presentación solo ocupa espacio al empezar; después estorba en el móvil. */}
        {state.step === 1 && (
          <div className="app-intro">
            <p className="app-tagline">
              Calcula cuánto recibirías si cierras y cobras la venta, cuánto puedes asignar a
              publicidad y cómo repartirlo en 30 días.
            </p>
            <ul className="app-intro-points">
              <li>5 pasos</li>
              <li>Sin registro</li>
              <li>Tus datos se quedan en este dispositivo</li>
            </ul>
          </div>
        )}

        {state.corruptStorageNotice && (
          <Notice tone="warning" title="No se pudo recuperar la simulación guardada" role="alert">
            <p>
              Los datos guardados en este dispositivo estaban dañados o eran de otra versión, así
              que la calculadora empezó en blanco. Lo que escribas ahora reemplazará esos datos.
            </p>
            <div className="notice-actions">
              <button type="button" className="btn btn-secondary" onClick={startOver}>
                Borrar los datos dañados
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => dispatch({ type: 'dismissStorageNotice' })}
              >
                Entendido
              </button>
            </div>
          </Notice>
        )}

        <StepIndicator
          current={state.step}
          maxReachable={derived.maxReachableStep}
          onSelect={(step) => dispatch({ type: 'goToStep', step })}
        />

        <div className={showSummary ? 'app-layout app-layout-split' : 'app-layout'}>
          <main className="app-main">
            <section className="card step-card" aria-labelledby="step-title">
              <p className="step-count">Paso {state.step} de 5</p>
              <h2 className="step-title" id="step-title" tabIndex={-1} ref={headingRef}>
                {STEP_LABELS[state.step]}
              </h2>
              {state.step === 1 && (
                <PropertyStep {...stepProps} onCurrencyChange={handleCurrencyChange} />
              )}
              {state.step === 2 && <CommissionStep {...stepProps} />}
              {state.step === 3 && <CapacityStep {...stepProps} />}
              {state.step === 4 && <ScenarioStep {...stepProps} />}
              {state.step === 5 && <PlanStep {...stepProps} onPrint={() => window.print()} />}
            </section>
          </main>

          {showSummary && (
            <aside
              className={result ? 'app-aside' : 'app-aside app-aside-empty'}
              aria-label="Resumen de la simulación"
            >
              <SummaryPanel result={result} fmt={fmt} />
            </aside>
          )}
        </div>

        <footer className="app-footer">
          <p>{REQUIRED_TEXT.noGuarantee}</p>
          <p>
            Herramienta de planificación independiente: no está afiliada a Meta ni conectada con
            ninguna cuenta publicitaria. Los datos se guardan solo en este dispositivo.
          </p>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => (derived.pristine ? startOver() : setDialog({ kind: 'reset' }))}
          >
            Empezar de nuevo
          </button>
        </footer>

        <p className="visually-hidden" role="status">
          {liveSummary(result, fmt)}
        </p>
      </div>

      <PrintReport
        form={state.form}
        result={result}
        excessAccepted={derived.excessAccepted}
        fmt={fmt}
      />

      {dialog?.kind === 'currency' && (
        <ConfirmDialog
          title={`¿Cambiar la moneda a ${dialog.currency}?`}
          description={REQUIRED_TEXT.currencyChange}
          confirmLabel={`Cambiar a ${dialog.currency}`}
          cancelLabel="Cancelar"
          onConfirm={() => {
            dispatch({ type: 'setCurrency', currency: dialog.currency })
            setDialog(null)
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'reset' && (
        <ConfirmDialog
          title="¿Empezar de nuevo?"
          description="Se borrarán todos los datos de esta simulación en este dispositivo. No se puede deshacer."
          confirmLabel="Borrar y empezar de nuevo"
          cancelLabel="Cancelar"
          onConfirm={startOver}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )
}
