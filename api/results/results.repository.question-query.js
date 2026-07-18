import Result from './results.model.js';
import { loadSurveyQuestions } from './results.repository.questions.util.js';
import { parseAnswerWithOtherOption } from './results.repository.answer.util.js';

// Fetches every response to one specific question within a survey.
export const getResponsesByQuestion = async (surveyId, question) => {
  try {
    if (!surveyId || !question) {
      throw new Error('surveyId and question are required');
    }

    const questions = await loadSurveyQuestions(surveyId);
    const questionData = questions.find((q) => q.question === question || q.questionId === question);

    const responses = await Result.findAll({
      where: { surveyId, question },
      raw: true
    });

    const parsedResponses = responses.map((r) => ({
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
    }));

    return parsedResponses;
  } catch (error) {
    console.error(`[results.repository.question-query] getResponsesByQuestion failed (surveyId=${surveyId}):`, error.message);
    throw new Error('Error fetching responses for question: ' + error.message);
  }
};
