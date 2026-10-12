import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../storage/simulationStorage'
import {
  completeToPlan,
  completeToScenarios,
  continueStep,
  fillProperty,
  freezeToday,
  renderApp,
  results,
  scenarioRadio,
  stepTitle,
  summary,
} from '../test/harness'

beforeEach(freezeToday)
afterEach(() => vi.useRealTimers())

const saveIndicator = () => screen.getByTestId('save-indicator')
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown

describe('guardado automático local', () => {
  it('no guarda nada hasta que hay datos y lo indica', () => {
    renderApp()
    expect(saveIndicator()).toHaveTextContent('se guardará automáticamente en este dispositivo')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('guarda las entradas, no los resultados, y muestra el indicador', async () => {
    const { user } = renderApp()
    await completeToScenarios(user, { available: '300' })
    await user.click(scenarioRadio(10))

    expect(saveIndicator()).toHaveTextContent(/Guardado automáticamente en este dispositivo · \d/)
    expect(stored()).toMatchObject({
      schemaVersion: 1,
      calculationVersion: 1,
      input: {
        currency: 'USD',
        closingPrice: '200000',
        commissionModel: 'single',
        single: { kind: 'percentage', percentage: '5', advisorSharePercent: '50' },
        availableBudget: '300',
        selectedScenario: 10,
        startDate: '2026-10-12',
      },
      progress: { step: 4, excessAcceptance: null },
    })
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toMatch(/budgetMinor":50000|stages|days/)
  })

  it('recupera la simulación, el paso y la aceptación al recargar', async () => {
    const first = renderApp()
    await completeToScenarios(first.user, { available: '300' })
    await first.user.click(scenarioRadio(10))
    await first.user.click(screen.getByRole('checkbox'))
    first.unmount()

    const { user } = renderApp()
    expect(stepTitle()).toBe('Escenarios')
    expect(scenarioRadio(10)).toBeChecked()
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(within(summary()).getByText('USD 5,000.00')).toBeInTheDocument()
    expect(saveIndicator()).toHaveTextContent(/Guardado automáticamente/)

    await continueStep(user)
    expect(stepTitle()).toBe('Plan')
    expect(within(results()).getAllByText('USD 500.00').length).toBeGreaterThan(0)
  })

  it('recalcula al recuperar: los resultados salen de las entradas guardadas', async () => {
    const first = renderApp()
    await completeToPlan(first.user)
    first.unmount()

    // Se altera una entrada guardada: el resultado debe seguirla.
    const saved = stored() as { input: { closingPrice: string } }
    saved.input.closingPrice = '400000'
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))

    renderApp()
    expect(stepTitle()).toBe('Plan')
    expect(within(results()).getAllByText('USD 10,000.00').length).toBeGreaterThan(0)
    expect(within(results()).getAllByText('USD 500.00').length).toBeGreaterThan(0)
    expect(screen.queryByText(/5,000\.00/)).not.toBeInTheDocument()
  })

  it('distingue disponibilidad vacía de cero después de recargar', async () => {
    const first = renderApp()
    await completeToScenarios(first.user, { available: '0' })
    first.unmount()

    const second = renderApp()
    expect(within(scenarioRadio(5).closest('label') as HTMLElement).getByText('Supera tu disponibilidad'))
      .toBeInTheDocument()
    second.unmount()
    window.localStorage.clear()

    const third = renderApp()
    await completeToScenarios(third.user)
    third.unmount()
    renderApp()
    expect(screen.queryByText('Supera tu disponibilidad')).not.toBeInTheDocument()
  })

  it('si los datos guardados ya no son válidos, vuelve al paso que hay que corregir', async () => {
    const first = renderApp()
    await completeToPlan(first.user)
    first.unmount()

    const saved = stored() as { input: { closingPrice: string } }
    saved.input.closingPrice = '1,234.56'
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))

    renderApp()
    expect(stepTitle()).toBe('Propiedad')
    expect(screen.getByLabelText('Precio de cierre estimado')).toHaveValue('1,234.56')
    expect(screen.getByLabelText('Precio de cierre estimado')).toBeInvalid()
  })
})

describe('almacenamiento dañado', () => {
  it.each([
    ['JSON ilegible', '{{{'],
    ['otra versión', JSON.stringify({ schemaVersion: 7, input: {} })],
    ['campos inválidos', JSON.stringify({ schemaVersion: 1, calculationVersion: 1, input: 5 })],
  ])('avisa con %s sin bloquear la app', async (_name, raw) => {
    window.localStorage.setItem(STORAGE_KEY, raw)
    const { user } = renderApp()

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo recuperar la simulación guardada')
    // Nada se borra hasta que la persona actúa.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw)

    await completeToPlan(user)
    expect(within(results()).getAllByText('USD 250.00').length).toBeGreaterThan(0)
    expect(stored()).toMatchObject({ schemaVersion: 1, input: { closingPrice: '200000' } })
  })

  it('permite reiniciar: borra los datos dañados y oculta el aviso', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'no es json')
    const { user } = renderApp()

    await user.click(screen.getByRole('button', { name: 'Borrar los datos dañados' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(stepTitle()).toBe('Propiedad')
  })

  it('permite descartar el aviso y seguir trabajando', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'no es json')
    const { user } = renderApp()

    await user.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await fillProperty(user)
    expect(stored()).toMatchObject({ input: { currency: 'USD' } })
  })
})

describe('almacenamiento no disponible', () => {
  function denyStorage(): void {
    const deny = () => {
      throw new DOMException('Acceso denegado', 'SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(deny)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(deny)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(deny)
  }

  it('la calculadora funciona completa aunque no pueda leer ni guardar', async () => {
    denyStorage()
    const { user } = renderApp()
    expect(saveIndicator()).toHaveTextContent('No se puede guardar en este dispositivo')

    await completeToPlan(user)
    expect(stepTitle()).toBe('Plan')
    expect(within(results()).getAllByText('USD 250.00').length).toBeGreaterThan(0)
    expect(saveIndicator()).toHaveTextContent('No se puede guardar en este dispositivo')
  })

  it('avisa si se agota la cuota al guardar y sigue calculando', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Cuota excedida', 'QuotaExceededError')
    })
    const { user } = renderApp()
    expect(saveIndicator()).toHaveTextContent('se guardará automáticamente')

    await fillProperty(user)
    expect(saveIndicator()).toHaveTextContent('No se puede guardar en este dispositivo')
    await continueStep(user)
    expect(stepTitle()).toBe('Comisión')
  })

  it('funciona si el navegador niega el acceso a localStorage', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Acceso denegado', 'SecurityError')
    })
    const { user } = renderApp()
    expect(saveIndicator()).toHaveTextContent('No se puede guardar en este dispositivo')
    await completeToPlan(user)
    expect(stepTitle()).toBe('Plan')
  })
})
