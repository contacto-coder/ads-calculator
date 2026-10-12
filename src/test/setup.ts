import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  // Primero se restauran los espías: algunas pruebas simulan un localStorage
  // que lanza errores y no debe quedar así para la limpieza.
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})
