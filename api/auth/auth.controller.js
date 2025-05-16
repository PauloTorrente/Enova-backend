import * as userService from './auth.service.js';

// Register a new user
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
    educationLevel
  } = req.body;

  // Debug: Log only the email to confirm request (do NOT log passwords or personal info)
  console.log(`📩 Registration attempt for email: ${email}`);

  try {
    // Call the user service to register the user with all the provided fields
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
      educationLevel
    });

    // Respond with success message and user basic info (excluding sensitive data)
    res.status(201).json({
      message: 'User registered successfully! Please check your email to confirm your account.',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    // Debug: Log only the error message
    console.error(`❌ Registration error: ${error.message}`);

    // Handle specific errors with proper status codes
    if (error.message === 'This email is already registered.') {
      return res.status(409).json({ message: error.message });
    } else if (error.message === 'Email, password, first name, and last name are required.') {
      return res.status(400).json({ message: error.message });
    } else if (error.message === 'Error loading the email template') {
      return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    } else {
      return res.status(500).json({ message: 'Error registering user. Please try again later.' });
    }
  }
};

// User login
export const login = async (req, res) => {
  const { email, password } = req.body;

  // Debug: Log only the email for tracking
  console.log(`🔐 Login attempt for email: ${email}`);

  try {
    // Authenticate and get access/refresh tokens
    const { token, refreshToken } = await userService.login(email, password);

    res.status(200).json({
      message: 'Login successful!',
      token,
      refreshToken
    });
  } catch (error) {
    // Debug: Log only the error message
    console.error(`❌ Login error for ${email}: ${error.message}`);

    // Handle specific errors
    if (error.message === 'Invalid credentials.') {
      return res.status(401).json({ message: error.message });
    } else if (error.message === 'Please confirm your email before logging in.') {
      return res.status(403).json({ message: error.message });
    } else {
      return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
  }
};

// Refresh the access token using a valid refresh token
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  // Check if refresh token is present
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required.' });
  }

  try {
    // Generate a new access token
    const newToken = await userService.refreshToken(refreshToken);

    res.status(200).json({
      message: 'Token refreshed successfully!',
      token: newToken
    });
  } catch (error) {
    // Debug: Log only the error message
    console.error(`🔁 Token refresh error: ${error.message}`);

    // Handle specific errors
    if (error.message === 'Invalid refresh token.') {
      return res.status(401).json({ message: error.message });
    } else {
      return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
  }
};
