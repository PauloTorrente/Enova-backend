import * as usersService from './users.service.js';
import User from './users.model.js';

// This function gets a single user by their ID (like when admin wants to check someone’s profile)
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await usersService.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
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
    'phoneNumber',
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
    'phoneNumber',
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

  // Make sure phoneNumber is a string or null
  if ('phoneNumber' in updatedData) {
    updatedData.phoneNumber = updatedData.phoneNumber 
      ? String(updatedData.phoneNumber).replace(/[^0-9+]/g, '')
      : null;
  }

  try {
    const updatedUser = await usersService.updateUser(userId, updatedData);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove sensitive fields and include real phoneNumber
    const { password, confirmationToken, phoneNumber, ...safeUser } = updatedUser.toJSON();
    safeUser.hasPhoneNumber = !!phoneNumber;

    res.json(safeUser);
  } catch (error) {
    console.error('Error updating current user:', error);
    res.status(400).json({
      message: 'Validation error',
      errors: error.errors?.map(err => err.message) || [error.message]
    });
  }
};

// This gets a list of all users (can support filters via query params)
export const getAllUsers = async (req, res) => {
  const filters = req.query;

  try {
    const users = await usersService.getAllUsers(filters);
    res.json(users);
  } catch (error) {
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
