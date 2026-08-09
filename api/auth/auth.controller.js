// Entry point for the auth controllers.
//
// Split by responsibility, one file per concern, following the
// `auth.<concern>.controller.js` naming convention:
//   - auth.registration.controller.js -> register
//   - auth.session.controller.js      -> login, refreshToken
//   - auth.password.controller.js     -> requestPasswordReset, resetPassword
//
// Kept as the single import surface so auth.router.js doesn't need to
// know how this controller is internally organized.
export { register } from './auth.registration.controller.js';
export { login, refreshToken, logout } from './auth.session.controller.js';
export { requestPasswordReset, resetPassword } from './auth.password.controller.js';
