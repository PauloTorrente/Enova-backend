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

router.get('/me', authenticateUser, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Convert to JSON and handle field name conversions
    const userData = user.toJSON();
    const safeUser = {
      ...userData,
      phoneNumber: userData.phone_number, // Explicit mapping
      firstName: userData.first_name,
      lastName: userData.last_name,
      residentialArea: userData.residential_area,
      purchaseResponsibility: userData.purchase_responsibility,
      childrenCount: userData.children_count,
      childrenAges: userData.children_ages,
      educationLevel: userData.education_level,
      walletBalance: userData.wallet_balance,
      isConfirmed: userData.isconfirmed,
      createdAt: userData.createdat
    };

    // Remove sensitive fields
    delete safeUser.password;
    delete safeUser.confirmationToken;
    delete safeUser.resetPasswordToken;
    delete safeUser.resetPasswordExpires;
    
    // Remove original database fields
    delete safeUser.phone_number;
    delete safeUser.first_name;
    delete safeUser.last_name;
    delete safeUser.residential_area;
    delete safeUser.purchase_responsibility;
    delete safeUser.children_count;
    delete safeUser.children_ages;
    delete safeUser.education_level;
    delete safeUser.wallet_balance;
    delete safeUser.isconfirmed;
    delete safeUser.createdat;

    return res.status(200).json(safeUser);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

// Other routes
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id', authenticateUser, updateUser);
router.delete('/:id', authenticateAdmin, deleteUser);
router.get('/confirm/:token', confirmUser);

// Route to get a user's wallet balance by ID
router.get('/:id/wallet', getWalletBalance);
router.patch('/me', authenticateUser, updateCurrentUser);

export default router;