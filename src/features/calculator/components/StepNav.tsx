import { ArrowLeftIcon, ArrowRightIcon } from './icons'

interface StepNavProps {
  onBack?: () => void
  /** Texto del botón principal; sin él no se muestra (último paso). */
  nextLabel?: string
}

/** Botones atrás / continuar, siempre visibles al final del paso. */
export function StepNav({ onBack, nextLabel }: StepNavProps) {
  return (
    <div className="step-nav">
      {onBack && (
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          <ArrowLeftIcon />
          Atrás
        </button>
      )}
      {nextLabel && (
        <button type="submit" className="btn btn-primary step-nav-next">
          {nextLabel}
          <ArrowRightIcon />
        </button>
      )}
    </div>
  )
}
