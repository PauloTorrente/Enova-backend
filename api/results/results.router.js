import express from 'express';
import * as resultsController from './results.controller.js';
import { authenticateAdmin } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Route to save a response for a survey (authenticated users only)
router.post('/submit', authenticateUser, resultsController.saveResponse);

// Route to get all responses for a specific survey (admin only)
router.get('/survey/:surveyId', authenticateAdmin, resultsController.getResponsesBySurvey);

// Route to get all responses for a specific user (admin only)
router.get('/user/:userId', authenticateAdmin, resultsController.getUserResponses);

// Route to get responses for a specific question in a survey (admin only)
router.get('/survey/:surveyId/question/:question', authenticateAdmin, resultsController.getResponsesByQuestion);

export default router;
