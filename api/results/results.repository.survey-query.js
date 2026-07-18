import Result from './results.model.js';
import { loadSurveyQuestions, findQuestionData } from './results.repository.questions.util.js';
import { parseAnswerWithOtherOption } from './results.repository.answer.util.js';

// Fetches every response for a survey, enriched with the matching
// question's metadata (type, "other" option support) so callers don't
// need a second round-trip to interpret the answers.
export const getResponsesBySurvey = async (surveyId) => {
  try {
    if (!surveyId) {
      throw new Error('surveyId is required');
    }

    const surveyQuestions = await loadSurveyQuestions(surveyId);

    const responses = await Result.findAll({
      where: { surveyId },
      raw: true
    });

    const parsedResponses = responses.map((r) => {
      const questionData = findQuestionData(surveyQuestions, r);
      return {
        ...r,
        answer: parseAnswerWithOtherOption(r.answer, questionData),
        questionData: questionData
          ? {
              type: questionData.type,
              multipleSelections: questionData.multipleSelections,
              otherOption: questionData.otherOption,
              otherOptionText: questionData.otherOptionText
            }
          : null
      };
    });

    return parsedResponses;
  } catch (error) {
    console.error(`[results.repository.survey-query] getResponsesBySurvey failed (surveyId=${surveyId}):`, error.message);
    throw new Error('Error fetching responses for survey: ' + error.message);
  }
};
