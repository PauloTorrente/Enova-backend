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
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Missing authentication token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const client = await Client.findByPk(decoded.clientId);
    
    if (!client) {
      return res.status(401).json({ message: 'Client not found' });
    }

    req.client = { id: client.id, companyName: client.companyName };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
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
    if (decoded.clientId) {
      const client = await Client.findByPk(decoded.clientId);
      if (!client) {
        return res.status(401).json({ message: 'Client not found' });
      }
      
      req.client = { 
        id: client.id, 
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
