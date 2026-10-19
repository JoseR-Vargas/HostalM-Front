import { RECEIPT_MONTHS } from '../lib/receipts';
import { formatMontoInputWithCaret } from '../lib/money';
import { useCaretRestore } from '../lib/useCaretRestore';

function Field({ group, label, htmlFor, hasError, errorMessage, children }) {
  return (
    <div className={hasError ? 'form-group error' : 'form-group'} id={`group-${group}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      <div className="error-message">{errorMessage}</div>
    </div>
  );
}

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
    <Field group={name} label={label} htmlFor={name} hasError={hasError} errorMessage={errorMessage}>
      <input
        type="text"
        id={name}
        name={name}
        inputMode="numeric"
        placeholder={placeholder}
        autoComplete="off"
        ref={inputRef}
        value={value}
        onChange={handleChange}
      />
    </Field>
  );
}

/**
 * Client, property, period and receipt date, shared by both receipt forms.
 * `errors` is the list of invalid field names; `onChange(name, value)` receives the edits.
 */
export function ReceiptIdentityFields({ values, errors, onChange }) {
  // The legacy date input is named `fechaRecibo` but the form value is `fecha`.
  const handleChange = (event) =>
    onChange(event.target.name === 'fechaRecibo' ? 'fecha' : event.target.name, event.target.value);

  return (
    <>
      <div className="form-row">
        <Field
          group="cliente"
          label="Cliente"
          htmlFor="cliente"
          hasError={errors.includes('cliente')}
          errorMessage="Ingresá el nombre del cliente"
        >
          <input
            type="text"
            id="cliente"
            name="cliente"
            placeholder="Ej: Jennifer Martínez"
            autoComplete="off"
            value={values.cliente}
            onChange={handleChange}
          />
        </Field>
        <Field
          group="propiedad"
          label="Propiedad"
          htmlFor="propiedad"
          hasError={errors.includes('propiedad')}
          errorMessage="Ingresá la dirección o propiedad"
        >
          <input
            type="text"
            id="propiedad"
            name="propiedad"
            placeholder="Ej: Humberto Primo 3070 Habitación 4"
            autoComplete="off"
            value={values.propiedad}
            onChange={handleChange}
          />
        </Field>
      </div>

      <div className="form-row">
        <Field
          group="periodo"
          label="Período"
          htmlFor="periodo"
          hasError={errors.includes('periodo')}
          errorMessage="Seleccioná el período"
        >
          <select id="periodo" name="periodo" value={values.periodo} onChange={handleChange}>
            <option value="">— Seleccioná el mes —</option>
            {RECEIPT_MONTHS.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </Field>
        <Field
          group="fecha"
          label="Fecha del recibo"
          htmlFor="fechaRecibo"
          hasError={errors.includes('fecha')}
          errorMessage="Seleccioná la fecha del recibo"
        >
          <input type="date" id="fechaRecibo" name="fechaRecibo" value={values.fecha} onChange={handleChange} />
        </Field>
      </div>
    </>
  );
}
