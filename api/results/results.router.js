import express from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware.js';
import * as resultsController from './results.controller.js';

const router = express.Router();

// Route for saving results of a survey (authentication required)
router.post('/:id/results', authenticateUser, resultsController.saveSurveyResults); // Save survey results

export default router;
