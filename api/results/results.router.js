// results.router.js - VERSÃO CORRIGIDA
import express from 'express'; 
import * as resultsController from './results.controller.js'; 
// REMOVA ESTA LINHA → import * as resultsClientController from './results.client.controller.js'; 
import { authenticateAdmin, authenticateUser, authenticateClient } from '../../middlewares/auth.middleware.js'; 

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
router.get('/client/survey/:surveyId', authenticateClient, resultsController.getResponsesBySurvey);

// Route for clients to get responses for a specific question in a survey
router.get('/client/survey/:surveyId/question/:question', authenticateClient, resultsController.getResponsesByQuestion);

// Route for clients to get responses with user details
router.get('/client/survey/:surveyId/with-users', authenticateClient, resultsController.getSurveyResponsesWithUserDetails);

// CORRIJA ESTA LINHA - use resultsController em vez de resultsClientController
router.get('/client/survey/:surveyId/analytics', authenticateClient, resultsController.getSurveyAnalytics);

// ROTA DE TESTE - para verificar se o router está funcionando
router.get('/test', (req, res) => {
  res.json({ message: 'Results router is working!' });
});

export default router;
