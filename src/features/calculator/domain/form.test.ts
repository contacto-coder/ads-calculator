import { describe, expect, it } from 'vitest'
import { calculate } from './calculate'
import { createEmptyForm, hasMonetaryAmounts, isPristineForm, toSimulationInput } from './form'
import type { SimulationForm } from './form'

function filledForm(overrides: Partial<SimulationForm> = {}): SimulationForm {
  return {
    ...createEmptyForm('2026-10-12'),
    currency: 'USD',
    closingPrice: '200000',
    single: { kind: 'percentage', percentage: '5', fixed: '', advisorSharePercent: '50' },
    ...overrides,
  }
}

const commissionOf = (form: SimulationForm) =>
  calculate(toSimulationInput(form)).result?.advisorCommissionMinor

describe('toSimulationInput', () => {
  it('envía al motor solo el modelo de comisión activo', () => {
    const input = toSimulationInput(filledForm())
    expect(input.commission).toEqual({
      kind: 'single',
      single: { kind: 'percentage', value: '5', advisorSharePercent: '50' },
    })
  })

  it('trata los opcionales vacíos como ausentes', () => {
    const input = toSimulationInput(filledForm({ availableBudget: '  ', listingPrice: '' }))
    expect(input.availableBudget).toBeUndefined()
    expect(input.listingPrice).toBeUndefined()
    expect(input.country).toBeUndefined()
    expect(toSimulationInput(filledForm({ availableBudget: '0' })).availableBudget).toBe('0')
  })

  // Aceptación 5
  it('el modelo inactivo nunca cambia los resultados', () => {
    const base = commissionOf(filledForm())
    expect(base).toBe(500000)

    const withValidSplitDrafts = filledForm({
      listing: { kind: 'percentage', percentage: '2', fixed: '', advisorSharePercent: '100' },
      selling: { kind: 'fixed', percentage: '', fixed: '99999', advisorSharePercent: '100' },
    })
    const withInvalidSplitDrafts = filledForm({
      listing: { kind: 'percentage', percentage: 'abc', fixed: '', advisorSharePercent: '500' },
      selling: { kind: 'fixed', percentage: '', fixed: '-1', advisorSharePercent: '' },
    })
    expect(commissionOf(withValidSplitDrafts)).toBe(base)
    expect(commissionOf(withInvalidSplitDrafts)).toBe(base)
    expect(calculate(toSimulationInput(withInvalidSplitDrafts)).errors).toEqual({})
  })

  it('con puntas activas, el borrador de comisión única no participa', () => {
    const splitForm = filledForm({
      commissionModel: 'split',
      listing: { kind: 'percentage', percentage: '2', fixed: '', advisorSharePercent: '0' },
      selling: { kind: 'percentage', percentage: '3', fixed: '', advisorSharePercent: '50' },
    })
    expect(commissionOf(splitForm)).toBe(300000)
    expect(
      commissionOf({
        ...splitForm,
        single: { kind: 'fixed', percentage: 'x', fixed: '1', advisorSharePercent: '' },
      })
    ).toBe(300000)
  })

  it('el valor del tipo de comisión inactivo tampoco participa', () => {
    const form = filledForm({
      single: { kind: 'percentage', percentage: '5', fixed: '777', advisorSharePercent: '50' },
    })
    expect(commissionOf(form)).toBe(500000)
    expect(commissionOf({ ...form, single: { ...form.single, kind: 'fixed' } })).toBe(38850)
  })
})

describe('estado del formulario', () => {
  it('detecta si hay importes escritos', () => {
    expect(hasMonetaryAmounts(createEmptyForm('2026-10-12'))).toBe(false)
    expect(hasMonetaryAmounts(filledForm())).toBe(true)
    expect(hasMonetaryAmounts({ ...createEmptyForm('2026-10-12'), availableBudget: '0' })).toBe(true)
    // Un porcentaje no es un importe: no cambia de sentido al cambiar la moneda.
    const onlyPercent = createEmptyForm('2026-10-12')
    onlyPercent.single.percentage = '5'
    expect(hasMonetaryAmounts(onlyPercent)).toBe(false)
  })

  it('reconoce el formulario sin datos', () => {
    expect(isPristineForm(createEmptyForm('2026-10-12'), '2026-10-12')).toBe(true)
    expect(isPristineForm(filledForm(), '2026-10-12')).toBe(false)
    expect(isPristineForm(createEmptyForm('2026-10-13'), '2026-10-12')).toBe(false)
    expect(isPristineForm({ ...createEmptyForm('2026-10-12'), selectedScenario: 5 }, '2026-10-12')).toBe(
      false
    )
  })
})
