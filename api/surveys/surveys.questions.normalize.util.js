// Normalizes survey/question/answer shapes coming out of the database or
// out of a request body, so the rest of the service layer never has to
// worry about stringified JSON, missing defaults, or the "other" option's
// two different answer formats.

// Coerces a Survey row's `questions` into a clean array and fills in
// defaults (selectionLimit as a number, otherOption/otherOptionText),
// returning the survey as a plain object. Returns null for a null/undefined
// survey so callers can short-circuit instead of throwing.
export const normalizeSurveyQuestions = (survey) => {
  if (!survey) {
    console.error('[surveys.questions.normalize] normalizeSurveyQuestions called with null survey');
    return null;
  }

  let questions = survey.questions;

  if (typeof questions === 'string') {
    try {
      questions = JSON.parse(questions);
    } catch (error) {
      console.error(`[surveys.questions.normalize] Failed to parse questions JSON for survey ${survey.id}:`, error.message);
      questions = [];
    }
  }

  if (!Array.isArray(questions)) {
    questions = [];
  }

  const processedQuestions = questions.map((question) => {
    if (
      question.type === 'multiple' &&
      (question.multipleSelections === 'yes' || question.multipleSelections === true) &&
      question.selectionLimit != null
    ) {
      const numericLimit = Number(question.selectionLimit);
      question.selectionLimit = !isNaN(numericLimit) && numericLimit > 0 ? numericLimit : null;
    }

    if (question.type === 'multiple') {
      if (question.otherOption === undefined) {
        question.otherOption = false;
      }
      if (question.otherOption === true && !question.otherOptionText) {
        question.otherOptionText = 'Other (specify)';
      }
    }

    return question;
  });

  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    questions: processedQuestions,
    expirationTime: survey.expirationTime,
    status: survey.status,
    accessToken: survey.accessToken,
    clientId: survey.clientId,
    responseLimit: survey.responseLimit,
    createdAt: survey.createdAt,
    updatedAt: survey.updatedAt
  };
};

// Converts a submitted answer for an "other"-enabled question into the
// display string format used by results (e.g. "Other: <free text>"),
// mirroring the format results.repository.answer.util.js expects.
export const normalizeOtherOptionResponse = (question, answer) => {
  if (!question.otherOption) {
    return answer;
  }

  if (typeof answer === 'object' && answer !== null && answer.otherText !== undefined) {
    if (Array.isArray(answer.selectedOptions)) {
      const finalAnswer = [...answer.selectedOptions];
      if (answer.otherText && answer.otherText.trim()) {
        finalAnswer.push(`${question.otherOptionText || 'Other'}: ${answer.otherText}`);
      }
      return finalAnswer;
    }

    if (answer.selectedOption) {
      if (answer.selectedOption === 'other' && answer.otherText && answer.otherText.trim()) {
        return `${question.otherOptionText || 'Other'}: ${answer.otherText}`;
      }
      if (answer.selectedOption !== 'other') {
        return answer.selectedOption;
      }
    }
  }

  // Legacy "Other: <text>" string format — already display-ready.
  if (typeof answer === 'string' && answer.startsWith('Other: ')) {
    return answer;
  }

  // "other" selected with no free text — drop it rather than storing a
  // meaningless bare "other" token.
  if (Array.isArray(answer) && answer.includes('other')) {
    return answer.filter((item) => item !== 'other');
  }

  return answer;
};
