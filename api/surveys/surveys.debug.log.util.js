// Shared logger for the client-debug endpoints below. In development it
// prints everything; in production it only surfaces warnings/errors, so
// these troubleshooting routes don't spam production logs on the happy path.
export const DIAGNOSTIC_MODE = process.env.NODE_ENV === 'development';

export const log = (prefix, message, data = null) => {
  if (DIAGNOSTIC_MODE) {
    data ? console.log(`${prefix} ${message}`, data) : console.log(`${prefix} ${message}`);
    return;
  }
  if (prefix.includes('❌') || prefix.includes('⚠️')) {
    console.log(`${prefix} ${message}`);
  }
};
