// Maps one submitted response item to its question definition and builds
// the Result row to insert, tolerating mismatched question IDs (falls
// back to a positional index, then to a synthetic placeholder) since the
// "permissive" endpoint is meant to accept slightly malformed clients
// rather than reject them outright.
export const mapResponseItemToResultEntry = (item, questions, surveyId, userId, warnings) => {
  const questionObj = findQuestionForItem(item, questions, warnings);
  const questionText = questionObj.question || `Question ${item.questionId}`;

  if (questionObj.type === 'multiple') {
    const limitError = normalizeMultipleChoiceAnswer(item, questionObj, questionText);
    if (limitError) return { limitError };
  }

  return {
    entry: {
      surveyId,
      userId,
      question: questionText,
      answer: item.answer
    }
  };
};

// Finds the question definition by ID, falling back to a 1-based
// positional index, and finally to a synthetic placeholder so the caller
// always has *something* to attach the response to.
const findQuestionForItem = (item, questions, warnings) => {
  let questionObj = questions.find((q) => q.questionId === item.questionId || q.id === item.questionId);
  if (questionObj) return questionObj;

  const numericId = parseInt(item.questionId);
  if (!isNaN(numericId)) {
    questionObj = questions[numericId - 1];
    if (questionObj) {
      warnings.push(`Question ID ${item.questionId} mapped to index ${numericId - 1}`);
      return questionObj;
    }
  }

  warnings.push(`Question with ID ${item.questionId} not found`);
  return { question: `Question ${item.questionId}`, type: 'text', multipleSelections: 'no' };
};

// Coerces the answer shape to match the question's selection mode and
// enforces the selection limit. Mutates `item.answer` in place (matching
// the original inline behavior) and returns an error message string if
// the selection limit was exceeded, or undefined otherwise.
const normalizeMultipleChoiceAnswer = (item, questionObj, questionText) => {
  if (questionObj.multipleSelections === 'yes') {
    if (!Array.isArray(item.answer)) {
      item.answer = [item.answer];
    }
    if (questionObj.selectionLimit && item.answer.length > questionObj.selectionLimit) {
      return `Question "${questionText}" allows maximum ${questionObj.selectionLimit} selection(s).`;
    }
  } else if (Array.isArray(item.answer)) {
    item.answer = item.answer[0];
  }
  return undefined;
};
