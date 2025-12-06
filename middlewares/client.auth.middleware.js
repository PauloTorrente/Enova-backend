import jwt from 'jsonwebtoken';
import Client from '../api/client/client.model.js';

export const authenticateClient = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token not provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
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
    console.error('Client authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    res.status(401).json({ message: 'Invalid token' });
  }
};

// New middleware: Only for clients with 'client_admin' role
export const authenticateClientAdmin = async (req, res, next) => {
  // First authenticate as normal client
  authenticateClient(req, res, () => {
    // Then verify if it's client_admin
    if (req.client?.role !== 'client_admin') {
      return res.status(403).json({ 
        message: 'Access restricted to client administrators only' 
      });
    }
    
    console.log(`✅ Client Admin authenticated: ${req.client.companyName}`);
    next();
  });
};

export const refreshClientToken = async (req, res) => {
  const { refreshToken } = req.body;

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
    
    const newToken = jwt.sign(
      { 
        clientId: decoded.clientId, 
        email: decoded.email,
        role: client.role || 'client'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7h' }
    );

    res.status(200).json({ 
      token: newToken,
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
