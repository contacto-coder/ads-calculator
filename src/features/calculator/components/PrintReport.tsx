import type { SimulationForm } from '../domain/form'
import type { CalculationResult, CommissionPart } from '../domain/types'
import type { Formatters } from '../format'
import {
  APP_NAME,
  COMMISSION_PART_LABELS,
  CONDITIONAL_RETURN_TEXT,
  CURRENCY_NAMES,
  MEDIA_ONLY_TEXT,
  REQUIRED_TEXT,
  STAGE_REVIEW_TEXT,
  countryName,
} from '../messages'
import { CommissionBreakdown } from './CommissionBreakdown'
import { PlanTable } from './PlanTable'
import { PrintCalendar } from './PrintCalendar'

interface PrintReportProps {
  form: SimulationForm
  result: CalculationResult | null
  excessAccepted: boolean
  fmt: Formatters
}

function partText(part: CommissionPart, result: CalculationResult, fmt: Formatters): string {
  const base =
    part.ratePercent === null
      ? `importe fijo de ${fmt.money(part.grossMinor, result.currency)}`
      : `${fmt.percent(part.ratePercent)} del precio de cierre`
  return `${base}; participación final ${fmt.percent(part.advisorSharePercent)}`
}

interface InputsSectionProps {
  form: SimulationForm
  result: CalculationResult
  fmt: Formatters
}

function InputsSection({ form, result, fmt }: InputsSectionProps) {
  const { currency } = result
  const country = countryName(form.country)

  return (
    <section>
      <h2>Datos de la simulación</h2>
      <dl className="report-list">
        {country && (
          <div>
            <dt>País</dt>
            <dd>{country}</dd>
          </div>
        )}
        <div>
          <dt>Moneda</dt>
          <dd>
            {currency} · {CURRENCY_NAMES[currency]}
          </dd>
        </div>
        {result.listingPriceMinor !== null && (
          <div>
            <dt>Precio publicado</dt>
            <dd>{fmt.money(result.listingPriceMinor, currency)}</dd>
          </div>
        )}
        <div>
          <dt>Precio de cierre estimado</dt>
          <dd>{fmt.money(result.closingPriceMinor, currency)}</dd>
        </div>
        <div>
          <dt>Modelo de comisión</dt>
          <dd>
            {form.commissionModel === 'single' ? 'Comisión única con reparto' : 'Comisión por puntas'}
          </dd>
        </div>
        {result.breakdown.map((part) => (
          <div key={part.key}>
            <dt>{COMMISSION_PART_LABELS[part.key]}</dt>
            <dd>{partText(part, result, fmt)}</dd>
          </div>
        ))}
        <div>
          <dt>Dinero disponible para publicidad</dt>
          <dd>
            {result.availableMinor === null
              ? 'No indicado'
              : fmt.money(result.availableMinor, currency)}
          </dd>
        </div>
      </dl>
    </section>
  )
}

/**
 * Informe para imprimir o guardar como PDF. En pantalla está oculto
 * (`.print-only`); al imprimir es lo único visible: sin navegación, botones
 * ni campos.
 */
export function PrintReport({ form, result, excessAccepted, fmt }: PrintReportProps) {
  const scenario = result?.selectedScenario
  const plan = result?.selectedPlan

  if (!result || !scenario || !plan) {
    return (
      <article className="print-only report" aria-label="Informe para imprimir">
        <h1>{APP_NAME}</h1>
        <p>Completa los cinco pasos de la calculadora para generar el informe.</p>
      </article>
    )
  }

  const { currency } = result
  return (
    <article className="print-only report" aria-label="Informe para imprimir">
      <header>
        <h1>{APP_NAME}</h1>
        <p className="report-subtitle">
          Plan de inversión publicitaria del {fmt.date(plan.startDate)} al {fmt.date(plan.endDate)}{' '}
          (30 días)
        </p>
      </header>

      <InputsSection form={form} result={result} fmt={fmt} />

      <section>
        <h2>Comisión</h2>
        <CommissionBreakdown result={result} fmt={fmt} />
        <p>{REQUIRED_TEXT.commissionEstimate}</p>
      </section>

      <section>
        <h2>Escenario elegido: inversión del {scenario.rate}&nbsp;%</h2>
        <dl className="report-list">
          <div>
            <dt>Presupuesto publicitario</dt>
            <dd>{fmt.money(scenario.budgetMinor, currency)}</dd>
          </div>
          <div>
            <dt>Promedio diario</dt>
            <dd>{fmt.money(scenario.averageDailyMinor, currency)}</dd>
          </div>
          <div>
            <dt>Saldo después de publicidad</dt>
            <dd>
              {fmt.money(scenario.balanceMinor, currency)}. {REQUIRED_TEXT.balance}
            </dd>
          </div>
          {scenario.conditionalReturnPercent !== null && (
            <div>
              <dt>Retorno condicionado</dt>
              <dd>
                {fmt.fixedPercent(scenario.conditionalReturnPercent, 2)}. {CONDITIONAL_RETURN_TEXT}
              </dd>
            </div>
          )}
        </dl>
        {scenario.exceedsAvailable && result.availableMinor !== null && (
          <p className="report-note">
            <strong>Supera tu disponibilidad:</strong> el presupuesto es mayor que el dinero
            disponible indicado ({fmt.money(result.availableMinor, currency)}).
            {excessAccepted ? ' Se eligió continuar con este importe.' : ''}
          </p>
        )}
      </section>

      <section>
        <h2>Etapas</h2>
        <PlanTable plan={plan} currency={currency} fmt={fmt} caption="Etapas del plan de 30 días" />
        <p>{STAGE_REVIEW_TEXT}</p>
      </section>

      <section className="report-calendar">
        <h2>Calendario diario: importe exacto de cada día</h2>
        <PrintCalendar plan={plan} currency={currency} fmt={fmt} />
      </section>

      <section className="report-notes">
        <h2>Aclaraciones</h2>
        <ul>
          <li>{REQUIRED_TEXT.methodology}</li>
          <li>{REQUIRED_TEXT.noGuarantee}</li>
          <li>{REQUIRED_TEXT.dailyAverages}</li>
          <li>{MEDIA_ONLY_TEXT}</li>
          <li>
            Los importes son de planificación. Esta herramienta no está conectada con Meta ni con
            ninguna cuenta publicitaria.
          </li>
        </ul>
      </section>
    </article>
  )
}
