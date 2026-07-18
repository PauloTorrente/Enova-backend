// Entry point for the surveys controllers — re-exports every handler from
// its dedicated file so surveys.router.js has a single place to import
// from. See each imported file for its specific responsibility.
import { createSurvey, getActiveSurveys } from './surveys.creation.controller.js';
import { respondToSurveyByToken, validateSurveyResponses } from './surveys.response.validation.controller.js';
import { deleteSurvey, getSurveyByAccessToken } from './surveys.management.controller.js';
import { getClientSurveys } from './surveys.client.controller.js';
import { getMySurveys, getClientSurveyStats } from './surveys.client.detailed.controller.js';
import { debugMySurveys, debugSurveyDetails, healthCheckClientSurveys } from './surveys.client.debug.controller.js';
import { respondToSurveyPermissive } from './surveys.permissive.response.controller.js';

export {
  createSurvey,
  getActiveSurveys,
  respondToSurveyByToken,
  validateSurveyResponses,
  deleteSurvey,
  getSurveyByAccessToken,
  getClientSurveys,
  getMySurveys,
  getClientSurveyStats,
  debugMySurveys,
  debugSurveyDetails,
  healthCheckClientSurveys,
  respondToSurveyPermissive
};

export default {
  createSurvey,
  getActiveSurveys,
  respondToSurveyByToken,
  validateSurveyResponses,
  getClientSurveys,
  getMySurveys,
  getClientSurveyStats,
  debugMySurveys,
  debugSurveyDetails,
  healthCheckClientSurveys,
  deleteSurvey,
  getSurveyByAccessToken,
  respondToSurveyPermissive
};
