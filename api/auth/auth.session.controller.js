import * as authService from './auth.service.js';
import { setAuthCookies, clearAuthCookies, extractRefreshToken } from '../../middlewares/auth.cookies.util.js';

const ACCESS_MAX_AGE_MS = 60 * 60 * 1000; // 1h, matches the access token's expiresIn
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7d, matches the refresh token's expiresIn
const REFRESH_PATH = '/api/auth/refresh-token';

// User login. Tokens are set as httpOnly cookies rather than returned in the
// body — the frontend never touches them directly, so an XSS bug on the
// frontend can't read them out of localStorage.
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { token, refreshToken, csrfToken } = await authService.login(email, password);
    setAuthCookies(res, {
      accessToken: token,
      accessMaxAgeMs: ACCESS_MAX_AGE_MS,
      refreshToken,
      refreshMaxAgeMs: REFRESH_MAX_AGE_MS,
      refreshPath: REFRESH_PATH,
      csrfToken,
    });
    // The csrfToken cookie above is unreadable by the frontend's own JS:
    // it's set by enova-backend.onrender.com, a different registrable
    // domain than the frontend (opinacash.com, *.vercel.app), and
    // document.cookie can never see a cookie that belongs to another
    // origin — that's a browser-enforced boundary, not a config mistake.
    // So the value also rides in the body; the frontend keeps it in memory
    // and mirrors it into X-CSRF-Token itself instead of reading a cookie.
    res.status(200).json({ message: 'Login successful!', csrfToken });
  } catch (error) {
    console.error(`[auth.session] login failed (email=${email}):`, error.message);

    if (error.message === 'The email or password may be incorrect.') {
      return res.status(401).json({ message: error.message });
    }
    if (error.message === 'Please confirm your email before logging in.') {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};

// Refresh the access token using the refresh token cookie (or, for
// non-browser callers, a refreshToken in the body).
export const refreshToken = async (req, res) => {
  const oldRefreshToken = extractRefreshToken(req);

  if (!oldRefreshToken) {
    return res.status(400).json({ message: 'Refresh token is required.' });
  }

  try {
    const { token: newToken, csrfToken } = await authService.refreshToken(oldRefreshToken);
    setAuthCookies(res, { accessToken: newToken, accessMaxAgeMs: ACCESS_MAX_AGE_MS, csrfToken });
    // See the same note in login() above — the cookie is cross-origin and
    // unreadable by the frontend, so the value has to travel in the body too.
    res.status(200).json({ message: 'Token refreshed successfully!', csrfToken });
  } catch (error) {
    console.error('[auth.session] refreshToken failed:', error.message);

    if (error.message === 'Invalid refresh token.') {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};

// Clears the auth cookies. Stateless JWTs can't be revoked server-side, but
// clearing the cookies still ends the session for this browser.
export const logout = (_req, res) => {
  clearAuthCookies(res, { refreshPath: REFRESH_PATH });
  res.status(200).json({ message: 'Logged out.' });
};
