import type { ReactNode } from 'react'

export interface ControlProps {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

interface FieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  /** Texto de apoyo junto al control (moneda, %) que también se lee al enfocarlo. */
  affix?: string
  /**
   * Lectura de lo escrito ("Se lee: USD 350,000.00"). Si se pasa, aunque sea
   * `null`, su línea queda reservada para que la interfaz no salte al escribir.
   */
  readback?: string | null
  children: (control: ControlProps) => ReactNode
}

/**
 * Envoltura común de un campo: etiqueta real, ayuda, lectura y error
 * asociados al control mediante aria-describedby.
 */
export function Field({ id, label, hint, error, affix, readback, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const affixId = affix ? `${id}-affix` : undefined
  const readbackId = readback ? `${id}-readback` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, affixId, readbackId, errorId].filter(Boolean).join(' ') || undefined

  const control = children({
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
  })

  return (
    <div className={error ? 'field field-invalid' : 'field'}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
      {affix ? (
        <div className="input-affix">
          {control}
          <span className="input-affix-text" id={affixId}>
            {affix}
          </span>
        </div>
      ) : (
        control
      )}
      {readback !== undefined && !error && (
        <p className="field-readback" id={readbackId}>
          {readback ?? ' '}
        </p>
      )}
      {error && (
        <p className="field-error" id={errorId}>
          <span className="visually-hidden">Error:</span>{' '}
          {error}
        </p>
      )}
    </div>
  )
}
