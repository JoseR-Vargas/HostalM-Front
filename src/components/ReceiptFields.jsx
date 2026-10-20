import { RECEIPT_MONTHS } from '../lib/receipts';
import { formatMontoInputWithCaret } from '../lib/money';
import { useCaretRestore } from '../lib/useCaretRestore';
import { Field, FormRow } from './ui';

/**
 * Money input that adds thousands dots while typing and keeps the caret in place.
 * `name` is the form field; it is also the input id and the wrapper id suffix (`group-<name>`).
 */
export function ReceiptAmountField({ name, label, placeholder, errorMessage, hasError, value, onChange }) {
  const { inputRef, setCaret } = useCaretRestore();

  const handleChange = (event) => {
    const { value: masked, caret } = formatMontoInputWithCaret(event.target.value, event.target.selectionStart);
    onChange(name, masked);
    setCaret(caret);
  };

  return (
    <Field
      groupId={`group-${name}`}
      id={name}
      label={label}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      autoComplete="off"
      ref={inputRef}
      value={value}
      onChange={handleChange}
      error={hasError}
      errorMessage={errorMessage}
    />
  );
}

/**
 * Client, property, period and receipt date, shared by both receipt forms.
 * `errors` is the list of invalid field names; `onChange(name, value)` receives the edits.
 */
export function ReceiptIdentityFields({ values, errors, onChange }) {
  // The date input is named `fechaRecibo` but the form value is `fecha`.
  const handleChange = (event) =>
    onChange(event.target.name === 'fechaRecibo' ? 'fecha' : event.target.name, event.target.value);

  const field = (name, label, errorMessage, props, id = name) => (
    <Field
      groupId={`group-${name}`}
      id={id}
      label={label}
      value={values[name]}
      onChange={handleChange}
      error={errors.includes(name)}
      errorMessage={errorMessage}
      {...props}
    />
  );

  return (
    <>
      <FormRow>
        {field('cliente', 'Cliente', 'Ingresá el nombre del cliente', {
          type: 'text',
          placeholder: 'Ej: Jennifer Martínez',
          autoComplete: 'off',
        })}
        {field('propiedad', 'Propiedad', 'Ingresá la dirección o propiedad', {
          type: 'text',
          placeholder: 'Ej: Humberto Primo 3070 Habitación 4',
          autoComplete: 'off',
        })}
      </FormRow>

      <FormRow>
        {field('periodo', 'Período', 'Seleccioná el período', {
          as: 'select',
          children: (
            <>
              <option value="">— Seleccioná el mes —</option>
              {RECEIPT_MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </>
          ),
        })}
        {field('fecha', 'Fecha del recibo', 'Seleccioná la fecha del recibo', { type: 'date' }, 'fechaRecibo')}
      </FormRow>
    </>
  );
}
