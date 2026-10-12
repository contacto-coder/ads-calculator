import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { CalculatorState } from '../state/calculatorState'
import { clearSimulation, saveSimulation } from '../storage/simulationStorage'

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saved'; savedAt: string }
  | { kind: 'unavailable' }

interface StatusStore {
  get(): SaveStatus
  set(status: SaveStatus): void
  subscribe(listener: () => void): () => void
}

function createStatusStore(initial: SaveStatus): StatusStore {
  let status = initial
  const listeners = new Set<() => void>()
  return {
    get: () => status,
    set(next) {
      status = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function initialStatus(state: CalculatorState): SaveStatus {
  if (state.storageUnavailable) return { kind: 'unavailable' }
  return state.restoredAt ? { kind: 'saved', savedAt: state.restoredAt } : { kind: 'idle' }
}

/**
 * Guarda la simulación en este dispositivo cada vez que cambian las entradas
 * y devuelve el estado para el indicador. Sin datos escritos no guarda nada;
 * si el almacenamiento falla, la calculadora sigue funcionando.
 */
export function useAutosave(state: CalculatorState, pristine: boolean): SaveStatus {
  const { form, step, excessAcceptance } = state
  const snapshot = useMemo(
    () => (pristine ? null : JSON.stringify({ form, step, excessAcceptance })),
    [pristine, form, step, excessAcceptance]
  )
  const [store] = useState(() => createStatusStore(initialStatus(state)))
  // Lo recuperado al abrir ya está guardado: no hace falta reescribirlo.
  const lastWritten = useRef(state.restoredAt ? snapshot : null)

  useEffect(() => {
    if (snapshot === lastWritten.current) return
    lastWritten.current = snapshot
    if (snapshot === null) {
      clearSimulation()
      store.set({ kind: 'idle' })
      return
    }
    const result = saveSimulation(form, { step, excessAcceptance }, new Date())
    store.set(result.ok ? { kind: 'saved', savedAt: result.savedAt } : { kind: 'unavailable' })
  }, [snapshot, form, step, excessAcceptance, store])

  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
