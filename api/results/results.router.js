import express from 'express';
import { submitResult, getResultsForSurvey } from './results.controller.js'; // Import controller functions

const router = express.Router();

// Route to submit a result (user answers a survey)
router.post('/submit', submitResult);

// Route to get all results for a specific survey
router.get('/:surveyId', getResultsForSurvey);

export default router;
