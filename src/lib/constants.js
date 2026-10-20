// Fixed electricity price per kWh used by the meter calculator.
export const PRICE_PER_KWH = 439.26;

// Meter photos: image/* up to 5MB each.
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Voucher images: total upload (all images together) up to 50MB.
export const MAX_VOUCHERS_TOTAL_BYTES = 50 * 1024 * 1024;

// Admin token key in sessionStorage (shared with the original app).
export const TOKEN_STORAGE_KEY = 'mayelewoo_admin_token';

export const HOSTAL_NAME = 'Hostal Mayelewoo';
export const WHATSAPP_NUMBER = '5493516664584';

// Vouchers that could not be sent are kept here (read by the admin dashboard as a fallback).
export const PENDING_VOUCHERS_KEY = 'pendingVouchers';
