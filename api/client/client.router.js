import express from 'express';
import { register, confirm, login, getClient 
} from './client.controller.js';
import { 
  authenticateClient, 
  refreshClientToken 
} from '../../middlewares/client.auth.middleware.js';

// Create a new router instance
const router = express.Router();

// Route for client registration
router.post('/register', register);

// Route for email confirmation (using token from confirmation email)
router.get('/confirm/:token', confirm);

// Route for client login (returns JWT tokens)
router.post('/login', login);

// Route for refreshing access token using refresh token
router.post('/refresh-token', refreshClientToken);

// Route to get current client profile (uses authenticateClient middleware)
router.get('/me', authenticateClient, getClient);

// Export the configured router
export default router;

