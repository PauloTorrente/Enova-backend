// Full per-question answer validation used by respondToSurveyByToken.
// Returns an error message string if the answer is invalid, or null if
// it's fine — kept as a single function (rather than throwing) so the
// controller can turn it directly into a 400 response without a
// try/catch just for control flow.
//
// Note: this is intentionally more thorough than the lighter check in
// validateSurveyResponses() (surveys.response.validation.controller.js),
// which predates full "other"-option support — they are not unified here
// to avoid changing either endpoint's existing validation behavior.
export const validateResponseItem = (question, responseItem) => {
  const isRequired = question.required === true || question.required === 'yes';
  if (question.type === 'multiple' && !isRequired && isBlankMultipleChoiceAnswer(question, responseItem.answer)) {
    return null;
  }
  if (question.otherOption === true) {
    return validateOtherOptionAnswer(question, responseItem);
  }
  return validateStandardAnswer(question, responseItem);
};

// An optional multiple-choice question left unanswered shouldn't fail
// option-validity checks below (e.g. '' or null isn't a real option, and
// an empty selectedOptions/selectedOptions array isn't "no option chosen
// among valid ones" — it's simply skipped). Only applies when the question
// isn't required; a required question still has to have a real answer.
const isBlankMultipleChoiceAnswer = (question, answer) => {
  if (question.otherOption === true) {
    if (typeof answer !== 'object' || answer === null) return true;
    const otherText = (answer.otherText || '').trim();
    if (question.multipleSelections === 'yes') {
      return (!answer.selectedOptions || answer.selectedOptions.length === 0) && !otherText;
    }
    return (answer.selectedOption === null || answer.selectedOption === undefined) && !otherText;
  }
  if (answer === null || answer === undefined || answer === '') return true;
  return Array.isArray(answer) && answer.length === 0;
};

const validateOtherOptionAnswer = (question, responseItem) => {
  const { answer } = responseItem;

  if (typeof answer !== 'object' || answer === null) {
    return `For question "${question.question}" with "other" option, answer must be an object with selectedOptions/selectedOption and otherText fields`;
  }

  if (question.multipleSelections === 'yes' && answer.selectedOptions) {
    return validateOtherMultipleSelection(question, answer);
  }
  if (question.multipleSelections === 'no' && answer.selectedOption !== undefined) {
    return validateOtherSingleSelection(question, answer);
  }
  return `Invalid answer structure for question "${question.question}"`;
};

const validateOtherMultipleSelection = (question, answer) => {
  const selectedOptions = answer.selectedOptions || [];
  const otherText = answer.otherText || '';

  if (question.selectionLimit) {
    const selectionLimit = Number(question.selectionLimit);
    if (selectedOptions.length > selectionLimit) {
      return `Question "${question.question}" allows maximum ${selectionLimit} selection(s). You selected ${selectedOptions.length}.`;
    }
  }

  for (const option of selectedOptions) {
    if (option === 'other') {
      if (!otherText.trim()) {
        return `When selecting "other", you must provide text for question "${question.question}"`;
      }
    } else if (!question.options.includes(option)) {
      return `Invalid option "${option}" for question "${question.question}"`;
    }
  }

  if (selectedOptions.length === 0) {
    return `You must select at least one option for question "${question.question}"`;
  }
  return null;
};

const validateOtherSingleSelection = (question, answer) => {
  const { selectedOption } = answer;
  const otherText = answer.otherText || '';

  if (selectedOption === 'other') {
    if (!otherText.trim()) {
      return `When selecting "other", you must provide text for question "${question.question}"`;
    }
  } else if (!question.options.includes(selectedOption)) {
    return `Invalid option "${selectedOption}" for question "${question.question}"`;
  }
  return null;
};

const validateStandardAnswer = (question, responseItem) => {
  if (question.type !== 'multiple') return null;

  const { answer } = responseItem;

  if (question.multipleSelections === 'yes' && question.selectionLimit) {
    const selectionLimit = Number(question.selectionLimit);

    if (!Array.isArray(answer)) {
      return `Question "${question.question}" requires multiple selections`;
    }
    if (answer.length > selectionLimit) {
      return `Question "${question.question}" allows maximum ${selectionLimit} selection(s). You selected ${answer.length}.`;
    }
    for (const value of answer) {
      if (!question.options.includes(value)) {
        return `Invalid option "${value}" for question "${question.question}"`;
      }
    }
    return null;
  }

  if (question.multipleSelections === 'no' && Array.isArray(answer)) {
    return `Question "${question.question}" only accepts a single answer`;
  }

  const answers = Array.isArray(answer) ? answer : [answer];
  for (const value of answers) {
    if (!question.options || !question.options.includes(value)) {
      return `Invalid option "${value}" for question "${question.question}"`;
    }
  }
  return null;
};
