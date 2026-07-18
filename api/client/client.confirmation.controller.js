import * as clientService from './client.service.js';

// Email confirmation endpoint — confirms the account and returns session
// tokens so the client is immediately logged in.
export const confirm = async (req, res) => {
  try {
    const { token } = req.params;
    const result = await clientService.confirmClient(token);

    res.json({
      message: 'Account confirmed successfully!',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    console.error('[client.confirmation] confirm failed:', error.message);
    res.status(400).json({ message: error.message });
  }
};
