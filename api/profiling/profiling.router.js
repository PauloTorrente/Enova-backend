import express from 'express';
import { submitSurgicalProfile, getMySurgicalProfile, getProfilingSummary } from './profiling.controller.js';
import { authenticateUser } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/surgical', authenticateUser, submitSurgicalProfile);
router.get('/surgical/me', authenticateUser, getMySurgicalProfile);
router.get('/summary', authenticateUser, getProfilingSummary);

export default router;
