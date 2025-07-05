import * as usersService from './users.service.js';
import User from './users.model.js';

// This function gets a single user by their ID (like when admin wants to check someone’s profile)
export const getUserById = async (req, res) => {
  const { id } = req.params; // Get the ID from the URL
  const requester = req.user; // Get the user who made the request (added by auth middleware)

  try {
    // Call the service to find user in the database
    const user = await usersService.getUserById(id);
    // If user is not found, send 404 response
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // If the requester is NOT an admin, only send public info
    if (requester.role !== 'admin') {
      // Remove sensitive info like password and tokens
      const { password, confirmationToken, resetPasswordToken, ...publicData } = user.toJSON();
      return res.json(publicData);
    }
    // If the requester is an admin, return all user data
    res.json(user);
  } catch (error) {
    // If there's an error, log it and return 500
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

// This is used when a user clicks on a confirmation email link
export const confirmUser = async (req, res) => {
  const { token } = req.params;

  try {
    // Look for a user with this confirmation token
    const user = await User.findOne({ where: { confirmationToken: token } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Check if the token is older than 1 hour
    const expirationTime = 60 * 60 * 1000;
    const isExpired = Date.now() - new Date(user.createdAt).getTime() > expirationTime;

    if (isExpired) {
      return res.status(400).json({ message: 'Token has expired' });
    }

    // Confirm the user and clear the token
    user.isConfirmed = true;
    user.confirmationToken = null;
    await user.save();

    return res.status(200).json({ message: 'User confirmed successfully' });
  } catch (error) {
    console.error('Error confirming user:', error);
    res.status(500).json({ message: 'Error confirming user', error: error.message });
  }
};

// This is for admins or users editing user profiles by ID (/users/:id)
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const requester = req.user;

  // Only the user themselves or an admin can update
  if (requester.role !== 'admin' && requester.userId !== Number(id)) {
    return res.status(403).json({ message: 'Forbidden: you can only edit your own profile.' });
  }

  // These are the fields that can be updated
  const allowedFields = [
    'firstName',
    'lastName',
    'gender',
    'age',
    'phone_number',
    'city',
    'residentialArea',
    'purchaseResponsibility',
    'childrenCount',
    'childrenAges',
    'educationLevel'
  ];

  // Build an object with the updated values only
  const updatedData = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      updatedData[key] = req.body[key];
    }
  }

  try {
    const updatedUser = await usersService.updateUser(id, updatedData);
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// This is for updating the logged-in user using /users/me
export const updateCurrentUser = async (req, res) => {
  const userId = req.user.userId;

  // Fields that users can update themselves
  const allowedFields = [
    'firstName',
    'lastName',
    'gender',
    'age',
    'phone_number',
    'city',
    'residentialArea',
    'purchaseResponsibility',
    'childrenCount',
    'childrenAges',
    'educationLevel'
  ];

  // Prepare the data to update
  const updatedData = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      updatedData[key] = req.body[key];
    }
  }

  // Make sure phone_number is a string or null
  if ('phone_number' in updatedData) {
    updatedData.phone_number = updatedData.phone_number 
      ? String(updatedData.phone_number).replace(/[^0-9+]/g, '')
      : null;
  }

  try {
    const updatedUser = await usersService.updateUser(userId, updatedData);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove sensitive fields and include real phone_number
    const { password, confirmationToken, phone_number, ...safeUser } = updatedUser.toJSON();
    safeUser.hasphone_number = !!phone_number;

    res.json(safeUser);
  } catch (error) {
    console.error('Error updating current user:', error);
    res.status(400).json({
      message: 'Validation error',
      errors: error.errors?.map(err => err.message) || [error.message]
    });
  }
};

// This function gets all users (with optional filters)
export const getAllUsers = async (req, res) => {
  const requester = req.user; // The user making the request
  const filters = req.query;  // Optional filters from query params

  try {
    // Get all users using filters (if any)
    const users = await usersService.getAllUsers(filters);

    // If the requester is NOT an admin, only return public info
    if (requester.role !== 'admin') {
      const publicUsers = users.map(user => {
        // Remove sensitive fields
        const { password, confirmationToken, resetPasswordToken, ...publicData } = user.toJSON();
        publicData.score = publicData.score || 0;
        return publicData;
      });

      return res.json(publicUsers);
    }

    // If admin, return full user list with all data
    res.json(users);
  } catch (error) {
    // If there's an error, return 500 and log it
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// This function soft deletes a user (doesn't remove from DB, just marks)
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await usersService.deleteUser(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

// This gets the wallet balance for a specific user by ID
export const getWalletBalance = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await usersService.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ walletBalance: user.walletBalance });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ message: 'Error fetching wallet balance', error: error.message });
  }
};

// only Admin can update userScore
export const updateUserScore = async (req, res) => {
  const { id } = req.params;
  const { points } = req.body;

  if (typeof points !== 'number') {
    return res.status(400).json({ message: 'Invalid points value' });
  }

  try {
    const updatedUser = await usersService.updateUserScore(id, points);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ 
      message: 'Score updated successfully',
      newScore: updatedUser.score
    });
  } catch (error) {
    console.error('Error updating user score:', error);
    res.status(500).json({ message: 'Error updating score', error: error.message });
  }
};
