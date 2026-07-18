import Survey from '../surveys/surveys.model.js';

// Loads and parses a survey's `questions` JSON column.
// Every read query in this repository needs this to enrich raw answers
// with question metadata (type, options, "other" support) — factored out
// so the JSON.parse/try-catch pair isn't repeated in every query function.
// Returns [] if the survey doesn't exist or its questions can't be parsed,
// so callers can treat "no metadata" the same way regardless of the cause.
export const loadSurveyQuestions = async (surveyId) => {
  const survey = await Survey.findByPk(surveyId);
  if (!survey || !survey.questions) return [];

  try {
    return typeof survey.questions === 'string'
      ? JSON.parse(survey.questions)
      : survey.questions;
  } catch (error) {
    console.error(`[results.repository] Failed to parse questions JSON for survey ${surveyId}:`, error.message);
    return [];
  }
};

// Finds the question definition matching a stored response, by questionId
// first (authoritative) and falling back to exact question text.
export const findQuestionData = (questions, response) => {
  return questions.find((q) =>
    q.questionId === response.questionId || q.question === response.question
  );
};
