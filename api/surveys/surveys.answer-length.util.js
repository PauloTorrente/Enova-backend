// Validates the optional `answerLength` preset on text questions (and,
// for text questions with sub-options, their per-option length bounds).
const ANSWER_LENGTH_PRESETS = {
  short: { min: 1, max: 100 },
  medium: { min: 10, max: 300 },
  long: { min: 50, max: 1000 },
  unrestricted: { min: 0, max: Infinity }
};

export const validateAnswerLength = (question) => {
  if (typeof question.answerLength !== 'string') {
    throw new Error('answerLength must be a string');
  }
  if (!ANSWER_LENGTH_PRESETS[question.answerLength]) {
    throw new Error(`Invalid answerLength. Allowed values: ${Object.keys(ANSWER_LENGTH_PRESETS).join(', ')}`);
  }

  if (question.type === 'text' && question.options) {
    const options = Array.isArray(question.options) ? question.options : [];
    options.forEach((option) => {
      if (option.minLength && typeof option.minLength !== 'number') {
        throw new Error('minLength must be a number');
      }
      if (option.maxLength && typeof option.maxLength !== 'number') {
        throw new Error('maxLength must be a number');
      }
    });
  }
};
