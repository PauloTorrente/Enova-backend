import express from 'express';
import { getUserById, updateUser, updateCurrentUser,confirmUser, getAllUsers, deleteUser, getWalletBalance } from './users.controller.js';
import { authenticateUser, authenticateAdmin } from '../../middlewares/auth.middleware.js'; 
import User from './users.model.js';

const router = express.Router();

router.get('/me', authenticateUser, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: {
        exclude: ['password', 'confirmationToken', 'resetPasswordToken', 'resetPasswordExpires']
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Explicitly include all safe fields including phoneNumber
    const userData = user.toJSON();
    
    // Return the complete user data (already filtered by attributes.exclude)
    res.status(200).json({
      id: userData.id,
      role: userData.role,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      gender: userData.gender,
      age: userData.age,
      phoneNumber: userData.phoneNumber, // Ensure phoneNumber is included
      city: userData.city,
      residentialArea: userData.residentialArea,
      purchaseResponsibility: userData.purchaseResponsibility,
      childrenCount: userData.childrenCount,
      childrenAges: userData.childrenAges,
      educationLevel: userData.educationLevel,
      walletBalance: userData.walletBalance,
      isConfirmed: userData.isConfirmed,
      createdAt: userData.createdAt
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Other routes remain unchanged
router.get('/', getAllUsers); 
router.get('/:id', getUserById);
router.patch('/:id', authenticateUser, updateUser); 
router.delete('/:id', authenticateAdmin, deleteUser);  
router.get('/confirm/:token', confirmUser);

// Route to get a user's wallet balance by ID
router.get('/:id/wallet', getWalletBalance);
router.patch('/me', authenticateUser, updateCurrentUser);

export default router;