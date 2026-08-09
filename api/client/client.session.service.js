import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Client from './client.model.js';
import { generateCsrfToken } from '../../middlewares/auth.cookies.util.js';

// Authenticates a client and issues session tokens. Tracks failed
// attempts (loginAttempts/lastFailedAttempt) for abuse monitoring, and
// resets that counter on a successful login.
export const loginClient = async (contactEmail, password) => {
  try {
    const client = await Client.findOne({
      where: { contactEmail },
      attributes: { include: ['password'] }
    });

    if (!client) {
      throw new Error('Invalid credentials');
    }
    if (!client.isConfirmed) {
      throw new Error('Please confirm your email first');
    }

    const isPasswordValid = await bcryptjs.compare(password, client.password);
    if (!isPasswordValid) {
      await client.update({
        loginAttempts: (client.loginAttempts || 0) + 1,
        lastFailedAttempt: new Date()
      });
      throw new Error('Invalid credentials');
    }

    const csrfToken = generateCsrfToken();
    const tokenPayload = {
      clientId: client.id,
      email: client.contactEmail,
      role: 'client',
      company: client.companyName,
      csrf: csrfToken
    };

    const [token, refreshToken] = await Promise.all([
      jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' }),
      jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' })
    ]);

    await client.update({ lastLogin: new Date(), loginAttempts: 0 });

    const { password: _, ...clientData } = client.toJSON();
    return { ...clientData, token, refreshToken, csrfToken };
  } catch (error) {
    console.error(`[client.session] loginClient failed (email=${contactEmail}):`, error.message);
    throw error;
  }
};
