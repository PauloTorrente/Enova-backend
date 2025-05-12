import express from 'express';
import { 
  getUserById, 
  updateUser, 
  confirmUser, 
  getAllUsers, 
  deleteUser, 
  getWalletBalance 
} from './users.controller.js';
import { authenticateUser, authenticateAdmin } from '../../middlewares/auth.middleware.js'; 

const router = express.Router();

// Routes for handling user actions
router.get('/', getAllUsers); 
router.get('/:id', getUserById);
router.patch('/:id', authenticateUser, updateUser); 
router.delete('/:id', authenticateAdmin, deleteUser);  
router.get('/confirm/:token', confirmUser);
router.get('/:id/wallet', getWalletBalance); 

export default router;
