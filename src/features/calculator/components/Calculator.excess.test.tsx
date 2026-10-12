import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  completeToScenarios,
  continueStep,
  freezeToday,
  goBack,
  renderApp,
  replaceText,
  results,
  scenarioRadio,
  stepCard,
  stepTitle,
} from '../test/harness'

beforeEach(freezeToday)
afterEach(() => vi.useRealTimers())

const ACCEPTANCE = /Entiendo que este presupuesto supera mi dinero disponible/
const acceptance = () => screen.getByRole('checkbox', { name: ACCEPTANCE })
const card = (rate: 5 | 10 | 20) => scenarioRadio(rate).closest('label') as HTMLElement

describe('escenario sobre la disponibilidad', () => {
  it('marca los escenarios que superan el dinero disponible', async () => {
    const { user } = renderApp()
    await completeToScenarios(user, { available: '300' })

    expect(within(card(5)).queryByText('Supera tu disponibilidad')).not.toBeInTheDocument()
    expect(within(card(10)).getByText('Supera tu disponibilidad')).toBeInTheDocument()
    expect(within(card(20)).getByText('Supera tu disponibilidad')).toBeInTheDocument()
    // Antes de elegir no hay aviso que aceptar.
    expect(screen.queryByRole('checkbox', { name: ACCEPTANCE })).not.toBeInTheDocument()
  })

  it('avisa, exige aceptación explícita y nunca cambia el importe', async () => {
    const { user } = renderApp()
    await completeToScenarios(user, { available: '300' })

    await user.click(scenarioRadio(10))
    const warning = screen.getByRole('alert')
    expect(warning).toHaveTextContent('Supera tu disponibilidad')
    expect(warning).toHaveTextContent('USD 500.00')
    expect(warning).toHaveTextContent('USD 300.00')
    expect(acceptance()).not.toBeChecked()

    await continueStep(user)
    expect(stepTitle()).toBe('Escenarios')
    expect(acceptance()).toBeInvalid()
    expect(acceptance()).toHaveAccessibleDescription(/Marca la casilla para confirmar/)

    await user.click(acceptance())
    expect(acceptance()).toBeChecked()
    await continueStep(user)

    expect(stepTitle()).toBe('Plan')
    expect(within(results()).getAllByText('USD 500.00').length).toBeGreaterThan(0)
    const notice = within(results()).getByText(/tu dinero disponible es USD 300\.00/)
    expect(notice).toHaveTextContent('Elegiste continuar con este importe.')
  })

  it('no pide aceptación cuando el presupuesto no supera la disponibilidad', async () => {
    const { user } = renderApp()
    await completeToScenarios(user, { available: '250' })

    // Igualdad: 250.00 de presupuesto con 250.00 disponibles no avisa.
    await user.click(scenarioRadio(5))
    expect(screen.queryByRole('checkbox', { name: ACCEPTANCE })).not.toBeInTheDocument()
    await continueStep(user)
    expect(stepTitle()).toBe('Plan')
  })

  it('con disponibilidad cero avisa en cualquier presupuesto; vacía no avisa', async () => {
    const { user } = renderApp()
    await completeToScenarios(user, { available: '0' })
    for (const rate of [5, 10, 20] as const) {
      expect(within(card(rate)).getByText('Supera tu disponibilidad')).toBeInTheDocument()
    }

    await goBack(user)
    expect(screen.getByText(/Sin dinero disponible/)).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Dinero disponible para publicidad (opcional)'))
    expect(screen.getByText(/Disponibilidad desconocida/)).toBeInTheDocument()
    await continueStep(user)
    expect(within(stepCard('Escenarios')).queryByText('Supera tu disponibilidad')).not.toBeInTheDocument()
  })

  it('invalida la aceptación al cambiar la disponibilidad', async () => {
    const { user } = renderApp()
    await completeToScenarios(user, { available: '300' })
    await user.click(scenarioRadio(10))
    await user.click(acceptance())
    expect(acceptance()).toBeChecked()

    await goBack(user)
    await replaceText(
      user,
      screen.getByLabelText('Dinero disponible para publicidad (opcional)'),
      '400'
    )
    await continueStep(user)

    expect(scenarioRadio(10)).toBeChecked()
    expect(acceptance()).not.toBeChecked()
    expect(screen.getByRole('alert')).toHaveTextContent('USD 400.00')
    await continueStep(user)
    expect(stepTitle()).toBe('Escenarios')
  })

  it('invalida la aceptación al cambiar el presupuesto', async () => {
    const { user } = renderApp()
    await completeToScenarios(user, { available: '300' })
    await user.click(scenarioRadio(10))
    await user.click(acceptance())

    // Otro escenario es otro presupuesto: hay que volver a aceptar.
    await user.click(scenarioRadio(20))
    expect(acceptance()).not.toBeChecked()
    await user.click(scenarioRadio(10))
    expect(acceptance()).not.toBeChecked()

    // Cambiar el precio de cierre también cambia el presupuesto.
    await user.click(acceptance())
    await user.click(screen.getByRole('button', { name: /Paso 1: Propiedad/ }))
    await replaceText(user, screen.getByLabelText('Precio de cierre estimado'), '300000')
    await user.click(screen.getByRole('button', { name: /Paso 4: Escenarios/ }))
    expect(stepTitle()).toBe('Escenarios')
    expect(screen.getByRole('alert')).toHaveTextContent('USD 750.00')
    expect(acceptance()).not.toBeChecked()
  })

  it('el aviso desaparece si el nuevo presupuesto ya no supera la disponibilidad', async () => {
    const { user } = renderApp()
    await completeToScenarios(user, { available: '300' })
    await user.click(scenarioRadio(10))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.click(scenarioRadio(5))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await continueStep(user)
    expect(stepTitle()).toBe('Plan')
  })
})
