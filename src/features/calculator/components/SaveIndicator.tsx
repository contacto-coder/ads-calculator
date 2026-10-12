import type { Formatters } from '../format'
import type { SaveStatus } from '../hooks/useAutosave'

interface SaveIndicatorProps {
  status: SaveStatus
  fmt: Formatters
}

function describe(status: SaveStatus, fmt: Formatters): string {
  switch (status.kind) {
    case 'idle':
      return 'Lo que escribas se guardará automáticamente en este dispositivo.'
    case 'saved':
      return `Guardado automáticamente en este dispositivo · ${fmt.time(status.savedAt)}`
    case 'unavailable':
      return 'No se puede guardar en este dispositivo. La calculadora funciona igual, pero los datos se perderán al cerrar o recargar la página.'
  }
}

/** Indicador del guardado automático local. */
export function SaveIndicator({ status, fmt }: SaveIndicatorProps) {
  return (
    <p className={`save-indicator save-indicator-${status.kind}`} data-testid="save-indicator">
      <span className="save-indicator-dot" aria-hidden="true" />
      <span>{describe(status, fmt)}</span>
    </p>
  )
}
