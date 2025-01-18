import * as userService from './auth.service.js';

// Register a new user
export const register = async (req, res) => {
  const { email, password, role, firstName, lastName, gender, age, phoneNumber, city, residentialArea, purchaseResponsibility, childrenCount, childrenAges, educationLevel } = req.body;

  // Debug: Log the received registration data
  console.log('Registration data received:', req.body);

  try {
    // Call the user service to register the user with the necessary fields
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

    // Respond with the created user data
    res.status(201).json(newUser);
  } catch (error) {
    // Debug: Log error if registration fails
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user', error });
  }
};

// User login
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Attempt to authenticate user and get tokens
    const { token, refreshToken } = await userService.login(email, password);

    // If no token is returned, send an error
    if (!token) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Respond with both the access token and refresh token
    res.status(200).json({ token, refreshToken });
  } catch (error) {
    // Debug: Log error if login fails
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Refresh the access token using a valid refresh token
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  // Check if refresh token is provided
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    // Generate a new token using the provided refresh token
    const newToken = await userService.refreshToken(refreshToken);
    res.status(200).json({ token: newToken });
  } catch (error) {
    // Debug: Log error if token refresh fails
    console.error('Error refreshing token:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};
