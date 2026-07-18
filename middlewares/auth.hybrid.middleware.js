import jwt from 'jsonwebtoken';
import Client from '../api/client/client.model.js';

// Accepts either an admin user token or a client token on the same
// route, setting req.user or req.client depending on which one the
// token decodes to. Used by endpoints both roles can call (e.g. survey
// creation).
export const authenticateAdminOrClient = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role?.toLowerCase() === 'admin') {
      req.user = { id: decoded.userId, role: decoded.role.toLowerCase(), email: decoded.email };
      return next();
    }

    if (decoded.clientId || decoded.role === 'client') {
      const clientId = decoded.clientId || decoded.id;
      const client = await Client.findByPk(clientId);
      if (!client) {
        return res.status(401).json({ message: 'Client not found' });
      }

      req.client = { id: client.id, email: client.contactEmail, companyName: client.companyName };
      return next();
    }

    throw new Error('Invalid token type');
  } catch (error) {
    console.warn('[auth.hybrid.middleware] Authentication failed:', error.message);
    const status = error.message.includes('expired') ? 401 : 403;
    res.status(status).json({
      message: error.message.includes('expired') ? 'Token expired' : 'Authentication failed'
    });
  }
};
