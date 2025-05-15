import express from 'express';
import { getUserById, updateUser, updateCurrentUser, confirmUser, getAllUsers, deleteUser, getWalletBalance } from './users.controller.js';
import { authenticateUser, authenticateAdmin } from '../../middlewares/auth.middleware.js'; 
import User from './users.model.js';

const router = express.Router();

// Route to get current user profile (requires authentication)
router.get('/me', authenticateUser, async (req, res) => {
  try {
    // find user by primary key from token
    const user = await User.findByPk(req.user.userId);

    // if user not found, return 404
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // remove sensitive fields (password, confirmationToken)
    const { password, confirmationToken, ...safeUser } = user.toJSON();

    // return all other fields, including real phoneNumber
    return res.status(200).json(safeUser);

  } catch (error) {
    // log error and return 500
    console.error('Error fetching current user profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Route to update current user profile (partial updates)
router.patch('/me', authenticateUser, updateCurrentUser);

// Route to get all users (open to admins or general listing)
router.get('/', getAllUsers);

// Route to get a user by ID
router.get('/:id', getUserById);

// Route to update a user by ID (authenticated user or admin)
router.patch('/:id', authenticateUser, updateUser);

// Route to delete a user by ID (admin only)
router.delete('/:id', authenticateAdmin, deleteUser);

// Route to confirm user email via token
router.get('/confirm/:token', confirmUser);

// Route to get a user's wallet balance by ID
router.get('/:id/wallet', getWalletBalance);

export default router;