import { describe, expect, it } from 'vitest';
import {
  MAX_NOTIFICATIONS,
  countUnread,
  describeCalculo,
  describeVoucher,
  emptyState,
  formatNotificationTime,
  loadState,
  markAllRead,
  markRead,
  saveState,
  syncNotifications,
} from './notifications';

const NOW = new Date('2026-11-18T15:00:00Z');

const voucher = (id, extra = {}) => ({
  _id: id,
  nombre: 'Ana',
  apellido: 'Pérez',
  hab: '4',
  monto: '150.000',
  timestamp: '2026-11-18T14:30:00Z',
  ...extra,
});
const calculo = (id, extra = {}) => ({
  _id: id,
  nombre: 'Beto',
  apellido: 'Gómez',
  habitacion: 'Apto 2',
  medicionAnterior: 100,
  medicionActual: 160.5,
  consumoCalculado: 60.5,
  createdAt: '2026-11-18T14:45:00Z',
  ...extra,
});

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    data,
  };
};

describe('describeVoucher / describeCalculo', () => {
  it('describes a voucher with guest, room and amount', () => {
    expect(describeVoucher(voucher('v1'))).toBe('Ana Pérez cargó un comprobante de la habitación 4 por $150.000.');
  });

  it('skips the missing parts of a voucher', () => {
    expect(describeVoucher({ _id: 'v2', nombre: 'Ana' })).toBe('Ana cargó un comprobante.');
    expect(describeVoucher({ _id: 'v3' })).toBe('Se cargó un comprobante.');
  });

  it('describes a meter reading with guest, room and consumption', () => {
    expect(describeCalculo(calculo('c1'))).toBe('Beto Gómez registró la medición de Apto 2: 60.5 kWh de consumo.');
  });

  it('skips the missing parts of a reading', () => {
    expect(describeCalculo({ _id: 'c2', consumoCalculado: 12 })).toBe('Se registró una medición: 12.0 kWh de consumo.');
  });
});

describe('syncNotifications', () => {
  it('records what already exists as the baseline without notifying', () => {
    const state = syncNotifications(emptyState(), { vouchers: [voucher('v1')], calculos: [calculo('c1')] }, NOW);
    expect(state.notifications).toEqual([]);
    expect(state.known).toEqual({ voucher: ['v1'], medicion: ['c1'] });
  });

  it('notifies a voucher uploaded after the baseline', () => {
    const baseline = syncNotifications(emptyState(), { vouchers: [voucher('v1')], calculos: [] }, NOW);
    const next = syncNotifications(baseline, { vouchers: [voucher('v1'), voucher('v2')], calculos: [] }, NOW);

    expect(next.notifications).toHaveLength(1);
    expect(next.notifications[0]).toMatchObject({
      id: 'voucher:v2',
      kind: 'voucher',
      title: 'Nuevo voucher',
      description: 'Ana Pérez cargó un comprobante de la habitación 4 por $150.000.',
      createdAt: '2026-11-18T14:30:00.000Z',
      read: false,
    });
  });

  it('notifies a meter reading uploaded after the baseline', () => {
    const baseline = syncNotifications(emptyState(), { vouchers: [], calculos: [calculo('c1')] }, NOW);
    const next = syncNotifications(baseline, { vouchers: [], calculos: [calculo('c1'), calculo('c2')] }, NOW);

    expect(next.notifications).toHaveLength(1);
    expect(next.notifications[0]).toMatchObject({ id: 'medicion:c2', kind: 'medicion', title: 'Nueva medición de luz', read: false });
  });

  it('never notifies the same record twice', () => {
    const baseline = syncNotifications(emptyState(), { vouchers: [], calculos: [] }, NOW);
    const once = syncNotifications(baseline, { vouchers: [voucher('v9')], calculos: [] }, NOW);
    const twice = syncNotifications(once, { vouchers: [voucher('v9')], calculos: [] }, NOW);
    expect(twice.notifications).toHaveLength(1);
  });

  it('leaves a source untouched when its request failed (null)', () => {
    const baseline = syncNotifications(emptyState(), { vouchers: [voucher('v1')], calculos: [calculo('c1')] }, NOW);
    const next = syncNotifications(baseline, { vouchers: null, calculos: [calculo('c1'), calculo('c2')] }, NOW);

    expect(next.known.voucher).toEqual(['v1']);
    expect(next.notifications.map((n) => n.id)).toEqual(['medicion:c2']);
  });

  it('does not baseline a source whose first request failed', () => {
    const first = syncNotifications(emptyState(), { vouchers: null, calculos: [] }, NOW);
    expect(first.known.voucher).toBeUndefined();
    const second = syncNotifications(first, { vouchers: [voucher('v1')], calculos: [] }, NOW);
    expect(second.notifications).toEqual([]);
    expect(second.known.voucher).toEqual(['v1']);
  });

  it('ignores records without an id', () => {
    const baseline = syncNotifications(emptyState(), { vouchers: [], calculos: [] }, NOW);
    const next = syncNotifications(baseline, { vouchers: [{ nombre: 'Sin id' }], calculos: [] }, NOW);
    expect(next.notifications).toEqual([]);
  });

  it('falls back to the detection time when the record has no date', () => {
    const baseline = syncNotifications(emptyState(), { vouchers: [], calculos: [] }, NOW);
    const next = syncNotifications(baseline, { vouchers: [voucher('v1', { timestamp: undefined })], calculos: [] }, NOW);
    expect(next.notifications[0].createdAt).toBe(NOW.toISOString());
  });

  it('keeps the newest first and caps the list', () => {
    const baseline = syncNotifications(emptyState(), { vouchers: [], calculos: [] }, NOW);
    const many = Array.from({ length: MAX_NOTIFICATIONS + 5 }, (_, i) =>
      voucher(`v${i}`, { timestamp: new Date(NOW.getTime() - i * 60000).toISOString() }),
    );
    const next = syncNotifications(baseline, { vouchers: many, calculos: [] }, NOW);
    expect(next.notifications).toHaveLength(MAX_NOTIFICATIONS);
    expect(next.notifications[0].id).toBe('voucher:v0');
  });
});

describe('read state', () => {
  const withTwo = () => {
    const baseline = syncNotifications(emptyState(), { vouchers: [], calculos: [] }, NOW);
    return syncNotifications(baseline, { vouchers: [voucher('v1')], calculos: [calculo('c1')] }, NOW);
  };

  it('counts unread notifications', () => {
    expect(countUnread(withTwo())).toBe(2);
  });

  it('marks one as read', () => {
    const state = markRead(withTwo(), 'voucher:v1');
    expect(countUnread(state)).toBe(1);
  });

  it('marks everything as read', () => {
    expect(countUnread(markAllRead(withTwo()))).toBe(0);
  });
});

describe('storage', () => {
  it('round-trips the state', () => {
    const storage = memoryStorage();
    const state = syncNotifications(emptyState(), { vouchers: [voucher('v1')], calculos: [] }, NOW);
    saveState(state, storage);
    expect(loadState(storage)).toEqual(state);
  });

  it('starts empty when nothing is stored, the JSON is broken or the shape is wrong', () => {
    expect(loadState(memoryStorage())).toEqual(emptyState());
    expect(loadState(memoryStorage({ mayelewoo_admin_notifications: '{broken' }))).toEqual(emptyState());
    expect(loadState(memoryStorage({ mayelewoo_admin_notifications: '{"known":5,"notifications":"x"}' }))).toEqual(emptyState());
  });

  it('does not throw when the storage is unavailable', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadState(broken)).toEqual(emptyState());
    expect(() => saveState(emptyState(), broken)).not.toThrow();
  });
});

describe('formatNotificationTime', () => {
  it('shows relative time for recent notifications', () => {
    expect(formatNotificationTime('2026-11-18T14:59:40Z', NOW)).toBe('Ahora');
    expect(formatNotificationTime('2026-11-18T14:30:00Z', NOW)).toBe('Hace 30 min');
    expect(formatNotificationTime('2026-11-18T12:00:00Z', NOW)).toBe('Hace 3 h');
  });

  it('shows the date for older notifications', () => {
    expect(formatNotificationTime('2026-11-10T12:00:00Z', NOW)).toBe(new Date('2026-11-10T12:00:00Z').toLocaleDateString('es-AR'));
  });
});
