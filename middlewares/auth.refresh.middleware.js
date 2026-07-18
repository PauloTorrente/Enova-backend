import jwt from 'jsonwebtoken';
import Client from '../api/client/client.model.js';

// Exchanges a valid client refresh token for a new access + refresh
// token pair. This is a route handler (not a `next()`-calling middleware)
// — it's the endpoint behind POST /clients/refresh-token.
export const refreshClientToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.role !== 'client') {
      return res.status(403).json({ message: 'Invalid token type' });
    }

    const client = await Client.findByPk(decoded.clientId);
    if (!client) {
      return res.status(401).json({ message: 'Client not found' });
    }

    const tokenPayload = {
      clientId: client.id,
      email: client.contactEmail,
      role: 'client',
      company: client.companyName
    };

    const newAccessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '12h' });
    const newRefreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.warn('[auth.refresh.middleware] Token refresh failed:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};
