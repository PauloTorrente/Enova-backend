// Entry point for the client-facing results controllers.
//
// Split by responsibility, one file per concern, following the
// `results.client.<concern>.controller.js` naming convention:
//   - results.client.admin.controller.js      -> client_admin-only, cross-client views
//   - results.client.responses.controller.js  -> raw response listing
//   - results.client.detailed.controller.js   -> responses + demographics
//   - results.client.analytics.controller.js  -> segmented analytics
//   - results.client.scores.controller.js     -> responses + loyalty scores
//   - results.client.points.controller.js     -> award points (the one write endpoint)
//
// Kept as the single import surface so results.controller.js and
// results.router.js don't need to know how this controller is internally
// organized.

export { getAllSurveys, getAdminDashboard } from './results.client.admin.controller.js';
export { getResponsesBySurvey, getResponsesByQuestion } from './results.client.responses.controller.js';
export { getSurveyResponsesWithUserDetails } from './results.client.detailed.controller.js';
export { getSurveyAnalytics } from './results.client.analytics.controller.js';
export { getSurveyResultsWithScores } from './results.client.scores.controller.js';
export { awardPointsToUser } from './results.client.points.controller.js';

import { getAllSurveys, getAdminDashboard } from './results.client.admin.controller.js';
import { getResponsesBySurvey, getResponsesByQuestion } from './results.client.responses.controller.js';
import { getSurveyResponsesWithUserDetails } from './results.client.detailed.controller.js';
import { getSurveyAnalytics } from './results.client.analytics.controller.js';
import { getSurveyResultsWithScores } from './results.client.scores.controller.js';
import { awardPointsToUser } from './results.client.points.controller.js';

export default {
  getResponsesBySurvey,
  getResponsesByQuestion,
  getSurveyResponsesWithUserDetails,
  getSurveyAnalytics,
  getSurveyResultsWithScores,
  awardPointsToUser,
  getAllSurveys,
  getAdminDashboard
};
