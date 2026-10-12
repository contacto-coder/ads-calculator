import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { REQUIRED_TEXT } from '../messages'
import { STORAGE_KEY } from '../storage/simulationStorage'
import {
  completeToPlan,
  completeToScenarios,
  continueStep,
  fillProperty,
  fillSingleCommission,
  freezeToday,
  renderApp,
  report,
  scenarioRadio,
  stepCard,
  stepHeading,
  stepTitle,
  summary,
  tableRows,
} from '../test/harness'

beforeEach(freezeToday)
afterEach(() => vi.useRealTimers())

const currencySelect = () => screen.getByLabelText('Moneda')
const closingPrice = () => screen.getByLabelText('Precio de cierre estimado')

/** Avanza con Tab hasta el elemento; falla si no se alcanza con el teclado. */
async function tabTo(user: UserEvent, element: HTMLElement): Promise<void> {
  for (let presses = 0; presses < 40; presses += 1) {
    if (document.activeElement === element) return
    await user.tab()
  }
  expect(element).toHaveFocus()
}

describe('cambio de moneda', () => {
  it('sin importes escritos cambia directamente', async () => {
    const { user } = renderApp()
    await user.selectOptions(currencySelect(), 'USD')
    await user.selectOptions(currencySelect(), 'EUR')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(currencySelect()).toHaveValue('EUR')
  })

  it('cancelar conserva la moneda y todos los números', async () => {
    const { user } = renderApp()
    await fillProperty(user, { currency: 'USD', closingPrice: '200000' })

    await user.selectOptions(currencySelect(), 'MXN')
    const dialog = screen.getByRole('alertdialog', { name: '¿Cambiar la moneda a MXN?' })
    expect(dialog).toHaveAccessibleDescription(REQUIRED_TEXT.currencyChange)

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(currencySelect()).toHaveValue('USD')
    expect(closingPrice()).toHaveValue('200000')
    expect(closingPrice()).toHaveAccessibleDescription(/USD/)
  })

  it('aceptar cambia la denominación sin convertir los números', async () => {
    const { user } = renderApp()
    await fillProperty(user, { currency: 'USD', closingPrice: '200000' })
    await continueStep(user)
    await fillSingleCommission(user, '5', '50')
    expect(within(summary()).getByText('USD 5,000.00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Paso 1: Propiedad/ }))

    await user.selectOptions(currencySelect(), 'MXN')
    await user.click(screen.getByRole('button', { name: 'Cambiar a MXN' }))

    expect(currencySelect()).toHaveValue('MXN')
    expect(closingPrice()).toHaveValue('200000')
    expect(closingPrice()).toHaveAccessibleDescription(/MXN/)
    expect(within(summary()).getByText('MXN 5,000.00')).toBeInTheDocument()
    expect(screen.queryByText(/USD 5,000\.00/)).not.toBeInTheDocument()
  })

  it('el país no cambia la moneda', async () => {
    const { user } = renderApp()
    await user.selectOptions(currencySelect(), 'USD')
    await user.selectOptions(screen.getByLabelText('País (opcional)'), 'CO')
    expect(currencySelect()).toHaveValue('USD')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('Escape cancela el diálogo y devuelve el foco al selector', async () => {
    const { user } = renderApp()
    await fillProperty(user)
    currencySelect().focus()
    await user.selectOptions(currencySelect(), 'COP')

    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cambiar a COP' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(currencySelect()).toHaveValue('USD')
    expect(currencySelect()).toHaveFocus()
  })
})

describe('errores claros y asociados al campo', () => {
  it('al continuar sin datos marca los campos, los describe y enfoca el primero', async () => {
    const { user } = renderApp()
    await continueStep(user)

    expect(stepTitle()).toBe('Propiedad')
    expect(currencySelect()).toBeInvalid()
    expect(currencySelect()).toHaveAccessibleDescription(/Error: Elige una moneda\./)
    expect(closingPrice()).toBeInvalid()
    expect(closingPrice()).toHaveAccessibleDescription(/Error: Escribe el precio de cierre estimado\./)
    expect(currencySelect()).toHaveFocus()
    expect(screen.getByLabelText('Precio publicado (opcional)')).toBeValid()
  })

  it('no muestra errores mientras se escribe; sí al salir del campo', async () => {
    const { user } = renderApp()
    await user.type(closingPrice(), '-5')
    expect(closingPrice()).toBeValid()

    await user.tab()
    expect(closingPrice()).toBeInvalid()
    expect(closingPrice()).toHaveAccessibleDescription(/El valor no puede ser negativo\./)

    await user.clear(closingPrice())
    await user.type(closingPrice(), '200000')
    expect(closingPrice()).toBeValid()
  })

  it.each([
    ['0', /debe ser mayor que cero/],
    ['12.345', /sin separadores de miles/],
    ['abc', /Escribe solo números/],
    ['10.1234', /como máximo dos decimales/],
    ['Infinity', /Escribe un número válido/],
  ])('explica por qué no vale el precio de cierre "%s"', async (value, message) => {
    const { user } = renderApp()
    await user.selectOptions(currencySelect(), 'USD')
    await user.type(closingPrice(), value)
    await continueStep(user)
    expect(stepTitle()).toBe('Propiedad')
    expect(closingPrice()).toHaveAccessibleDescription(message)
    expect(closingPrice()).toHaveFocus()
  })

  it('valida porcentajes entre 0 y 100 con hasta cuatro decimales', async () => {
    const { user } = renderApp()
    await fillProperty(user)
    await continueStep(user)
    await fillSingleCommission(user, '101', '2.12345')
    await continueStep(user)

    expect(stepTitle()).toBe('Comisión')
    expect(screen.getByLabelText('Porcentaje de comisión')).toHaveAccessibleDescription(
      /debe estar entre 0 y 100/
    )
    expect(screen.getByLabelText('Tu participación final')).toHaveAccessibleDescription(
      /como máximo cuatro decimales/
    )
    expect(screen.getByLabelText('Porcentaje de comisión')).toHaveFocus()
  })
})

describe('navegación por teclado', () => {
  it('recorre el asistente completo sin ratón', async () => {
    const { user } = renderApp()
    await user.selectOptions(currencySelect(), 'USD')

    await tabTo(user, closingPrice())
    await user.keyboard('200000{Enter}')
    expect(stepHeading()).toHaveFocus()
    expect(stepTitle()).toBe('Comisión')

    await tabTo(user, screen.getByLabelText('Porcentaje de comisión'))
    await user.keyboard('5')
    await tabTo(user, screen.getByLabelText('Tu participación final'))
    await user.keyboard('50{Enter}')
    expect(stepHeading()).toHaveFocus()
    expect(stepTitle()).toBe('Capacidad')

    await tabTo(user, screen.getByLabelText('Dinero disponible para publicidad (opcional)'))
    await user.keyboard('{Enter}')
    expect(stepHeading()).toHaveFocus()
    expect(stepTitle()).toBe('Escenarios')

    await tabTo(user, scenarioRadio(5))
    await user.keyboard(' ')
    expect(scenarioRadio(5)).toBeChecked()
    await user.keyboard('{ArrowDown}')
    expect(scenarioRadio(10)).toBeChecked()

    await tabTo(user, screen.getByRole('button', { name: 'Continuar' }))
    await user.keyboard('{Enter}')
    expect(stepHeading()).toHaveFocus()
    expect(stepTitle()).toBe('Plan')

    await tabTo(user, screen.getByRole('button', { name: 'Imprimir o guardar como PDF' }))
    await tabTo(user, screen.getByRole('button', { name: 'Atrás' }))
    await user.keyboard('{Enter}')
    expect(stepHeading()).toHaveFocus()
    expect(stepTitle()).toBe('Escenarios')
  })

  it('el modelo de comisión se elige con las flechas', async () => {
    const { user } = renderApp()
    await fillProperty(user)
    await continueStep(user)

    await tabTo(user, screen.getByRole('radio', { name: 'Comisión única con reparto' }))
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: 'Comisión por puntas' })).toBeChecked()
    expect(screen.getByRole('group', { name: 'Captación' })).toBeInTheDocument()
  })

  it('los pasos bloqueados no reciben foco', async () => {
    const { user } = renderApp()
    expect(screen.getByRole('button', { name: /Paso 2: Comisión/ })).toBeDisabled()
    await user.tab()
    expect(screen.getByRole('button', { name: /Paso 1: Propiedad/ })).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('País (opcional)')).toHaveFocus()
  })
})

describe('semántica y avisos accesibles', () => {
  it('usa encabezados en orden y radios semánticos para los escenarios', async () => {
    const { user } = renderApp()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(2) // pantalla e informe
    await completeToScenarios(user)

    const group = screen.getByRole('group', { name: 'Inversión publicitaria' })
    expect(within(group).getAllByRole('radio')).toHaveLength(3)
    expect(scenarioRadio(5)).toHaveAccessibleDescription(/Presupuesto publicitario\s*USD\s250\.00/)
  })

  it('anuncia los resultados recalculados en una región de estado', async () => {
    const { user } = renderApp()
    const status = screen.getAllByRole('status').find((node) => node.className === 'visually-hidden')
    expect(status).toBeEmptyDOMElement()

    await fillProperty(user)
    await continueStep(user)
    await fillSingleCommission(user, '5', '50')
    expect(status).toHaveTextContent('Resultados actualizados. Comisión estimada: USD 5,000.00.')

    await continueStep(user)
    await continueStep(user)
    await user.click(scenarioRadio(20))
    expect(status).toHaveTextContent('Presupuesto del 20 %: USD 1,000.00.')
  })

  it('muestra siempre la moneda junto a los importes', async () => {
    const { user } = renderApp()
    await completeToScenarios(user, { currency: 'COP', closingPrice: '350000000' })
    const amounts = within(stepCard('Escenarios')).getAllByText(/\d\.\d{2}$/)
    expect(amounts.length).toBeGreaterThan(8)
    amounts.forEach((amount) => expect(amount).toHaveTextContent(/COP/))
  })
})

describe('imprimir', () => {
  it('lanza la impresión del navegador y el informe contiene cifras, fechas y supuestos', async () => {
    const print = vi.fn()
    vi.stubGlobal('print', print)
    const { user } = renderApp()
    await completeToScenarios(user, { available: '300' })
    // 10 % con 300 disponibles excede: hay que aceptar para llegar al plan.
    await user.click(scenarioRadio(10))
    await user.click(screen.getByRole('checkbox'))
    await continueStep(user)
    expect(stepTitle()).toBe('Plan')

    await user.click(screen.getByRole('button', { name: 'Imprimir o guardar como PDF' }))
    expect(print).toHaveBeenCalledTimes(1)

    const informe = within(report())
    expect(report()).toHaveTextContent('Presupuesto inmobiliario para Meta')
    expect(report()).toHaveTextContent('del 12 oct 2026 al 10 nov 2026')
    // Entradas
    expect(report()).toHaveTextContent('USD · Dólar estadounidense')
    expect(report()).toHaveTextContent('Precio de cierre estimadoUSD 200,000.00')
    expect(report()).toHaveTextContent('Comisión única con reparto')
    expect(report()).toHaveTextContent('5 % del precio de cierre; participación final 50 %')
    expect(report()).toHaveTextContent('Dinero disponible para publicidadUSD 300.00')
    // Desglose y escenario
    expect(informe.getByRole('table', { name: 'Desglose de la comisión' })).toBeInTheDocument()
    expect(report()).toHaveTextContent('Escenario elegido: inversión del 10 %')
    expect(report()).toHaveTextContent('Presupuesto publicitarioUSD 500.00')
    expect(report()).toHaveTextContent('Saldo después de publicidadUSD 4,500.00')
    expect(report()).toHaveTextContent('900.00 %')
    expect(report()).toHaveTextContent('Supera tu disponibilidad')
    // Etapas y calendario
    const stages = tableRows(informe.getByRole('table', { name: 'Etapas del plan de 30 días' }))
    expect(stages.slice(1, 5).map((row) => row[3])).toEqual([
      'USD 50.00',
      'USD 100.00',
      'USD 150.00',
      'USD 200.00',
    ])
    // Una tabla corta por etapa, para que ninguna se parta entre páginas.
    const stageCalendars = informe.getAllByRole('table', { name: /^Etapa \d: / })
    expect(stageCalendars).toHaveLength(4)
    const days = stageCalendars.flatMap((table) =>
      tableRows(table).filter((row) => /^\d+$/.test(row[0]))
    )
    expect(days.map((row) => row[0])).toEqual(Array.from({ length: 30 }, (_, day) => String(day + 1)))
    expect(days[0]).toEqual(['1', 'lun, 12 oct 2026', 'USD 7.15'])
    expect(days[29]).toEqual(['30', 'mar, 10 nov 2026', 'USD 22.22'])
    expect(report()).toHaveTextContent('Total de los 30 días: USD 500.00')
    // Aclaraciones
    for (const text of [
      REQUIRED_TEXT.commissionEstimate,
      REQUIRED_TEXT.balance,
      REQUIRED_TEXT.methodology,
      REQUIRED_TEXT.noGuarantee,
      REQUIRED_TEXT.dailyAverages,
    ]) {
      expect(report()).toHaveTextContent(text)
    }
  })

  it('el informe no contiene navegación, botones ni campos', async () => {
    const { user } = renderApp()
    await completeToPlan(user)

    const informe = within(report())
    for (const role of ['button', 'textbox', 'combobox', 'radio', 'checkbox', 'navigation', 'link']) {
      expect(informe.queryAllByRole(role)).toHaveLength(0)
    }
    expect(report().querySelectorAll('input, select, button, details')).toHaveLength(0)
    // La pantalla interactiva queda en un contenedor aparte que la hoja de
    // impresión oculta por completo.
    expect(report().closest('.screen-only')).toBeNull()
    expect(screen.getByRole('button', { name: 'Atrás' }).closest('.screen-only')).not.toBeNull()
    expect(report()).toHaveClass('print-only')
  })

  it('sin plan completo el informe lo indica y no se puede imprimir', async () => {
    const { user } = renderApp()
    expect(report()).toHaveTextContent('Completa los cinco pasos')
    await completeToScenarios(user)
    expect(screen.queryByRole('button', { name: 'Imprimir o guardar como PDF' })).not.toBeInTheDocument()
  })
})

describe('empezar de nuevo', () => {
  it('sin datos no pide confirmación', async () => {
    const { user } = renderApp()
    await user.click(screen.getByRole('button', { name: 'Empezar de nuevo' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(stepTitle()).toBe('Propiedad')
  })

  it('con datos pide confirmación; cancelar no pierde nada', async () => {
    const { user } = renderApp()
    await completeToScenarios(user)

    await user.click(screen.getByRole('button', { name: 'Empezar de nuevo' }))
    const dialog = screen.getByRole('alertdialog', { name: '¿Empezar de nuevo?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(stepTitle()).toBe('Escenarios')
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('al confirmar borra la simulación de la pantalla y del dispositivo', async () => {
    const { user } = renderApp()
    await completeToPlan(user)

    await user.click(screen.getByRole('button', { name: 'Empezar de nuevo' }))
    await user.click(screen.getByRole('button', { name: 'Borrar y empezar de nuevo' }))

    expect(stepTitle()).toBe('Propiedad')
    expect(currencySelect()).toHaveValue('')
    expect(closingPrice()).toHaveValue('')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.queryByText(/5,000\.00/)).not.toBeInTheDocument()
    expect(screen.getByTestId('save-indicator')).toHaveTextContent('se guardará automáticamente')
  })
})
