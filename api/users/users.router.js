import express from 'express';
import { getUserById, updateUser, updateCurrentUser,confirmUser, getAllUsers, deleteUser, getWalletBalance,updateUserScore} from './users.controller.js';
import { authenticateUser, authenticateAdmin } from '../../middlewares/auth.middleware.js';
import User from './users.model.js';

const router = express.Router();

//Fetch the current user's profile.
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

    //Score system 
    json.score = json.score || 0;
    return res.status(200).json(json);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Update the current logged-in user's profile.
router.patch('/me', authenticateUser, updateCurrentUser);

//List all users (supports optional query filters).
router.get('/',authenticateAdmin, getAllUsers);

// Retrieve a specific user by ID.
router.get('/:id', authenticateAdmin, getUserById);

// Update another user's profile (self or admin).
router.patch('/:id', authenticateUser, updateUser);

//Soft-delete a user (admin only).
router.delete('/:id', authenticateAdmin, deleteUser);

// Confirm a user's email via token.
router.get('/confirm/:token', confirmUser);

// Get wallet balance for a specific user.
router.get('/:id/wallet', getWalletBalance);

//Modify UserScore
router.patch('/:id/score', authenticateAdmin, updateUserScore);

export default router;
