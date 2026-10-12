import type { BudgetPlan, Currency } from '../domain/types'
import type { Formatters } from '../format'
import { STAGE_NAMES } from '../messages'

interface PlanTableProps {
  plan: BudgetPlan
  currency: Currency
  fmt: Formatters
  caption: string
}

/**
 * Etapas del plan. En pantallas estrechas cada fila se apila como tarjeta
 * (ver app.css); los roles explícitos conservan la semántica de tabla aunque
 * cambie el `display`.
 */
export function PlanTable({ plan, currency, fmt, caption }: PlanTableProps) {
  return (
    <table className="stack-table" role="table">
      <caption className="table-caption">{caption}</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th role="columnheader" scope="col">
            Etapa
          </th>
          <th role="columnheader" scope="col">
            Fechas
          </th>
          <th role="columnheader" scope="col" className="cell-number">
            Parte del presupuesto
          </th>
          <th role="columnheader" scope="col" className="cell-number">
            Importe de la etapa
          </th>
          <th role="columnheader" scope="col" className="cell-number">
            Promedio diario
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {plan.stages.map((stage) => (
          <tr role="row" key={stage.index}>
            <th role="rowheader" scope="row">
              {stage.index + 1}. {STAGE_NAMES[stage.index]}
            </th>
            <td role="cell" data-label="Fechas">
              {fmt.date(stage.startDate)} – {fmt.date(stage.endDate)}{' '}
              <span className="cell-days">({stage.dayCount} días)</span>
            </td>
            <td role="cell" data-label="Parte del presupuesto" className="cell-number">
              {stage.weightPercent}&nbsp;%
            </td>
            <td role="cell" data-label="Importe de la etapa" className="cell-number">
              {fmt.money(stage.totalMinor, currency)}
            </td>
            <td role="cell" data-label="Promedio diario" className="cell-number">
              {fmt.money(stage.averageDailyMinor, currency)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot role="rowgroup">
        <tr role="row">
          <th role="rowheader" scope="row">
            Total
          </th>
          <td role="cell" data-label="Fechas">
            {fmt.date(plan.startDate)} – {fmt.date(plan.endDate)}{' '}
            <span className="cell-days">(30 días)</span>
          </td>
          <td role="cell" data-label="Parte del presupuesto" className="cell-number">
            100&nbsp;%
          </td>
          <td role="cell" data-label="Importe total" className="cell-number">
            {fmt.money(plan.budgetMinor, currency)}
          </td>
          <td role="cell" className="cell-empty" aria-hidden="true" />
        </tr>
      </tfoot>
    </table>
  )
}
