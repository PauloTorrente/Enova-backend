// Entry point for the client service layer.
//
// Split by responsibility, one file per concern, following the
// `client.<concern>.service.js` naming convention:
//   - client.registration.service.js   -> registerClient
//   - client.confirmation.service.js   -> confirmClient
//   - client.session.service.js        -> loginClient
//   - client.lookup.service.js         -> getClientById
//   - client.password-reset.service.js -> requestPasswordReset, validatePasswordResetToken, resetPasswordWithToken
//
// Kept as the single import surface so client.controller.js doesn't need
// to know how the service layer is internally organized.
//
// Note: getClientByEmail was removed during this reorganization — it was
// never called anywhere outside this file, so it was dead code.
export { registerClient } from './client.registration.service.js';
export { confirmClient } from './client.confirmation.service.js';
export { loginClient } from './client.session.service.js';
export { getClientById } from './client.lookup.service.js';
export { requestPasswordReset, validatePasswordResetToken, resetPasswordWithToken } from './client.password-reset.service.js';
