import * as passwordService from './password.service.js';

// Request password reset for a user
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const result = await passwordService.requestPasswordReset(email);
    res.status(200).json(result);
  } catch (error) {
    console.error(`[auth.password] requestPasswordReset failed (email=${email}):`, error.message);

    if (error.message === 'Email not found in our system') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to process password reset request' });
  }
};

// Reset user password using a valid token
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const result = await passwordService.resetPassword(token, newPassword);
    res.status(200).json(result);
  } catch (error) {
    // Never log the reset token — it's a live credential until it expires.
    console.error('[auth.password] resetPassword failed:', error.message);

    if (error.message === 'Invalid or expired password reset token') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to reset password' });
  }
};
