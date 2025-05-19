import jwt from 'jsonwebtoken'; // Import JWT library for token verification

// Middleware to authenticate regular users

export const authenticateUser = (req, res, next) => {
  // Get token from Authorization header (format: "Bearer <token>")
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // If no token found, immediately deny access
  if (!token) {
    console.log('🚫 Access attempt with no token');
    return res.status(401).json({ 
      message: 'Access denied. Please login first.' 
    });
  }

  try {
    // Verify the token using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach the decoded user info to the request object
    req.user = decoded;

    // Helpful debug log (only shown in development)
    console.log(`✅ User authenticated: ${req.user.email} (ID: ${req.user.userId})`);
    
    // Move to the next middleware/route handler
    next();
  
  } catch (error) {
    // Handle different types of JWT errors
    console.error('❌ Token verification failed:', error.message);
    
    let errorMessage = 'Invalid token';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token expired. Please login again.';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Malformed token';
    }

    return res.status(401).json({ 
      message: errorMessage 
    });
  }
};

// Middleware to authenticate ADMIN users only
export const authenticateAdmin = (req, res, next) => {
  // First, check regular authentication
  authenticateUser(req, res, () => {
    // If we get here, authenticateUser passed
    
    // Check if user has admin privileges (case-insensitive check)
    if (req.user?.role?.toLowerCase() !== 'admin') {
      console.log(`🚫 Admin access denied for ${req.user.email} (role: ${req.user.role})`);
      return res.status(403).json({ 
        message: 'Administrator privileges required.' 
      });
    }

    // Helpful debug log
    console.log(`🔒 Admin access granted to ${req.user.email}`);
    
    // User is authenticated AND is admin - proceed
    next();
  });
};
