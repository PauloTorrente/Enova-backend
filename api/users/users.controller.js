import * as usersService from './users.service.js';
import User from '../users/users.model.js';
import { authenticateAdmin } from '../../middlewares/auth.middleware.js'; 

// Get user details by ID
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await usersService.getUserById(id); // Using service to fetch user
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

// Confirm user registration using a confirmation token
export const confirmUser = async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({ where: { confirmationToken: token } }); // Sequelize query to find user by token
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const expirationTime = 60 * 60 * 1000; // Token expiration time (1 hour)
    const isExpired = Date.now() - new Date(user.createdAt).getTime() > expirationTime;

    if (isExpired) {
      return res.status(400).json({ message: 'Token has expired' });
    }

    user.isConfirmed = true;
    user.confirmationToken = null; // Clear confirmation token
    await user.save(); // Save the updated user status

    return res.status(200).json({ message: 'User confirmed successfully' });
  } catch (error) {
    console.error('Error confirming user:', error);
    res.status(500).json({ message: 'Error confirming user', error: error.message });
  }
};

// Update user details
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    const updatedUser = await usersService.updateUser(id, updatedData); // Call service to update user
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// Get all users (optional, with filters)
export const getAllUsers = async (req, res) => {
  const filters = req.query;

  try {
    const users = await usersService.getAllUsers(filters); // Fetch users with filters
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// Soft delete a user (ensure that only admins can perform this action)
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await usersService.deleteUser(id); // Soft delete the user
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

// Get user wallet balance
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
