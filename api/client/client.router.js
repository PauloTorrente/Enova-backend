import express from 'express';
import { 
  register, 
  confirm, 
  login, 
  getClient,
  getAllClients,         
  getAdminDashboard,     
  forgotPassword,
  resetPassword,
  validateResetToken
} from './client.controller.js';
import { 
  authenticateClient, 
  refreshClientToken,
  authenticateClientAdmin  
} from '../../middlewares/client.auth.middleware.js';

// Create a new router instance
const router = express.Router();

// Route for client registration
router.post('/register', register);

// Route for email confirmation (using token from confirmation email)
router.get('/confirm/:token', confirm);

// Route for client login (returns JWT tokens)
router.post('/login', login);

// Route for password reset request
router.post('/forgot-password', forgotPassword);

// Route for password reset with token
router.post('/reset-password/:token', resetPassword);

// Route to validate reset token
router.get('/validate-reset-token/:token', validateResetToken);

// Route for refreshing access token using refresh token
router.post('/refresh-token', refreshClientToken);

// Route to get current client profile (uses authenticateClient middleware)
router.get('/me', authenticateClient, getClient);

// Route to get ALL clients in the system (admin only)
router.get('/admin/all-clients', authenticateClientAdmin, getAllClients);

// Route to get admin dashboard with system statistics
router.get('/admin/dashboard', authenticateClientAdmin, getAdminDashboard);

// Export the configured router
export default router;
