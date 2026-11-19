import { VOUCHER_DATE_FIELDS, getRecordDate } from './dates';

/**
 * Admin notifications, built on the client: the bell polls the lists the dashboards already read
 * (vouchers and meter readings) and turns every record it has not seen before into a notification.
 *
 * State shape (kept in localStorage so it survives reloads and is shared by the admin tabs):
 * - `known`: ids already seen, per kind. A kind that is not there yet has no baseline: the first successful
 *   fetch only records what already exists, so a first visit does not flood the bell with old records.
 * - `notifications`: newest first, capped at `MAX_NOTIFICATIONS`.
 */

export const NOTIFICATIONS_STORAGE_KEY = 'mayelewoo_admin_notifications';
export const MAX_NOTIFICATIONS = 50;
const MAX_KNOWN_IDS = 2000;

const CALCULO_DATE_FIELDS = ['createdAt', 'fechaRegistro'];

/** Per kind: what the notification says and where the full record lives. */
export const NOTIFICATION_KINDS = {
  voucher: { title: 'Nuevo voucher', label: 'Voucher', path: '/dashboard' },
  medicion: { title: 'Nueva medición de luz', label: 'Medición de luz', path: '/dashboard-calculator' },
};

export const emptyState = () => ({ known: {}, notifications: [] });

const fullName = (record) => `${record.nombre || ''} ${record.apellido || ''}`.trim();

/** One decimal, as the meter dashboard shows consumption. */
const formatKwh = (value) => Number(value).toFixed(1);

export function describeVoucher(voucher) {
  const name = fullName(voucher);
  let text = name ? `${name} cargó un comprobante` : 'Se cargó un comprobante';
  if (voucher.hab) text += ` de la habitación ${voucher.hab}`;
  if (voucher.monto) text += ` por $${voucher.monto}`;
  return `${text}.`;
}

export function describeCalculo(calculo) {
  const name = fullName(calculo);
  let text = name ? `${name} registró la medición` : 'Se registró una medición';
  if (calculo.habitacion) text += ` de ${calculo.habitacion}`;
  const hasConsumption = calculo.consumoCalculado !== undefined && calculo.consumoCalculado !== null && calculo.consumoCalculado !== '';
  if (hasConsumption) text += `: ${formatKwh(calculo.consumoCalculado)} kWh de consumo`;
  return `${text}.`;
}

const SOURCES = [
  { kind: 'voucher', field: 'vouchers', dateFields: VOUCHER_DATE_FIELDS, describe: describeVoucher },
  { kind: 'medicion', field: 'calculos', dateFields: CALCULO_DATE_FIELDS, describe: describeCalculo },
];

const recordId = (record) => (record && record._id !== undefined && record._id !== null ? String(record._id) : null);

/**
 * Folds fresh server lists into the state. `vouchers` / `calculos` are arrays, or `null` when that request
 * failed: a failed source is left exactly as it was (no baseline, no notifications).
 */
export function syncNotifications(state, lists, now = new Date()) {
  const known = { ...state.known };
  const created = [];

  for (const { kind, field, dateFields, describe } of SOURCES) {
    const records = lists[field];
    if (!Array.isArray(records)) continue;

    const withId = records.map((record) => ({ record, id: recordId(record) })).filter((entry) => entry.id);
    const ids = withId.map((entry) => entry.id);

    if (known[kind] === undefined) {
      known[kind] = ids;
      continue;
    }

    const seen = new Set(known[kind]);
    for (const { record, id } of withId) {
      if (seen.has(id)) continue;
      created.push({
        id: `${kind}:${id}`,
        kind,
        recordId: id,
        title: NOTIFICATION_KINDS[kind].title,
        description: describe(record),
        createdAt: (getRecordDate(record, dateFields) ?? now).toISOString(),
        read: false,
      });
    }
    known[kind] = [...new Set([...known[kind], ...ids])].slice(-MAX_KNOWN_IDS);
  }

  created.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { known, notifications: [...created, ...state.notifications].slice(0, MAX_NOTIFICATIONS) };
}

export const countUnread = (state) => state.notifications.filter((notification) => !notification.read).length;

export const markRead = (state, id) => ({
  ...state,
  notifications: state.notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
});

export const markAllRead = (state) => ({
  ...state,
  notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
});

const isNotification = (value) =>
  Boolean(value) && typeof value.id === 'string' && value.kind in NOTIFICATION_KINDS && typeof value.createdAt === 'string';

/** Reads the saved state. Anything missing, broken or of the wrong shape gives an empty state. */
export function loadState(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(NOTIFICATIONS_STORAGE_KEY));
    const validShape =
      parsed &&
      typeof parsed.known === 'object' &&
      parsed.known !== null &&
      !Array.isArray(parsed.known) &&
      Array.isArray(parsed.notifications);
    if (!validShape) return emptyState();
    return { known: parsed.known, notifications: parsed.notifications.filter(isNotification) };
  } catch {
    return emptyState();
  }
}

/** Saves the state. A blocked or full storage only loses persistence, never the running session. */
export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignored on purpose: notifications keep working in memory.
  }
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** "Ahora", "Hace 30 min", "Hace 3 h", then the date. */
export function formatNotificationTime(isoDate, now = new Date()) {
  const date = new Date(isoDate);
  const elapsed = Math.max(0, now.getTime() - date.getTime());
  if (elapsed < MINUTE_MS) return 'Ahora';
  if (elapsed < HOUR_MS) return `Hace ${Math.floor(elapsed / MINUTE_MS)} min`;
  if (elapsed < DAY_MS) return `Hace ${Math.floor(elapsed / HOUR_MS)} h`;
  return date.toLocaleDateString('es-AR');
}
