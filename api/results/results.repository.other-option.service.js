import { Op } from 'sequelize';
import Result from './results.model.js';
import User from '../users/users.model.js';
import Survey from '../surveys/surveys.model.js';

// Analyzes free-text "other" answers across a survey (or a single
// question), grouping near-duplicate replies so an admin can see the
// most common custom answers without reading every single response.
export const getOtherOptionResponses = async (surveyId, questionId = null) => {
  try {
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    let surveyQuestions = [];
    try {
      surveyQuestions = typeof survey.questions === 'string'
        ? JSON.parse(survey.questions)
        : survey.questions;
    } catch (error) {
      console.error(`[results.repository.other-option] Failed to parse questions JSON for survey ${surveyId}:`, error.message);
    }

    const questionsWithOtherOption = surveyQuestions.filter((q) => q.type === 'multiple' && q.otherOption === true);
    if (questionsWithOtherOption.length === 0) return [];

    const targetQuestions = questionId
      ? questionsWithOtherOption.filter((q) => q.questionId === questionId)
      : questionsWithOtherOption;
    if (targetQuestions.length === 0) return [];

    const questionTexts = targetQuestions.map((q) => q.question);
    const responses = await Result.findAll({
      where: {
        surveyId,
        question: { [Op.in]: questionTexts }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'city', 'gender', 'age']
      }]
    });

    const otherResponses = collectOtherResponses(responses, targetQuestions);
    const groupedArray = groupOtherResponsesByText(otherResponses);

    console.log(`[results.repository.other-option] Found ${otherResponses.length} "other" responses for survey ${surveyId}`);

    return {
      totalOtherResponses: otherResponses.length,
      questionsAnalyzed: targetQuestions.map((q) => ({
        questionId: q.questionId,
        question: q.question,
        otherOptionText: q.otherOptionText
      })),
      groupedResponses: groupedArray,
      rawOtherResponses: otherResponses.slice(0, 20) // Cap the raw sample for response size.
    };
  } catch (error) {
    console.error(`[results.repository.other-option] getOtherOptionResponses failed (surveyId=${surveyId}):`, error.message);
    throw new Error('Error fetching "other" option responses: ' + error.message);
  }
};

// Extracts the "other" free-text answer (current object format, or the
// legacy "Outro: <text>" string format) from each raw response.
const collectOtherResponses = (responses, targetQuestions) => {
  const otherResponses = [];

  responses.forEach((r) => {
    const responseData = r.toJSON ? r.toJSON() : r;
    const questionData = targetQuestions.find((q) => q.question === responseData.question);
    if (!questionData) return;

    let parsedAnswer = responseData.answer;
    if (typeof parsedAnswer === 'string') {
      try {
        parsedAnswer = JSON.parse(parsedAnswer);
      } catch {
        // Legacy plain-string answer, handled by the branch below.
      }
    }

    if (typeof parsedAnswer === 'object' && parsedAnswer !== null && parsedAnswer.otherText) {
      otherResponses.push({
        responseId: responseData.id,
        questionId: questionData.questionId,
        question: responseData.question,
        otherOptionText: questionData.otherOptionText || 'Outro (especifique)',
        otherText: parsedAnswer.otherText,
        selectedOptions: parsedAnswer.selectedOptions || [parsedAnswer.selectedOption],
        user: responseData.user,
        createdAt: responseData.createdAt
      });
    } else if (typeof responseData.answer === 'string' && responseData.answer.includes('Outro: ')) {
      otherResponses.push({
        responseId: responseData.id,
        questionId: questionData.questionId,
        question: responseData.question,
        otherOptionText: 'Outro (especifique)',
        otherText: responseData.answer.split('Outro: ')[1] || '',
        selectedOptions: [],
        user: responseData.user,
        createdAt: responseData.createdAt
      });
    }
  });

  return otherResponses;
};

// Groups "other" responses by normalized text so near-identical free-text
// answers are counted together, sorted by frequency (most common first).
const groupOtherResponsesByText = (otherResponses) => {
  const groupedByText = otherResponses.reduce((acc, response) => {
    const key = response.otherText.toLowerCase().trim();
    if (!acc[key]) {
      acc[key] = { text: response.otherText, count: 0, responses: [] };
    }
    acc[key].count++;
    acc[key].responses.push(response);
    return acc;
  }, {});

  return Object.values(groupedByText)
    .sort((a, b) => b.count - a.count)
    .map((group) => ({
      text: group.text,
      count: group.count,
      sampleResponses: group.responses.slice(0, 3)
    }));
};
