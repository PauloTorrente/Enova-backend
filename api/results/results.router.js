// Importing express to define the routes
import express from 'express'; 
// Importing controller functions for admin/user operations
import * as resultsController from './results.controller.js'; 
// Importing controller functions for client-specific operations
import * as resultsClientController from './results.client.controller.js'; 
// Importing authentication middlewares for different user types
import { authenticateAdmin, authenticateUser, authenticateClient } from '../../middlewares/auth.middleware.js'; 

// Initializing the router to define our API routes
const router = express.Router(); 

// ADMIN/USER ROUTES //

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

// CLIENT-SPECIFIC ROUTES //

// Route for clients to get responses for a specific survey
router.get('/client/survey/:surveyId', authenticateClient, resultsClientController.getResponsesBySurvey);

// Route for clients to get responses for a specific question in a survey
router.get('/client/survey/:surveyId/question/:question', authenticateClient, resultsClientController.getResponsesByQuestion);

// Route for clients to get responses with user details
router.get('/client/survey/:surveyId/with-users', authenticateClient, resultsClientController.getSurveyResponsesWithUserDetails);

// Exporting the configured router
export default router;
