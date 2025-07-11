import express from 'express';
import { 
  authenticateUser, 
  authenticateAdmin,
  authenticateClient  // Added missing import
} from '../../middlewares/auth.middleware.js';
import * as surveysController from './surveys.controller.js';

const router = express.Router();

// Admin-only routes
router.post('/', authenticateAdmin, surveysController.createSurvey); // Create a survey (admin only)
router.delete('/:id', authenticateAdmin, surveysController.deleteSurvey); // Delete a survey (admin only)

// Client-specific routes
router.get('/client-surveys', authenticateClient, surveysController.getClientSurveys); // Receive their respective surveys

// Public routes
router.get('/active', authenticateAdmin, surveysController.getActiveSurveys); // Get active surveys

// Route to get a survey by access token
router.get('/respond', authenticateUser, surveysController.getSurveyByAccessToken); // Get survey by access token

// Route to respond to a survey by token
router.post('/respond', authenticateUser, surveysController.respondToSurveyByToken); // Respond to a survey by token

export default router;
