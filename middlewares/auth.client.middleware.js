import jwt from 'jsonwebtoken';
import Client from '../api/client/client.model.js';
import { extractToken, verifyCsrf } from './auth.cookies.util.js';

// Verifies a client access token (httpOnly cookie, or an Authorization
// header for non-browser callers) and attaches a minimal req.client (id,
// email, companyName). Used by routes that don't need role/permissions —
// see middlewares/client.auth.middleware.js's authenticateClient for the
// richer variant (fetches role + permissions) used by client-admin routes.
export const authenticateClient = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'client') {
      return res.status(403).json({ message: 'Client access required' });
    }

    if (!verifyCsrf(req, decoded)) {
      return res.status(403).json({ message: 'Invalid or missing CSRF token.' });
    }

    const client = await Client.findByPk(decoded.clientId);
    if (!client) {
      return res.status(401).json({ message: 'Client not found' });
    }

    req.client = { id: client.id, email: client.contactEmail, companyName: client.companyName };
    next();
  } catch (error) {
    console.warn('[auth.client.middleware] Client authentication failed:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(401).json({ message: 'Authentication failed' });
  }
};
