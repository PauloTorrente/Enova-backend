import * as clientService from './client.service.js';

// Request password reset
export const forgotPassword = async (req, res) => {
  const { contactEmail } = req.body;
  try {
    await clientService.requestPasswordReset(contactEmail);
    // Same response whether or not the email exists — avoids leaking
    // which emails are registered.
    res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
  } catch (error) {
    console.error(`[client.password-reset] forgotPassword failed (email=${contactEmail}):`, error.message);
    res.status(400).json({ message: error.message });
  }
};

// Reset password with token
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const result = await clientService.resetPasswordWithToken(token, password);

    res.json({
      message: 'Password reset successfully! You can now login with your new password.',
      clientId: result.clientId
    });
  } catch (error) {
    console.error('[client.password-reset] resetPassword failed:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Validate reset token (used by the reset-password page before showing the form)
export const validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    const isValid = await clientService.validatePasswordResetToken(token);

    if (isValid) {
      return res.json({ valid: true, message: 'Token is valid' });
    }
    res.status(400).json({ valid: false, message: 'Invalid or expired token' });
  } catch (error) {
    console.error('[client.password-reset] validateResetToken failed:', error.message);
    res.status(400).json({ valid: false, message: error.message });
  }
};
