import jwt from 'jsonwebtoken';
import Client from '../api/client/client.model.js';

// Middleware for regular user authentication
export const authenticateUser = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    console.log('🚫 No token provided');
    return res.status(401).json({ message: 'Access denied. Please login first.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log(`✅ User auth: ${req.user.email}`);
    next();
  } catch (error) {
    console.error('❌ Token error:', error.message);
    const message = error.name === 'TokenExpiredError' 
      ? 'Token expired. Please login again.' 
      : 'Invalid token';
    res.status(401).json({ message });
  }
};

// Middleware for admin-only routes
export const authenticateAdmin = (req, res, next) => {
  authenticateUser(req, res, () => {
    if (req.user?.role?.toLowerCase() !== 'admin') {
      console.log(`🚫 Admin access denied for ${req.user?.email}`);
      return res.status(403).json({ message: 'Administrator privileges required.' });
    }
    console.log(`🔒 Admin access: ${req.user.email}`);
    next();
  });
};

// Middleware for client authentication
export const authenticateClient = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's a client token
    if (decoded.role !== 'client') {
      return res.status(403).json({ message: 'Client access required' });
    }

    const client = await Client.findByPk(decoded.clientId);
    if (!client) {
      return res.status(401).json({ message: 'Client not found' });
    }

    req.client = {
      id: client.id,
      email: client.contactEmail,
      companyName: client.companyName
    };

    console.log(`🔑 Client authenticated: ${client.companyName} (ID: ${client.id})`);
    next();
  } catch (error) {
    console.error('Client auth error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Middleware for admin OR client authentication
export const authenticateAdminOrClient = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Admin verification
    if (decoded.role?.toLowerCase() === 'admin') {
      req.user = { 
        id: decoded.userId, 
        role: decoded.role.toLowerCase(),
        email: decoded.email 
      };
      console.log(`🔑 Admin access: ${decoded.email}`);
      return next();
    }
    
    // Client verification
    if (decoded.clientId || decoded.role === 'client') {
      const clientId = decoded.clientId || decoded.id;
      const client = await Client.findByPk(clientId);
      
      if (!client) {
        return res.status(401).json({ message: 'Client not found' });
      }
      
      req.client = { 
        id: client.id,
        email: client.contactEmail,
        companyName: client.companyName 
      };
      console.log(`🔑 Client access: ${client.companyName}`);
      return next();
    }

    throw new Error('Invalid token type');
    
  } catch (error) {
    console.error('Auth error:', error.message);
    const status = error.message.includes('expired') ? 401 : 403;
    res.status(status).json({ 
      message: error.message.includes('expired') 
        ? 'Token expired' 
        : 'Authentication failed' 
    });
  }
};

// Middleware to refresh client token using refresh token
export const refreshClientToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Check if it's a client refresh token
    if (decoded.role !== 'client') {
      return res.status(403).json({ message: 'Invalid token type' });
    }

    // Find client in database
    const client = await Client.findByPk(decoded.clientId);
    if (!client) {
      return res.status(401).json({ message: 'Client not found' });
    }

    // Create payload for new tokens
    const tokenPayload = { 
      clientId: client.id,
      email: client.contactEmail,
      role: 'client',
      company: client.companyName
    };

    // Generate new access token (1 hour expiration)
    const newAccessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '12h' });
    
    // Generate new refresh token (7 days expiration)
    const newRefreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Return both new tokens to the client
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
    
    console.log(`🔄 Tokens refreshed for client: ${client.companyName}`);
    
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Handle different types of JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};
