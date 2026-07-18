// Entry point for the client controllers.
//
// Split by responsibility, one file per concern, following the
// `client.<concern>.controller.js` naming convention:
//   - client.registration.controller.js   -> register
//   - client.confirmation.controller.js   -> confirm
//   - client.session.controller.js        -> login
//   - client.profile.controller.js        -> getClient
//   - client.password-reset.controller.js -> forgotPassword, resetPassword, validateResetToken
//   - client.admin.controller.js          -> getAllClients
//   - client.admin.dashboard.controller.js -> getAdminDashboard
//   - client.admin.details.controller.js  -> getClientDetails
//
// Kept as the single import surface so client.router.js doesn't need to
// know how this controller is internally organized.
export { register } from './client.registration.controller.js';
export { confirm } from './client.confirmation.controller.js';
export { login } from './client.session.controller.js';
export { getClient } from './client.profile.controller.js';
export { forgotPassword, resetPassword, validateResetToken } from './client.password-reset.controller.js';
export { getAllClients } from './client.admin.controller.js';
export { getAdminDashboard } from './client.admin.dashboard.controller.js';
export { getClientDetails } from './client.admin.details.controller.js';
