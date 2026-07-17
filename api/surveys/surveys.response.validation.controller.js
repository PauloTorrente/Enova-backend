import * as surveysService from './surveys.service.js';
import Survey from './surveys.model.js';
import Result from '../results/results.model.js';
import { normalizeSurveyQuestions } from './surveys.response.validation.normalize.util.js';
import { validateResponseItem } from './surveys.response.answer-validator.util.js';

// Strict survey-response submission endpoint (the one actually wired to
// POST /respond — see surveys.router.js). Every answer must match its
// question's expected shape exactly; compare with
// surveys.permissive.response.controller.js for the tolerant variant.
export const respondToSurveyByToken = async (req, res) => {
  const startTime = Date.now();

  try {
    const { accessToken } = req.query;
    if (!accessToken) {
      return res.status(400).json({ message: 'Access token is required' });
    }

    const survey = await surveysService.getSurveyByAccessToken(accessToken);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    if (survey.responseLimit !== null) {
      const responseCount = await Result.count({ where: { surveyId: survey.id } });
      if (responseCount >= survey.responseLimit) {
        return res.status(400).json({ message: 'This survey has reached the maximum response limit.' });
      }
    }

    const userId = req.user?.userId || req.user?.id || req.userId || req.user?.clientId || null;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required. Please log in to respond to this survey.' });
    }

    const normalizedSurvey = normalizeSurveyQuestions(survey);
    if (!normalizedSurvey) {
      return res.status(500).json({ message: 'Failed to process survey data' });
    }

    const { questions } = normalizedSurvey;
    if (!questions || questions.length === 0) {
      return res.status(400).json({ message: 'Survey has no questions' });
    }

    for (const responseItem of req.body) {
      const question = questions.find(q => q.questionId === responseItem.questionId || q.id === responseItem.questionId);
      if (!question) {
        return res.status(400).json({ message: `Question with ID ${responseItem.questionId} not found` });
      }

      const validationError = validateResponseItem(question, responseItem);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
    }

    await surveysService.saveResponse(survey.id, userId, req.body);

    const duration = Date.now() - startTime;
    res.status(200).json({
      message: 'Responses saved successfully',
      surveyTitle: survey.title,
      surveyId: survey.id,
      userId,
      questionsAnswered: req.body.length,
      responseTime: `${duration}ms`
    });
  } catch (error) {
    console.error('[surveys.response.validation] respondToSurveyByToken failed:', error.message);

    let statusCode = 500;
    let errorMessage = 'An error occurred while processing your response';

    if (error.message.includes('already responded')) {
      statusCode = 400;
      errorMessage = 'You have already responded to this survey';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorMessage = error.message;
    } else if (error.message.includes('Invalid') || error.message.includes('required')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes('Authentication required')) {
      statusCode = 401;
      errorMessage = 'Authentication required. Please log in to respond to this survey.';
    }

    res.status(statusCode).json({
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { debug: error.message })
    });
  }
};

// Standalone validator (no HTTP response side effects) used where callers
// need a list of validation problems rather than a fail-fast 400 — a
// lighter subset of the checks in respondToSurveyByToken (see
// surveys.response.answer-validator.util.js for why they aren't shared).
export const validateSurveyResponses = async (surveyId, responses) => {
  const surveyDetails = await Survey.findByPk(surveyId);
  if (!surveyDetails) {
    throw new Error('Survey not found');
  }

  const normalizedSurvey = normalizeSurveyQuestions(surveyDetails);
  if (!normalizedSurvey) {
    throw new Error('Failed to normalize survey questions');
  }

  const { questions } = normalizedSurvey;
  const validationErrors = [];

  for (const responseItem of responses) {
    const question = questions.find(q => q.questionId === responseItem.questionId || q.id === responseItem.questionId);
    if (!question) {
      validationErrors.push(`Question with ID ${responseItem.questionId} not found`);
      continue;
    }
    if (question.type !== 'multiple') continue;

    const selectionLimit = Number(question.selectionLimit);
    if (question.multipleSelections === 'yes' && question.selectionLimit) {
      if (Array.isArray(responseItem.answer) && responseItem.answer.length > selectionLimit) {
        validationErrors.push(
          `Question "${question.question}" allows maximum ${selectionLimit} selection(s). You selected ${responseItem.answer.length}.`
        );
      }
    }

    if (question.multipleSelections === 'no' && Array.isArray(responseItem.answer)) {
      validationErrors.push(`Question "${question.question}" only accepts a single answer`);
    }

    const answers = Array.isArray(responseItem.answer) ? responseItem.answer : [responseItem.answer];
    for (const answer of answers) {
      if (!question.options || !question.options.includes(answer)) {
        validationErrors.push(`Invalid option "${answer}" for question "${question.question}"`);
      }
    }
  }

  return validationErrors;
};

export default { respondToSurveyByToken, validateSurveyResponses };
