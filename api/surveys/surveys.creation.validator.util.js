// Validates the question array submitted when creating a survey, mutating
// questions in place to fill in defaults (multipleSelections, otherOption)
// the same way the Sequelize model's own validator does — kept as an
// explicit pre-check so createSurvey can fail fast with a clear message
// instead of surfacing a raw SequelizeValidationError.
export const validateQuestionDefinitions = (questions) => {
  questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;

    if (!question.type) throw new Error(`${label} missing type`);
    if (!question.question) throw new Error(`${label} missing question text`);
    if (!question.questionId) throw new Error(`${label} missing questionId`);

    if (question.type !== 'multiple') return;

    if (!question.options || !Array.isArray(question.options)) {
      throw new Error(`${label} (multiple choice) missing options array`);
    }
    if (question.options.length === 0) {
      throw new Error(`${label} (multiple choice) must have at least one option`);
    }

    if (question.multipleSelections && !['yes', 'no'].includes(question.multipleSelections)) {
      throw new Error(`${label}: multipleSelections must be "yes" or "no"`);
    }
    if (!question.multipleSelections) {
      question.multipleSelections = 'no';
    }

    if (question.otherOption === true) {
      if (!question.otherOptionText || typeof question.otherOptionText !== 'string' || !question.otherOptionText.trim()) {
        throw new Error(`${label}: otherOptionText is required when otherOption is enabled`);
      }
    } else {
      question.otherOption = false;
      question.otherOptionText = null;
    }

    validateSelectionLimit(question, label);
  });
};

// Selection-limit rules only apply to multi-select questions, and only
// make sense relative to how many options exist.
const validateSelectionLimit = (question, label) => {
  if (question.multipleSelections === 'yes' && question.selectionLimit) {
    if (typeof question.selectionLimit === 'string') {
      const parsedLimit = parseInt(question.selectionLimit);
      if (!isNaN(parsedLimit)) question.selectionLimit = parsedLimit;
    }

    if (typeof question.selectionLimit !== 'number' || question.selectionLimit < 1) {
      throw new Error(`${label}: selectionLimit must be a positive number`);
    }
    if (question.selectionLimit > question.options.length) {
      throw new Error(`${label}: selectionLimit cannot exceed the number of available options`);
    }
    if (question.selectionLimit === 1) {
      throw new Error(`${label}: For single selection, set multipleSelections to "no" instead of using selectionLimit`);
    }
  }

  if (question.multipleSelections === 'no' && question.selectionLimit) {
    throw new Error(`${label}: selectionLimit is only allowed for multiple selection questions (multipleSelections: "yes")`);
  }
};
