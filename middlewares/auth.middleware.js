import jwt from 'jsonwebtoken'; // Importing jsonwebtoken to verify the JWT

// Middleware to check if the user is authenticated
export const authenticateUser = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify the token and decode it
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = decoded.user; // Attach user info to request
    next(); // Proceed to next middleware or route handler
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if the user is authenticated and is an admin
export const authenticateAdmin = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify the token and decode it
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = decoded.user; // Attach user info to request

    // Check if the user role is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can create surveys.' });
    }
    
    next(); // If the user is an admin, proceed to the next middleware or route handler
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};
