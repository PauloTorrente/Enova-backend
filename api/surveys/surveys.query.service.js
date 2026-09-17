import { Op } from 'sequelize';
import Survey from './surveys.model.js';
import { normalizeSurveyQuestions } from './surveys.questions.normalize.util.js';

// Lists surveys that are still open for responses (active status and not
// yet expired), optionally scoped to one client's surveys.
export const getActiveSurveys = async (clientId = null) => {
  try {
    const whereConditions = {
      status: 'active',
      expirationTime: { [Op.gt]: new Date() }
    };
    if (clientId) {
      whereConditions.clientId = clientId;
    }

    const surveys = await Survey.findAll({ where: whereConditions });

    return surveys
      .map((survey) => normalizeSurveyQuestions(survey))
      .filter((survey) => survey !== null);
  } catch (error) {
    console.error(`[surveys.query] getActiveSurveys failed (clientId=${clientId}):`, error.message);
    throw new Error('Error fetching active surveys: ' + error.message);
  }
};

// Looks up a survey by its respondent-facing access token. Passing
// `clientId` additionally scopes the lookup to surveys owned by that
// client, used when a client wants to preview one of their own surveys.
export const getSurveyByAccessToken = async (accessToken, clientId = null) => {
  try {
    const whereConditions = { accessToken };
    if (clientId) {
      whereConditions.clientId = clientId;
    }

    const survey = await Survey.findOne({ where: whereConditions, raw: false });
    if (!survey) return null;

    const normalizedSurvey = normalizeSurveyQuestions(survey);
    if (!normalizedSurvey) return null;

    return {
      id: normalizedSurvey.id,
      title: normalizedSurvey.title,
      description: normalizedSurvey.description,
      questions: normalizedSurvey.questions,
      expirationTime: normalizedSurvey.expirationTime,
      status: normalizedSurvey.status,
      accessToken: normalizedSurvey.accessToken,
      clientId: normalizedSurvey.clientId,
      responseLimit: normalizedSurvey.responseLimit,
      // Both were silently dropped here before — surveyType being
      // undefined meant the Perfilación Quirúrgica auto-scoring hook in
      // surveys.response.validation.controller.js never fired, and
      // rewardPerResponse being undefined meant every survey paid the
      // flat DEFAULT_RESPONDENT_REWARD no matter what was configured.
      surveyType: normalizedSurvey.surveyType,
      rewardPerResponse: normalizedSurvey.rewardPerResponse,
      createdAt: normalizedSurvey.createdAt,
      updatedAt: normalizedSurvey.updatedAt
    };
  } catch (error) {
    // Never log the token itself — it's the respondent's access credential.
    console.error('[surveys.query] getSurveyByAccessToken failed:', error.message);
    throw new Error('Error fetching survey by access token: ' + error.message);
  }
};
