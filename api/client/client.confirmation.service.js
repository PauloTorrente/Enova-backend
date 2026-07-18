import jwt from 'jsonwebtoken';
import Client from './client.model.js';

// Confirms a client account from its confirmation token and immediately
// issues session tokens, so the client lands logged-in right after
// clicking the confirmation link (no separate login step required).
export const confirmClient = async (token) => {
  try {
    const client = await Client.findOne({ where: { confirmationToken: token } });
    if (!client) {
      throw new Error('Invalid or expired token');
    }

    client.isConfirmed = true;
    client.confirmationToken = null;
    await client.save();

    const tokenPayload = { clientId: client.id, email: client.contactEmail, role: 'client' };
    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...clientData } = client.toJSON();

    return { client: clientData, accessToken, refreshToken };
  } catch (error) {
    console.error('[client.confirmation] confirmClient failed:', error.message);
    throw error;
  }
};
