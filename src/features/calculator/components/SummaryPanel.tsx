import type { CalculationResult } from '../domain/types'
import type { Formatters } from '../format'
import { REQUIRED_TEXT } from '../messages'

interface SummaryPanelProps {
  result: CalculationResult | null
  fmt: Formatters
}

/**
 * Resumen en vivo. En escritorio es una tarjeta lateral; en móvil se reduce a
 * una barra fija abajo con las dos cifras clave (ver `.summary` en app.css),
 * para ver el efecto de cada dato sin tener que bajar.
 *
 * Se calcula siempre a partir de las entradas actuales: si dejan de ser
 * válidas, desaparece en vez de mostrar cifras obsoletas.
 */
export function SummaryPanel({ result, fmt }: SummaryPanelProps) {
  if (!result) {
    return (
      <div className="summary">
        <h2 className="summary-title">Resumen</h2>
        <p className="summary-empty">
          Completa la propiedad y la comisión para ver aquí tu comisión estimada.
        </p>
      </div>
    )
  }

  const { currency, selectedScenario: scenario, selectedPlan: plan } = result
  return (
    <div className="summary">
      <h2 className="summary-title">Resumen</h2>
      <dl className="summary-list">
        <div className="summary-item summary-item-key">
          <dt className="figure-label">Comisión estimada</dt>
          <dd className="figure-value">{fmt.money(result.advisorCommissionMinor, currency)}</dd>
          <dd className="figure-note summary-extra">{REQUIRED_TEXT.commissionEstimate}</dd>
        </div>
        {scenario && (
          <>
            <div className="summary-item summary-item-key">
              <dt className="figure-label">Presupuesto ({scenario.rate}&nbsp;%)</dt>
              <dd className="figure-value">{fmt.money(scenario.budgetMinor, currency)}</dd>
              {scenario.exceedsAvailable && (
                <dd className="summary-extra">
                  <span className="badge badge-warning">Supera tu disponibilidad</span>
                </dd>
              )}
            </div>
            <div className="summary-item summary-extra">
              <dt className="figure-label">Promedio diario</dt>
              <dd className="summary-value">{fmt.money(scenario.averageDailyMinor, currency)}</dd>
            </div>
            <div className="summary-item summary-extra">
              <dt className="figure-label">Saldo después de publicidad</dt>
              <dd className="summary-value">{fmt.money(scenario.balanceMinor, currency)}</dd>
              <dd className="figure-note">{REQUIRED_TEXT.balance}</dd>
            </div>
          </>
        )}
        {plan && (
          <div className="summary-item summary-extra">
            <dt className="figure-label">Fechas del plan</dt>
            <dd className="summary-value">
              {fmt.date(plan.startDate)} – {fmt.date(plan.endDate)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
