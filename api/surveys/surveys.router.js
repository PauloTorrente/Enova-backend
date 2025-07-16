import express from 'express';
import { authenticateAdminOrClient, authenticateUser, authenticateAdmin, authenticateClient } from '../../middlewares/auth.middleware.js';
import * as surveysController from './surveys.controller.js';

const router = express.Router();

// Survey management routes (accessible to both admin and clients)
router.post('/', authenticateAdminOrClient, surveysController.createSurvey); // Create new survey
router.delete('/:id', authenticateAdminOrClient, surveysController.deleteSurvey); // Delete existing survey

// Client-specific routes
router.get('/client-surveys', authenticateAdminOrClient, surveysController.getClientSurveys); // Get surveys for logged-in client

// Admin analytics routes
router.get('/active', authenticateAdmin, surveysController.getActiveSurveys); // Get all active surveys (admin only)

// User response routes
router.get('/respond', authenticateUser, surveysController.getSurveyByAccessToken); // Get survey to respond to
router.post('/respond', authenticateUser, surveysController.respondToSurveyByToken); // Submit survey response

export default router;
