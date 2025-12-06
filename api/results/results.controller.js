import * as basicController from './results.basic.controller.js';
import * as clientController from './results.client.controller.js';

// Import the specific function you want to re-export
import { exportResponsesToExcel } from './results.basic.controller.js';

// Re-export all controller functions
export const saveResponse = basicController.saveResponse;
export const getUserResponses = basicController.getUserResponses;
export const getResponsesBySurvey = clientController.getResponsesBySurvey;
export const getResponsesByQuestion = clientController.getResponsesByQuestion;
export const getSurveyResponsesWithUserDetails = clientController.getSurveyResponsesWithUserDetails;
export const getSurveyAnalytics = clientController.getSurveyAnalytics; 
export { exportResponsesToExcel };
export const getSurveyResultsWithScores = clientController.getSurveyResultsWithScores;
export const awardPointsToUser = clientController.awardPointsToUser;

// Export controller collection
export default {
  saveResponse,
  getResponsesBySurvey,
  getUserResponses,
  getResponsesByQuestion,
  exportResponsesToExcel,
  getSurveyResponsesWithUserDetails,
  getSurveyAnalytics,
  getSurveyResultsWithScores,
  awardPointsToUser
};