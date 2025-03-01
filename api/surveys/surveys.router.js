import express from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware.js'; 
import { authenticateAdmin } from '../../middlewares/auth.middleware.js';
import * as surveysController from './surveys.controller.js';

const router = express.Router();

// Admin-only routes
router.post('/', authenticateAdmin, surveysController.createSurvey); // Create a survey (admin only)
router.delete('/:id', authenticateAdmin, surveysController.deleteSurvey); // Delete a survey (admin only)

// Public routes
router.get('/active', surveysController.getActiveSurveys); // Get active surveys

// Route to respond to a survey by token (must come before /:id to avoid conflicts)
router.post('/respond', authenticateUser, surveysController.respondToSurveyByToken); // Respond to a survey by token (authentication required)

// Route to get a survey by ID (must come after /respond to avoid conflicts)
router.get('/:id', surveysController.getSurveyById); // Get survey by ID

export default router;
