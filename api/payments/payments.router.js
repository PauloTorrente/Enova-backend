import express from 'express';
import { getMyTransactions, getMyClientTransactions } from './payments.controller.js';
import { createTopupCheckout, handleConektaWebhook } from './conekta.controller.js';
import { authenticateUser, authenticateClient } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/me', authenticateUser, getMyTransactions);
router.get('/client/me', authenticateClient, getMyClientTransactions);

// Real-money top-up (Conekta hosted checkout) — see conekta.controller.js.
router.post('/client/topup', authenticateClient, createTopupCheckout);
// Called by Conekta's servers, not a browser — no cookie/CSRF auth applies.
router.post('/conekta/webhook/:secret', handleConektaWebhook);

export default router;
