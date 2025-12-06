import express from 'express'; 
import * as resultsController from './results.controller.js'; 
import { authenticateAdmin, authenticateUser, authenticateClient } from '../../middlewares/auth.middleware.js'; 
import { authenticateClientAdmin } from '../../middlewares/client.auth.middleware.js'; 

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

// Route for clients to get responses for a specific survey (SOMENTE SEUS PRÓPRIOS SURVEYS)
router.get('/client/survey/:surveyId', authenticateClient, resultsController.getResponsesBySurvey);

// Route for clients to get responses for a specific question in a survey (SOMENTE SEUS PRÓPRIOS SURVEYS)
router.get('/client/survey/:surveyId/question/:question', authenticateClient, resultsController.getResponsesByQuestion);

// Route for clients to get responses with user details (SOMENTE SEUS PRÓPRIOS SURVEYS)
router.get('/client/survey/:surveyId/with-users', authenticateClient, resultsController.getSurveyResponsesWithUserDetails);

// Route for clients to get analytics for a survey (SOMENTE SEUS PRÓPRIOS SURVEYS)
router.get('/client/survey/:surveyId/analytics', authenticateClient, resultsController.getSurveyAnalytics);

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

// Route for client admin dashboard with global statistics
router.get('/client-admin/dashboard', authenticateClientAdmin, resultsController.getAdminDashboard);




export default router;