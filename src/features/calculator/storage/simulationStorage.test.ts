import { describe, expect, it } from 'vitest'
import { createEmptyForm } from '../domain/form'
import type { SimulationForm } from '../domain/form'
import {
  STORAGE_KEY,
  clearSimulation,
  loadSimulation,
  saveSimulation,
} from './simulationStorage'
import type { SimulationProgress } from './simulationStorage'

const NOW = new Date('2026-10-12T18:30:00.000Z')

function createMemoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

function createFailingStorage() {
  const fail = () => {
    throw new DOMException('Acceso denegado', 'SecurityError')
  }
  return { getItem: fail, setItem: fail, removeItem: fail }
}

function form(): SimulationForm {
  return {
    ...createEmptyForm('2026-10-12'),
    country: 'MX',
    currency: 'MXN',
    closingPrice: '3500000,50',
    single: { kind: 'percentage', percentage: '5', fixed: '', advisorSharePercent: '50' },
    availableBudget: '0',
    selectedScenario: 10,
  }
}

const progress: SimulationProgress = {
  step: 4,
  excessAcceptance: { budgetMinor: 875000, availableMinor: 0 },
}

describe('simulationStorage', () => {
  it('usa la clave acordada', () => {
    expect(STORAGE_KEY).toBe('meta-real-estate-budget:v1')
  })

  it('devuelve vacío cuando no hay nada guardado', () => {
    expect(loadSimulation(createMemoryStorage())).toEqual({ status: 'empty' })
  })

  it('guarda y recupera las entradas tal como se escribieron', () => {
    const storage = createMemoryStorage()
    expect(saveSimulation(form(), progress, NOW, storage)).toEqual({
      ok: true,
      savedAt: '2026-10-12T18:30:00.000Z',
    })

    const loaded = loadSimulation(storage)
    expect(loaded).toEqual({
      status: 'loaded',
      saved: {
        schemaVersion: 1,
        calculationVersion: 1,
        savedAt: '2026-10-12T18:30:00.000Z',
        input: form(),
        progress,
      },
    })
  })

  it('guarda entradas, no resultados calculados', () => {
    const storage = createMemoryStorage()
    saveSimulation(form(), progress, NOW, storage)
    const raw = JSON.parse(storage.data.get(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    expect(Object.keys(raw).sort()).toEqual([
      'calculationVersion',
      'input',
      'progress',
      'savedAt',
      'schemaVersion',
    ])
    expect(JSON.stringify(raw)).not.toMatch(/advisorCommission|scenarios|stages|days/)
  })

  it('distingue disponibilidad vacía de cero al recuperar', () => {
    const storage = createMemoryStorage()
    saveSimulation({ ...form(), availableBudget: '' }, progress, NOW, storage)
    const empty = loadSimulation(storage)
    expect(empty.status === 'loaded' && empty.saved.input.availableBudget).toBe('')

    saveSimulation({ ...form(), availableBudget: '0' }, progress, NOW, storage)
    const zero = loadSimulation(storage)
    expect(zero.status === 'loaded' && zero.saved.input.availableBudget).toBe('0')
  })

  it.each([
    ['JSON inválido', '{no es json'],
    ['un valor que no es objeto', '"hola"'],
    ['null', 'null'],
    ['una lista', '[]'],
    ['otra versión de esquema', JSON.stringify({ schemaVersion: 2 })],
  ])('trata %s como dato dañado', (_name, raw) => {
    expect(loadSimulation(createMemoryStorage({ [STORAGE_KEY]: raw }))).toEqual({
      status: 'corrupt',
    })
  })

  it('rechaza un guardado con campos del tipo equivocado o fuera de catálogo', () => {
    const valid = {
      schemaVersion: 1,
      calculationVersion: 1,
      savedAt: NOW.toISOString(),
      input: form(),
      progress,
    }
    const variants: unknown[] = [
      { ...valid, calculationVersion: 99 },
      { ...valid, savedAt: 'ayer' },
      { ...valid, input: { ...form(), currency: 'BTC' } },
      { ...valid, input: { ...form(), closingPrice: 3500000 } },
      { ...valid, input: { ...form(), commissionModel: 'triple' } },
      { ...valid, input: { ...form(), selectedScenario: 15 } },
      { ...valid, input: { ...form(), single: { kind: 'percentage' } } },
      { ...valid, input: { ...form(), closingPrice: '9'.repeat(500) } },
      { ...valid, input: undefined },
      { ...valid, progress: { step: 9, excessAcceptance: null } },
      { ...valid, progress: { step: 4, excessAcceptance: { budgetMinor: -1, availableMinor: 0 } } },
      { ...valid, progress: { step: 4, excessAcceptance: { budgetMinor: 1.5, availableMinor: 0 } } },
    ]
    for (const variant of variants) {
      const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(variant) })
      expect(loadSimulation(storage), JSON.stringify(variant)).toEqual({ status: 'corrupt' })
    }
  })

  it('conserva borradores con formato inválido: validarlos es tarea del formulario', () => {
    const storage = createMemoryStorage()
    saveSimulation({ ...form(), closingPrice: '1,234.56' }, progress, NOW, storage)
    const loaded = loadSimulation(storage)
    expect(loaded.status === 'loaded' && loaded.saved.input.closingPrice).toBe('1,234.56')
  })

  it('descarta propiedades desconocidas al recuperar', () => {
    const storage = createMemoryStorage()
    saveSimulation(form(), progress, NOW, storage)
    const raw = JSON.parse(storage.data.get(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    raw.extra = 'x'
    ;(raw.input as Record<string, unknown>).ownerName = 'No debería guardarse'
    storage.data.set(STORAGE_KEY, JSON.stringify(raw))

    const loaded = loadSimulation(storage)
    expect(loaded.status).toBe('loaded')
    expect(JSON.stringify(loaded)).not.toMatch(/ownerName|extra/)
  })

  it('no lanza errores si el almacenamiento falla o no existe', () => {
    const failing = createFailingStorage()
    expect(loadSimulation(failing)).toEqual({ status: 'unavailable' })
    expect(saveSimulation(form(), progress, NOW, failing)).toEqual({ ok: false })
    expect(clearSimulation(failing)).toBe(false)

    expect(loadSimulation(null)).toEqual({ status: 'unavailable' })
    expect(saveSimulation(form(), progress, NOW, null)).toEqual({ ok: false })
    expect(clearSimulation(null)).toBe(false)
  })

  it('informa cuando se agota la cuota al guardar', () => {
    const storage = {
      ...createMemoryStorage(),
      setItem: () => {
        throw new DOMException('Cuota excedida', 'QuotaExceededError')
      },
    }
    expect(saveSimulation(form(), progress, NOW, storage)).toEqual({ ok: false })
  })

  it('borra la simulación guardada', () => {
    const storage = createMemoryStorage()
    saveSimulation(form(), progress, NOW, storage)
    expect(clearSimulation(storage)).toBe(true)
    expect(loadSimulation(storage)).toEqual({ status: 'empty' })
  })

  it('usa localStorage del navegador por defecto', () => {
    expect(saveSimulation(form(), progress, NOW)).toMatchObject({ ok: true })
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"schemaVersion":1')
    expect(loadSimulation()).toMatchObject({ status: 'loaded' })
  })
})
