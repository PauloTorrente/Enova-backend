import express from 'express';
import authRouter from './auth/auth.router.js';  // Roteador de autenticação
import usersRouter from './users/users.router.js';  // Roteador de usuários
// Adicione mais roteadores conforme necessário

const router = express.Router();

// Definindo as rotas
router.use('/auth', authRouter);  // Roteador de autenticação
router.use('/users', usersRouter);  // Roteador de usuários

// Adicione outras rotas conforme necessário

export default router;
