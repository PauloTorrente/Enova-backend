import * as userService from './auth.service.js';
import User from '../users/users.model.js';
import jwtDecode from 'jwt-decode';

// User login controller
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // call service to authenticate and get tokens
    const { token, refreshToken } = await userService.login(email, password);

    // decode token to extract userId
    const { userId } = jwtDecode(token);

    // fetch full user data from database
    const user = await User.findByPk(userId);

    // if user is not found, return 404
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // convert Sequelize instance to plain object and remove sensitive fields
    const { password: pw, confirmationToken, ...safeUser } = user.toJSON();

    // respond with tokens and full user profile (including phoneNumber)
    return res.status(200).json({
      message: 'Login successful!',
      token,
      refreshToken,
      user: safeUser, // user data for frontend, includes phoneNumber
    });
  } catch (error) {
    // log error for debugging
    console.error('Error logging in:', error);

    // handle known error messages
    if (error.message === 'Invalid credentials.') {
      return res.status(401).json({ message: error.message });
    } else if (error.message === 'Please confirm your email before logging in.') {
      return res.status(403).json({ message: error.message });
    }

    // fallback to 500 for unexpected errors
    return res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};

// User registration controller (example for reference)
export const register = async (req, res) => {
  const {
    email,
    password,
    role,
    firstName,
    lastName,
    gender,
    age,
    phoneNumber,
    city,
    residentialArea,
    purchaseResponsibility,
    childrenCount,
    childrenAges,
    educationLevel,
  } = req.body;

  try {
    // register new user
    const newUser = await userService.register({
      email,
      password,
      role,
      firstName,
      lastName,
      gender,
      age,
      phoneNumber,
      city,
      residentialArea,
      purchaseResponsibility,
      childrenCount,
      childrenAges,
      educationLevel,
    });

    // respond with created user info
    return res.status(201).json({
      message: 'User registered successfully! Please check your email to confirm your account.',
      user: newUser,
    });
  } catch (error) {
    // Debug: Log error if registration fails
    console.error('Error registering user:', error);
    // specific error handling
    if (error.message === 'This email is already registered.') {
      return res.status(409).json({ message: error.message });
    } else if (error.message === 'Email, password, first name, and last name are required.') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error registering user. Please try again later.' });
  }
};

// Token refresh controller (example for reference)
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required.' });
  }

  try {
    // get new token
    const newToken = await userService.refreshToken(refreshToken);
    return res.status(200).json({
      message: 'Token refreshed successfully!',
      token: newToken,
    });
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