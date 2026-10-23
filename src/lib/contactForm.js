import { HOSTAL_NAME } from './constants';
import { isValidEmail } from './validators';

export const CONTACT_MESSAGE_MAX_LENGTH = 200;
const NEAR_LIMIT_LENGTH = CONTACT_MESSAGE_MAX_LENGTH * 0.8;

const ACCOMMODATION_LABELS = {
  habitacion: 'Habitación',
  apartamento: 'Apartamento',
  consultar: 'Consultar opciones disponibles',
};

/** Returns the list of error messages (empty when the contact form is valid). */
export function validateContactForm({ nombre, apellido, dni, email }) {
  const errors = [];
  if (!nombre.trim()) errors.push('El nombre es requerido');
  if (!apellido.trim()) errors.push('El apellido es requerido');
  if (!dni.trim()) errors.push('El DNI es requerido');
  if (!email.trim()) {
    errors.push('El correo electrónico es requerido');
  } else if (!isValidEmail(email)) {
    errors.push('El correo electrónico no es válido');
  }
  return errors;
}

/** Plain-text WhatsApp message (encoding is done by `buildWhatsAppUrl`). */
export function buildContactMessage({ nombre, apellido, dni, email, huespedes, tipo, mensaje }) {
  let message = `¡Hola! Quiero hacer una consulta para ${HOSTAL_NAME}\n\n`;
  message += `*Datos del huésped:*\n`;
  message += `👤 Nombre: ${nombre} ${apellido}\n`;
  message += `📋 DNI: ${dni}\n`;
  message += `📧 Email: ${email}\n\n`;
  message += `👥 *Huéspedes:* ${huespedes}\n`;
  message += `🏠 *Tipo de alojamiento:* ${ACCOMMODATION_LABELS[tipo] || tipo}\n\n`;
  if (mensaje) {
    message += `💬 *Mensaje adicional:*\n${mensaje}\n\n`;
  }
  message += `Espero su respuesta. ¡Gracias!`;
  return message;
}

/** CSS modifier of the character counter: '' | 'near-limit' (80%) | 'warning' (limit). */
export function getCounterState(length) {
  if (length >= CONTACT_MESSAGE_MAX_LENGTH) return 'warning';
  if (length >= NEAR_LIMIT_LENGTH) return 'near-limit';
  return '';
}
