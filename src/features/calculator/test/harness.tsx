import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { vi } from 'vitest'
import { CalculatorApp } from '../components/CalculatorApp'

/** "Hoy" fijo para que las fechas por defecto sean deterministas: 12 oct 2026. */
export const TODAY = new Date(2026, 9, 12, 10, 0, 0)

export function freezeToday(): void {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(TODAY)
}

export function renderApp() {
  const user = userEvent.setup()
  const view = render(<CalculatorApp />)
  return { user, ...view }
}

/** Título del paso actual. Se busca por id: el informe impreso tiene sus propios h2. */
export function stepHeading(): HTMLElement {
  const heading = document.getElementById('step-title')
  if (!heading) throw new Error('No se encontró el título del paso')
  return heading
}

export function stepTitle(): string | null {
  return stepHeading().textContent
}

export const stepCard = (name: string) => screen.getByRole('region', { name })
export const summary = () => screen.getByRole('complementary', { name: 'Resumen de la simulación' })
export const results = () => screen.getByRole('region', { name: 'Resultados' })
export const report = () => screen.getByRole('article', { name: 'Informe para imprimir' })

export async function continueStep(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
}

export async function goBack(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Atrás' }))
}

export async function replaceText(user: UserEvent, field: HTMLElement, value: string) {
  await user.clear(field)
  if (value !== '') await user.type(field, value)
}

export async function fillProperty(
  user: UserEvent,
  { currency = 'USD', closingPrice = '200000' } = {}
): Promise<void> {
  await user.selectOptions(screen.getByLabelText('Moneda'), currency)
  await replaceText(user, screen.getByLabelText('Precio de cierre estimado'), closingPrice)
}

export async function fillSingleCommission(user: UserEvent, rate = '5', share = '50') {
  await replaceText(user, screen.getByLabelText('Porcentaje de comisión'), rate)
  await replaceText(user, screen.getByLabelText('Tu participación final'), share)
}

interface FlowOptions {
  currency?: string
  closingPrice?: string
  rate?: string
  share?: string
  available?: string
}

/** Completa los pasos 1 a 3 con comisión única y deja la app en "Escenarios". */
export async function completeToScenarios(user: UserEvent, options: FlowOptions = {}) {
  const { rate, share, available = '', ...property } = options
  await fillProperty(user, property)
  await continueStep(user)
  await fillSingleCommission(user, rate, share)
  await continueStep(user)
  if (available !== '') {
    await user.type(screen.getByLabelText('Dinero disponible para publicidad (opcional)'), available)
  }
  await continueStep(user)
}

export const scenarioRadio = (rate: 5 | 10 | 20) =>
  screen.getByRole('radio', { name: `Inversión del ${rate} %` })

/** Completa todo el asistente con un escenario que no excede la disponibilidad. */
export async function completeToPlan(
  user: UserEvent,
  options: FlowOptions & { scenario?: 5 | 10 | 20 } = {}
) {
  const { scenario = 5, ...flow } = options
  await completeToScenarios(user, flow)
  await user.click(scenarioRadio(scenario))
  await continueStep(user)
}

export function setStartDate(value: string): void {
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value } })
}

/** Texto de una tabla fila por fila, con espacios normalizados. */
export function tableRows(table: HTMLElement): string[][] {
  return Array.from(table.querySelectorAll('tr')).map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) =>
      (cell.textContent ?? '').replace(/\s+/g, ' ').trim()
    )
  )
}
