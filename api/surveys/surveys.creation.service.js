import crypto from 'crypto';
import Survey from './surveys.model.js';
import { validateQuestionDefinitions } from './surveys.creation.validator.util.js';

// Generates the opaque token respondents use to access a survey without
// logging in (see getSurveyByAccessToken in surveys.query.service.js).
export const generateSurveyToken = () => crypto.randomBytes(20).toString('hex');

// Validates and persists a new survey. Most callers (see
// surveys.creation.controller.js) already generate the access token
// before calling this, but it falls back to generating its own so the
// function is safe to call directly too.
export const createSurvey = async (surveyData, clientId = null) => {
  try {
    if (!surveyData.title) {
      throw new Error('Survey title is required');
    }
    if (!surveyData.questions || !Array.isArray(surveyData.questions)) {
      throw new Error('Questions array is required');
    }
    if (!surveyData.expirationTime) {
      throw new Error('Expiration time is required');
    }

    if (!surveyData.accessToken) {
      surveyData.accessToken = generateSurveyToken();
    }

    if (clientId) {
      surveyData.clientId = clientId;
    }

    if (surveyData.responseLimit && (surveyData.responseLimit < 1 || surveyData.responseLimit > 1000)) {
      throw new Error('Response limit must be between 1 and 1000');
    }

    validateQuestionDefinitions(surveyData.questions);

    const survey = await Survey.create(surveyData);

    // The DB round-trip should return the token we generated, but if the
    // driver ever strips it, make sure the response the caller sees still
    // has it — an admin creating a survey needs this token immediately.
    if (!survey.accessToken && surveyData.accessToken) {
      survey.accessToken = surveyData.accessToken;
    }

    return survey;
  } catch (error) {
    console.error(`[surveys.creation] createSurvey failed ("${surveyData?.title}"):`, error.message);
    if (error.name === 'SequelizeValidationError') {
      console.error('[surveys.creation] Validation errors:', error.errors.map((e) => `${e.path}: ${e.message}`));
    }
    throw new Error('Error creating survey: ' + error.message);
  }
};
