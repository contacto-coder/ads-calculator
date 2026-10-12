import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { REQUIRED_TEXT } from '../messages'
import {
  completeToPlan,
  completeToScenarios,
  continueStep,
  fillProperty,
  fillSingleCommission,
  freezeToday,
  goBack,
  renderApp,
  replaceText,
  results,
  scenarioRadio,
  setStartDate,
  stepCard,
  stepTitle,
  summary,
  tableRows,
} from '../test/harness'

beforeEach(freezeToday)
afterEach(() => vi.useRealTimers())

describe('recorrido con comisión única', () => {
  it('completa los cinco pasos y muestra el ejemplo principal', async () => {
    const { user } = renderApp()
    expect(stepTitle()).toBe('Propiedad')
    expect(screen.getByText('Paso 1 de 5')).toBeInTheDocument()

    await fillProperty(user)
    await continueStep(user)
    expect(stepTitle()).toBe('Comisión')

    await fillSingleCommission(user, '5', '50')
    const commission = stepCard('Comisión')
    expect(within(commission).getByText('USD 5,000.00')).toBeInTheDocument()
    expect(within(commission).getByText(REQUIRED_TEXT.commissionEstimate)).toBeInTheDocument()
    await continueStep(user)

    expect(stepTitle()).toBe('Capacidad')
    expect(screen.getByText(/Disponibilidad desconocida/)).toBeInTheDocument()
    await continueStep(user)

    expect(stepTitle()).toBe('Escenarios')
    const scenarios = stepCard('Escenarios')
    expect(within(scenarios).getByText(REQUIRED_TEXT.chooseScenario)).toBeInTheDocument()
    expect(within(scenarios).getByText(REQUIRED_TEXT.methodology)).toBeInTheDocument()
    for (const amount of ['USD 250.00', 'USD 500.00', 'USD 1,000.00']) {
      expect(within(scenarios).getByText(amount)).toBeInTheDocument()
    }
    for (const average of ['USD 8.33', 'USD 16.67', 'USD 33.33']) {
      expect(within(scenarios).getByText(average)).toBeInTheDocument()
    }
    for (const balance of ['USD 4,750.00', 'USD 4,500.00', 'USD 4,000.00']) {
      expect(within(scenarios).getByText(balance)).toBeInTheDocument()
    }
    expect(within(scenarios).getAllByText(REQUIRED_TEXT.balance)).toHaveLength(3)

    await user.click(scenarioRadio(5))
    await continueStep(user)
    expect(stepTitle()).toBe('Plan')

    const figures = within(results())
    expect(figures.getAllByText('USD 5,000.00').length).toBeGreaterThan(0)
    expect(figures.getByText('5 %')).toBeInTheDocument()
    expect(figures.getAllByText('USD 250.00').length).toBeGreaterThan(0)
    expect(figures.getByText('USD 8.33')).toBeInTheDocument()
    expect(figures.getByText('USD 4,750.00')).toBeInTheDocument()
    expect(figures.getByText('1,900.00 %')).toBeInTheDocument()
    expect(figures.getAllByText(REQUIRED_TEXT.commissionEstimate).length).toBeGreaterThan(0)
    expect(figures.getByText(REQUIRED_TEXT.balance)).toBeInTheDocument()
    expect(figures.getByText(REQUIRED_TEXT.noGuarantee)).toBeInTheDocument()
    expect(figures.getAllByText(REQUIRED_TEXT.dailyAverages).length).toBeGreaterThan(0)
  })

  it('muestra las etapas y el calendario exacto con centavos', async () => {
    const { user } = renderApp()
    await completeToPlan(user)

    const stages = tableRows(within(results()).getByRole('table', { name: 'Etapas del plan' }))
    expect(stages.slice(1)).toEqual([
      ['1. Prueba inicial', '12 oct 2026 – 18 oct 2026 (7 días)', '10 %', 'USD 25.00', 'USD 3.57'],
      ['2. Revisión y ajustes', '19 oct 2026 – 25 oct 2026 (7 días)', '20 %', 'USD 50.00', 'USD 7.14'],
      ['3. Concentración', '26 oct 2026 – 1 nov 2026 (7 días)', '30 %', 'USD 75.00', 'USD 10.71'],
      [
        '4. Continuidad y seguimiento',
        '2 nov 2026 – 10 nov 2026 (9 días)',
        '40 %',
        'USD 100.00',
        'USD 11.11',
      ],
      ['Total', '12 oct 2026 – 10 nov 2026 (30 días)', '100 %', 'USD 250.00', ''],
    ])

    await user.click(screen.getByText('Calendario diario (30 días)'))
    const calendar = within(results()).getByRole('table', { name: 'Importe exacto de cada día' })
    const days = tableRows(calendar).filter((row) => /^\d+$/.test(row[0]))
    expect(days).toHaveLength(30)
    expect(days.map((row) => row[2])).toEqual([
      'USD 3.58',
      ...Array(6).fill('USD 3.57'),
      'USD 7.15',
      'USD 7.15',
      ...Array(5).fill('USD 7.14'),
      'USD 10.72',
      'USD 10.72',
      'USD 10.72',
      ...Array(4).fill('USD 10.71'),
      'USD 11.12',
      ...Array(8).fill('USD 11.11'),
    ])
    expect(days[0][1]).toBe('lun, 12 oct 2026')
    expect(days[29][1]).toBe('mar, 10 nov 2026')
    expect(within(calendar).getByText('Total de los 30 días').closest('tr')).toHaveTextContent(
      'USD 250.00'
    )
  })

  it('usa por defecto la fecha local de hoy y recalcula al cambiarla', async () => {
    const { user } = renderApp()
    await completeToPlan(user)
    expect(screen.getByLabelText('Fecha de inicio')).toHaveValue('2026-10-12')

    setStartDate('2028-02-01')
    const stages = tableRows(within(results()).getByRole('table', { name: 'Etapas del plan' }))
    expect(stages[4][1]).toBe('22 feb 2028 – 1 mar 2028 (9 días)')

    setStartDate('')
    expect(screen.getByLabelText('Fecha de inicio')).toBeInvalid()
    expect(screen.getByText('Elige una fecha de inicio.')).toBeInTheDocument()
    expect(within(results()).queryByRole('table', { name: 'Etapas del plan' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Imprimir o guardar como PDF' })).toBeDisabled()
  })

  it('no preselecciona ningún escenario y exige elegir uno', async () => {
    const { user } = renderApp()
    await completeToScenarios(user)

    for (const rate of [5, 10, 20] as const) expect(scenarioRadio(rate)).not.toBeChecked()

    await continueStep(user)
    expect(stepTitle()).toBe('Escenarios')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Elige una de las tres inversiones para continuar.'
    )
  })
})

describe('recorrido con comisión por puntas', () => {
  it('calcula captación y venta por separado', async () => {
    const { user } = renderApp()
    await fillProperty(user)
    await continueStep(user)

    await user.click(screen.getByRole('radio', { name: 'Comisión por puntas' }))
    const listing = within(screen.getByRole('group', { name: 'Captación' }))
    const selling = within(screen.getByRole('group', { name: 'Venta' }))
    await user.type(listing.getByLabelText('Porcentaje de comisión'), '2')
    await user.type(listing.getByLabelText('Tu participación final'), '0')
    await user.type(selling.getByLabelText('Porcentaje de comisión'), '3')
    await user.type(selling.getByLabelText('Tu participación final'), '50')

    const commission = within(stepCard('Comisión'))
    expect(commission.getByText('USD 3,000.00')).toBeInTheDocument()
    expect(commission.getByText('Captación: USD 0.00')).toBeInTheDocument()
    expect(commission.getByText('Venta: USD 3,000.00')).toBeInTheDocument()

    await continueStep(user)
    await continueStep(user)
    await user.click(scenarioRadio(10))
    await continueStep(user)

    const breakdown = tableRows(within(results()).getByRole('table', { name: 'Desglose de la comisión' }))
    expect(breakdown.slice(1)).toEqual([
      ['Captación2 % del precio de cierre', 'USD 4,000.00', '0 %', 'USD 0.00'],
      ['Venta3 % del precio de cierre', 'USD 6,000.00', '50 %', 'USD 3,000.00'],
      ['Comisión estimada', 'USD 3,000.00'],
    ])
    expect(within(results()).getAllByText('USD 300.00').length).toBeGreaterThan(0)
    expect(within(results()).getByText('USD 2,700.00')).toBeInTheDocument()
  })

  it('admite un importe fijo en la moneda elegida', async () => {
    const { user } = renderApp()
    await fillProperty(user, { currency: 'PEN', closingPrice: '350000' })
    await continueStep(user)

    await user.click(screen.getByRole('radio', { name: 'Importe fijo' }))
    await user.type(screen.getByLabelText('Importe de la comisión'), '1200')
    await user.type(screen.getByLabelText('Tu participación final'), '25')

    expect(within(stepCard('Comisión')).getByText('PEN 300.00')).toBeInTheDocument()
    expect(screen.getByLabelText('Importe de la comisión')).toHaveAccessibleDescription(/PEN/)
  })
})

describe('volver atrás y editar', () => {
  it('recalcula todo al cambiar el precio de cierre, sin datos obsoletos', async () => {
    const { user } = renderApp()
    await completeToPlan(user)
    expect(within(results()).getAllByText('USD 250.00').length).toBeGreaterThan(0)

    for (let step = 0; step < 4; step += 1) await goBack(user)
    expect(stepTitle()).toBe('Propiedad')
    expect(screen.getByLabelText('Precio de cierre estimado')).toHaveValue('200000')

    await user.clear(screen.getByLabelText('Precio de cierre estimado'))
    // Con el cierre vacío no hay cálculo válido: no puede quedar ninguna cifra anterior.
    expect(screen.queryByText(/5,000\.00/)).not.toBeInTheDocument()
    expect(screen.queryByText(/250\.00/)).not.toBeInTheDocument()
    expect(within(summary()).getByText(/Completa la propiedad y la comisión/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Precio de cierre estimado'), '400000')
    expect(within(summary()).getByText('USD 10,000.00')).toBeInTheDocument()
    expect(within(summary()).getByText('USD 500.00')).toBeInTheDocument()
    expect(screen.queryByText(/5,000\.00/)).not.toBeInTheDocument()

    for (let step = 0; step < 3; step += 1) await continueStep(user)
    expect(scenarioRadio(5)).toBeChecked()
    await continueStep(user)
    expect(stepTitle()).toBe('Plan')
    const stages = tableRows(within(results()).getByRole('table', { name: 'Etapas del plan' }))
    expect(stages.slice(1).map((row) => row[3])).toEqual([
      'USD 50.00',
      'USD 100.00',
      'USD 150.00',
      'USD 200.00',
      'USD 500.00',
    ])
    expect(within(results()).getByText('USD 9,500.00')).toBeInTheDocument()
  })

  it('conserva la información al retroceder y avanzar', async () => {
    const { user } = renderApp()
    await completeToScenarios(user, { available: '300' })
    await goBack(user)
    expect(screen.getByLabelText('Dinero disponible para publicidad (opcional)')).toHaveValue('300')
    await goBack(user)
    expect(screen.getByLabelText('Porcentaje de comisión')).toHaveValue('5')
    expect(screen.getByLabelText('Tu participación final')).toHaveValue('50')
    await goBack(user)
    expect(screen.getByLabelText('Moneda')).toHaveValue('USD')
  })

  it('permite saltar a un paso anterior desde el indicador, pero no a uno bloqueado', async () => {
    const { user } = renderApp()
    await completeToScenarios(user)

    expect(screen.getByRole('button', { name: /Paso 5: Plan/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Paso 1: Propiedad/ }))
    expect(stepTitle()).toBe('Propiedad')
    expect(screen.getByRole('button', { name: /Paso 1: Propiedad/ })).toHaveAttribute(
      'aria-current',
      'step'
    )
    await user.click(screen.getByRole('button', { name: /Paso 4: Escenarios/ }))
    expect(stepTitle()).toBe('Escenarios')
  })
})

describe('cambio de modelo de comisión', () => {
  it('mantiene los borradores pero calcula solo el modelo activo', async () => {
    const { user } = renderApp()
    await fillProperty(user)
    await continueStep(user)
    await fillSingleCommission(user, '5', '50')
    const commission = within(stepCard('Comisión'))
    expect(commission.getByText('USD 5,000.00')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Comisión por puntas' }))
    // El borrador de comisión única no participa: las puntas están vacías.
    expect(commission.getByText(/Completa los campos/)).toBeInTheDocument()
    expect(screen.queryByText(/5,000\.00/)).not.toBeInTheDocument()

    const listing = within(screen.getByRole('group', { name: 'Captación' }))
    const selling = within(screen.getByRole('group', { name: 'Venta' }))
    await user.type(listing.getByLabelText('Porcentaje de comisión'), '2')
    await user.type(listing.getByLabelText('Tu participación final'), '100')
    await user.type(selling.getByLabelText('Porcentaje de comisión'), '3')
    await user.type(selling.getByLabelText('Tu participación final'), '100')
    expect(commission.getByText('USD 10,000.00')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Comisión única con reparto' }))
    expect(screen.getByLabelText('Porcentaje de comisión')).toHaveValue('5')
    expect(screen.getByLabelText('Tu participación final')).toHaveValue('50')
    expect(commission.getByText('USD 5,000.00')).toBeInTheDocument()
    expect(screen.queryByText(/10,000\.00/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Comisión por puntas' }))
    const listingAgain = within(screen.getByRole('group', { name: 'Captación' }))
    expect(listingAgain.getByLabelText('Porcentaje de comisión')).toHaveValue('2')
    expect(listingAgain.getByLabelText('Tu participación final')).toHaveValue('100')
    expect(commission.getByText('USD 10,000.00')).toBeInTheDocument()
  })

  it('conserva por separado el porcentaje y el importe fijo', async () => {
    const { user } = renderApp()
    await fillProperty(user)
    await continueStep(user)
    await fillSingleCommission(user, '5', '50')

    await user.click(screen.getByRole('radio', { name: 'Importe fijo' }))
    expect(screen.getByLabelText('Importe de la comisión')).toHaveValue('')
    await user.type(screen.getByLabelText('Importe de la comisión'), '1200')
    expect(within(stepCard('Comisión')).getByText('USD 600.00')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Porcentaje del precio de cierre' }))
    expect(screen.getByLabelText('Porcentaje de comisión')).toHaveValue('5')
    expect(within(stepCard('Comisión')).getByText('USD 5,000.00')).toBeInTheDocument()
  })
})

describe('comisión cero', () => {
  it('explica el caso y bloquea el plan de inversión', async () => {
    const { user } = renderApp()
    await fillProperty(user)
    await continueStep(user)
    await fillSingleCommission(user, '5', '0')
    expect(screen.getByText(/Con estos datos no recibirías comisión/)).toBeInTheDocument()

    await continueStep(user)
    await continueStep(user)
    expect(stepTitle()).toBe('Escenarios')
    expect(screen.getByText(/Tu comisión estimada es cero/)).toBeInTheDocument()
    for (const rate of [5, 10, 20] as const) expect(scenarioRadio(rate)).toBeDisabled()
    expect(screen.getAllByText(/No planificable/)).toHaveLength(3)

    await continueStep(user)
    expect(stepTitle()).toBe('Escenarios')
    expect(screen.getByRole('button', { name: /Paso 5: Plan/ })).toBeDisabled()
    expect(document.body.textContent).not.toMatch(/Infinity|NaN/)
  })
})

describe('entradas decimales', () => {
  it('acepta coma decimal y calcula igual que con punto', async () => {
    const { user } = renderApp()
    await fillProperty(user, { closingPrice: '100,01' })
    await continueStep(user)
    await fillSingleCommission(user, '2,5', '50')
    expect(within(stepCard('Comisión')).getByText('USD 1.25')).toBeInTheDocument()
  })

  it('rechaza separadores de miles con un mensaje claro', async () => {
    const { user } = renderApp()
    await user.selectOptions(screen.getByLabelText('Moneda'), 'USD')
    await replaceText(user, screen.getByLabelText('Precio de cierre estimado'), '200,000.00')
    await continueStep(user)

    expect(stepTitle()).toBe('Propiedad')
    expect(screen.getByLabelText('Precio de cierre estimado')).toHaveAccessibleDescription(
      /sin separadores de miles/
    )
  })
})
