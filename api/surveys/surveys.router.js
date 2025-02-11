import express from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware.js'; 
import * as surveysController from './surveys.controller.js';

const router = express.Router();

// Admin-only routes
router.post('/surveys', surveysController.createSurvey); // Create a survey (admin only)
router.delete('/surveys/:id', surveysController.deleteSurvey); // Delete a survey (admin only)

// Public routes
router.get('/surveys/:id', surveysController.getSurveyById); // Get survey by ID
router.get('/surveys/active', surveysController.getActiveSurveys); // Get active surveys

// Apply authentication middleware here, so only authenticated users can respond
router.post('/surveys/:id/respond', authenticateUser, surveysController.respondToSurvey); // Respond to a survey (authentication required)

export default router;
