import jwt from 'jsonwebtoken';
import { extractToken, verifyCsrf } from './auth.cookies.util.js';

// Verifies the access token (httpOnly cookie, or an Authorization header for
// non-browser callers) and attaches the decoded payload to req.user. Every
// other user-facing auth middleware in this file builds on top of this one.
export const authenticateUser = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Access denied. Please login first.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!verifyCsrf(req, decoded)) {
      return res.status(403).json({ message: 'Invalid or missing CSRF token.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.warn('[auth.user.middleware] Token verification failed:', error.message);
    const message = error.name === 'TokenExpiredError'
      ? 'Token expired. Please login again.'
      : 'Invalid token';
    res.status(401).json({ message });
  }
};

// Requires an authenticated user with role "admin".
export const authenticateAdmin = (req, res, next) => {
  authenticateUser(req, res, () => {
    if (req.user?.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Administrator privileges required.' });
    }
    next();
  });
};
