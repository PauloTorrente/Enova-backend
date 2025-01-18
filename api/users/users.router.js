import express from 'express';
import { 
  getUserById, 
  updateUser, 
  confirmUser, 
  getAllUsers, 
  deleteUser 
} from './users.controller.js';

const router = express.Router();

// Routes for handling user actions
router.get('/', getAllUsers); 
router.get('/:id', getUserById);
router.patch('/:id', updateUser); 
router.delete('/:id', deleteUser);
router.get('/confirm/:token', confirmUser);

export default router;
