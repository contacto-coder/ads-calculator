'use client'

import { useSyncExternalStore } from 'react'
import { APP_NAME } from '../messages'
import { Calculator } from './Calculator'

const subscribeNever = () => () => {}

/**
 * La calculadora depende del dispositivo (datos guardados, fecha local y
 * formato regional), así que solo se monta en el navegador. En el HTML
 * prerenderizado queda un marcador sin datos, igual para todo el mundo.
 */
export function CalculatorApp() {
  const isBrowser = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  )

  if (!isBrowser) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <h1 className="app-title">{APP_NAME}</h1>
          <p className="app-tagline" role="status">
            Cargando la calculadora…
          </p>
        </header>
        <noscript>
          <p>Esta calculadora necesita JavaScript para funcionar.</p>
        </noscript>
      </div>
    )
  }

  return <Calculator />
}
