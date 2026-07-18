import * as authService from './auth.service.js';

// User login
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { token, refreshToken } = await authService.login(email, password);
    res.status(200).json({ message: 'Login successful!', token, refreshToken });
  } catch (error) {
    console.error(`[auth.session] login failed (email=${email}):`, error.message);

    if (error.message === 'Invalid credentials.') {
      return res.status(401).json({ message: error.message });
    }
    if (error.message === 'Please confirm your email before logging in.') {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};

// Refresh the access token using a valid refresh token
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required.' });
  }

  try {
    const newToken = await authService.refreshToken(refreshToken);
    res.status(200).json({ message: 'Token refreshed successfully!', token: newToken });
  } catch (error) {
    console.error('[auth.session] refreshToken failed:', error.message);

    if (error.message === 'Invalid refresh token.') {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};
