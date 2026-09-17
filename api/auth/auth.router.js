import express from 'express'; 
import {
  register,
  login,
  refreshToken,
  logout,
  requestPasswordReset,
  resetPassword
} from './auth.controller.js';
import { authenticateUser, authenticateAdmin } from '../../middlewares/auth.middleware.js';
import { sendOtp as sendWhatsappOtp, verifyOtp as verifyWhatsappOtp } from './auth.whatsapp.controller.js';

const router = express.Router(); 

// Route for user registration
router.post('/register', register);

// Route for user login
router.post('/login', login);

// Route for handling refresh tokens
router.post('/refresh-token', refreshToken);

// Route for logging out (clears the auth cookies)
router.post('/logout', logout);

// Route for requesting password reset
router.post('/forgot-password', requestPasswordReset);

// Route for resetting password with valid token
router.post('/reset-password', resetPassword);

// Filtro Preliminar: verify the respondent's WhatsApp number (payment rail)
router.post('/whatsapp/send-otp', authenticateUser, sendWhatsappOtp);
router.post('/whatsapp/verify-otp', authenticateUser, verifyWhatsappOtp);

// Route that requires authentication
router.get('/profile', authenticateUser, (req, res) => {
  // Logic for profile fetching here
  res.json({ message: 'This is your profile', user: req.user });
});

// Route for admin-only actions (example)
router.post('/admin-action', authenticateAdmin, (req, res) => {
  // Logic for admin action
  res.json({ message: 'Admin action performed' });
});

export default router;
