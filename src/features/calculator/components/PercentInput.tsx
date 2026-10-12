import { Field } from './Field'

interface PercentInputProps {
  id: string
  label: string
  hint?: string
  error?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}

/** Porcentaje entre 0 y 100 como texto, con punto o coma decimal. */
export function PercentInput({ id, label, hint, error, value, onChange, onBlur }: PercentInputProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} affix="%">
      {(control) => (
        <input
          {...control}
          className="input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
      )}
    </Field>
  )
}
