import type { BudgetPlan, CalculationResult, ScenarioResult } from '../domain/types'
import type { Formatters } from '../format'
import { CONDITIONAL_RETURN_TEXT, MEDIA_ONLY_TEXT, REQUIRED_TEXT, STAGE_REVIEW_TEXT } from '../messages'
import { CommissionBreakdown } from './CommissionBreakdown'
import { DailyCalendar } from './DailyCalendar'
import { Notice } from './Notice'
import { PlanTable } from './PlanTable'
import { PrinterIcon } from './icons'

interface ResultsProps {
  result: CalculationResult
  fmt: Formatters
  excessAccepted: boolean
  onPrint: () => void
}

interface SelectedProps {
  result: CalculationResult
  scenario: ScenarioResult
  fmt: Formatters
}

function KeyFigures({ result, scenario, fmt }: SelectedProps) {
  const { currency } = result
  return (
    <dl className="figures">
      <div className="figure figure-main">
        <dt className="figure-label">Comisión estimada</dt>
        <dd className="figure-value">{fmt.money(result.advisorCommissionMinor, currency)}</dd>
        <dd className="figure-note">{REQUIRED_TEXT.commissionEstimate}</dd>
      </div>
      <div className="figure">
        <dt className="figure-label">Porcentaje publicitario</dt>
        <dd className="figure-value">{scenario.rate}&nbsp;%</dd>
        <dd className="figure-note">De tu comisión estimada.</dd>
      </div>
      <div className="figure figure-accent">
        <dt className="figure-label">Presupuesto publicitario</dt>
        <dd className="figure-value">{fmt.money(scenario.budgetMinor, currency)}</dd>
        <dd className="figure-note">{MEDIA_ONLY_TEXT}</dd>
      </div>
      <div className="figure">
        <dt className="figure-label">Promedio diario</dt>
        <dd className="figure-value">{fmt.money(scenario.averageDailyMinor, currency)}</dd>
        <dd className="figure-note">Presupuesto entre 30 días, redondeado.</dd>
      </div>
      <div className="figure">
        <dt className="figure-label">Saldo después de publicidad</dt>
        <dd className="figure-value">{fmt.money(scenario.balanceMinor, currency)}</dd>
        <dd className="figure-note">{REQUIRED_TEXT.balance}</dd>
      </div>
    </dl>
  )
}

/**
 * Reparto de la comisión entre publicidad y saldo. Es un apoyo visual de las
 * cifras de arriba, por eso queda fuera del árbol de accesibilidad.
 */
function CommissionSplit({ scenario }: Pick<SelectedProps, 'scenario'>) {
  return (
    <div className="split" aria-hidden="true">
      <div className="split-bar">
        <span className="split-bar-budget" style={{ width: `${scenario.rate}%` }} />
      </div>
      <div className="split-legend">
        <span className="split-key split-key-budget">
          Publicidad: {scenario.rate}&nbsp;% de tu comisión
        </span>
        <span className="split-key split-key-balance">
          Saldo: el {100 - scenario.rate}&nbsp;% restante
        </span>
      </div>
    </div>
  )
}

function ConditionalReturn({ scenario, fmt }: Pick<SelectedProps, 'scenario' | 'fmt'>) {
  if (scenario.conditionalReturnPercent === null) return null
  return (
    <details className="disclosure">
      <summary>Retorno condicionado (opcional)</summary>
      <div className="disclosure-body">
        <p>
          Si la venta se cierra y se cobra, el saldo equivale al{' '}
          <strong>{fmt.fixedPercent(scenario.conditionalReturnPercent, 2)}</strong> de la inversión
          publicitaria.
        </p>
        <p>{CONDITIONAL_RETURN_TEXT}</p>
      </div>
    </details>
  )
}

/** Las cuatro etapas a escala: cada una recibe más presupuesto que la anterior. */
function StageBar({ plan }: { plan: BudgetPlan }) {
  return (
    <div className="stage-bar" aria-hidden="true">
      {plan.stages.map((stage) => (
        <span
          key={stage.index}
          className={`stage-bar-segment stage-bar-segment-${stage.index + 1}`}
          style={{ flexGrow: stage.weightPercent }}
        >
          {stage.index + 1}
        </span>
      ))}
    </div>
  )
}

function PlanSection({ plan, result, fmt }: { plan: BudgetPlan; result: CalculationResult; fmt: Formatters }) {
  return (
    <section className="results-section" aria-labelledby="plan-heading">
      <h3 id="plan-heading">Plan de 30 días</h3>
      <p>
        Del <strong>{fmt.date(plan.startDate)}</strong> al <strong>{fmt.date(plan.endDate)}</strong>
        , en cuatro etapas que reparten el presupuesto en 10, 20, 30 y 40&nbsp;%.
      </p>
      <StageBar plan={plan} />
      <PlanTable plan={plan} currency={result.currency} fmt={fmt} caption="Etapas del plan" />
      <p className="note">{STAGE_REVIEW_TEXT}</p>

      {result.notices.includes('fragmentedPlan') && (
        <Notice tone="info" title="Planificación muy fragmentada">
          <p>
            El presupuesto es tan pequeño que algunos días quedan con importe cero. El reparto es
            exacto, pero tiene poco sentido práctico como plan diario.
          </p>
        </Notice>
      )}

      <details className="disclosure">
        <summary>Calendario diario (30 días)</summary>
        <div className="disclosure-body">
          <DailyCalendar
            plan={plan}
            currency={result.currency}
            fmt={fmt}
            caption="Importe exacto de cada día"
          />
          <p className="note">{REQUIRED_TEXT.dailyAverages}</p>
        </div>
      </details>
    </section>
  )
}

/** Resultados explicados del escenario elegido y su plan completo. */
export function Results({ result, fmt, excessAccepted, onPrint }: ResultsProps) {
  const scenario = result.selectedScenario
  const plan = result.selectedPlan
  if (!scenario) return null

  return (
    <section className="results" aria-labelledby="results-heading">
      <h3 id="results-heading">Resultados</h3>
      <KeyFigures result={result} scenario={scenario} fmt={fmt} />
      <CommissionSplit scenario={scenario} />

      {scenario.exceedsAvailable && result.availableMinor !== null && (
        <Notice tone="warning" title="Supera tu disponibilidad">
          <p>
            El presupuesto es {fmt.money(scenario.budgetMinor, result.currency)} y tu dinero
            disponible es {fmt.money(result.availableMinor, result.currency)}.
            {excessAccepted ? ' Elegiste continuar con este importe.' : ''}
          </p>
        </Notice>
      )}

      <CommissionBreakdown result={result} fmt={fmt} />
      <ConditionalReturn scenario={scenario} fmt={fmt} />

      {plan ? (
        <PlanSection plan={plan} result={result} fmt={fmt} />
      ) : (
        <Notice tone="info" title="Falta la fecha de inicio">
          <p>Elige una fecha de inicio válida para ver el plan y el calendario.</p>
        </Notice>
      )}

      <ul className="disclaimers">
        <li>{REQUIRED_TEXT.methodology}</li>
        <li>{REQUIRED_TEXT.noGuarantee}</li>
        <li>{REQUIRED_TEXT.dailyAverages}</li>
      </ul>

      <div className="results-actions">
        <button type="button" className="btn btn-primary" onClick={onPrint} disabled={!plan}>
          <PrinterIcon />
          Imprimir o guardar como PDF
        </button>
      </div>
    </section>
  )
}
