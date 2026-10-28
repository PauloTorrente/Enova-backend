import express from 'express';
import { submitSurgicalProfile, getMySurgicalProfile, getProfilingSummary, getSurveyGraffarResults, getGraffarDirectory, getActiveSurgicalProfilingSurvey } from './profiling.controller.js';
import { authenticateUser, authenticateClient } from '../../middlewares/auth.middleware.js';
import { authenticateClient as authenticateClientWithRole } from '../../middlewares/client.auth.middleware.js';

const router = express.Router();

router.post('/surgical', authenticateUser, submitSurgicalProfile);
router.get('/surgical/me', authenticateUser, getMySurgicalProfile);
router.get('/surgical/survey', authenticateUser, getActiveSurgicalProfilingSurvey);
router.get('/summary', authenticateUser, getProfilingSummary);

// Client-facing: see how a Perfilación Quirúrgica survey's respondents
// scored — own survey, or any survey as client_admin. getSurveyGraffarResults
// branches on req.client.role via verifyClientAccessWithPrivileges, which
// the plain authenticateClient never sets (same bug as results.router.js's
// /client/survey/:surveyId/analytics — see its comment there).
router.get('/client/survey/:surveyId/results', authenticateClientWithRole, getSurveyGraffarResults);

// Client-facing: every respondent's Graffar result, platform-wide — the
// standalone directory page (not tied to one survey).
router.get('/directory', authenticateClient, getGraffarDirectory);

export default router;
