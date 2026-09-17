import express from 'express';
import { submitSurgicalProfile, getMySurgicalProfile, getProfilingSummary, getSurveyGraffarResults, getGraffarDirectory } from './profiling.controller.js';
import { authenticateUser, authenticateClient } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/surgical', authenticateUser, submitSurgicalProfile);
router.get('/surgical/me', authenticateUser, getMySurgicalProfile);
router.get('/summary', authenticateUser, getProfilingSummary);

// Client-facing: see how a Perfilación Quirúrgica survey's respondents scored.
router.get('/client/survey/:surveyId/results', authenticateClient, getSurveyGraffarResults);

// Client-facing: every respondent's Graffar result, platform-wide — the
// standalone directory page (not tied to one survey).
router.get('/directory', authenticateClient, getGraffarDirectory);

export default router;
