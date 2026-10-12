import type { CalculationResult, CommissionPart } from '../domain/types'
import type { Formatters } from '../format'
import { COMMISSION_PART_LABELS } from '../messages'

interface CommissionBreakdownProps {
  result: CalculationResult
  fmt: Formatters
}

function basis(part: CommissionPart, fmt: Formatters): string {
  return part.ratePercent === null
    ? 'Importe fijo'
    : `${fmt.percent(part.ratePercent)} del precio de cierre`
}

/**
 * Desglose de la comisión por parte, con el mismo redondeo que el total.
 * Los roles explícitos conservan la semántica cuando la tabla se apila en
 * pantallas estrechas (ver `.stack-table` en app.css).
 */
export function CommissionBreakdown({ result, fmt }: CommissionBreakdownProps) {
  const { currency } = result
  return (
    <table className="stack-table" role="table">
      <caption className="table-caption">Desglose de la comisión</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th role="columnheader" scope="col">
            Concepto
          </th>
          <th role="columnheader" scope="col" className="cell-number">
            Comisión bruta
          </th>
          <th role="columnheader" scope="col" className="cell-number">
            Tu participación
          </th>
          <th role="columnheader" scope="col" className="cell-number">
            Tu parte
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {result.breakdown.map((part) => (
          <tr role="row" key={part.key}>
            <th role="rowheader" scope="row">
              {COMMISSION_PART_LABELS[part.key]}
              <span className="cell-detail">{basis(part, fmt)}</span>
            </th>
            <td role="cell" data-label="Comisión bruta" className="cell-number">
              {fmt.money(part.grossMinor, currency)}
            </td>
            <td role="cell" data-label="Tu participación" className="cell-number">
              {fmt.percent(part.advisorSharePercent)}
            </td>
            <td role="cell" data-label="Tu parte" className="cell-number">
              {fmt.money(part.advisorMinor, currency)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot role="rowgroup">
        <tr role="row">
          <th role="rowheader" scope="row" colSpan={3}>
            Comisión estimada
          </th>
          <td role="cell" data-label="Total" className="cell-number">
            {fmt.money(result.advisorCommissionMinor, currency)}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}
