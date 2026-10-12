import { STEP_LABELS } from '../messages'
import { STEP_NUMBERS } from '../storage/simulationStorage'
import type { StepNumber } from '../storage/simulationStorage'
import { CheckIcon } from './icons'

interface StepIndicatorProps {
  current: StepNumber
  maxReachable: StepNumber
  onSelect: (step: StepNumber) => void
}

/** Un paso está completado cuando él y todos los anteriores son válidos. */
function isDone(step: StepNumber, current: StepNumber, maxReachable: StepNumber): boolean {
  return step !== current && step < maxReachable
}

function stepStatus(step: StepNumber, current: StepNumber, maxReachable: StepNumber): string {
  if (step === current) return 'paso actual'
  if (isDone(step, current, maxReachable)) return 'completado'
  return step <= maxReachable ? 'disponible' : 'pendiente'
}

/** Pasos numerados. Se puede saltar a cualquier paso cuyos anteriores sean válidos. */
export function StepIndicator({ current, maxReachable, onSelect }: StepIndicatorProps) {
  return (
    <nav className="steps" aria-label="Pasos de la calculadora">
      <ol className="steps-list">
        {STEP_NUMBERS.map((step) => {
          const isCurrent = step === current
          const reachable = step <= maxReachable
          const done = isDone(step, current, maxReachable)
          const className = [
            'steps-item',
            isCurrent ? 'steps-item-current' : '',
            done ? 'steps-item-done' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <li key={step} className={className}>
              <button
                type="button"
                className="steps-button"
                aria-current={isCurrent ? 'step' : undefined}
                disabled={!reachable && !isCurrent}
                onClick={() => onSelect(step)}
              >
                <span className="steps-number" aria-hidden="true">
                  {done ? <CheckIcon /> : step}
                </span>
                <span className="steps-label">
                  <span className="visually-hidden">Paso {step}:</span> {STEP_LABELS[step]}{' '}
                  <span className="visually-hidden">
                    ({stepStatus(step, current, maxReachable)})
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
