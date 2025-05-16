import * as userService from './auth.service.js';
import User from '../users/users.model.js';

// Register a new user
export const register = async (req, res) => {
  // junior dev comment: we get all needed fields from request body
  const {
    email, password, role,
    firstName, lastName, gender,
    age, phoneNumber, city,
    residentialArea, purchaseResponsibility,
    childrenCount, childrenAges, educationLevel
  } = req.body;

  console.log('Registration data received:', req.body);

  try {
    // call service to create user
    const newUser = await userService.register({
      email, password, role,
      firstName, lastName, gender,
      age, phoneNumber, city,
      residentialArea, purchaseResponsibility,
      childrenCount, childrenAges, educationLevel
    });

    // junior dev comment: respond with created user (without password)
    const { password: pw, confirmationToken, ...safeUser } = newUser.toJSON();
    return res
      .status(201)
      .json({ message: 'User registered successfully! Please check your email to confirm your account.', user: safeUser });
  } catch (error) {
    console.error('Error registering user:', error);
    // handle known errors with specific codes
    if (error.message === 'This email is already registered.') {
      return res.status(409).json({ message: error.message });
    }
    if (error.message === 'Email, password, first name, and last name are required.') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error registering user. Please try again later.' });
  }
};

// User login
export const login = async (req, res) => {
  // junior dev comment: extract credentials from request
  const { email, password } = req.body;

  try {
    // authenticate and get tokens
    const { token, refreshToken } = await userService.login(email, password);

    // junior dev comment: fetch full user profile so we can include phoneNumber
    const userRecord = await User.findOne({
      where: { email },
      attributes: { exclude: ['password', 'confirmationToken'] }
    });
    if (!userRecord) {
      // this probably won't happen as login already checked user exists
      return res.status(404).json({ message: 'User not found after login' });
    }
    const userData = userRecord.toJSON();

    // respond with tokens and user data
    return res.status(200).json({
      message: 'Login successful!',
      token,
      refreshToken,
      user: userData   // includes phoneNumber, firstName, lastName, etc.
    });
  } catch (error) {
    // log error for debugging
    console.error('Error logging in:', error);

    // handle known error messages
    if (error.message === 'Invalid credentials.') {
      return res.status(401).json({ message: error.message });
    }
    if (error.message === 'Please confirm your email before logging in.') {
      return res.status(403).json({ message: error.message });
    }

    // fallback to 500 for unexpected errors
    return res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};

// Refresh the access token using a valid refresh token
export const refreshToken = async (req, res) => {
  const { refreshToken: oldToken } = req.body;
  if (!oldToken) {
    return res.status(400).json({ message: 'Refresh token is required.' });
  }

  try {
    // get a brand new access token
    const newToken = await userService.refreshToken(oldToken);
    return res.status(200).json({ message: 'Token refreshed successfully!', token: newToken });
  } catch (error) {
    // Debug: Log error if token refresh fails
    console.error('Error refreshing token:', error);

    // Handle specific errors
    if (error.message === 'Invalid refresh token.') {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};
