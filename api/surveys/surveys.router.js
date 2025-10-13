import express from 'express';
import { 
  authenticateAdminOrClient, 
  authenticateUser, 
  authenticateAdmin, 
  authenticateClient 
} from '../../middlewares/auth.middleware.js';
import * as surveysController from './surveys.controller.js';

const router = express.Router();

// Survey management routes (accessible to both admin and clients)
router.post('/', authenticateAdminOrClient, surveysController.createSurvey);
router.delete('/:id', authenticateAdminOrClient, surveysController.deleteSurvey);

// Client-specific routes
router.get('/client-surveys', authenticateAdminOrClient, surveysController.getClientSurveys); 
router.get('/my-surveys', authenticateClient, surveysController.getMySurveys);

// Debug route for troubleshooting
router.get('/debug/my-surveys', authenticateClient, surveysController.debugMySurveys);

// Admin routes
router.get('/active', authenticateAdmin, surveysController.getActiveSurveys);

// User response routes (public and authenticated)
router.get('/respond', authenticateUser, surveysController.getSurveyByAccessToken);
router.post('/respond', authenticateUser, surveysController.respondToSurveyByToken);

// Export the configured router
export default router;
