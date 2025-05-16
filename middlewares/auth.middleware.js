import jwt from 'jsonwebtoken'; // JWT verification

// Middleware to check if the user is authenticated
export const authenticateUser = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.log('🚫 No token provided');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify the token and decode it
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Minimal debug output
    console.log(`✅ Authenticated User ID: ${req.user.userId}, Role: ${req.user.role}`);
    next();
  } catch (error) {
    console.error('❌ Token validation error:', error.message);
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if the user is authenticated and is an admin
export const authenticateAdmin = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.log('🚫 No token provided');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify the token and decode it
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Check if the user role is admin
    if (req.user.role !== 'Admin') {
      console.log(`🚫 Access denied for User ID: ${req.user.userId}, Role: ${req.user.role}`);
      return res.status(403).json({ message: 'Access denied. Only admins can access this resource.' });
    }

    console.log(`🔒 Authenticated Admin ID: ${req.user.userId}`);
    next();
  } catch (error) {
    console.error('❌ Token validation error:', error.message);
    return res.status(401).json({ message: 'Token is not valid' });
  }
};
