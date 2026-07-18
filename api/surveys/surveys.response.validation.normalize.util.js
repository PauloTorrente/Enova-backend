// Lightweight question normalizer used only by the strict-validation
// response endpoint. Deliberately simpler than
// surveys.questions.normalize.util.js (no selectionLimit/otherOption
// default-filling) — kept separate so tightening one doesn't silently
// change the other's behavior.
export const normalizeSurveyQuestions = (survey) => {
  if (!survey) {
    console.error('[surveys.response.validation] normalizeSurveyQuestions called with null survey');
    return null;
  }

  let questions = survey.questions;

  if (typeof questions === 'string') {
    try {
      questions = JSON.parse(questions);
    } catch (error) {
      console.error('[surveys.response.validation] Error parsing questions:', error.message);
      questions = [];
    }
  }

  if (!Array.isArray(questions)) {
    questions = [];
  }

  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    questions,
    expirationTime: survey.expirationTime,
    status: survey.status,
    accessToken: survey.accessToken,
    clientId: survey.clientId,
    responseLimit: survey.responseLimit,
    createdAt: survey.createdAt,
    updatedAt: survey.updatedAt
  };
};
