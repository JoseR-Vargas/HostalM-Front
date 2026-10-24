import { RECEIPT_MONTHS } from '../lib/receipts';
import { formatMontoInputWithCaret } from '../lib/money';
import { useCaretRestore } from '../lib/useCaretRestore';
import DatePickerField from './DatePickerField';
import SelectField from './SelectField';
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
 * The period is a Preline Advanced Select (month name) and the date a Preline Advanced Datepicker (`YYYY-MM-DD`);
 * both fall back to the native controls if their plugin cannot be loaded.
 */
export function ReceiptIdentityFields({ values, errors, onChange }) {
  const handleChange = (event) => onChange(event.target.name, event.target.value);

  const field = (name, label, errorMessage, props) => (
    <Field
      groupId={`group-${name}`}
      id={name}
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
        <SelectField
          id="periodo"
          groupId="group-periodo"
          label="Período"
          placeholder="— Seleccioná el mes —"
          options={RECEIPT_MONTHS}
          value={values.periodo}
          onChange={handleChange}
          error={errors.includes('periodo')}
          errorMessage="Seleccioná el período"
        />
        {/* The input is `fechaRecibo` (hook id), the form value `fecha`. */}
        <DatePickerField
          id="fechaRecibo"
          name="fecha"
          groupId="group-fecha"
          label="Fecha del recibo"
          value={values.fecha}
          onChange={handleChange}
          error={errors.includes('fecha')}
          errorMessage="Seleccioná la fecha del recibo"
        />
      </FormRow>
    </>
  );
}
