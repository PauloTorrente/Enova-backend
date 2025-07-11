import express from 'express';
import { register, confirm, login, getClient } from './client.controller.js';
import { authenticateClient } from '../../middlewares/client.auth.middleware.js';

const router = express.Router();

// Rotas públicas
router.post('/register', register);
router.get('/confirm/:token', confirm);
router.post('/login', login);

// Rotas autenticadas
router.get('/me', authenticateClient, getClient);

export default router;
