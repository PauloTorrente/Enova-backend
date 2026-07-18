import User from './users.model.js';

const CONFIRMATION_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Confirms a user's email from the link sent at registration. Tokens
// older than an hour are rejected even if still present in the DB.
export const confirmUser = async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({ where: { confirmationToken: token } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const isExpired = Date.now() - new Date(user.createdAt).getTime() > CONFIRMATION_TOKEN_TTL_MS;
    if (isExpired) {
      return res.status(400).json({ message: 'Token has expired' });
    }

    user.isConfirmed = true;
    user.confirmationToken = null;
    await user.save();

    return res.status(200).json({ message: 'User confirmed successfully' });
  } catch (error) {
    console.error('[users.confirmation] confirmUser failed:', error.message);
    res.status(500).json({ message: 'Error confirming user', error: error.message });
  }
};
