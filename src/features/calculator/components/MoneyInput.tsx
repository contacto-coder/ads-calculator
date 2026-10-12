import { Field } from './Field'

interface MoneyInputProps {
  id: string
  label: string
  hint?: string
  error?: string
  value: string
  /** Código de moneda elegido; vacío si aún no se ha elegido. */
  currency: string
  /** Lo escrito, ya formateado con separadores, para comprobar la magnitud. */
  readback: string | null
  required?: boolean
  onChange: (value: string) => void
  onBlur?: () => void
}

/**
 * Importe como texto: acepta punto o coma decimal y no usa separadores de
 * miles. No es type="number" para que el navegador no reinterprete lo escrito.
 * Debajo se muestra cómo se lee la cifra, porque sin separadores es fácil
 * equivocarse con los ceros.
 */
export function MoneyInput({
  id,
  label,
  hint,
  error,
  value,
  currency,
  readback,
  required,
  onChange,
  onBlur,
}: MoneyInputProps) {
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      affix={currency || 'Sin moneda'}
      readback={readback}
    >
      {(control) => (
        <input
          {...control}
          className="input input-number"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-required={required || undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
      )}
    </Field>
  )
}
