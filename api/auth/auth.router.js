import express from 'express'; 
import { register, login, refreshToken } from './auth.controller.js'; 
import { authenticateUser, authenticateAdmin } from '../../middlewares/auth.middleware.js';

const router = express.Router(); 

// Route for user registration
router.post('/register', register);

// Route for user login
router.post('/login', login);

// Route for handling refresh tokens
router.post('/refresh-token', refreshToken);

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
