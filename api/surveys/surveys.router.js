import express from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware.js'; 
import { authenticateAdmin } from '../../middlewares/auth.middleware.js';
import * as surveysController from './surveys.controller.js';

const router = express.Router();

// Admin-only routes
router.post('/', authenticateAdmin, surveysController.createSurvey); // Create a survey (admin only)
router.delete('/:id', authenticateAdmin, surveysController.deleteSurvey); // Delete a survey (admin only)

// Public routes
router.get('/:id', surveysController.getSurveyById); // Get survey by ID
router.get('/active', surveysController.getActiveSurveys); // Get active surveys

// Apply authentication middleware here, so only authenticated users can respond
router.post('/:id/respond', authenticateUser, surveysController.respondToSurvey); // Respond to a survey (authentication required)

export default router;
