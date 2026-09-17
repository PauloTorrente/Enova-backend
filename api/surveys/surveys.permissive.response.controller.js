import Survey from './surveys.model.js';
import Result from '../results/results.model.js';
import { mapResponseItemToResultEntry } from './surveys.permissive.answer-mapper.util.js';
import * as paymentsService from '../payments/payments.service.js';

// Permissive survey response handler: unlike
// surveys.response.validation.controller.js, this endpoint tolerates
// mismatched question IDs and loose answer shapes instead of rejecting
// the whole submission (see surveys.permissive.answer-mapper.util.js for
// the fallback-matching logic). Used where the client integration can't
// guarantee strict payload shape.
export const respondToSurveyPermissive = async (req, res) => {
  try {
    const { accessToken } = req.query;
    const userId = req.user?.userId || req.user?.id || req.userId || req.user?.clientId || null;

    if (!accessToken) {
      return res.status(400).json({ message: 'Access token is required' });
    }

    const survey = await Survey.findOne({ where: { accessToken } });
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    // responseLimit caps RESPONDENTS, not answer rows — see the matching
    // comment in surveys.response.validation.controller.js.
    const respondentCount = await Result.count({
      where: { surveyId: survey.id },
      distinct: true,
      col: 'userId'
    });
    if (survey.responseLimit !== null && respondentCount >= survey.responseLimit) {
      return res.status(400).json({ message: 'This survey has reached the maximum response limit.' });
    }

    if (userId) {
      const existingResponse = await Result.findOne({ where: { surveyId: survey.id, userId } });
      if (existingResponse) {
        return res.status(400).json({ message: 'You have already responded to this survey.' });
      }
    }

    const response = req.body;
    if (!Array.isArray(response)) {
      return res.status(400).json({ message: 'Response should be an array' });
    }

    const questions = typeof survey.questions === 'string' ? JSON.parse(survey.questions) : survey.questions;

    const resultEntries = [];
    const warnings = [];

    for (const item of response) {
      const { entry, limitError } = mapResponseItemToResultEntry(item, questions, survey.id, userId, warnings);
      if (limitError) {
        return res.status(400).json({ message: limitError });
      }
      resultEntries.push(entry);
    }

    const savedResults = await Result.bulkCreate(resultEntries);

    // Techdemo payment scaffolding — same non-blocking payout as the
    // strict /respond endpoint (see surveys.response.validation.controller.js).
    if (userId) {
      try {
        await paymentsService.payRespondentForSurvey({ userId, survey });
      } catch (paymentError) {
        console.error(`[surveys.permissive.response] payRespondentForSurvey failed (userId=${userId}, surveyId=${survey.id}):`, paymentError.message);
      }
    }

    return res.status(200).json({
      message: 'Response recorded successfully',
      details: {
        savedCount: savedResults.length,
        surveyId: survey.id,
        surveyTitle: survey.title,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    });
  } catch (error) {
    console.error('[surveys.permissive.response] respondToSurveyPermissive failed:', error.message);

    let statusCode = 500;
    let errorMessage = 'Internal error while recording response';

    if (error.name === 'SequelizeDatabaseError') {
      statusCode = 400;
      errorMessage = 'Database error occurred';
    } else if (error.message.includes('validation')) {
      statusCode = 400;
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default { respondToSurveyPermissive };
