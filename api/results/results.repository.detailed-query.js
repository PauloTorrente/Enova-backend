import Result from './results.model.js';
import User from '../users/users.model.js';
import { loadSurveyQuestions, findQuestionData } from './results.repository.questions.util.js';
import { parseAnswerWithOtherOption } from './results.repository.answer.util.js';

// Fetches survey responses joined with the respondent's demographic
// profile — used by the admin/client dashboards that need to segment
// results by user attributes (age, city, gender, etc).
export const getSurveyResponsesWithUserDetails = async (surveyId) => {
  try {
    const surveyQuestions = await loadSurveyQuestions(surveyId);

    const responses = await Result.findAll({
      where: { surveyId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'city', 'residentialArea', 'gender', 'age', 'score']
      }]
    });

    const parsedResponses = responses.map((r) => {
      const responseData = r.toJSON ? r.toJSON() : r;
      const questionData = findQuestionData(surveyQuestions, responseData);

      return {
        ...responseData,
        answer: parseAnswerWithOtherOption(responseData.answer, questionData),
        questionData: questionData
          ? {
              type: questionData.type,
              multipleSelections: questionData.multipleSelections,
              otherOption: questionData.otherOption,
              otherOptionText: questionData.otherOptionText,
              options: questionData.options
            }
          : null
      };
    });

    console.log(`[results.repository.detailed-query] getSurveyResponsesWithUserDetails: ${parsedResponses.length} responses for survey ${surveyId}`);
    return parsedResponses;
  } catch (error) {
    console.error(`[results.repository.detailed-query] getSurveyResponsesWithUserDetails failed (surveyId=${surveyId}):`, error.message);
    throw new Error('Error fetching responses with user details: ' + error.message);
  }
};
