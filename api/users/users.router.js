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
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    const { password, ...safeUser } = user.toJSON();
    res.status(200).json(safeUser);

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// Routes for handling user actions
router.get('/', getAllUsers); 
router.get('/:id', getUserById);
router.patch('/:id', authenticateUser, updateUser); 
router.delete('/:id', authenticateAdmin, deleteUser);  
router.get('/confirm/:token', confirmUser);
router.get('/:id/wallet', getWalletBalance); 
router.patch('/me', authenticateUser, updateCurrentUser);

export default router;
