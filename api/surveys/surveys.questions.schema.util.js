// Sequelize get/set/validate hooks for the Survey.questions JSON column.
// Kept separate from surveys.model.js because this is the bulk of the
// model's complexity — the column stores a whole mini-schema (question
// types, options, "other" support, answer-length limits) that needs its
// own validation, not just a plain JSON blob.

// Transparently parses the stored JSON string back into an object/array
// on read, so callers never see the raw DB representation.
export function getQuestionsValue() {
  const rawValue = this.getDataValue('questions');
  try {
    return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
  } catch (error) {
    console.error(`[surveys.questions.schema] Failed to parse stored questions for survey ${this.id}:`, error.message);
    return [];
  }
}

// Accepts either a JSON string or a live array/object and always stores
// a JSON string, so the column type stays consistent regardless of how
// the caller constructed the value.
export function setQuestionsValue(value) {
  if (typeof value === 'string') {
    try {
      JSON.parse(value); // Already valid JSON — store as-is.
      this.setDataValue('questions', value);
    } catch {
      this.setDataValue('questions', JSON.stringify(value));
    }
  } else {
    this.setDataValue('questions', JSON.stringify(value));
  }
}

import { validateAnswerLength } from './surveys.answer-length.util.js';

// Full schema validation for the questions array, run by Sequelize before
// every create/update. Throws on the first violation found.
export function validateQuestions(value) {
  const questions = typeof value === 'string' ? safeParse(value) : value;

  if (!Array.isArray(questions)) {
    throw new Error('Questions must be an array');
  }

  questions.forEach((question) => {
    if (!question.type || !question.question || !question.questionId) {
      throw new Error('Each question must have type, question, and questionId');
    }

    if (question.type === 'multiple') {
      validateMultipleChoiceQuestion(question);
    }

    if (question.imagem && typeof question.imagem !== 'string') {
      throw new Error('Image must be a string (URL)');
    }
    if (question.video && typeof question.video !== 'string') {
      throw new Error('Video must be a string (URL)');
    }
    if (question.answerLength) {
      validateAnswerLength(question);
    }
  });
}

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('Invalid JSON format for questions');
  }
};

// Multiple-choice-specific rules: options array, "Other" option objects,
// and selectionLimit constraints.
const validateMultipleChoiceQuestion = (question) => {
  if (question.multipleSelections && !['yes', 'no'].includes(question.multipleSelections)) {
    throw new Error('multipleSelections must be either "yes" or "no"');
  }
  if (!question.multipleSelections) {
    question.multipleSelections = 'no';
  }

  if (!question.options || !Array.isArray(question.options)) {
    throw new Error('Multiple choice questions must have an options array');
  }
  if (question.multipleSelections === 'yes' && question.options.length < 2) {
    throw new Error('Multiple selection questions require at least two options');
  }

  question.options.forEach((option, index) => {
    if (typeof option !== 'string' && typeof option !== 'object') {
      throw new Error(`Option ${index + 1} must be a string or an object`);
    }
    if (typeof option === 'object') {
      if (option.type !== 'other') {
        throw new Error(`Option ${index + 1}: Custom option objects must have type: "other"`);
      }
      if (!option.label || typeof option.label !== 'string') {
        throw new Error(`Option ${index + 1}: Other option must have a string label`);
      }
      if (option.requiresTextInput === undefined) {
        option.requiresTextInput = true;
      }
      if (typeof option.requiresTextInput !== 'boolean') {
        throw new Error(`Option ${index + 1}: requiresTextInput must be a boolean`);
      }
    }
  });

  if (question.multipleSelections === 'yes' && question.selectionLimit) {
    if (typeof question.selectionLimit !== 'number' || question.selectionLimit < 1) {
      throw new Error('selectionLimit must be a positive number');
    }
    // "Other" option objects don't count toward the standard option total.
    const nonOtherOptionsCount = question.options.filter((opt) => typeof opt === 'string').length;
    if (question.selectionLimit > nonOtherOptionsCount) {
      throw new Error('selectionLimit cannot exceed the number of standard (non-Other) options');
    }
    if (question.selectionLimit === 1) {
      throw new Error('For single selection, set multipleSelections to "no" instead of using selectionLimit');
    }
  } else if (question.selectionLimit) {
    throw new Error('selectionLimit is only allowed for multiple selection questions (multipleSelections: "yes")');
  }
};
