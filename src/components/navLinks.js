// Nav link sets taken from the original pages. `label` keeps their emoji/copy.

export const HOME_LINKS = [
  { to: '/#inicio', label: 'Inicio' },
  { to: '/calculator-medidor', label: 'Medidores' },
  { to: '/vouchers', label: 'Vouchers' },
];

export const LOGIN_LINKS = [{ to: '/', label: 'Inicio' }];

export const VOUCHERS_LINKS = [{ to: '/#inicio', label: 'Inicio' }];

const VOUCHERS = { to: '/dashboard', label: '📋 Vouchers' };
const RENT = (label) => ({ to: '/comprobante-pago', label });
const SERVICES = { to: '/comprobante-servicios', label: '💧 Servicios' };
const CALCULATE = { to: '/calcular-pago', label: '⚡ Calcular Pago' };
const METER = (label) => ({ to: '/dashboard-calculator', label });

// Admin nav links per page (each original page showed a different set).
export const ADMIN_NAV = {
  dashboard: [RENT('📄 Alquiler'), SERVICES, CALCULATE, METER('🧮 Medidores')],
  'dashboard-calculator': [VOUCHERS, RENT('📄 Comprobante'), SERVICES, CALCULATE],
  'calcular-pago': [VOUCHERS, METER('🧮 Medidor'), RENT('📄 Comprobante')],
  'comprobante-pago': [VOUCHERS, METER('🧮 Medidor')],
  'comprobante-servicios': [VOUCHERS, METER('🧮 Medidor'), RENT('📄 Alquiler')],
};
