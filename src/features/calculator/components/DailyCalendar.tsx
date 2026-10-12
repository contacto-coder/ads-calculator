import type { BudgetPlan, Currency } from '../domain/types'
import type { Formatters } from '../format'
import { STAGE_NAMES } from '../messages'

interface DailyCalendarProps {
  plan: BudgetPlan
  currency: Currency
  fmt: Formatters
  caption: string
}

/** Calendario exacto: los 30 días con su importe en centavos, por etapa. */
export function DailyCalendar({ plan, currency, fmt, caption }: DailyCalendarProps) {
  return (
    <table className="calendar-table">
      <caption className="table-caption">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Día</th>
          <th scope="col">Fecha</th>
          <th scope="col" className="cell-number">
            Importe
          </th>
        </tr>
      </thead>
      {plan.stages.map((stage) => (
        <tbody key={stage.index}>
          <tr className="calendar-stage-row">
            <th scope="rowgroup" colSpan={3}>
              Etapa {stage.index + 1}: {STAGE_NAMES[stage.index]} ·{' '}
              {fmt.money(stage.totalMinor, currency)}
            </th>
          </tr>
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
      ))}
      <tfoot>
        <tr>
          <th scope="row" colSpan={2}>
            Total de los 30 días
          </th>
          <td className="cell-number">{fmt.money(plan.budgetMinor, currency)}</td>
        </tr>
      </tfoot>
    </table>
  )
}
