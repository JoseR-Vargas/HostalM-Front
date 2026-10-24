import { useEffect, useMemo, useRef, useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import { DataTable, Td, Tr } from '../components/DataTable';
import Footer from '../components/Footer';
import { MetricCard } from '../components/MetricCard';
import MonthPager from '../components/MonthPager';
import { ADMIN_NAV } from '../components/navLinks';
import { Button, Field, FormCard, FormRow, PageSection, SectionSubtitle, Spinner } from '../components/ui';
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

const COLUMNS = ['Nombre', 'Apellido', 'Habitación', 'Consumo (kWh)', 'Acción'];
const MONTH_IDS = { prev: 'btnMesAnterior', label: 'residentesMonthLabel', next: 'btnMesSiguiente' };
const SELECTED_ROW_STYLE = {
  backgroundColor: 'rgba(43, 108, 176, 0.1)',
  borderLeft: '3px solid var(--color-primary)',
};
const DETAIL = 'text-[0.95rem] text-muted';

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

      <PageSection title="Calculadora de Pago de Electricidad" subtitle="Calculá cuánto debe abonar cada residente según la factura del mes">
        <FormCard>
          <SectionSubtitle>Paso 1 — Datos de la factura</SectionSubtitle>
          <FormRow>
            <Field
              id="montoFactura"
              label="Monto de la Factura EPEC ($)"
              type="text"
              inputMode="numeric"
              placeholder="Ej: 15.000 o 200.000,50"
              autoComplete="off"
              ref={montoField.inputRef}
              value={monto}
              onChange={handleMontoChange}
              error={errors.monto}
              errorMessage={MONTO_ERROR}
            />
            <Field
              id="totalKwhFactura"
              label="Total kWh de la Factura"
              type="text"
              inputMode="decimal"
              placeholder="Ej: 450 o 450,5"
              autoComplete="off"
              ref={kwhField.inputRef}
              value={totalKwh}
              onChange={handleKwhChange}
              error={errors.kwh}
              errorMessage={errors.kwh ? KWH_ERROR : KWH_HINT}
            />
          </FormRow>

          <FormRow>
            <Field
              id="precioKwh"
              label="Precio por kWh ($)"
              type="text"
              readOnly
              placeholder="—"
              controlClass="cursor-default bg-soft"
              value={precioKwh === null ? '' : formatMoney(precioKwh)}
            />
            <div className="mb-8 flex items-end">
              <Button type="button" id="btnCalcularPrecio" className="w-full" onClick={handleCalculatePrice}>
                Calcular Precio kWh
              </Button>
            </div>
          </FormRow>
        </FormCard>

        {step2Visible && (
          <div
            id="step2Section"
            className="mt-6 w-full max-w-[950px] rounded-xl border border-border bg-card p-10 shadow-card"
          >
            <SectionSubtitle>Paso 2 — Residentes del mes</SectionSubtitle>

            <MonthPager label={monthLabel} onChange={handleChangeMonth} ids={MONTH_IDS} />

            {status === 'loading' && (
              <div className="flex items-center justify-center gap-3 p-8 text-center text-muted">
                <Spinner />
                <span id="residentesLoading">Cargando residentes...</span>
              </div>
            )}

            {status === 'error' && (
              <div
                id="residentesError"
                className="my-4 rounded-lg border border-[#fc8181] bg-[#fff5f5] p-4 text-[#c53030]"
              >
                <p id="residentesErrorMsg">{errorMessage}</p>
              </div>
            )}

            {status === 'loaded' && residents.length > 0 && (
              <DataTable
                containerId="residentesTableContainer"
                id="residentesTable"
                bodyId="residentesTableBody"
                columns={COLUMNS}
              >
                {residents.map((resident) => (
                  <Tr
                    key={resident.habitacion}
                    id={`fila-${resident.habitacion}`}
                    style={resident.habitacion === selectedHabitacion ? SELECTED_ROW_STYLE : undefined}
                  >
                    <Td>{resident.nombre}</Td>
                    <Td>{resident.apellido}</Td>
                    <Td>{resident.habitacion}</Td>
                    <Td>{formatDecimal1(resident.consumoCalculado)} kWh</Td>
                    <Td>
                      <Button variant="link" type="button" onClick={() => handleSelect(resident.habitacion)}>
                        Seleccionar
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </DataTable>
            )}

            {status === 'loaded' && residents.length === 0 && (
              <div id="residentesEmpty" className="p-8 text-center text-muted">
                <p>No hay registros de consumo para este mes.</p>
              </div>
            )}

            {selectedResident && precioKwh !== null && (
              <div id="residenteSeleccionado" className="mt-8">
                <SectionSubtitle>Resultado</SectionSubtitle>
                <MetricCard className="mx-auto max-w-[500px]">
                  <p id="residenteNombreDisplay" className="mb-1 text-[1.1rem] font-semibold text-ink">
                    {`${selectedResident.nombre} ${selectedResident.apellido}`}
                  </p>
                  <p id="residenteHabitacionDisplay" className={`mb-4 ${DETAIL}`}>
                    {`Habitación: ${selectedResident.habitacion}`}
                  </p>
                  <p className={DETAIL}>
                    Consumo: <strong id="residenteConsumoDisplay">{`${formatDecimal1(selectedResident.consumoCalculado)} kWh`}</strong>
                  </p>
                  <p className={`mt-1 ${DETAIL}`}>
                    Precio kWh: <strong id="residentePrecioKwhDisplay">{`$${formatMoney(precioKwh)}`}</strong>
                  </p>
                  <p id="residenteTotalDisplay" className="result-amount mt-4 mb-2 text-[2rem] font-bold text-primary">
                    {`$${formatMoney(calcularTotalAPagar(selectedResident.consumoCalculado, precioKwh))}`}
                  </p>
                  <p className="mt-1 text-[0.85rem] text-muted">Total a Pagar</p>
                </MetricCard>
              </div>
            )}
          </div>
        )}
      </PageSection>

      <Footer />
    </>
  );
}
