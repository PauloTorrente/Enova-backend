import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../users/users.model.js';
import { generateCsrfToken } from '../../middlewares/auth.cookies.util.js';

// Verifies credentials and issues a short-lived access token plus a
// longer-lived refresh token. Rejects unconfirmed accounts — see
// auth.registration.service.js for the confirmation-email flow.
export const login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('The email or password may be incorrect.');
  }

  if (!user.isConfirmed) {
    throw new Error('Please confirm your email before logging in.');
  }

  const isPasswordValid = await bcryptjs.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('The email or password may be incorrect.');
  }

  const csrfToken = generateCsrfToken();

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role.toLowerCase(), csrf: csrfToken },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, csrf: csrfToken },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { token, refreshToken, csrfToken };
};

// Exchanges a valid refresh token for a new short-lived access token.
export const refreshToken = async (oldRefreshToken) => {
  try {
    const decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET);
    const csrfToken = generateCsrfToken();

    const token = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role, csrf: csrfToken },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return { token, csrfToken };
  } catch (error) {
    // Don't log the token itself or the verify error detail — both can
    // leak information useful for forging tokens.
    console.error('[auth.session] refreshToken rejected an invalid/expired token');
    throw new Error('Invalid refresh token.');
  }
};
