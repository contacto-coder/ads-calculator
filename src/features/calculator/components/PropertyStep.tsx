import { CURRENCIES } from '../domain/types'
import type { Currency } from '../domain/types'
import { isCurrency } from '../domain/validation'
import { COUNTRIES, CURRENCY_NAMES, fieldId } from '../messages'
import { Field } from './Field'
import { MoneyInput } from './MoneyInput'
import { StepNav } from './StepNav'
import { errorText, moneyReadback } from './stepProps'
import type { StepProps } from './stepProps'

interface PropertyStepProps extends StepProps {
  /** Cambiar de moneda puede requerir confirmación: lo decide el contenedor. */
  onCurrencyChange: (currency: Currency) => void
}

export function PropertyStep(props: PropertyStepProps) {
  const { state, dispatch, fmt, onSubmit, onCurrencyChange } = props
  const { form } = state

  return (
    <form noValidate onSubmit={onSubmit}>
      <p className="step-intro">
        Empieza con los datos básicos de la venta que quieres planificar. Sirve para una venta
        individual de una propiedad de terceros.
      </p>

      <Field
        id="field-country"
        label="País (opcional)"
        hint="Solo como referencia. No cambia los cálculos, los contratos ni los impuestos."
      >
        {(control) => (
          <select
            {...control}
            className="input"
            value={form.country}
            onChange={(event) =>
              dispatch({ type: 'setField', field: 'country', value: event.target.value })
            }
          >
            <option value="">Sin especificar</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        id={fieldId('currency')}
        label="Moneda"
        hint="Todos los importes se expresan en esta moneda. No depende del país y no se hace conversión."
        error={errorText(props, 'currency')}
      >
        {(control) => (
          <select
            {...control}
            className="input"
            aria-required
            value={form.currency}
            onChange={(event) => {
              if (isCurrency(event.target.value)) onCurrencyChange(event.target.value)
            }}
            onBlur={() => dispatch({ type: 'touch', field: 'currency' })}
          >
            <option value="" disabled>
              Elige una moneda
            </option>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency} · {CURRENCY_NAMES[currency]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <MoneyInput
        id={fieldId('listingPrice')}
        label="Precio publicado (opcional)"
        hint="El precio con el que se anuncia la propiedad."
        error={errorText(props, 'listingPrice')}
        value={form.listingPrice}
        currency={form.currency}
        readback={moneyReadback(form.listingPrice, form.currency, fmt)}
        onChange={(value) => dispatch({ type: 'setField', field: 'listingPrice', value })}
        onBlur={() => dispatch({ type: 'touch', field: 'listingPrice' })}
      />

      <MoneyInput
        id={fieldId('closingPrice')}
        label="Precio de cierre estimado"
        hint="El precio que esperas acordar con el comprador."
        error={errorText(props, 'closingPrice')}
        value={form.closingPrice}
        currency={form.currency}
        readback={moneyReadback(form.closingPrice, form.currency, fmt)}
        required
        onChange={(value) => dispatch({ type: 'setField', field: 'closingPrice', value })}
        onBlur={() => dispatch({ type: 'touch', field: 'closingPrice' })}
      />

      <p className="format-hint">
        Escribe los importes sin separadores de miles. Puedes usar punto o coma para los decimales:
        250000.50 o 250000,50.
      </p>

      <StepNav nextLabel="Continuar" />
    </form>
  )
}
