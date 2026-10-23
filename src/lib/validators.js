const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

const MIN_PASSWORD_LENGTH = 6;

/**
 * Login form validation. Returns the error message, or null when valid.
 * Expects the email already trimmed.
 */
export function validateLoginCredentials({ email, password }) {
  if (!email || !password) return 'Todos los campos son obligatorios';
  if (!isValidEmail(email)) return 'Por favor ingresa un email válido';
  if (password.length < MIN_PASSWORD_LENGTH) return 'La contraseña debe tener al menos 6 caracteres';
  return null;
}
