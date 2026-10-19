import { useEffect, useMemo, useRef, useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import Footer from '../components/Footer';
import { ADMIN_NAV } from '../components/navLinks';
import { useAuth } from '../auth/useAuth';
import { formatMoney, formatMontoInputWithCaret, parseMontoFactura, parsePositive } from '../lib/money';
import { sanitizeMeasurementInput } from '../lib/measurement';
import { fetchCalculos, formatDecimal1 } from '../lib/meterRecords';
import {
  calcularPrecioKwh,
  calcularTotalAPagar,
  findResident,
  getResidentsForMonth,
} from '../lib/residents';
import { useCaretRestore } from '../lib/useCaretRestore';
import { useMonthPager } from '../lib/useMonthPager';

const MONTO_ERROR = 'Ingresá un monto válido mayor a cero';
const KWH_HINT = 'Ingresá los kWh totales de la factura';
const KWH_ERROR = 'Ingresá los kWh totales de la factura (mayor a cero)';
const NOT_AUTHENTICATED_MESSAGE = 'No estás autenticado. Por favor, iniciá sesión nuevamente.';
const LOAD_ERROR_MESSAGE = 'No se pudo cargar la lista de residentes. Verificá tu conexión e intentá de nuevo.';

const READONLY_INPUT_STYLE = { background: 'var(--bg-secondary, #f7f8fa)', cursor: 'default' };
const STEP2_STYLE = {
  width: '100%',
  maxWidth: '950px',
  marginTop: '1.5rem',
  background: 'var(--bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--border-radius)',
  boxShadow: 'var(--shadow)',
  padding: '2.5rem',
};
const MUTED_BLOCK_STYLE = { textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' };
const ERROR_BLOCK_STYLE = {
  padding: '1rem',
  background: '#FFF5F5',
  border: '1px solid #FC8181',
  borderRadius: 'var(--border-radius-sm)',
  color: '#C53030',
  margin: '1rem 0',
};
const SELECT_BUTTON_STYLE = { padding: '0.5rem 1rem', fontSize: '0.85rem', animation: 'none' };
const SELECTED_ROW_STYLE = {
  backgroundColor: 'rgba(43, 108, 176, 0.1)',
  borderLeft: '3px solid var(--color-primary)',
};

export default function CalcularPago() {
  const { token } = useAuth();
  const { monthKey, monthLabel, changeMonth } = useMonthPager({ capitalize: true });
  const montoField = useCaretRestore();
  const kwhField = useCaretRestore();

  // Step 1
  const [monto, setMonto] = useState('');
  const [totalKwh, setTotalKwh] = useState('');
  const [errors, setErrors] = useState({ monto: false, kwh: false });
  const [precioKwh, setPrecioKwh] = useState(null);

  // Step 2
  const [step2Visible, setStep2Visible] = useState(false);
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error | loaded
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedHabitacion, setSelectedHabitacion] = useState(null);
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const residents = useMemo(() => getResidentsForMonth(records, monthKey), [records, monthKey]);
  const selectedResident = findResident(residents, selectedHabitacion);

  const handleMontoChange = (event) => {
    const { value, caret } = formatMontoInputWithCaret(event.target.value, event.target.selectionStart);
    setMonto(value);
    montoField.setCaret(caret);
  };

  const handleKwhChange = (event) => {
    const raw = event.target.value;
    const value = sanitizeMeasurementInput(raw);
    setTotalKwh(value);
    kwhField.setCaret(Math.max(0, event.target.selectionStart - (raw.length - value.length)));
  };

  const loadResidents = async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setStatus('loading');
    setSelectedHabitacion(null);

    if (!token) {
      setErrorMessage(NOT_AUTHENTICATED_MESSAGE);
      setStatus('error');
      return;
    }

    try {
      const data = await fetchCalculos({ token, signal: controller.signal });
      setRecords(data);
      setStatus('loaded');
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('Error al cargar residentes:', error);
      setErrorMessage(LOAD_ERROR_MESSAGE);
      setStatus('error');
    }
  };

  const handleCalculatePrice = () => {
    setPrecioKwh(null);
    setSelectedHabitacion(null);

    const montoValue = parseMontoFactura(monto);
    const kwhValue = parsePositive(totalKwh);
    const nextErrors = { monto: Number.isNaN(montoValue), kwh: Number.isNaN(kwhValue) };
    setErrors(nextErrors);
    if (nextErrors.monto || nextErrors.kwh) return;

    setPrecioKwh(calcularPrecioKwh(montoValue, kwhValue));
    setStep2Visible(true);
    loadResidents();
  };

  const handleChangeMonth = (delta) => {
    changeMonth(delta);
    setSelectedHabitacion(null);
  };

  // Without a price there is nothing to calculate.
  const handleSelect = (habitacion) => {
    if (precioKwh === null) return;
    setSelectedHabitacion(habitacion);
  };

  return (
    <>
      <AdminHeader links={ADMIN_NAV['calcular-pago']} />

      <section className="contact page-top-offset">
        <div className="container vouchers-center">
          <h3 className="section-title">Calculadora de Pago de Electricidad</h3>
          <p className="contact-subtitle">Calculá cuánto debe abonar cada residente según la factura del mes</p>

          <div className="contact-form">
            <h4 className="section-subtitle">Paso 1 — Datos de la factura</h4>
            <div className="form-row">
              <div className={errors.monto ? 'form-group error' : 'form-group'}>
                <label htmlFor="montoFactura">Monto de la Factura EPEC ($)</label>
                <input
                  type="text"
                  id="montoFactura"
                  name="montoFactura"
                  inputMode="numeric"
                  placeholder="Ej: 15.000 o 200.000,50"
                  autoComplete="off"
                  ref={montoField.inputRef}
                  value={monto}
                  onChange={handleMontoChange}
                />
                <div className="error-message">{MONTO_ERROR}</div>
              </div>
              <div className={errors.kwh ? 'form-group error' : 'form-group'}>
                <label htmlFor="totalKwhFactura">Total kWh de la Factura</label>
                <input
                  type="text"
                  id="totalKwhFactura"
                  name="totalKwhFactura"
                  inputMode="decimal"
                  placeholder="Ej: 450 o 450,5"
                  autoComplete="off"
                  ref={kwhField.inputRef}
                  value={totalKwh}
                  onChange={handleKwhChange}
                />
                <div className="error-message">{errors.kwh ? KWH_ERROR : KWH_HINT}</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="precioKwh">Precio por kWh ($)</label>
                <input
                  type="text"
                  id="precioKwh"
                  name="precioKwh"
                  readOnly
                  placeholder="—"
                  style={READONLY_INPUT_STYLE}
                  value={precioKwh === null ? '' : formatMoney(precioKwh)}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="cta-button"
                  id="btnCalcularPrecio"
                  onClick={handleCalculatePrice}
                  style={{ width: '100%' }}
                >
                  Calcular Precio kWh
                </button>
              </div>
            </div>
          </div>

          {step2Visible && (
            <div id="step2Section" style={STEP2_STYLE}>
              <h4 className="section-subtitle">Paso 2 — Residentes del mes</h4>

              <div className="month-pagination">
                <button type="button" className="month-nav-btn" id="btnMesAnterior" onClick={() => handleChangeMonth(-1)}>
                  ←
                </button>
                <span className="month-label" id="residentesMonthLabel">
                  {monthLabel}
                </span>
                <button type="button" className="month-nav-btn" id="btnMesSiguiente" onClick={() => handleChangeMonth(1)}>
                  →
                </button>
              </div>

              {status === 'loading' && (
                <div id="residentesLoading" style={MUTED_BLOCK_STYLE}>
                  Cargando residentes...
                </div>
              )}

              {status === 'error' && (
                <div id="residentesError" style={ERROR_BLOCK_STYLE}>
                  <p id="residentesErrorMsg">{errorMessage}</p>
                </div>
              )}

              {status === 'loaded' && residents.length > 0 && (
                <div id="residentesTableContainer" className="table-container">
                  <table className="data-table" id="residentesTable">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Apellido</th>
                        <th>Habitación</th>
                        <th>Consumo (kWh)</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody id="residentesTableBody">
                      {residents.map((resident) => (
                        <tr
                          key={resident.habitacion}
                          id={`fila-${resident.habitacion}`}
                          style={resident.habitacion === selectedHabitacion ? SELECTED_ROW_STYLE : undefined}
                        >
                          <td>{resident.nombre}</td>
                          <td>{resident.apellido}</td>
                          <td>{resident.habitacion}</td>
                          <td>{formatDecimal1(resident.consumoCalculado)} kWh</td>
                          <td>
                            <button
                              type="button"
                              className="cta-button"
                              style={SELECT_BUTTON_STYLE}
                              onClick={() => handleSelect(resident.habitacion)}
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {status === 'loaded' && residents.length === 0 && (
                <div id="residentesEmpty" style={MUTED_BLOCK_STYLE}>
                  <p>No hay registros de consumo para este mes.</p>
                </div>
              )}

              {selectedResident && precioKwh !== null && (
                <div id="residenteSeleccionado" style={{ marginTop: '2rem' }}>
                  <h4 className="section-subtitle">Resultado</h4>
                  <div className="metric-card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
                    <p
                      id="residenteNombreDisplay"
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {`${selectedResident.nombre} ${selectedResident.apellido}`}
                    </p>
                    <p
                      id="residenteHabitacionDisplay"
                      style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}
                    >
                      {`Habitación: ${selectedResident.habitacion}`}
                    </p>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      Consumo: <strong id="residenteConsumoDisplay">{`${formatDecimal1(selectedResident.consumoCalculado)} kWh`}</strong>
                    </p>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Precio kWh: <strong id="residentePrecioKwhDisplay">{`$${formatMoney(precioKwh)}`}</strong>
                    </p>
                    <p className="result-amount" id="residenteTotalDisplay" style={{ marginTop: '1rem' }}>
                      {`$${formatMoney(calcularTotalAPagar(selectedResident.consumoCalculado, precioKwh))}`}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Total a Pagar
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
