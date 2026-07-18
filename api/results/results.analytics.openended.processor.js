import { getAgeGroup } from './results.analytics.age-group.util.js';

// Builds analytics for a free-text question by grouping near-identical
// answers together (first 50 chars, lowercased) so the UI can show
// "N people answered roughly this" instead of one row per response.
export const processOpenEndedQuestion = (question, questionResults) => {
  const questionData = {
    questionId: question.questionId,
    question: question.question,
    type: question.type,
    totalAnswers: questionResults.length,
    options: {},
    demographicBreakdown: {
      byGender: {}, byAgeGroup: {}, byCity: {},
      byEducationLevel: {}, byPurchaseResponsibility: {}
    }
  };

  const answerGroups = {};

  questionResults.forEach((r) => {
    const answer = r.answer || '';
    const key = answer.substring(0, 50).toLowerCase();

    if (!answerGroups[key]) {
      answerGroups[key] = {
        count: 0,
        examples: [],
        demographics: { byGender: {}, byAgeGroup: {}, byCity: {} }
      };
    }

    const group = answerGroups[key];
    group.count++;
    if (group.examples.length < 3) {
      group.examples.push(answer);
    }

    const user = r.user;
    if (!user) return;

    if (user.gender) {
      group.demographics.byGender[user.gender] =
        (group.demographics.byGender[user.gender] || 0) + 1;
    }

    if (user.age) {
      const ageGroup = getAgeGroup(user.age);
      group.demographics.byAgeGroup[ageGroup] = (group.demographics.byAgeGroup[ageGroup] || 0) + 1;
    }

    if (user.city) {
      group.demographics.byCity[user.city] = (group.demographics.byCity[user.city] || 0) + 1;
    }
  });

  questionData.answerGroups = answerGroups;
  return questionData;
};
