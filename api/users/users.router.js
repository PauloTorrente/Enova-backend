import express from 'express';
import { 
  getUserById, 
  updateUser, 
  updateCurrentUser,
  confirmUser, 
  getAllUsers, 
  deleteUser, 
  getWalletBalance 
} from './users.controller.js';
import { authenticateUser, authenticateAdmin } from '../../middlewares/auth.middleware.js';
import User from './users.model.js';

const router = express.Router();

/**
 * GET /me
 * Fetch the current user's profile.
 */
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Convert to plain object
    const json = user.toJSON();

    // Remove sensitive/internal fields
    delete json.password;
    delete json.confirmationToken;
    delete json.resetPasswordToken;
    delete json.resetPasswordExpires;

    // Add helper flag
    json.hasphone_number = !!json.phone_number;

    return res.status(200).json(json);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

/**
 * PATCH /me
 * Update the current logged-in user's profile.
 * MUST COME BEFORE /:id ROUTE!
 */
router.patch('/me', authenticateUser, updateCurrentUser);

/**
 * GET /
 * List all users (supports optional query filters).
 */
router.get('/',authenticateAdmin, getAllUsers);

/**
 * GET /:id
 * Retrieve a specific user by ID.
 */
router.get('/:id', authenticateAdmin, getUserById);

/**
 * PATCH /:id
 * Update another user's profile (self or admin).
 */
router.patch('/:id', authenticateUser, updateUser);

/**
 * DELETE /:id
 * Soft-delete a user (admin only).
 */
router.delete('/:id', authenticateAdmin, deleteUser);

/**
 * GET /confirm/:token
 * Confirm a user's email via token.
 */
router.get('/confirm/:token', confirmUser);

/**
 * GET /:id/wallet
 * Get wallet balance for a specific user.
 */
router.get('/:id/wallet', getWalletBalance);

export default router;
