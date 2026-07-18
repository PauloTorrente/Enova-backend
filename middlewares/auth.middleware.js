// Entry point for the user/admin/client auth middlewares.
//
// Split by responsibility, one file per concern, following the
// `auth.<concern>.middleware.js` naming convention:
//   - auth.user.middleware.js   -> authenticateUser, authenticateAdmin
//   - auth.client.middleware.js -> authenticateClient (minimal req.client)
//   - auth.hybrid.middleware.js -> authenticateAdminOrClient
//   - auth.refresh.middleware.js -> refreshClientToken
//
// Note: middlewares/client.auth.middleware.js is a separate, intentionally
// distinct file — it defines its own authenticateClient (which also loads
// role + permissions) for routes that need that richer client context.
// The two are not interchangeable; don't merge them without checking
// every call site's expected req.client shape.
export { authenticateUser, authenticateAdmin } from './auth.user.middleware.js';
export { authenticateClient } from './auth.client.middleware.js';
export { authenticateAdminOrClient } from './auth.hybrid.middleware.js';
export { refreshClientToken } from './auth.refresh.middleware.js';
