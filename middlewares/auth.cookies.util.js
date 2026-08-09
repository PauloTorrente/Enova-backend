import crypto from 'crypto';

// Shared helpers for the cookie-based session model: access/refresh tokens
// live in httpOnly cookies (unreadable by JS, so an XSS bug can't exfiltrate
// them the way it could with localStorage). A third, JS-readable cookie
// carries a CSRF token that the frontend mirrors into a request header —
// see verifyCsrf below for why that's needed despite httpOnly.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// All cookies here are SameSite=None because the two frontends
// (opinacash.com, *.vercel.app) are on different registrable domains than
// this API (onrender.com) — SameSite=None requires Secure regardless of
// NODE_ENV, so that's not gated behind an environment check.
const authCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
};

export const generateCsrfToken = () => crypto.randomBytes(24).toString('hex');

// Sets accessToken/refreshToken (httpOnly) and csrfToken (readable) cookies.
// refreshToken/refreshPath are optional — omit them on a refresh-only
// response where no new refresh token was issued.
export const setAuthCookies = (res, {
  accessToken,
  accessMaxAgeMs,
  refreshToken,
  refreshMaxAgeMs,
  refreshPath = '/',
  csrfToken,
}) => {
  res.cookie('accessToken', accessToken, { ...authCookieOptions, maxAge: accessMaxAgeMs, path: '/' });

  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, { ...authCookieOptions, maxAge: refreshMaxAgeMs, path: refreshPath });
  }

  // Not httpOnly: the frontend needs to read this value in JS to send it
  // back as the X-CSRF-Token header (double-submit pattern).
  res.cookie('csrfToken', csrfToken, { secure: true, sameSite: 'none', maxAge: accessMaxAgeMs, path: '/' });
};

export const clearAuthCookies = (res, { refreshPath = '/' } = {}) => {
  res.clearCookie('accessToken', { ...authCookieOptions, path: '/' });
  res.clearCookie('refreshToken', { ...authCookieOptions, path: refreshPath });
  res.clearCookie('csrfToken', { secure: true, sameSite: 'none', path: '/' });
};

// Reads the access token from its httpOnly cookie first, falling back to
// an Authorization header for non-browser callers (server-to-server, tests).
export const extractToken = (req) =>
  req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '') || null;

export const extractRefreshToken = (req) => req.cookies?.refreshToken || req.body?.refreshToken || null;

// SameSite=None means these cookies ARE sent on cross-site requests, so
// (unlike a same-site app) we can't lean on SameSite to block CSRF. Instead
// we validate a double-submit token: the csrf claim embedded in the
// verified access token must match the X-CSRF-Token header, which the
// frontend fills in from the readable csrfToken cookie. An attacker's page
// can trigger the cross-site request but can't read the csrfToken cookie
// (different origin), so it can't produce a matching header.
// Safe methods (GET/HEAD/OPTIONS) can't mutate state, so they're exempt.
export const verifyCsrf = (req, decoded) => {
  if (SAFE_METHODS.has(req.method)) return true;
  const headerToken = req.header('X-CSRF-Token');
  return Boolean(headerToken) && Boolean(decoded?.csrf) && headerToken === decoded.csrf;
};
