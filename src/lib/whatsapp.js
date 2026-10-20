import { HOSTAL_NAME, WHATSAPP_NUMBER } from './constants';

export const WHATSAPP_INFO_MESSAGE = `¡Hola! Quiero información sobre ${HOSTAL_NAME}`;

export function buildWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function isMobileDevice() {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  );
}

/** Mobile browsers handle a same-tab redirect better than window.open. */
export function openWhatsApp(url) {
  if (isMobileDevice()) {
    window.location.href = url;
  } else {
    window.open(url, '_blank');
  }
}
