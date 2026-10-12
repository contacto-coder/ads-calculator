interface RadioOptionProps {
  id: string
  name: string
  title: string
  description?: string
  checked: boolean
  onSelect: () => void
}

/** Opción de un grupo de radios con título y explicación opcional. */
export function RadioOption({ id, name, title, description, checked, onSelect }: RadioOptionProps) {
  const titleId = `${id}-title`
  const descriptionId = description ? `${id}-description` : undefined
  return (
    <label className={checked ? 'radio-option radio-option-checked' : 'radio-option'} htmlFor={id}>
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onChange={onSelect}
      />
      <span className="radio-option-text">
        <span className="radio-option-title" id={titleId}>
          {title}
        </span>
        {description && (
          <span className="radio-option-description" id={descriptionId}>
            {description}
          </span>
        )}
      </span>
    </label>
  )
}
