// Entry point for the surveys service layer.
//
// Split by responsibility, one file per concern, following the
// `surveys.<concern>.service.js` naming convention:
//   - surveys.questions.normalize.util.js -> question/answer shape normalization
//   - surveys.creation.validator.util.js  -> question array validation
//   - surveys.creation.service.js         -> generateSurveyToken, createSurvey
//   - surveys.query.service.js            -> getActiveSurveys, getSurveyByAccessToken
//   - surveys.mutation.service.js         -> saveResponse, deleteSurvey
//
// Kept as the single import surface so controllers don't need to know how
// the service layer is internally organized.
//
// Note: getSurveyWithDetails and getClientSurveysWithDebug were removed
// during this reorganization — neither was called anywhere outside this
// file (confirmed via project-wide search), so they were dead code.

export { generateSurveyToken, createSurvey } from './surveys.creation.service.js';
export { getActiveSurveys, getSurveyByAccessToken } from './surveys.query.service.js';
export { saveResponse, deleteSurvey } from './surveys.mutation.service.js';
export { normalizeSurveyQuestions, normalizeOtherOptionResponse } from './surveys.questions.normalize.util.js';

import { generateSurveyToken, createSurvey } from './surveys.creation.service.js';
import { getActiveSurveys, getSurveyByAccessToken } from './surveys.query.service.js';
import { saveResponse, deleteSurvey } from './surveys.mutation.service.js';
import { normalizeSurveyQuestions, normalizeOtherOptionResponse } from './surveys.questions.normalize.util.js';

const surveysService = {
  createSurvey,
  getActiveSurveys,
  getSurveyByAccessToken,
  saveResponse,
  deleteSurvey,
  generateSurveyToken,
  normalizeSurveyQuestions,
  normalizeOtherOptionResponse
};

export default surveysService;
