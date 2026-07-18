// Entry point for the auth service layer.
//
// Split by responsibility, one file per concern, following the
// `auth.<concern>.service.js` naming convention:
//   - auth.registration.service.js -> register + confirmation email
//   - auth.session.service.js      -> login + refreshToken
// (password reset lives in the separate password.service.js, which was
// already its own file before this reorganization).
export { register } from './auth.registration.service.js';
export { login, refreshToken } from './auth.session.service.js';
