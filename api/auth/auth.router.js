import express from 'express';
import { register, login } from './auth.controller.js';
import { refreshToken as handleRefreshToken } from './auth.service.js';

const router = express.Router();
router.post('/register', register);
router.post('/login', login);


router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const newToken = await handleRefreshToken(refreshToken);
    res.status(200).json({ token: newToken });
  } catch (error) {
    console.error('Error refreshing token:', error); 
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

export default router;
