import jwt from 'jsonwebtoken';
import Client from '../api/client/client.model.js';

export const authenticateClient = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticação ausente' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const client = await Client.findByPk(decoded.clientId);
    
    if (!client) {
      return res.status(401).json({ message: 'Cliente não encontrado' });
    }

    req.client = { id: client.id, companyName: client.companyName };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido ou expirado' });
  }
};
