import { filterByMonth, parseLooseDate } from './dates';

const recordTime = (record) => parseLooseDate(record.fechaRegistro)?.getTime() ?? 0;

/** Keeps only the latest record (by `fechaRegistro`) of every habitacion. */
function latestPerHabitacion(records) {
  const byHabitacion = new Map();
  for (const record of records) {
    const existing = byHabitacion.get(record.habitacion);
    if (!existing || recordTime(record) > recordTime(existing)) {
      byHabitacion.set(record.habitacion, record);
    }
  }
  return Array.from(byHabitacion.values());
}

/** Residents of the month: filter by month -> latest per habitacion -> sort alphabetically. */
export function getResidentsForMonth(records, monthKey) {
  const inMonth = filterByMonth(records, monthKey, (record) => parseLooseDate(record.fechaRegistro));
  return latestPerHabitacion(inMonth).sort((a, b) => a.habitacion.localeCompare(b.habitacion));
}

export function findResident(residents, habitacion) {
  return residents.find((resident) => resident.habitacion === habitacion) || null;
}

/** precio kWh = monto de la factura / total kWh de la factura */
export function calcularPrecioKwh(montoFactura, totalKwhFactura) {
  return montoFactura / totalKwhFactura;
}

/** total a pagar = consumo kWh x precio kWh */
export function calcularTotalAPagar(consumoKwh, precioKwh) {
  return consumoKwh * precioKwh;
}
