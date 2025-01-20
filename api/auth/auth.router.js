import express from 'express'; // Importing Express framework
import { register, login } from './auth.controller.js'; // Importing authentication controllers
import { refreshToken as handleRefreshToken } from './auth.service.js'; // Importing refresh token function from auth service

const router = express.Router(); // Creating an instance of Express Router

// Route for user registration
router.post('/register', register);

// Route for user login
router.post('/login', login);

// Route for handling refresh tokens
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body; // Extracting refresh token from request body

  // Checking if refresh token is provided
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    // Attempting to generate a new access token using the provided refresh token
    const newToken = await handleRefreshToken(refreshToken);
    res.status(200).json({ token: newToken }); // Sending the new access token to the client
  } catch (error) {
    console.error('Error refreshing token:', error); // Logging error for debugging
    res.status(401).json({ message: 'Invalid refresh token' }); // Sending an error response if the token is invalid
  }
});

export default router; // Exporting the router to be used in other parts of the application
