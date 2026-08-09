import jwt from 'jsonwebtoken';
import Client from '../api/client/client.model.js';
import { extractToken, extractRefreshToken, verifyCsrf, setAuthCookies, generateCsrfToken } from './auth.cookies.util.js';

const ACCESS_MAX_AGE_MS = 7 * 60 * 60 * 1000; // 7h, matches refreshClientToken's expiresIn below

// Client auth middleware that also loads role + permissions into
// req.client — used by routes that need to distinguish client_admin from
// a regular client. See middlewares/auth.client.middleware.js for the
// lighter-weight variant (id/email/companyName only).
export const authenticateClient = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Authentication token not provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!verifyCsrf(req, decoded)) {
      return res.status(403).json({ message: 'Invalid or missing CSRF token.' });
    }

    // Fetch complete client information from database
    const client = await Client.findByPk(decoded.clientId, {
      attributes: ['id', 'companyName', 'contactEmail', 'role', 'permissions']
    });
    
    if (!client) {
      return res.status(401).json({ message: 'Client not found' });
    }

    req.client = { 
      id: client.id,
      companyName: client.companyName,
      email: client.contactEmail,
      role: client.role || 'client',
      permissions: client.permissions || {}
    };
    
    next();
  } catch (error) {
    console.warn('[client.auth.middleware] Client authentication failed:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }

    res.status(401).json({ message: 'Invalid token' });
  }
};

// Requires an authenticated client whose role is specifically
// 'client_admin' (cross-client access), not just any client.
export const authenticateClientAdmin = async (req, res, next) => {
  authenticateClient(req, res, () => {
    if (req.client?.role !== 'client_admin') {
      return res.status(403).json({
        message: 'Access restricted to client administrators only'
      });
    }
    next();
  });
};

export const refreshClientToken = async (req, res) => {
  const refreshToken = extractRefreshToken(req);

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Verify if client still exists
    const client = await Client.findByPk(decoded.clientId);
    if (!client) {
      return res.status(401).json({ message: 'Client not found' });
    }

    const csrfToken = generateCsrfToken();
    const newToken = jwt.sign(
      {
        clientId: decoded.clientId,
        email: decoded.email,
        role: client.role || 'client',
        csrf: csrfToken
      },
      process.env.JWT_SECRET,
      { expiresIn: '7h' }
    );

    setAuthCookies(res, { accessToken: newToken, accessMaxAgeMs: ACCESS_MAX_AGE_MS, csrfToken });

    res.status(200).json({
      client: {
        id: client.id,
        companyName: client.companyName,
        role: client.role
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};
