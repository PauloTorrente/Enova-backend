import Survey from './surveys.model.js';
import Result from '../results/results.model.js';
import { normalizeSurveyQuestions, normalizeOtherOptionResponse } from './surveys.questions.normalize.util.js';

// Persists a respondent's answers to a survey. Enforces the "one response
// per user per survey" rule and normalizes "other" option answers before
// storing them.
export const saveResponse = async (surveyId, userId, response) => {
  try {
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    if (userId) {
      const existingResponse = await Result.findOne({ where: { surveyId, userId } });
      if (existingResponse) {
        throw new Error('User has already responded to this survey');
      }
    }

    if (!Array.isArray(response) || response.some((item) => !item.questionId || item.answer === undefined)) {
      throw new Error('Invalid response format: questionId and answer required');
    }

    const normalizedSurvey = normalizeSurveyQuestions(survey);
    if (!normalizedSurvey) {
      throw new Error('Failed to process survey questions');
    }
    const questions = normalizedSurvey.questions;

    const resultEntries = response.map((item) => {
      const question = questions.find((q) => q.questionId === item.questionId || q.id === item.questionId);
      const questionText = item.question || (question ? question.question : `Question ${item.questionId}`);
      const finalAnswer = question?.otherOption === true
        ? normalizeOtherOptionResponse(question, item.answer)
        : item.answer;

      return { surveyId, userId, question: questionText, answer: finalAnswer };
    });

    const results = await Result.bulkCreate(resultEntries);
    return results;
  } catch (error) {
    console.error(`[surveys.mutation] saveResponse failed (surveyId=${surveyId}, userId=${userId}):`, error.message);
    throw new Error('Error saving response: ' + error.message);
  }
};

// Deletes a survey. When `clientId` is provided, the caller must own the
// survey — used by the client-facing delete endpoint (admins pass null).
export const deleteSurvey = async (surveyId, clientId = null) => {
  try {
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    if (clientId && survey.clientId !== clientId) {
      throw new Error('You do not have permission to delete this survey');
    }

    await survey.destroy();
  } catch (error) {
    console.error(`[surveys.mutation] deleteSurvey failed (surveyId=${surveyId}, clientId=${clientId}):`, error.message);
    throw new Error('Error deleting survey: ' + error.message);
  }
};
