import jwt from 'jsonwebtoken';

// Verifies the Authorization bearer token and attaches the decoded
// payload to req.user. Every other user-facing auth middleware in this
// file builds on top of this one.
export const authenticateUser = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Access denied. Please login first.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
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
