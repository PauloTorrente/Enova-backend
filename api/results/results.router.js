import express from 'express';
import * as resultsController from './results.controller.js';
import { authenticateAdmin, authenticateUser, authenticateClient } from '../../middlewares/auth.middleware.js';
import { authenticateClientAdmin, authenticateClient as authenticateClientWithRole } from '../../middlewares/client.auth.middleware.js';
import { evaluateRespondentWithAI, askAIAboutSurvey } from './results.client.ai-evaluation.controller.js';

const router = express.Router(); 

// Route to save a response for a survey (authenticated users only)
router.post('/submit', authenticateUser, resultsController.saveResponse);

// Route to get all responses for a specific survey (admin only)
router.get('/survey/:surveyId', authenticateAdmin, resultsController.getResponsesBySurvey);

// Route to get all responses for a specific user (admin only)
router.get('/user/:userId', authenticateAdmin, resultsController.getUserResponses);

// Route to get responses for a specific question in a survey (admin only)
router.get('/survey/:surveyId/question/:question', authenticateAdmin, resultsController.getResponsesByQuestion);

// Route to export responses to Excel (admin only)
router.get('/export/:surveyId', authenticateAdmin, resultsController.exportResponsesToExcel);

// Route to get responses with user details (admin only)
router.get('/survey/:surveyId/with-users', authenticateAdmin, resultsController.getSurveyResponsesWithUserDetails);

// All five /client/survey/:surveyId/* routes below branch on
// req.client.role inside their handler (verifyClientAccessWithPrivileges,
// or getSurveyAnalytics's own clientRole check) to let a client_admin
// through to ANY survey, not just their own — but the plain
// authenticateClient (from auth.middleware.js) never sets req.client.role,
// so that branch was always dead and a client_admin got "access denied" on
// any survey that wasn't literally their own, same as a regular client.
// authenticateClientWithRole (role + permissions) is the one that actually
// supports it.

// Route for clients to get responses for a specific survey (own, or any as client_admin)
router.get('/client/survey/:surveyId', authenticateClientWithRole, resultsController.getResponsesBySurvey);

// Route for clients to get responses for a specific question in a survey (own, or any as client_admin)
router.get('/client/survey/:surveyId/question/:question', authenticateClientWithRole, resultsController.getResponsesByQuestion);

// Route for clients to get responses with user details (own, or any as client_admin)
router.get('/client/survey/:surveyId/with-users', authenticateClientWithRole, resultsController.getSurveyResponsesWithUserDetails);

// Route for clients to get analytics for a survey (own, or any as client_admin)
router.get('/client/survey/:surveyId/analytics', authenticateClientWithRole, resultsController.getSurveyAnalytics);

// Route for clients to export their survey's responses as Excel (default),
// CSV (?format=csv) — both one row per respondent with demographic columns —
// or PDF (?format=pdf), a readable per-question report instead of a raw
// table (own, or any as client_admin)
router.get('/client/survey/:surveyId/export', authenticateClientWithRole, resultsController.exportSurveyResponses);

// Route for a regular client to ask AI about their OWN survey's results —
// only works if that survey has aiEnabled (the seal set in CreateSurvey);
// see results.client.ai-evaluation.controller.js's askAIAboutSurvey, which
// already branches client vs client_admin access via verifyClientAccessWithPrivileges.
router.post('/client/survey/:surveyId/ask-ai', authenticateClientWithRole, askAIAboutSurvey);

// Route for client admin to get survey results with user scores
router.get('/client/survey/:surveyId/results-with-scores', authenticateClientAdmin, resultsController.getSurveyResultsWithScores);

// Route for client admin to award points to users
router.post('/client/survey/:surveyId/user/:userId/award-points', authenticateClientAdmin, resultsController.awardPointsToUser);

// Route for client admin to get ALL surveys from ALL clients
router.get('/client-admin/all-surveys', authenticateClientAdmin, resultsController.getAllSurveys);

// Route for client admin to get responses for ANY survey (QUALQUER CLIENTE)
router.get('/client-admin/survey/:surveyId/responses', authenticateClientAdmin, resultsController.getResponsesBySurvey);

// Route for client admin to get responses for specific question in ANY survey
router.get('/client-admin/survey/:surveyId/question/:question', authenticateClientAdmin, resultsController.getResponsesByQuestion);

// Route for client admin to get responses with user details from ANY survey
router.get('/client-admin/survey/:surveyId/with-users', authenticateClientAdmin, resultsController.getSurveyResponsesWithUserDetails);

// Route for client admin to get analytics from ANY survey
router.get('/client-admin/survey/:surveyId/analytics', authenticateClientAdmin, resultsController.getSurveyAnalytics);

// Route for client admin to get results with scores from ANY survey
router.get('/client-admin/survey/:surveyId/results-with-scores', authenticateClientAdmin, resultsController.getSurveyResultsWithScores);

// Route for client admin to award points to users from ANY survey
router.post('/client-admin/survey/:surveyId/user/:userId/award-points', authenticateClientAdmin, resultsController.awardPointsToUser);

// Route for client admin to get an AI-suggested performance score (-5..5)
// for one respondent's answers to ANY survey — an assist only, never
// auto-applied (see results.client.ai-evaluation.controller.js).
router.post('/client-admin/survey/:surveyId/user/:userId/evaluate-ai', authenticateClientAdmin, evaluateRespondentWithAI);

// Route for client admin to ask the AI a free-form question about ALL of
// a survey's responses together (not one respondent) — locked to that
// scope by a strict system prompt.
router.post('/client-admin/survey/:surveyId/ask-ai', authenticateClientAdmin, askAIAboutSurvey);

// Route for client admin dashboard with global statistics
router.get('/client-admin/dashboard', authenticateClientAdmin, resultsController.getAdminDashboard);




export default router;