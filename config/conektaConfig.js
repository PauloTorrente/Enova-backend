// Conekta credentials/config, read from env so the real test key never
// touches source control. Unset until someone adds it to .env — every
// caller must check isConektaConfigured() first and fail clearly instead
// of sending an empty Authorization header.
export const CONEKTA_PRIVATE_KEY = process.env.CONEKTA_PRIVATE_KEY || null;
export const CONEKTA_API_VERSION = '2.1.0';
export const CONEKTA_API_BASE = 'https://api.conekta.io';

// Where Conekta's hosted checkout sends the shopper back after paying —
// point these at real Enova-Pulse pages once they exist; for now they're
// placeholders so order creation doesn't fail on a missing URL.
export const CONEKTA_SUCCESS_URL = process.env.CONEKTA_SUCCESS_URL || 'https://enova-pulse.vercel.app/pagos/exito';
export const CONEKTA_FAILURE_URL = process.env.CONEKTA_FAILURE_URL || 'https://enova-pulse.vercel.app/pagos/error';

export const isConektaConfigured = () => Boolean(CONEKTA_PRIVATE_KEY);
