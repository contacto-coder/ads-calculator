import type { Currency, ScenarioResult } from '../domain/types'
import type { Formatters } from '../format'
import { REQUIRED_TEXT } from '../messages'

interface ScenarioCardProps {
  scenario: ScenarioResult
  currency: Currency
  checked: boolean
  fmt: Formatters
  onSelect: () => void
}

/** Un escenario como radio semántico: toda la tarjeta es la etiqueta. */
export function ScenarioCard({ scenario, currency, checked, fmt, onSelect }: ScenarioCardProps) {
  const id = `scenario-${scenario.rate}`
  const titleId = `${id}-title`
  const detailsId = `${id}-details`
  const className = [
    'scenario-card',
    checked ? 'scenario-card-checked' : '',
    scenario.plannable ? '' : 'scenario-card-disabled',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <label className={className} htmlFor={id}>
      <span className="scenario-card-header">
        <input
          id={id}
          className="scenario-card-radio"
          type="radio"
          name="scenario"
          value={scenario.rate}
          checked={checked}
          disabled={!scenario.plannable}
          aria-labelledby={titleId}
          aria-describedby={detailsId}
          onChange={onSelect}
        />
        <span className="scenario-card-title" id={titleId}>
          Inversión del {scenario.rate} %
        </span>
      </span>

      <span className="scenario-card-details" id={detailsId}>
        <span className="scenario-card-figure">
          <span className="figure-label">Presupuesto publicitario</span>
          <span className="figure-value">{fmt.money(scenario.budgetMinor, currency)}</span>
        </span>
        {/* Parte de la comisión que se va a publicidad. Decorativo: la cifra ya lo dice. */}
        <span className="share-bar" aria-hidden="true">
          <span className="share-bar-fill" style={{ width: `${scenario.rate}%` }} />
        </span>
        <span className="scenario-card-stats">
          <span className="scenario-card-stat">
            <span className="figure-label">Promedio diario (30 días)</span>
            <span className="stat-value">{fmt.money(scenario.averageDailyMinor, currency)}</span>
          </span>
          <span className="scenario-card-stat">
            <span className="figure-label">Saldo después de publicidad</span>
            <span className="stat-value">{fmt.money(scenario.balanceMinor, currency)}</span>
          </span>
        </span>
        <span className="scenario-card-note">{REQUIRED_TEXT.balance}</span>
        {scenario.exceedsAvailable && (
          <span className="badge badge-warning">Supera tu disponibilidad</span>
        )}
        {!scenario.plannable && (
          <span className="badge badge-muted">No planificable: el presupuesto redondea a cero</span>
        )}
      </span>
    </label>
  )
}
