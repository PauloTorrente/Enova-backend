import jwt from 'jsonwebtoken';

export const authenticateClient = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticação não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.client = { id: decoded.clientId };
    next();
  } catch (error) {
    console.error('Erro na autenticação do cliente:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    
    res.status(401).json({ message: 'Token inválido' });
  }
};

export const refreshClientToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token é obrigatório' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const newToken = jwt.sign(
      { clientId: decoded.clientId, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token: newToken });
  } catch (error) {
    res.status(401).json({ message: 'Refresh token inválido' });
  }
};
