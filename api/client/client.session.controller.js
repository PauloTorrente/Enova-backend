import * as clientService from './client.service.js';
import { setAuthCookies, clearAuthCookies } from '../../middlewares/auth.cookies.util.js';

const ACCESS_MAX_AGE_MS = 60 * 60 * 1000; // 1h, matches the access token's expiresIn
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7d, matches the refresh token's expiresIn
const REFRESH_PATH = '/api/clients/refresh-token';

// Client authentication. Tokens are set as httpOnly cookies rather than
// returned in the body — the frontend never touches them directly, so an
// XSS bug on the frontend can't read them out of localStorage.
export const login = async (req, res) => {
  const { contactEmail, password } = req.body;
  try {
    const { token, refreshToken, csrfToken, ...clientData } = await clientService.loginClient(contactEmail, password);
    setAuthCookies(res, {
      accessToken: token,
      accessMaxAgeMs: ACCESS_MAX_AGE_MS,
      refreshToken,
      refreshMaxAgeMs: REFRESH_MAX_AGE_MS,
      refreshPath: REFRESH_PATH,
      csrfToken,
    });
    // csrfToken cookie is cross-origin (onrender.com vs the client-side
    // frontend's own domain) and unreadable by that frontend's JS — same
    // issue as auth.session.controller.js. Ship the value in the body too
    // so the frontend can keep it in memory instead of reading a cookie.
    res.json({ ...clientData, csrfToken });
  } catch (error) {
    console.error(`[client.session] login failed (email=${contactEmail}):`, error.message);
    res.status(401).json({ message: error.message });
  }
};

// Clears the auth cookies. Stateless JWTs can't be revoked server-side, but
// clearing the cookies still ends the session for this browser.
export const logout = (_req, res) => {
  clearAuthCookies(res, { refreshPath: REFRESH_PATH });
  res.status(200).json({ message: 'Logged out.' });
};
