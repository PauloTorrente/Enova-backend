import { extractAnswerValue } from './results.analytics.answer.util.js';
import { processOptionDemographics, processQuestionDemographics } from './results.analytics.demographics.helpers.js';

// Builds per-option analytics (counts + demographics) for a single
// multiple-choice question, including support for a free-text "other"
// option on both single- and multi-select questions.
export const processMultipleChoiceQuestion = (question, questionResults) => {
  const questionData = {
    questionId: question.questionId,
    question: question.question,
    type: question.type,
    multipleSelections: question.multipleSelections || 'no',
    hasOtherOption: question.otherOption || false,
    otherOptionText: question.otherOptionText || 'Outro (especifique)',
    totalAnswers: questionResults.length,
    options: {},
    otherResponses: [],
    demographicBreakdown: {
      byGender: {}, byAgeGroup: {}, byCity: {},
      byEducationLevel: {}, byPurchaseResponsibility: {}
    }
  };

  // Seed a counter bucket for every defined option up front, so options
  // with zero responses still show up in the result (instead of being
  // silently missing).
  question.options.forEach((option) => {
    questionData.options[option] = {
      count: 0,
      demographics: {
        byGender: {}, byAgeGroup: {}, byCity: {},
        byEducationLevel: {}, byPurchaseResponsibility: {}
      }
    };
  });

  if (questionData.hasOtherOption) {
    questionData.options[questionData.otherOptionText] = {
      count: 0,
      isOtherOption: true,
      demographics: {
        byGender: {}, byAgeGroup: {}, byCity: {},
        byEducationLevel: {}, byPurchaseResponsibility: {}
      }
    };
  }

  questionResults.forEach((r) => {
    const user = r.user;
    const answerValue = extractAnswerValue(r.answer);

    if (Array.isArray(answerValue)) {
      answerValue.forEach((option) => tallyChoiceOption(questionData, option, r, user, answerValue));
    } else if (typeof answerValue === 'string') {
      tallyChoiceOption(questionData, answerValue, r, user, null);
    }

    if (user) {
      processQuestionDemographics(questionData.demographicBreakdown, user);
    }
  });

  return questionData;
};

// Increments the count/demographics for one selected option, unpacking
// the "Outro: <text>" convention used by extractAnswerValue when the
// respondent typed a free-text answer.
// `siblingOptions` is the full multi-select array this option came from
// (null for single-select), used only to record the other options that
// were picked alongside a free-text "other" answer.
const tallyChoiceOption = (questionData, option, result, user, siblingOptions) => {
  const isOtherResponse = option.startsWith('Outro: ');
  const optionKey = isOtherResponse ? questionData.otherOptionText : option;
  const optionBucket = questionData.options[optionKey];

  // Guard against options that don't exist on the question definition
  // (e.g. the question was edited after responses were already collected).
  if (!optionBucket) return;

  optionBucket.count++;
  if (user) {
    processOptionDemographics(optionBucket, user);
  }

  if (isOtherResponse && questionData.hasOtherOption) {
    const otherText = option.replace('Outro: ', '');
    questionData.otherResponses.push({
      userId: result.userId,
      otherText,
      ...(siblingOptions
        ? { otherOptions: siblingOptions.filter((opt) => !opt.startsWith('Outro: ')) }
        : {}),
      timestamp: result.createdAt,
      userInfo: user
        ? {
            name: `${user.firstName} ${user.lastName}`,
            gender: user.gender,
            age: user.age,
            city: user.city
          }
        : null
    });
  }
};
