import type { BudgetPlan, Currency } from '../domain/types'
import type { Formatters } from '../format'
import { STAGE_NAMES } from '../messages'

interface PrintCalendarProps {
  plan: BudgetPlan
  currency: Currency
  fmt: Formatters
}

/**
 * Calendario del informe impreso: una tabla corta por etapa, en dos columnas.
 * Así cada etapa cabe entera en la hoja y ninguna queda partida entre páginas,
 * cosa que pasaba con una sola tabla de 30 filas.
 */
export function PrintCalendar({ plan, currency, fmt }: PrintCalendarProps) {
  return (
    <>
      <div className="report-calendar-grid">
        {plan.stages.map((stage) => (
          <table key={stage.index} className="calendar-table">
            <caption className="table-caption">
              Etapa {stage.index + 1}: {STAGE_NAMES[stage.index]} ·{' '}
              {fmt.money(stage.totalMinor, currency)}
            </caption>
            <thead>
              <tr>
                <th scope="col">Día</th>
                <th scope="col">Fecha</th>
                <th scope="col" className="cell-number">
                  Importe
                </th>
              </tr>
            </thead>
            <tbody>
              {plan.days
                .filter((day) => day.stageIndex === stage.index)
                .map((day) => (
                  <tr key={day.dayNumber}>
                    <th scope="row">{day.dayNumber}</th>
                    <td>{fmt.weekdayDate(day.date)}</td>
                    <td className="cell-number">{fmt.money(day.amountMinor, currency)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ))}
      </div>
      <p className="report-total">
        Total de los 30 días: <strong>{fmt.money(plan.budgetMinor, currency)}</strong>
      </p>
    </>
  )
}
